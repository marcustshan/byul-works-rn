import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MemberState {
  memberList: Member[] | null;
}

// 사용자 정보 인터페이스 (실제 API 응답에 맞게 수정)
export interface Member {
  memberSeq: number;
  id: string;
  name: string;
  email?: string;
  phone?: string;
  position?: string;
  sex?: string;
  address?: string;
  birthday?: string;
  department?: string;
  departmentLabel?: string;
  entryDate?: string;
  lastLoginDate?: string;
  resignationDate?: string | null;
  resigned: boolean;
  monthsPeriod?: number;
  guest: boolean;
  profileImgId?: string | null;
  profileColor?: string | null;
  authGroupSeq?: number;
  authorities?: any[];
  createId?: string;
  createDate?: string;
  createIp?: string;
  updateId?: string;
  updateDate?: string;
  updateIp?: string;
}

const initialState: MemberState = {
  memberList: null,
};

const memberSlice = createSlice({
  name: 'member',
  initialState,
  reducers: {
    setMemberList(state, action: PayloadAction<Member[] | null>) {
      state.memberList = action.payload;
    },
    clearMemberList(state) {
      state.memberList = null;
    },
  },
});

export const { setMemberList, clearMemberList } = memberSlice.actions;
export default memberSlice.reducer;