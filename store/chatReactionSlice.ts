import { ChatReaction } from '@/api/chat/chatService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ChatReactionState {
  chatReactionList: ChatReaction[] | null;
}

const initialState: ChatReactionState = {
  chatReactionList: null,
};

const chatReactionSlice = createSlice({
  name: 'chatReaction',
  initialState,
  reducers: {
    setChatReactionList(state, action: PayloadAction<ChatReaction[] | null>) {
      state.chatReactionList = action.payload;
    },
  },
});

export const { setChatReactionList } = chatReactionSlice.actions;

export default chatReactionSlice.reducer;