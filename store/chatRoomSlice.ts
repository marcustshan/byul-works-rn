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
    setNewMessageCountPlus(state, action: PayloadAction<number>) {
      state.newMessageCount = state.newMessageCount + action.payload;
    },
    setNewMessageCountMinus(state, action: PayloadAction<number>) {
      state.newMessageCount = state.newMessageCount - action.payload;
    },
    setNewMessageCountZero(state) {
      state.newMessageCount = 0;
    },
  },
});

export const { setChatRoomList, clearChatRoomList, setChatRoomLoading, setChatRoomError, setNewMessageCountPlus, setNewMessageCountMinus, setNewMessageCountZero } = chatRoomSlice.actions;
export default chatRoomSlice.reducer;