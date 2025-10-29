// 채팅 관련 소켓 발신 서비스
import { stompManager } from '@/socket/stompClient';
import { ChatSendType } from './chatService';

export class ChatSocketService {
  static sendChatMessage(chatRoomSeq: number, sendMessage: ChatSendType): void {
    const mgr = stompManager();
    console.log('sendChatMessage', sendMessage);
    mgr.sendApp(`/newMessage/${chatRoomSeq}`, sendMessage);
  }
}
