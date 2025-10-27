// src/socket/stompClient.ts
import { CURRENT_ENV, getCurrentSocketConfig } from '@/constants/environment';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

export type Transport = 'auto' | 'sockjs' | 'raw';

export type ConnectOptions = {
  token?: string;
  extraHeaders?: Record<string, any>;
  transport?: Transport;              // 'auto' | 'sockjs' | 'raw'
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

function toWsUrl(url: string): string {
  // http(s)://.../endpoint -> ws(s)://.../endpoint/websocket
  const wsBase = url.startsWith('https') ? url.replace(/^https/i, 'wss') : url.replace(/^http/i, 'ws');
  return wsBase.endsWith('/websocket') ? wsBase : `${wsBase}/websocket`;
}

function isHttpLike(url: string) { return url.startsWith('http://') || url.startsWith('https://'); }
function isWsLike(url: string) { return url.startsWith('ws://') || url.startsWith('wss://'); }

export class StompSocketManager {
  private client: Client | null = null;
  private attempt = 0;
  private readonly maxAttempts: number;
  private readonly reconnectDelay: number;
  private readonly connectTimeout: number;
  private readonly baseUrl: string;      // 환경에서 온 원본 URL (보통 http(s) SockJS endpoint)
  private logger: Required<Logger>;
  private token?: string;

  constructor(logger?: Logger) {
    const cfg = getCurrentSocketConfig();
    this.baseUrl = cfg.URL; // 예: http://host/socket/works/endpoint  (SockJS 엔드포인트)
    this.maxAttempts = cfg.MAX_RECONNECT_ATTEMPTS;
    this.reconnectDelay = cfg.RECONNECT_DELAY;
    this.connectTimeout = cfg.TIMEOUT;
    this.logger = { ...defaultLogger, ...(logger ?? {}) };
  }

  isConnected() { return !!this.client?.connected; }

  setToken(token?: string) {
    this.token = token;
    if (this.client?.active) this.logger.info('Auth token updated (will apply on next connect)');
  }

  private buildHeaders(extra?: Record<string, any>) {
    return {
      ...(this.token ? { Authorization: `${this.token}` } : {}),
      ...(extra ?? {}),
    };
  }

  /**
   * transport = 'auto' (기본):
   *  - URL이 http(s)면 SockJS
   *  - URL이 ws(s)면 Raw WS
   */
  async connect(opts: ConnectOptions = {}): Promise<void> {
    const { token, extraHeaders, transport = 'auto', onConnect, onDisconnect, onError } = opts;
    if (this.isConnected()) {
      this.logger.info('Already connected');
      onConnect?.();
      return;
    }
    if (token) this.token = token;

    // 이전 인스턴스 정리
    if (this.client) {
      try { await this.client.deactivate(); } catch {}
      this.client = null;
    }

    // 접속 방식 결정
    let mode: Transport = transport;
    if (mode === 'auto') {
      if (isHttpLike(this.baseUrl)) mode = 'sockjs';
      else if (isWsLike(this.baseUrl)) mode = 'raw';
      else mode = 'sockjs';
    }

    const headers = this.buildHeaders(extraHeaders);

    this.attempt = 0;

    if (mode === 'sockjs') {
      // ✅ 백엔드가 withSockJS() 이므로 이 경로가 가장 안전
      const httpUrl = this.baseUrl; // 반드시 /endpoint (NO /websocket)
      this.logger.info('Connecting via SockJS', { httpUrl });
      const socket = new (SockJS as any)(httpUrl);

      this.client = new Client({
        // SockJS 경로에서는 brokerURL 설정하지 않고 factory만 지정
        webSocketFactory: () => socket as any,
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 15000,
        heartbeatOutgoing: 15000,
        connectHeaders: headers,
        debug: () => {},
        onConnect: () => { this.logger.info('STOMP connected (SockJS)'); this.attempt = 0; onConnect?.(); },
        onStompError: (frame) => { this.logger.error('Broker error:', frame.headers['message'], frame.body); onError?.(frame); },
        onWebSocketClose: (evt) => {
          this.logger.warn('WebSocket closed (SockJS)', evt?.code, evt?.reason);
          onDisconnect?.();
          this.attempt++;
          if (this.attempt > this.maxAttempts) {
            this.logger.error(`Max reconnect attempts exceeded (${this.maxAttempts})`);
            this.client?.deactivate();
          }
        },
        onWebSocketError: (evt) => { this.logger.error('WebSocket error (SockJS)', evt); onError?.(evt); },
      });
    } else {
      // raw WebSocket + /websocket 트랜스포트로 직접
      const wsUrl = isWsLike(this.baseUrl) ? (this.baseUrl.endsWith('/websocket') ? this.baseUrl : `${this.baseUrl}/websocket`)
                                           : toWsUrl(this.baseUrl);
      this.logger.info('Connecting via Raw WebSocket', { wsUrl });

      this.client = new Client({
        brokerURL: wsUrl,
        // RN 환경에서 subprotocol 명시가 안전
        webSocketFactory: () => new WebSocket(wsUrl, ['v12.stomp', 'v11.stomp', 'v10.stomp']),
        reconnectDelay: this.reconnectDelay,
        heartbeatIncoming: 15000,
        heartbeatOutgoing: 15000,
        connectHeaders: headers,
        debug: (str) => { if (CURRENT_ENV !== 'PRODUCTION') this.logger.debug(str); },
        onConnect: () => { this.logger.info('STOMP connected (Raw WS)'); this.attempt = 0; onConnect?.(); },
        onStompError: (frame) => { this.logger.error('Broker error:', frame.headers['message'], frame.body); onError?.(frame); },
        onWebSocketClose: (evt) => {
          this.logger.warn('WebSocket closed (Raw WS)', evt?.code, evt?.reason);
          onDisconnect?.();
          this.attempt++;
          if (this.attempt > this.maxAttempts) {
            this.logger.error(`Max reconnect attempts exceeded (${this.maxAttempts})`);
            this.client?.deactivate();
          }
        },
        onWebSocketError: (evt) => { this.logger.error('WebSocket error (Raw WS)', evt); onError?.(evt); },
      });
    }

    // activate + 수동 타임아웃 보호
    this.logger.info('activate() call');
    const timer = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('STOMP connect timeout')), this.connectTimeout));
    const activator = this.client.activate();
    await Promise.race([activator, timer]).catch((e) => { this.logger.error(e); throw e; });
  }

  subscribe(destination: string, handler: (message: IMessage) => void, headers?: Record<string, any>): StompSubscription {
    if (!this.client || !this.client.active) throw new Error('STOMP is not connected');
    return this.client.subscribe(destination, handler, headers);
  }

  unsubscribe(sub: StompSubscription) {
    try { sub?.unsubscribe(); } catch (e) { this.logger.warn('unsubscribe error', e); }
  }

  /** 컨트롤러 @MessageMapping("/...") → publish는 "/socket/works/app/..." 로!
   *  예: sendApp('invite/room', payload) => /socket/works/app/invite/room
   */
  sendApp(path: string, body?: any, headers?: Record<string, any>) {
    this.send(`/socket/works/app/${path.replace(/^\//, '')}`, body, headers);
  }

  send(destination: string, body?: any, headers?: Record<string, any>) {
    if (!this.client || !this.client.active) throw new Error('STOMP is not connected');
    const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {});
    this.client.publish({ destination, body: payload, headers });
  }

  async disconnect() {
    if (!this.client) return;
    await this.client.deactivate();
    this.client = null;
    this.logger.info('STOMP deactivated');
  }
}

/* Singleton */
let _manager: StompSocketManager | null = null;
export const stompManager = () => (_manager ??= new StompSocketManager());
