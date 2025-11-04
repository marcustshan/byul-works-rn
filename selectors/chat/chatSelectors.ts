// store/selectors/chatSelectors.ts
import { RootState } from '@/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectChatRoomList = (s: RootState) => s.chatRoom.chatRoomList;

export const selectChatRoomBySeq = (seq: number) => createSelector(
  [selectChatRoomList],
  (list) => list?.find(r => r.chatRoomSeq === seq) ?? null
);

export const selectTotalUnread = createSelector(
  [selectChatRoomList],
  (list) => (list ?? []).reduce((sum, r) => sum + (r.newCnt ?? 0), 0)
);

export const selectCurrentChatRoomSeq = (s: RootState) => s.chatRoom.currentChatRoomSeq;

export const selectChatReactionList = (s: RootState) => s.chatReaction.chatReactionList;