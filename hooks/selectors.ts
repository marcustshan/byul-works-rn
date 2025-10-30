import { RootState } from '@/store';

// 인증 관련 셀렉터
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectUserInfo = (state: RootState) => state.auth.userInfo;
export const selectMember = (state: RootState) => state.auth.userInfo?.member;

// UI 관련 셀렉터
export const selectUILoading = (state: RootState) => state.ui.loading || false;
export const selectUIError = (state: RootState) => state.ui.error || null;

// 채팅방 관련 셀렉터
export const selectChatRoomList = (s: RootState) => s.chatRoom.chatRoomList;
export const selectChatRoomLoading = (s: RootState) => s.chatRoom.loading;
export const selectChatRoomError = (s: RootState) => s.chatRoom.error;
