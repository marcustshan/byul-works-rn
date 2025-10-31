// components/GlobalStompBridge.tsx
import type { ChatMessage, ChatRoom } from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { useStompConnect } from '@/hooks/useStomp';
import { stompManager } from '@/socket/stompClient';
import { updateChatRoom } from '@/store/chatRoomSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Toast } from './common/Toast';

export default function GlobalStompBridge() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token as string | undefined);
  const chatRooms = useAppSelector((s) => s.chatRoom.chatRoomList);
  const activeChatRoomSeq = useAppSelector((s) => s.chatRoom.activeChatRoomSeq);

  const [connected, setConnected] = useState(false);

  // ✅ 전역/개인 큐 구독(단일)
  const globalSubsRef = useRef<{ unsubscribe: () => void }[]>([]);
  // ✅ 방별 구독 Map: roomSeq -> subscription
  const roomSubsRef = useRef<Map<number, { unsubscribe: () => void }>>(new Map());

  // 소켓 연결
  useStompConnect({
    token,
    onConnect: () => setConnected(true),
    onDisconnect: () => setConnected(false),
    onError: (e) => console.log('[GlobalStompBridge] ❌', e),
  });

  // 개인 큐(전역)만 고정 구독
  useEffect(() => {
    const mgr = stompManager();
    if (!token || !connected || !mgr.isConnected()) return;

    // 기존 정리
    globalSubsRef.current.forEach((s) => s?.unsubscribe?.());
    globalSubsRef.current = [];

    // 예: 일정/인박스 등
    globalSubsRef.current.push(
      mgr.subscribe(`/user/queue/push/notification`, (msg) => {
        try {
          const body = JSON.parse(msg.body);
          Toast.show({ title: '새로운 알림', message: body.content, type: 'info' });
        } catch {}
      })
    );

    return () => {
      globalSubsRef.current.forEach((s) => s?.unsubscribe?.());
      globalSubsRef.current = [];
    };
  }, [token, connected]);

  // ✅ 방별 구독: diff 기반 (활성 방 제외)
  useEffect(() => {
    const mgr = stompManager();
    if (!token || !connected || !mgr.isConnected()) return;

    // 현재 유지해야 하는 방들(활성 방 제외)
    const targetRooms = new Set<number>(
      (chatRooms || [])
        .map((r: ChatRoom) => r.chatRoomSeq)
        .filter((seq) => seq !== activeChatRoomSeq)
    );

    // 1) 더 이상 필요 없는 구독 해제
    for (const [seq, sub] of roomSubsRef.current.entries()) {
      if (!targetRooms.has(seq)) {
        sub.unsubscribe();
        roomSubsRef.current.delete(seq);
      }
    }

    // 2) 새로 필요한 구독 추가
    for (const seq of targetRooms) {
      if (roomSubsRef.current.has(seq)) continue; // 이미 있음
      const sub = mgr.subscribe(`/topic/newMessage/${seq}`, (frame) => {
        let body: ChatMessage | null = null;
        try {
          body = JSON.parse(frame.body);
        } catch { return; }
        if (!body) return;

        // 👉 토스트/프리뷰만: 활성 방이 아니므로 unread 증가
        // (본인 메시지는 토스트 제외)
        const isMine = !!body.memberSeq && body.memberSeq === (/* 현재 사용자 seq */ 0);
        const recentEnough =
          body.createDate ? Date.now() - new Date(body.createDate).getTime() < 1000 * 60 * 5 : true;
        const appInForeground = AppState.currentState === 'active';

        if (!isMine && recentEnough && appInForeground) {
          const senderName = MemberService.getMemberName(body.memberSeq);
          const bodyContent = body.chatType?.includes?.('I')
            ? '이미지'
            : body.chatType?.includes?.('F')
            ? '파일'
            : body.chatType?.includes?.('L')
            ? '링크'
            : body.content;
          Toast.show({
            title: '새로운 메시지',
            message: `${senderName} - ${bodyContent}`,
            type: 'newMessage',
            onPress: () => {
              router.push({
                pathname: '/chat/[chatRoomSeq]',
                params: {
                  chatRoomSeq: body.chatRoomSeq.toString(),
                  name: body.chatRoomName,
                },
              });
              Toast.hide();
            },
          });
        }

        dispatch(
          updateChatRoom({
            chatRoomSeq: body.chatRoomSeq,
            content: body.content,
            createDate: body.createDate,
            memberSeq: body.memberSeq,
            incUnread: true,
          })
        );
      });

      roomSubsRef.current.set(seq, sub);
    }

    // 클린업: 여기선 전체 해제하지 않음(필요한 것만 유지)
    return () => {
      // 의존성 변화 시 diff로 관리하므로 여기서 일괄 해제는 금지
      // (컴포넌트 언마운트 때만 전부 정리하려면 아래 별도 effect 사용)
    };
  }, [token, connected, chatRooms, activeChatRoomSeq]);

  // 언마운트 시 전부 정리
  useEffect(() => {
    return () => {
      globalSubsRef.current.forEach((s) => s?.unsubscribe?.());
      roomSubsRef.current.forEach((s) => s?.unsubscribe?.());
      globalSubsRef.current = [];
      roomSubsRef.current.clear();
    };
  }, []);

  return null;
}
