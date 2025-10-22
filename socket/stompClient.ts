// src/socket/stompClient.ts
import { IMessage, Client as StompClient, StompSubscription } from "@stomp/stompjs";
import { useEffect, useRef } from "react";
import SockJS from "sockjs-client";

/* ===========================
 * 타입 & 설정
 * =========================== */

export type StompStatus = "disconnected" | "connecting" | "connected" | "error";

export interface StompPaths {
  /** Spring의 setApplicationDestinationPrefixes()에 대응 */
  appPrefix?: string;          // default "/socket/works/app"
  topicPrefix?: string;        // default "/topic"
  userQueuePrefix?: string;    // default "/user/queue"
}

export interface StompOptions {
  /** SockJS endpoint (ex: https://api.example.com/ws) */
  url: string;

  /** 토큰 문자열 또는 토큰을 반환하는 함수(동기/비동기 모두 지원) */
  token?: string | (() => string | Promise<string>);

  /** 연결 타임아웃(ms) */
  timeoutMs?: number;          // default 10000

  /** 하트비트(ms) */
  heartbeatIncomingMs?: number; // default 10000
  heartbeatOutgoingMs?: number; // default 10000

  /** 자동 재접속 지연(ms). 0 또는 undefined면 비활성화 */
  reconnectDelayMs?: number;    // default 3000

  /** 경로 프리픽스 커스터마이즈 */
  paths?: StompPaths;

  /** 간단 로거 주입(원하면 console 전달) */
  logger?: {
    debug?: (...args: any[]) => void;
    info?: (...args: any[]) => void;
    warn?: (...args: any[]) => void;
    error?: (...args: any[]) => void;
  };
}

type Listener = (payload: any) => void;

/** 간단 이벤트 버스 */
class Emitter {
  private map = new Map<string, Set<Listener>>();
  on(event: string, cb: Listener) {
    if (!this.map.has(event)) this.map.set(event, new Set());
    this.map.get(event)!.add(cb);
    return () => this.off(event, cb);
  }
  off(event: string, cb?: Listener) {
    if (!this.map.has(event)) return;
    if (!cb) return void this.map.delete(event);
    this.map.get(event)!.delete(cb);
  }
  emit(event: string, data: any) {
    const set = this.map.get(event);
    if (!set) return;
    for (const cb of set) cb(data);
  }
  clear() { this.map.clear(); }
}

/* ===========================
 * STOMP 서비스 (싱글톤)
 * =========================== */

class StompService {
  private client: StompClient | null = null;
  private status: StompStatus = "disconnected";
  private subs = new Map<string, StompSubscription>(); // key = logical name
  private bus = new Emitter();
  private opts?: Required<
    Pick<StompOptions,
      "url" | "timeoutMs" | "reconnectDelayMs" |
      "heartbeatIncomingMs" | "heartbeatOutgoingMs" | "logger"
    >
  > & { paths: Required<StompPaths>; token?: StompOptions["token"] };

  /* ===== 유틸 ===== */

  private log(level: keyof NonNullable<StompOptions["logger"]>, ...args: any[]) {
    try { this.opts?.logger?.[level]?.(...args); } catch {}
  }

  private async resolveToken(token: StompOptions["token"]) {
    if (!token) return undefined;
    if (typeof token === "function") return await token();
    return token;
  }

  private buildSubscribeDest(logical: string): string {
    // absolute path 그대로 허용
    if (logical.startsWith("/")) return logical;

    // user/queue/* 인지 구분
    if (logical.startsWith("user/queue/")) return `/${logical}`;

    // 그 외는 topic prefix 적용
    return `${this.opts!.paths.topicPrefix}/${logical}`;
  }

  private buildPublishDest(logical: string): string {
    // absolute path 그대로 허용
    if (logical.startsWith("/")) return logical;

    // 기본은 appPrefix + logical
    return `${this.opts!.paths.appPrefix}/${logical}`;
  }

  /* ===== 퍼블릭 API ===== */

  getState() { return this.status; }

  on(event: "open" | "close" | "error" | "message", cb: Listener) {
    return this.bus.on(event, cb);
  }

  /** 메시지 토픽 구독 (반환: 언구독 함수) */
  subscribe(logicalTopic: string, cb: Listener) {
    if (!this.client || this.status !== "connected") {
      // 연결 후 재호출하거나, 필요하면 지연 큐 구현 가능
      return () => {};
    }
    const dest = this.buildSubscribeDest(logicalTopic);
    if (this.subs.has(logicalTopic)) {
      // 기존 동일 키 구독 제거
      this.subs.get(logicalTopic)!.unsubscribe();
      this.subs.delete(logicalTopic);
    }
    const sub = this.client.subscribe(dest, (msg: IMessage) => {
      let payload: any = msg.body;
      try { payload = JSON.parse(msg.body); } catch {}
      cb(payload);
      this.bus.emit("message", { topic: logicalTopic, payload });
    });
    this.subs.set(logicalTopic, sub);
    return () => this.unsubscribe(logicalTopic);
  }

