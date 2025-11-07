import api, { ApiErrorShape } from '@/api/api';

// 채팅방 타입
export interface ChatRoom {
  chatRoomImgId: string | null;
  chatRoomName: string;
  chatRoomSeq: number;
  createDate: string;
  fixed: boolean;
  joinCnt: number;
  joiningMemberSeqList: number[];
  lastInsertDate: string;
  lastInsertMsg: string;
  lastMsgMemberSeq: number;
  lastMsgSeq: number;
  memberSeq: number;
  newCnt: number;
  notifyType: string;
  chatType?: 'M' | 'I' | 'F' | 'L'; // M: 메시지, I: 이미지, F: 파일, L: 링크
}

// 채팅방 참여 응답 타입
export interface ChatJoinResponse {
  chatSeq: number;
  memberSeq: number;
  send: boolean;
}

// 채팅 Reaction 타입
export interface ChatReaction {
  chatReactionSeq: number;
  chatSeq: number;
  memberSeq: number;
  reaction: string;
}

// 채팅 메시지 타입
export interface ChatMessage {
  chatSeq: number;
  chatRoomSeq: number;
  chatRoomName: string | null;
  memberSeq: number;
  memberName: string;
  profileColor: string | null;
  chatType: string;
  content: string;
  emojiPath: string | null;
  fileSeq: number | null;
  fileName: string | null;
  fileSize: string | null;
  parentChatSeq: number | null;
  parentChat: ChatMessage | null;
  taskCardSeq: number | null;
  deleted: boolean;
  createDate: string;
  readMembers: number[];
  chatReactions: ChatReaction[];
}

// 채팅 메시지 페이지 결과 타입
export interface ChatPageResult {
  content: ChatMessage[];
  hasNext: boolean;
  hasPrev: boolean;
  minChatSeq: number;
  maxChatSeq: number;
}

// 채팅 메시지 전송용 타입
export interface ChatSendType {
  content: string;
  memberName: string;
  chatRoomName: string;
  chatRoomSeq: number;
  fileSeq?: number;
  chatType: 'M' | 'I' | 'F' | 'L' | 'E'; // M: 메시지, I: 이미지, F: 파일, L: 링크, E: 이모티콘
  parentChat?: ChatMessage | null; // 답장인 경우 부모 메시지 전체 객체
  emojiPath?: string | null; // 이모티콘 경로
}

// 채팅 메시지 페이지 요청 타입
export interface ChatPageRequest {
  size?: number;
  hasPrev?: boolean;
  hasNext?: boolean;
  prev?: boolean;
  baseChatSeq?: number;
  minChatSeq?: number;
  maxChatSeq?: number;
  includeBase?: boolean;
}

export interface ChatLinkOpenGraph {
  description: string;
  title: string;
  imageUrl: string;
}

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type ChatError = ApiErrorShape;

