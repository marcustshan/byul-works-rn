// store/selectors/chatSelectors.ts
import { RootState } from '@/store';
import { createSelector } from '@reduxjs/toolkit';

export const selectMemberList = (s: RootState) => s.member.memberList;
export const selectMemberBySeq = (seq: number) => createSelector(
  [selectMemberList],
  (list) => list?.find(r => r.memberSeq === seq) ?? null
);
export const selectMemberProfileColor = (seq: number) => createSelector(
  [selectMemberList],
  (list) => list?.find(r => r.memberSeq === seq)?.profileColor ?? '#CCCCCC'
);

export const selectMyMemberSeq = (state: RootState) => state.auth.userInfo?.member?.memberSeq;