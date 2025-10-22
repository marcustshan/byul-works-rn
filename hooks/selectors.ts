import { RootState } from '@/store';

// 채팅방 관련 셀렉터
export const selectChatRooms = (state: RootState) => state.chatRoom.chatRoomList || [];
export const selectChatLoading = (state: RootState) => state.chatRoom.loading || false;
export const selectChatError = (state: RootState) => state.chatRoom.error || null;

// 인증 관련 셀렉터
export const selectAuthToken = (state: RootState) => state.auth.token;
export const selectUserInfo = (state: RootState) => state.auth.userInfo;
export const selectMember = (state: RootState) => state.auth.userInfo?.member;

// 멤버 관련 셀렉터
export const selectMemberList = (state: RootState) => state.member.memberList || [];

// UI 관련 셀렉터
export const selectUILoading = (state: RootState) => state.ui.loading || false;
export const selectUIError = (state: RootState) => state.ui.error || null;
