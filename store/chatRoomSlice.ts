import { ChatRoom } from '@/api/chat/chatService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatRoomState {
  chatRoomList: ChatRoom[] | null;
  loading: boolean;
  error: string | null;
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
    setChatRoomLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setChatRoomError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
  },
});

export const { setChatRoomList, clearChatRoomList, setChatRoomLoading, setChatRoomError } = chatRoomSlice.actions;
export default chatRoomSlice.reducer;