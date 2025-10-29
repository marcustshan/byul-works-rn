// store/selectors/chatSelectors.ts
import { RootState } from '@/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectChatRoomList = (s: RootState) => s.chatRoom.chatRoomList;

export const selectTotalUnread = createSelector(
  [selectChatRoomList],
  (list) => (list ?? []).reduce((sum, r) => sum + (r.newCnt ?? 0), 0)
);
