// components/GlobalStompBridge.tsx
import { ChatMessage, ChatRoom } from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { useStompConnect } from '@/hooks/useStomp';
import { stompManager } from '@/socket/stompClient';
import { updateChatRoom } from '@/store/chatRoomSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { Toast } from './common/Toast';

// 필요 시 주석 해제하고 본인 slice에 맞게 import
// import { setExistUnread } from '@/store/notificationSlice';
// import { addIncomingMessage } from '@/store/chatRoomSlice';

export default function GlobalStompBridge() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token as string | undefined);
  // ⚠️ chatRoomSlice 초기값에서 chatRoomList를 [] 로 두는 것을 전제로, 여기선 참조만 꺼냄
  const chatRooms = useAppSelector((s) => s.chatRoom.chatRoomList);

  // 연결 상태 플래그 (연결 이벤트에 반응해서 구독 effect 재실행)
  const [connected, setConnected] = useState(false);

  // 1) 루트에서 연결만 책임 (전역 훅은 간단하게)
  useStompConnect({
    token: token,
    onConnect: () => {
      console.log('[GlobalStompBridge] ✅ connected');
      setConnected(true);
    },
    onDisconnect: () => {
      console.log('[GlobalStompBridge] 🔌 disconnected');
      setConnected(false);
    },
    onError: (e) => {
      console.log('[GlobalStompBridge] ❌', e);
    },
  });

  // 모든 구독(정적 + 동적)을 한 번에 관리
  const subsRef = useRef<{ unsubscribe: () => void }[]>([]);

  useEffect(() => {

    const mgr = stompManager();
    // 토큰 없거나 아직 미연결이면 아무 것도 하지 않음
    if (!token || !connected || !mgr.isConnected()) return;

    // 이전 구독 전부 정리
    subsRef.current.forEach((s) => s?.unsubscribe?.());
    subsRef.current = [];

    // 일정 알림 구독
    subsRef.current.push(
      mgr.subscribe(`/user/queue/push/notification`, (msg) => {
        const body: any = JSON.parse(msg.body);
        Toast.show({
          title: '새로운 알림',
          message: body.content,
          type: 'info',
        });
      })
    );

    // ====== 방(동적) 구독들 ======
    chatRooms?.forEach((chatRoom: ChatRoom) => {
      subsRef.current.push(
        mgr.subscribe(`/topic/newMessage/${chatRoom.chatRoomSeq}`, (msg) => {
          const body: ChatMessage = JSON.parse(msg.body);
          try {
            // TODO - 현재 새로운 메시지가 온 채팅방 화면이면 다르게 처리해야 함
            const senderName = MemberService.getMemberName(body.memberSeq);
            const bodyContent = body.chatType.includes('I') ? '이미지' : body.chatType.includes('F') ? '파일' : body.chatType.includes('L') ? '링크' : body.content;
            Toast.show({
              title: '새로운 메시지',
              message: `${senderName} - ${bodyContent}`,
              type: 'newMessage',
              onPress: () => {
                Alert.alert(`${body.chatRoomSeq} 방으로 이동해야함.`);
              },
            });

            dispatch(updateChatRoom({
              chatRoomSeq: body.chatRoomSeq,
              content: body.content,
              createDate: body.createDate,
              memberSeq: body.memberSeq,
              incUnread: true,
            }));
          } catch {}
        })
      );
    });

    // 의존성 바뀌면 전부 해제 후 재등록
    return () => {
      subsRef.current.forEach((s) => s?.unsubscribe?.());
      subsRef.current = [];
    };
    // 연결 상태, 토큰, 방 목록이 바뀔 때만
  }, [token, connected, chatRooms, dispatch]);

  return null;
}
