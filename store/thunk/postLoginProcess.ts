// store/thunks/postLoginProcess.ts
import AuthService from '@/api/authService';
import { MemberService } from '@/api/memberService';
import { MenuService } from '@/api/menuService';
import WorkOnOffService from '@/api/workOnOff/workOnOffService';
import { setToken, setUserInfo } from '@/store/authSlice';
import { setMemberList } from '@/store/memberSlice';
import { setMenuList } from '@/store/menuSlice';
import { saveToken } from '@/utils/auth';
import { createAsyncThunk } from '@reduxjs/toolkit';

export const postLoginProcess = createAsyncThunk(
  'app/postLoginProcess',
  async (_, { dispatch }) => {
    try {
      const [members, menus] = await Promise.all([
        MemberService.getAllMembers(),
        MenuService.getMyMenuList(),
        WorkOnOffService.autoWorkOn(),
      ]);

      dispatch(setMemberList(members));
      dispatch(setMenuList(menus));
    } catch (error: any) {
      console.error('사용자, 메뉴 정보를 불러오는데 실패했습니다.', error.message);
      throw error;
    }
  }
);

export const postLoginProcessAutoLogin = createAsyncThunk(
  'app/postLoginProcessAutoLogin',
  async (_, { dispatch }) => {
    try {
      const [myInfo, members, menus] = await Promise.all([
        AuthService.getMemberInfo(),
        MemberService.getAllMembers(),
        MenuService.getMyMenuList(),
        WorkOnOffService.autoWorkOn(),
      ]);

      const token = myInfo.accessToken;
      dispatch(setToken(token));
      await saveToken(token);
      dispatch(setUserInfo(myInfo));
      dispatch(setMemberList(members));
      dispatch(setMenuList(menus));
    } catch (error: any) {
      console.error('사용자, 메뉴 정보를 불러오는데 실패했습니다.', error.message);
      throw error;
    }
  }
);