// store/chatRoomSlice.ts
import { ChatRoom } from '@/api/chat/chatService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatRoomState {
  chatRoomList: ChatRoom[] | null;
  loading: boolean;
  error: string | null;
  // ❌ newMessageCount 삭제
}

const initialState: ChatRoomState = {
  chatRoomList: null,
  loading: false,
  error: null,
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
    clearChatRoomUnread(state, action: PayloadAction<number>) {
      const room = state.chatRoomList?.find(r => r.chatRoomSeq === action.payload);
      if (room) room.newCnt = 0; // ✅ 전역 카운트 조작 없음
    },
    setChatRoomLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setChatRoomError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
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
      const { chatRoomSeq, content, createDate, memberSeq, incUnread = true } = action.payload;
      const room = state.chatRoomList?.find(r => r.chatRoomSeq === chatRoomSeq);
      if (!room) return;
      if (content !== undefined) room.lastInsertMsg = content;
      if (createDate !== undefined) room.lastInsertDate = createDate;
      if (memberSeq !== undefined) room.lastMsgMemberSeq = memberSeq;
      if (incUnread) room.newCnt = (room.newCnt ?? 0) + 1; // ✅ 방별만 조작
    },
  },
});

export const {
  setChatRoomList,
  clearChatRoomList,
  setChatRoomLoading,
  setChatRoomError,
  updateChatRoom,
  clearChatRoomUnread,
} = chatRoomSlice.actions;

export default chatRoomSlice.reducer;
