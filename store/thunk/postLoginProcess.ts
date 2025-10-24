// store/thunks/postLoginProcess.ts
import AuthService from '@/api/authService';
import ChatService from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { MenuService } from '@/api/menuService';
import { NotificationService } from '@/api/notificationService';
import WorkOnOffService from '@/api/workOnOff/workOnOffService';
// ❌ 훅 사용 금지: import { useStompConnect } from '@/hooks/useStomp';
import { setToken, setUserInfo } from '@/store/authSlice';
import { setChatRoomList } from '@/store/chatRoomSlice';
import { setMemberList } from '@/store/memberSlice';
import { setMenuList } from '@/store/menuSlice';
import { setExistUnread } from '@/store/notificationSlice';
import { getAutoLoginInfo } from '@/utils/auth';
import { createAsyncThunk } from '@reduxjs/toolkit';

type BootstrapOptions = {
  includeMemberInfo?: boolean; // auto-login 등에서 내정보/토큰 필요 여부
};

export const postLoginProcess = createAsyncThunk(
  'app/postLoginProcess',
  async (
    { includeMemberInfo = false }: BootstrapOptions,
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      // 옵션에 따라 필요한 요청만 구성
      const jobs: Array<Promise<any>> = [];
      const keys: string[] = [];

      if (includeMemberInfo) {
        const autoLoginInfo = await getAutoLoginInfo();
        if (!autoLoginInfo) {
          throw new Error('자동로그인 정보 없음');
        }
        const userInfo = await AuthService.login({
          id: autoLoginInfo?.id,
          password: autoLoginInfo?.password,
        });
        if (!userInfo) {
          throw new Error('로그인 실패');
        }
        // RTK dispatch는 동기지만, 일관성을 위해 await 유지해도 무해
        await dispatch(setToken(userInfo.accessToken));
        await dispatch(setUserInfo(userInfo));
      }

      // 토큰/유저 정보
      const state: any = getState();
      const token: string | undefined = state.auth.token;
      const user = state.auth.userInfo;

      jobs.push(MemberService.getAllMembers());
      keys.push('members');

      jobs.push(MenuService.getMyMenuList());
      keys.push('menus');

      jobs.push(ChatService.getMyChatRooms());
      keys.push('chatRooms');

      jobs.push(
        NotificationService.checkUnreadNotifications(user?.member?.memberSeq ?? 0)
      );
      keys.push('existUnread');

      jobs.push(WorkOnOffService.autoWorkOn());
      keys.push('autoWorkOn');

      // 개별 실행으로 오류 추적
      const results: any[] = [];

      for (let i = 0; i < jobs.length; i++) {
        const key = keys[i];
        const job = jobs[i];

        try {
          const result = await job;
          results.push(result);

          // 결과 매핑 & 상태 반영
          if (key === 'members') {
            dispatch(setMemberList(result));
          } else if (key === 'menus') {
            dispatch(setMenuList(result));
          } else if (key === 'chatRooms') {
            dispatch(setChatRoomList(result));
          } else if (key === 'existUnread') {
            dispatch(setExistUnread(result));
          }
        } catch (error: any) {
          console.error(`[postLoginProcess] ${key} API 호출 실패:`, error?.message ?? error);
          // 개별 API 실패는 전체 프로세스를 중단시키지 않음
          results.push(null);
        }
      }

      return { loaded: keys };
    } catch (error: any) {
      console.error('[postLoginProcess] 초기화 실패:', error?.message ?? error);
      return rejectWithValue(error?.message ?? '로그인 후처리 실패');
    }
  }
);
