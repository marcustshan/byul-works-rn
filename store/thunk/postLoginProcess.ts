// store/thunks/postLoginProcess.ts
import AuthService from '@/api/authService';
import ChatService from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { MenuService } from '@/api/menuService';
import { NotificationService } from '@/api/notificationService';
import WorkOnOffService from '@/api/workOnOff/workOnOffService';
import { setToken, setUserInfo } from '@/store/authSlice';
import { setChatRoomList } from '@/store/chatRoomSlice';
import { setMemberList } from '@/store/memberSlice';
import { setMenuList } from '@/store/menuSlice';
import { setExistUnread } from '@/store/notificationSlice';
import { getAutoLoginInfo } from '@/utils/auth';
import { createAsyncThunk } from '@reduxjs/toolkit';

import { registerFcmTokenIfPossible } from '@/api/firebaseService';

type BootstrapOptions = {
  includeMemberInfo?: boolean;
};

type TaskKey =
  | 'members'
  | 'menus'
  | 'chatRooms'
  | 'existUnread'
  | 'autoWorkOn'
  | 'fcmToken';

type Task<T = any> = {
  key: TaskKey;
  run: () => Promise<T>;
  /** await: 완료까지 대기 / background: 실패해도 전체 플로우 블로킹 없이 진행 */
  mode?: 'await' | 'background';
  onSuccess?: (result: T) => void;
};

export const postLoginProcess = createAsyncThunk(
  'app/postLoginProcess',
  async (
    { includeMemberInfo = false }: BootstrapOptions,
    { dispatch, rejectWithValue, getState }
  ) => {
    try {
      // 1) (옵션) 자동 로그인
      if (includeMemberInfo) {
        const autoLoginInfo = await getAutoLoginInfo();
        if (!autoLoginInfo) throw new Error('자동로그인 정보 없음');

        const userInfo = await AuthService.login({
          id: autoLoginInfo.id,
          password: autoLoginInfo.password,
        });
        if (!userInfo) throw new Error('로그인 실패');

        await dispatch(setToken(userInfo.accessToken));
        await dispatch(setUserInfo(userInfo));
      }

      // 2) 현재 상태에서 유저 정보를 먼저 확보 (↔ 기존 코드의 순서 버그 수정)
      const state: any = getState();
      const user = state.auth.userInfo;
      const memberSeq: number = user?.member?.memberSeq ?? 0;

      // 3) Task 목록 (키+잡+성공처리+모드)
      const tasks: Task[] = [
        {
          key: 'members',
          run: () => MemberService.getAllMembers(),
          mode: 'await',
          onSuccess: (result: any) => {
            dispatch(setMemberList(result));
          },
        },
        {
          key: 'menus',
          run: () => MenuService.getMyMenuList(),
          mode: 'await',
          onSuccess: (result: any) => {
            dispatch(setMenuList(result));
          },
        },
        {
          key: 'chatRooms',
          run: () => ChatService.getMyChatRooms(),
          mode: 'await',
          onSuccess: (result: any[]) => {
            dispatch(setChatRoomList(result));
            let newMessageCount = 0;
            for (const chatRoom of result ?? []) {
              newMessageCount += chatRoom?.newCnt ?? 0;
            }
          },
        },
        {
          key: 'existUnread',
          run: () => NotificationService.checkUnreadNotifications(memberSeq),
          mode: 'await',
          onSuccess: (result: boolean) => {
            dispatch(setExistUnread(result));
          },
        },
        {
          key: 'autoWorkOn',
          run: () => WorkOnOffService.autoWorkOn(),
          mode: 'await',
        },
        {
          // FCM은 전체 UX를 막을 필요가 없으므로 background 권장
          key: 'fcmToken',
          run: () =>
            registerFcmTokenIfPossible(memberSeq, async (token: string) => {
              await AuthService.setFirebaseToken(token);
              return token;
            }),
          mode: 'background',
          onSuccess: (token?: string | null) => {
            if (token) console.log('[FCM] 토큰 등록 성공:', token);
            else console.warn('[FCM] 토큰 미등록 또는 스킵');
          },
        },
      ];

      // 4) 대기 대상과 백그라운드 대상을 분리
      const awaitTasks = tasks.filter((t) => (t.mode ?? 'await') === 'await');
      const bgTasks = tasks.filter((t) => (t.mode ?? 'await') === 'background');

      // 5) awaitTasks는 병렬 수행 + allSettled로 개별 실패 격리
      const settled = await Promise.allSettled(awaitTasks.map((t) => t.run()));
      settled.forEach((res, idx) => {
        const key = awaitTasks[idx].key;
        if (res.status === 'rejected') {
          console.error(`[postLoginProcess] ${key} 실패:`, res.reason);
          return;
        }
        awaitTasks[idx].onSuccess?.(res.value);
      });

      // 6) bgTasks는 fire-and-forget로 수행하되 로깅만
      bgTasks.forEach(async (t) => {
        try {
          const result = await t.run();
          t.onSuccess?.(result);
        } catch (e: any) {
          console.error(`[postLoginProcess] ${t.key} 실패(백그라운드):`, e?.message ?? e);
        }
      });

      // 7) 로드된 키 목록 반환
      return { loaded: [...awaitTasks.map((t) => t.key), ...bgTasks.map((t) => t.key)] };
    } catch (error: any) {
      console.error('[postLoginProcess] 초기화 실패:', error?.message ?? error);
      return rejectWithValue(error?.message ?? '로그인 후처리 실패');
    }
  }
);
