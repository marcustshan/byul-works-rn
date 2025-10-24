import { ChatService } from '@/api/chat/chatService';
import { setChatRoomError, setChatRoomList, setChatRoomLoading } from '@/store/chatRoomSlice';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const loadChatRooms = createAsyncThunk(
  'chatRoom/loadChatRooms',
  async (_, { dispatch }) => {
    try {
      dispatch(setChatRoomLoading(true));
      dispatch(setChatRoomError(null));

      const chatRooms = await ChatService.getMyChatRooms();
      dispatch(setChatRoomList(chatRooms));

      return chatRooms;
    } catch (error: any) {
      const errorMessage = error?.message || '채팅방 목록을 불러오는데 실패했습니다.';
      dispatch(setChatRoomError(errorMessage));
      throw error;
    } finally {
      dispatch(setChatRoomLoading(false));
    }
  }
);