export class ChatService {
  /**
   * 내가 속한 채팅방 목록을 가져옵니다.
   * 소켓 연결 상태와 독립적으로 동작합니다.
   */
  static async getMyChatRooms(): Promise<ChatRoom[]> {
    try {
      const { data } = await api.get<ChatRoom[]>('/chat/room/myRooms');
      return data || [];
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * 채팅방에 참여합니다.
   * @param chatRoomSeq 채팅방 번호
   * @returns 참여 결과
   */
  public static async joinRoom(chatRoomSeq: number): Promise<ChatJoinResponse> {
    try {
      const { data } = await api.post<ChatJoinResponse>(`/chat/room/join/${chatRoomSeq}`);
      
      // POST 요청의 경우 응답이 비어있을 수 있음
      // 실제 응답이 있는 경우에만 반환, 없는 경우 기본값 반환
      if (data && data.chatSeq) {
        return data;
      } else {
        // 기본 응답 반환 (실제로는 서버에서 성공 상태코드만 반환)
        return {
          chatSeq: 0,
          memberSeq: 0,
          send: false
        };
      }
    } catch (error: any) {
      console.error('💬 채팅방 참여 실패:', error);
      throw error;
    }
  }

  /**
   * 특정 메시지를 읽은 사용자 목록을 조회합니다.
   * @param chatRoomSeq 채팅방 번호
   * @param chatSeq 메시지 번호
   * @returns 읽은 사용자 목록
   */
  public static async getReadMembers(chatRoomSeq: number, chatSeq: number): Promise<number[]> {
    try {
      const { data } = await api.get<number[]>(`/chat/room/readMembers/${chatRoomSeq}/${chatSeq}`);
      return data || [];
    } catch (error: any) {
      console.error('👥 읽은 사용자 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅방 참여자 목록을 조회합니다.
   * @param chatRoomSeq 채팅방 번호
   * @returns 채팅방 참여자 memberSeq 목록
   */
  public static async getRoomMembers(chatRoomSeq: number): Promise<number[]> {
    try {
      const { data } = await api.get<number[]>(`/chat/room/members/${chatRoomSeq}`);
      return data || [];
    } catch (error: any) {
      console.error('👥 채팅방 참여자 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅방의 메시지 목록을 조회합니다.
   * @param chatRoomSeq 채팅방 번호
   * @param pageRequest 페이징 요청 정보
   * @returns 메시지 목록
   */
  public static async getRoomMessages(chatRoomSeq: number, pageRequest: ChatPageRequest = {}): Promise<ChatPageResult> {
    try {
      // 기본값 설정
      const defaultParams = {
        size: 20,
        hasPrev: false,
        hasNext: false,
        prev: false,
        baseChatSeq: 0,
        minChatSeq: 0,
        maxChatSeq: 0,
        includeBase: false,
        ...pageRequest
      };

      const { data } = await api.get<ChatPageResult>(`/chat/room/messages/${chatRoomSeq}`, {
        params: defaultParams
      });
      
      return data;
    } catch (error: any) {
      console.error('💬 채팅 메시지 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 메시지에서 맨션된 멤버들을 추출합니다.
   * @param content 채팅 메시지 내용 (HTML)
   * @returns 맨션된 멤버의 memberSeq 배열
   */
  public static extractMentionedMembers(content: string): number[] {
    const mentionPattern = /<m contenteditable="false" data-member-seq="([0-9]+)">(@[a-zA-Zㄱ-ㅎ가-힣]+)<\/m>/g;
    const mentionedMembers: number[] = [];
    
    let match;
    while ((match = mentionPattern.exec(content)) !== null) {
      mentionedMembers.push(parseInt(match[1]));
    }
    
    return mentionedMembers;
  }

  /**
   * 채팅 메시지에 맨션이 포함되어 있는지 확인합니다.
   * @param content 채팅 메시지 내용 (HTML)
   * @returns 맨션 포함 여부
   */
  public static hasMentions(content: string): boolean {
    return this.extractMentionedMembers(content).length > 0;
  }

  /**
   * 특정 멤버가 채팅 메시지에서 맨션되었는지 확인합니다.
   * @param content 채팅 메시지 내용 (HTML)
   * @param memberSeq 확인할 멤버 번호
   * @returns 맨션 여부
   */
  public static isMemberMentioned(content: string, memberSeq: number): boolean {
    const mentionedMembers = this.extractMentionedMembers(content);
    return mentionedMembers.includes(memberSeq) || mentionedMembers.includes(0); // 0은 @All
  }

  /**
   * 채팅 검색
   * @param chatRoomSeq 채팅방 번호
   * @param keyword 검색 키워드
   * @returns 검색된 채팅 메시지 목록
   */
  public static async searchChat(chatRoomSeq: number, keyword: string): Promise<ChatMessage[]> {
    try {      
      const { data } = await api.get<ChatMessage[]>(`/chat/search`, {
        params: {
          chatRoomSeq: chatRoomSeq,
          keyword: keyword.trim()
          // memberSeq는 백엔드에서 자동으로 설정됨
        }
      });

      return data;
    } catch (error: any) {
      console.error('🔍 채팅 검색 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 리액션 목록을 조회합니다.
   * @returns 채팅 리액션 목록
   */
  public static async getReactionList(): Promise<ChatReaction[]> {
    try {
      const { data } = await api.get<ChatReaction[]>(`/chat/reactions`);
      return data;
    } catch (error: any) {
      console.error('👍 채팅 리액션 목록 조회 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 메시지에 리액션을 설정합니다.
   * @param message 채팅 메시지
   * @param reaction 리액션
   * @returns 성공 여부
   */
  public static async setMessageReaction(message: ChatMessage, reaction: string): Promise<ChatReaction> {
    try {
      console.log('setMessageReaction', message.chatSeq, reaction);
      const { data } = await api.post<ChatReaction>(`/chat/reactions`, {
        chatSeq: message.chatSeq,
        reaction: reaction
      });

      return data;
    } catch (error: any) {
      console.error('👍 채팅 리액션 설정 실패:', error);
      throw error;
    }
  }

  /**
   * 채팅 메시지에 리액션을 삭제합니다.
   * @param chatSeq 채팅 메시지 시퀀스
   * @returns 성공 여부
   */
  public static async deleteMessageReaction(chatSeq: number): Promise<ChatReaction> {
    try {
      const { data } = await api.delete<ChatReaction>(`/chat/reactions/${chatSeq}`);
      return data;
    } catch (error: any) {
      console.error('👍 채팅 리액션 삭제 실패:', error);
      throw error;
    }
  }

  public static async getLinkOpenGraph(url: string): Promise<ChatLinkOpenGraph> {
    try {
      const { data } = await api.get<ChatLinkOpenGraph>(`/crawling/openGraph`, {
        params: { url: url }
      });

      return data;
    } catch (error: any) {
      console.error('🔍 링크 오픈그래프 조회 실패:', error);
      throw error;
    }
  }
}

export default ChatService;
