// src/socket/hooks/useStomp.ts
import { stompManager } from '@/socket/stompClient';
import { useEffect, useRef } from 'react';

type UseStompOptions = {
  token?: string;
  extraHeaders?: Record<string, any>;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (e: any) => void;
};

/**
 * 마운트 시 연결하고 언마운트 시 해제하는 최소 훅.
 * 화면 단에서 여러 번 부르면 중복 연결이 될 수 있으니,
 * 보통 App 루트나 상위 Provider에서 1회만 호출하는 것을 권장.
 */
export function useStompConnect(opts: UseStompOptions = {}) {
  const { token, extraHeaders, onConnect, onDisconnect, onError } = opts;
  const connectedOnce = useRef(false);

  useEffect(() => {
    const mgr = stompManager();
    let cancelled = false;

    (async () => {
      try {
        if (token) mgr.setToken(token);
        await mgr.connect({ token, extraHeaders, onConnect: () => {
          if (!cancelled) {
            connectedOnce.current = true;
            onConnect?.();
          }
        }, onDisconnect, onError });
      } catch (e) {
        onError?.(e);
      }
    })();

    return () => {
      cancelled = true;
      // 필요 시 여기서 disconnect() 하지만,
      // 앱 전역 연결 유지하려면 해제하지 않는 전략도 가능.
      // return mgr.disconnect();
    };
    // token/extraHeaders 변경 시 재연결이 필요하면 deps에 포함
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * 특정 destination을 구독하고 메시지를 받는 훅
 */
export function useStompSubscription(
  destination: string,
  onMessage: (body: any, raw: any) => void,
  deps: any[] = []
) {
  useEffect(() => {
    const mgr = stompManager();
    if (!mgr.isConnected()) return; // 아직 연결 전이면 구독 생략(상위에서 연결 완료 후 다시 렌더되면 구독됨)

    const sub = mgr.subscribe(destination, (msg) => {
      try {
        const body = msg.body ? JSON.parse(msg.body) : null;
        onMessage(body, msg);
      } catch {
        onMessage(msg.body, msg);
      }
    });

    return () => {
      sub && mgr.unsubscribe(sub);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, ...deps]);
}
