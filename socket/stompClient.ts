// src/socket/stompClient.ts
import { CURRENT_ENV, getCurrentSocketConfig } from '@/constants/environment'; // 너의 파일 경로에 맞춰 수정
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                  */
/* -------------------------------------------------------------------------- */

function httpToWs(url: string): string {
  // http(s) -> ws(s)
  const wsBase = url.startsWith('https')
    ? url.replace(/^https/i, 'wss')
    : url.replace(/^http/i, 'ws');

  // Spring SockJS endpoint면 '/websocket' 트랜스포트 경로에 직접 연결
  // (예: https://host/socket/works/endpoint -> wss://host/socket/works/endpoint/websocket)
  return wsBase.endsWith('/websocket') ? wsBase : `${wsBase}/websocket`;
}

export type ConnectOptions = {
  token?: string;                      // JWT 있으면 Authorization 헤더에 실어 보냄
  extraHeaders?: Record<string, any>;  // 필요한 추가 헤더
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (e: any) => void;
};

type Logger = {
  debug?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

const defaultLogger: Required<Logger> = {
  debug: (...a) => console.debug('[STOMP]', ...a),
  info:  (...a) => console.info('[STOMP]', ...a),
  warn:  (...a) => console.warn('[STOMP]', ...a),
  error: (...a) => console.error('[STOMP]', ...a),
};

/* -------------------------------------------------------------------------- */
/*                              StompSocketManager                             */
/* -------------------------------------------------------------------------- */

export class StompSocketManager {
  private client: Client | null = null;
  private attempt = 0;
  private readonly maxAttempts: number;
  private readonly reconnectDelay: number;
  private readonly connectTimeout: number;
  private readonly url: string;
  private logger: Required<Logger>;
  private token?: string;

  constructor(logger?: Logger) {
    const cfg = getCurrentSocketConfig();
    this.url = httpToWs(cfg.URL);
    this.maxAttempts = cfg.MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = cfg.RECONNECT_DELAY;
    this.connectTimeout = cfg.TIMEOUT;
    this.logger = { ...defaultLogger, ...(logger ?? {}) };
  }

  /** 현재 연결 여부 */
  isConnected() {
    return !!this.client?.connected;
  }

  /** JWT 갱신 등 */
  setToken(token?: string) {
    this.token = token;
    if (this.client && this.client.active) {
      // 다음 재연결 시 반영됨. 즉시 반영 원하면 재연결 트리거 필요.
      this.logger.info('Auth token updated (will apply on next connect)');
    }
  }

  /** 연결 */
  async connect(opts: ConnectOptions = {}): Promise<void> {
    const { token, extraHeaders, onConnect, onDisconnect, onError } = opts;
    if (this.isConnected()) {
      this.logger.info('Already connected');
      onConnect?.();
      return;
    }
    if (token) this.token = token;

    this.attempt = 0;

    this.client = new Client({
      brokerURL: this.url, // RN/웹 모두 기본 WebSocket 사용
      reconnectDelay: this.reconnectDelay, // 라이브러리 자동 재시도 간격
      heartbeatIncoming: 15000,
      heartbeatOutgoing: 15000,
      // 디버그 로깅 (원하면 주석)
      debug: (str) => {
        if (CURRENT_ENV !== 'PRODUCTION') this.logger.debug(str);
      },
      // 연결 직전에 헤더 제공
      connectHeaders: {
        ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
        ...(extraHeaders ?? {}),
      },
      onConnect: () => {
        this.logger.info('STOMP connected');
        this.attempt = 0;
        onConnect?.();
      },
      onStompError: (frame) => {
        this.logger.error('Broker reported error:', frame.headers['message'], frame.body);
        onError?.(frame);
      },
      onWebSocketClose: (evt) => {
        this.logger.warn('WebSocket closed', evt?.code, evt?.reason);
        onDisconnect?.();

        // @stomp/stompjs 의 reconnectDelay로 자동 재시도되지만
        // 시도 횟수를 우리가 제한하고 싶으므로 여기서 컷오프
        this.attempt++;
        if (this.attempt > this.maxAttempts) {
          this.logger.error(`Max reconnect attempts exceeded (${this.maxAttempts})`);
          // 더 이상 자동 재시도 하지 않도록 비활성화
          this.client?.deactivate();
        }
      },
      onWebSocketError: (evt) => {
        this.logger.error('WebSocket error', evt);
        onError?.(evt);
      },
    });

    // 연결 처리 + 수동 타임아웃
    const timer = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('STOMP connect timeout')), this.connectTimeout)
    );
    const activator = this.client.activate(); // activate()는 즉시 반환 (비동기 시작)

    // 연결 완료 신호는 onConnect 콜백으로 오므로, 여기서는 activate() 시작 보장만
    await Promise.race([activator, timer]).catch((e) => {
      this.logger.error(e);
      throw e;
    });
  }

  /** 구독: destination = '/topic/...' or '/queue/...', 유저 큐는 '/user/queue/...' */
  subscribe(
    destination: string,
    handler: (message: IMessage) => void,
    headers?: Record<string, any>
  ): StompSubscription {
    if (!this.client || !this.client.active) {
      throw new Error('STOMP is not connected');
    }
    return this.client.subscribe(destination, handler, headers);
  }

  /** 구독 해제 */
  unsubscribe(sub: StompSubscription) {
    try {
      sub?.unsubscribe();
    } catch (e) {
      this.logger.warn('unsubscribe error', e);
    }
  }

  /** 메시지 전송: destination = '/app/...' (컨트롤러 @MessageMapping) */
  send(destination: string, body?: any, headers?: Record<string, any>) {
    if (!this.client || !this.client.active) {
      throw new Error('STOMP is not connected');
    }
    const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
    this.client.publish({ destination, body: payload, headers });
  }

  /** 연결 해제 */
  async disconnect() {
    if (!this.client) return;
    await this.client.deactivate();
    this.client = null;
    this.logger.info('STOMP deactivated');
  }
}

/* -------------------------------------------------------------------------- */
/*                              Singleton Export                               */
/* -------------------------------------------------------------------------- */

let _manager: StompSocketManager | null = null;

export const stompManager = () => {
  if (!_manager) _manager = new StompSocketManager();
  return _manager;
};
