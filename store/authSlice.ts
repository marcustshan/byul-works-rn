import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface AuthState {
  token: string | null;
  userInfo: UserInfo | null;
}

export interface UserInfo {
  accessToken: string;
  member?: {
    address: string;
    authGroupSeq: number;
    authorities: string[];
    birthday: string;
    createDate: string;
    createId: string;
    createIp: string;
    department: string | null;
    departmentLabel: string | null;
    email: string;
    entryDate: string;
    guest: boolean;
    id: string;
    lastLoginDate: string;
    memberSeq: number;
    monthsPeriod: number;
    name: string;
    phone: string;
    position: string;
    profileColor: string;
    profileImgId: string | null;
    resignationDate: string | null;
    resigned: boolean;
    sex: string;
    updateDate: string;
    updateId: string;
    updateIp: string;
  };
}

const initialState: AuthState = {
  token: null,
  userInfo: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string | null>) {
      state.token = action.payload;
    },
    clearAuth(state) {
      state.token = null;
      state.userInfo = null;
    },
    setUserInfo(state, action: PayloadAction<UserInfo | null>) {
      state.userInfo = action.payload;
    },
    clearUserInfo(state) {
      state.userInfo = null;
      state.token = null;
    },
  },
});

export const { setToken, clearAuth, setUserInfo, clearUserInfo } = authSlice.actions;
export default authSlice.reducer;