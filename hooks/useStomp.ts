// hooks/useStomp.ts
import { stompManager } from '@/socket/stompClient';
import { useEffect, useRef } from 'react';

type UseStompOptions = {
  token?: string;
  extraHeaders?: Record<string, any>;
  transport?: 'auto' | 'sockjs' | 'raw';   // ✅ 추가 (선택)
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (e: any) => void;
  disconnectWhenNoToken?: boolean;
};

export function useStompConnect(opts: UseStompOptions = {}) {
  const {
    token,
    extraHeaders,
    transport = 'auto',                  // ✅ 기본값
    onConnect,
    onDisconnect,
    onError,
    disconnectWhenNoToken = true,
  } = opts;

  // ✅ 토큰 변경 감지용
  const lastTokenRef = useRef<string | undefined>(undefined);

  // ✅ 콜백들을 ref에 고정해 불필요한 재실행 방지
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);

  onConnectRef.current = onConnect;
  onDisconnectRef.current = onDisconnect;
  onErrorRef.current = onError;

  useEffect(() => {
    const mgr = stompManager();

    // 토큰 없음: 필요 시 연결 해제
    if (!token) {
      if (disconnectWhenNoToken && mgr.isConnected()) {
        mgr.disconnect().catch(() => {});
        onDisconnectRef.current?.();
      }
      return;
    }

    // 토큰 갱신 반영
    const tokenChanged = lastTokenRef.current !== token;
    lastTokenRef.current = token;
    mgr.setToken(token);

    (async () => {
      try {
        if (!mgr.isConnected() || tokenChanged) {
          await mgr.connect({
            token,
            extraHeaders,
            transport, // ✅ 전달
            onConnect: () => onConnectRef.current?.(),
            onDisconnect: () => onDisconnectRef.current?.(),
            onError: (e) => onErrorRef.current?.(e),
          });
        }
      } catch (e) {
        onErrorRef.current?.(e as any);
      }
    })();
    // ✅ deps에서 콜백 제외: token/extraHeaders/transport만
  }, [token, extraHeaders, transport, disconnectWhenNoToken]);
}
