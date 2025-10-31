// 채팅 관련 소켓 발신 서비스
import { stompManager } from '@/socket/stompClient';
import { ChatSendType } from './chatService';

export class ChatSocketService {
  static sendChatMessage(chatRoomSeq: number, sendMessage: ChatSendType): void {
    const mgr = stompManager();
    mgr.sendApp(`/newMessage/${chatRoomSeq}`, sendMessage);
  }
  static sendReadMessage(memberSeq: number, chatRoomSeq: number, chatSeq: number): void {
    const mgr = stompManager();
    mgr.sendApp(`/read/room/${chatRoomSeq}/${chatSeq}`, { memberSeq });
  }
}