  /** 언구독 */
  unsubscribe(logicalTopic: string) {
    const sub = this.subs.get(logicalTopic);
    if (sub) {
      sub.unsubscribe();
      this.subs.delete(logicalTopic);
    }
  }

  /** 발행 */
  publish(logicalDestination: string, body: any) {
    if (!this.client || this.status !== "connected") return false;
    const dest = this.buildPublishDest(logicalDestination);
    const payload = typeof body === "string" ? body : JSON.stringify(body);
    this.client.publish({ destination: dest, body: payload });
    return true;
  }

  /** 연결 */
  async connect(options: StompOptions) {
    if (this.status === "connected" || this.status === "connecting") return;

    const {
      url,
      timeoutMs = 10_000,
      heartbeatIncomingMs = 10_000,
      heartbeatOutgoingMs = 10_000,
      reconnectDelayMs = 3_000,
      paths,
      token,
      logger,
    } = options;

    this.opts = {
      url,
      timeoutMs,
      heartbeatIncomingMs,
      heartbeatOutgoingMs,
      reconnectDelayMs,
      logger: logger ?? {},
      paths: {
        appPrefix: paths?.appPrefix ?? "/socket/works/app",
        topicPrefix: paths?.topicPrefix ?? "/topic",
        userQueuePrefix: paths?.userQueuePrefix ?? "/user/queue",
      },
      token,
    };

    const authToken = await this.resolveToken(token);
    const headers: Record<string, string> = {};
    if (authToken) headers.Authorization = authToken;

    this.status = "connecting";

    const sock = new (SockJS as any)(url, null, authToken ? { headers: { Authorization: authToken } } : undefined);

    this.client = new StompClient({
      webSocketFactory: () => sock as any,
      connectHeaders: headers,
      // stompjs가 내부 재접속 로직을 제공
      reconnectDelay: reconnectDelayMs ?? 0, // 0 또는 undefined면 비활성화
      connectionTimeout: timeoutMs,
      heartbeatIncoming: heartbeatIncomingMs,
      heartbeatOutgoing: heartbeatOutgoingMs,

      onConnect: () => {
        this.status = "connected";
        this.log("info", "✅ [STOMP] connected");
        this.bus.emit("open", null);
      },

      onStompError: (frame) => {
        this.status = "error";
        this.log("error", "❌ [STOMP] stomp error:", frame);
        this.bus.emit("error", frame);
      },

      onWebSocketError: (err) => {
        this.status = "error";
        this.log("error", "❌ [STOMP] ws error:", err);
        this.bus.emit("error", err);
      },

      onWebSocketClose: () => {
        // stompjs가 reconnectDelay > 0 이면 자동 재시도함
        this.status = "disconnected";
        this.log("warn", "⚠️ [STOMP] closed");
        this.bus.emit("close", null);
        // 구독은 연결이 끊기면 서버쪽에서 무효화됨. 재연결 후 재구독이 필요하면
        // 별도 레이어에서 관리(예: 아래 useStompSubscription에서 처리)
      },
    });

    this.client.activate();
  }

  /** 종료 */
  disconnect() {
    try {
      this.subs.forEach((s) => s.unsubscribe());
      this.subs.clear();
      this.client?.deactivate();
    } finally {
      this.client = null;
      this.status = "disconnected";
      this.bus.clear();
    }
  }
}

/** 싱글톤 인스턴스 */
export const stompService = new StompService();

/* ===========================
 * 리액트 훅 (선택)
 * =========================== */

/**
 * 앱 진입 시 1회 연결하고 전역 유지하고 싶다면 루트에서 호출:
 * useStompConnect({ url, token, ... })
 */
export function useStompConnect(opts: StompOptions) {
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    stompService.connect(opts);
    return () => {
      // 보통 앱 전체에서 유지하려면 언마운트시 disconnect 안 함
      // 필요시 주석 해제
      // stompService.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * 토픽을 구독하고, 재연결 시에도 자동 재구독해주는 훅
 * - logicalTopic: "chat/room/123", "user/queue/alerts", 또는 "/topic/raw"
 */
export function useStompSubscription(logicalTopic: string, handler: (payload: any) => void) {
  const topicRef = useRef(logicalTopic);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    let unsub: (() => void) | null = null;

    const trySub = () => {
      if (stompService.getState() === "connected") {
        unsub = stompService.subscribe(topicRef.current, (p) => handlerRef.current(p));
      }
    };

    // 최초 시도
    trySub();

    // 연결 이벤트에 반응하여 재구독
    const offOpen = stompService.on("open", () => {
      // 연결이 살아나면 재구독
      trySub();
    });

    // 안전하게 종료
    return () => {
      offOpen?.();
      if (unsub) unsub();
    };
  }, [logicalTopic]);
}
