import { router } from 'expo-router';

export interface NavigateToChatRoomParams {
  chatRoomSeq: number;
  chatRoomName: string;
  fromMenu?: boolean;
}

export const navigateToChatRoom = async (params: NavigateToChatRoomParams) => {
  try {
    // 채팅방 상세 페이지로 이동
    // 실제 라우팅 구조에 맞게 수정 필요
    router.push({
      pathname: '/chat/[chatRoomSeq]',
      params: {
        chatRoomSeq: params.chatRoomSeq.toString(),
        chatRoomName: params.chatRoomName,
        fromMenu: params.fromMenu ? 'true' : 'false',
      },
    });
  } catch (error) {
    console.error('채팅방 네비게이션 실패:', error);
    throw error;
  }
};
