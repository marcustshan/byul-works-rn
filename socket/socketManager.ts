// src/socket/socketManager.ts
import { sendChat as _sendChat, stompService } from "@/socket/stompClient";
import { store } from "@/store";

/**
 * 사용 목적
 * - 전역 연결/전역 구독/재연결·재구독을 한 곳에서 관리
 * - Redux slice 없이도 작동 (옵션으로 dispatch/handlers 주입 가능)
 * - 방 구독도 여기에 모아서 관리(화면에서 요청만)
 */

type Logger = {
  debug?: (...args: any[]) => void;
  info?: (...args: any[]) => void;
  warn?: (...args: any[]) => void;
  error?: (...args: any[]) => void;
};

type SocketManagerHandlers = {
  // 전역(개인 큐) 알림
  onChatInbox?: (evt: any) => void;      // { chatRoomSeq, msgId, textPreview, sender, unreadCount, ... }
  onScheduleAlert?: (evt: any) => void;  // 일정 관련 알림
  onError?: (e: any) => void;
  onOpen?: () => void;
  onClose?: () => void;

  // 방 스트림(옵션: 화면 대신 매니저에서 직접 받길 원할 때)
  onRoomMessage?: (chatRoomSeq: string | number, msg: any) => void;
};

export type StartArgs = {
  url: string;                  // SockJS endpoint, e.g. https://api.example.com/ws
  token: string | (() => string | Promise<string>);
  userId?: string | number;

  // STOMP 경로 프리픽스 (Spring Boot 설정과 일치)
  paths?: {
    appPrefix?: string;         // default: /socket/works/app
    topicPrefix?: string;       // default: /topic
    userQueuePrefix?: string;   // default: /user/queue
  };

  reconnectDelayMs?: number;    // default: 3000
  heartbeatIncomingMs?: number; // default: 10000
  heartbeatOutgoingMs?: number; // default: 10000

  logger?: Logger;

  // 선택: Redux dispatch 등을 넘겨서 내부에서 바로 store 반영 가능
  //   예) (action) => store.dispatch(action)
  dispatch?: (action: any) => void;

  // 선택: 매니저 외부 콜백들
  handlers?: SocketManagerHandlers;
};

class SocketManager {
  private started = false;
  private unsubGlobals: Array<() => void> = [];
  private roomSubs = new Map<string, () => void>(); // key = chatRoomSeq(string)
  private lastStartArgs?: StartArgs;

  async start(args: StartArgs) {
    // 중복 시작 방지
    if (this.started) return;
    this.started = true;
    this.lastStartArgs = args;

    const {
      url,
      token,
      reconnectDelayMs = 3000,
      heartbeatIncomingMs = 10000,
      heartbeatOutgoingMs = 10000,
      paths,
      logger,
      handlers,
    } = args;

    // 1) 연결
    await stompService.connect({
      url,
      token,
      reconnectDelayMs,
      heartbeatIncomingMs,
      heartbeatOutgoingMs,
      paths,
      logger,
    });

    // 2) 연결 상태 이벤트 → 핸들러 호출
    stompService.on("open", () => {
      handlers?.onOpen?.();
      // 재연결되면 전역/방 구독을 복구
      this.resubscribeAll();
    });
    stompService.on("close", () => handlers?.onClose?.());
    stompService.on("error", (e) => handlers?.onError?.(e));

    // 3) 전역(개인 큐) 구독 등록
    this.attachGlobalSubscriptions();
  }

  stop() {
    try {
      this.unsubGlobals.forEach((u) => u());
      this.unsubGlobals = [];
      // 방 구독 정리
      this.roomSubs.forEach((u) => u());
      this.roomSubs.clear();
    } finally {
      stompService.disconnect();
      this.started = false;
      this.lastStartArgs = undefined;
    }
  }

  /** 전역(개인 큐 대신) 내 방 전체를 선구독 */
  private attachGlobalSubscriptions() {
    // 1) 스토어에서 방 목록 안전하게 가져오기
    const state = store.getState();
    const chatRoomList: Array<{ chatRoomSeq: number | string }> =
      state?.chatRoom?.chatRoomList ?? [];

    if (!Array.isArray(chatRoomList) || chatRoomList.length === 0) return;

    // 2) 각 방 구독 (subscribeRoom 안에서 중복 방지됨)
    for (const room of chatRoomList) {
      const seq = room?.chatRoomSeq;
      if (seq == null) continue;

      this.subscribeRoom(seq, (msg) => {
        // 전역에서 알림처럼 쓰고 싶다면 inbox 핸들러로 흘려보내기
        // (방 화면에선 onRoomMessage로 직접 처리해도 OK)
        this.lastStartArgs?.handlers?.onChatInbox?.(msg);
      });
    }
  }


  /** 방 스트림 구독: 화면에서 필요할 때 호출 (여기서 관리하면 재연결 시 자동 복구) */
  subscribeRoom(chatRoomSeq: string | number, handler?: (msg: any) => void) {
    const key = String(chatRoomSeq);
    // 중복 방지
    if (this.roomSubs.has(key)) return this.roomSubs.get(key)!;

    /*
    /topic/newMessage/${chatRoomSeq} - 새 메시지
    /topic/joinRoom/${chatRoomSeq} - 방 입장
    /topic/readRoom/${chatRoomSeq} - 읽음 처리
    /topic/delete/${chatRoomSeq} - 메시지 삭제
    /topic/new/representation/${chatRoomSeq} - 공지
    */

    const unsub = stompService.subscribe(`newMessage/${chatRoomSeq}`, (msg) => {
      // 화면 콜백 우선, 없으면 매니저 핸들러로
      handler?.(msg) ?? this.lastStartArgs?.handlers?.onRoomMessage?.(chatRoomSeq, msg);
    });

    this.roomSubs.set(key, unsub);
    // 언구독 함수를 반환
    return () => this.unsubscribeRoom(chatRoomSeq);
  }

  unsubscribeRoom(chatRoomSeq: string | number) {
    const key = String(chatRoomSeq);
    const off = this.roomSubs.get(key);
    if (off) {
      try { off(); } catch {}
      this.roomSubs.delete(key);
    }
  }

  /** 재연결 시 복구 */
  private resubscribeAll() {
    // 1) 기존 방 목록 백업
    const prevKeys = Array.from(this.roomSubs.keys());

    // 2) 기존 구독 모두 해제
    this.roomSubs.forEach((off) => { try { off(); } catch {} });
    this.roomSubs.clear();

    // 3) 전역(개인 큐 또는 전체 방 선구독) 복구
    this.attachGlobalSubscriptions();

    // 4) (선택) 기존에 화면에서 수동 구독했던 방들도 다시 복구
    for (const key of prevKeys) {
      const seq = isNaN(+key) ? key : +key;
      this.subscribeRoom(seq);
    }
  }

  /** 채팅 보내기(편의) */
  sendChat(chatRoomSeq: string | number, text: string) {
    return _sendChat(chatRoomSeq, text);
  }

  /** 임의 publish(편의) */
  publish(dest: string, body: any) {
    return stompService.publish(dest, body);
  }

  get state() {
    return stompService.getState();
  }

  get isStarted() {
    return this.started;
  }
}

export const socketManager = new SocketManager();
export default socketManager;
