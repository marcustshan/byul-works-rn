import { ChatRoom } from '@/api/chat/chatService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatRoomState {
  chatRoomList: ChatRoom[] | null;
  loading: boolean;
  error: string | null;
  newMessageCount: number;
}

const initialState: ChatRoomState = {
  chatRoomList: null,
  loading: false,
  error: null,
  newMessageCount: 0,
};

const chatRoomSlice = createSlice({
  name: 'chatRoom',
  initialState,
  reducers: {
    setChatRoomList(state, action: PayloadAction<ChatRoom[] | null>) {
      state.chatRoomList = action.payload;
      state.loading = false;
      state.error = null;
    },
    clearChatRoomList(state) {
      state.chatRoomList = null;
      state.loading = false;
      state.error = null;
    },
    setChatRoomLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setChatRoomError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    setNewMessageCount(state, action: PayloadAction<number>) {
      state.newMessageCount = action.payload;
    },
    setNewMessageCountPlus(state, action: PayloadAction<number>) {
      state.newMessageCount = state.newMessageCount + action.payload;
    },
    setNewMessageCountMinus(state, action: PayloadAction<number>) {
      state.newMessageCount = state.newMessageCount - action.payload;
    },
    setNewMessageCountZero(state) {
      state.newMessageCount = 0;
    },
    /* ✅ 개별 채팅방 갱신용 액션 추가 */
    updateChatRoom(
      state,
      action: PayloadAction<{
        chatRoomSeq: number;
        content?: string;
        createDate?: string;
        memberSeq?: number;
        incUnread?: boolean;
      }>
    ) {
      const { chatRoomSeq, content, createDate, memberSeq, incUnread = true } =
        action.payload;
      const room = state.chatRoomList?.find(
        (r) => r.chatRoomSeq === chatRoomSeq
      );
      if (!room) return;
      // 프리뷰 / 보낸 시간 / 마지막 보낸 멤버 갱신
      if (content !== undefined) room.lastInsertMsg = content;
      if (createDate !== undefined) room.lastInsertDate = createDate;
      if (memberSeq !== undefined) room.lastMsgMemberSeq = memberSeq;
      // newCnt 증가
      if (incUnread) room.newCnt = (room.newCnt ?? 0) + 1;
    },
  },
});

export const {
  setChatRoomList,
  clearChatRoomList,
  setChatRoomLoading,
  setChatRoomError,
  setNewMessageCount,
  setNewMessageCountPlus,
  setNewMessageCountMinus,
  setNewMessageCountZero,
  updateChatRoom,
} = chatRoomSlice.actions;
export default chatRoomSlice.reducer;