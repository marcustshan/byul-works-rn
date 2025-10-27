// store/thunks/postLoginProcess.ts
import AuthService from '@/api/authService';
import ChatService from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { MenuService } from '@/api/menuService';
import { NotificationService } from '@/api/notificationService';
import WorkOnOffService from '@/api/workOnOff/workOnOffService';
import { setToken, setUserInfo } from '@/store/authSlice';
import { setChatRoomList, setNewMessageCount } from '@/store/chatRoomSlice';
import { setMemberList } from '@/store/memberSlice';
import { setMenuList } from '@/store/menuSlice';
import { setExistUnread } from '@/store/notificationSlice';
import { getAutoLoginInfo } from '@/utils/auth';
import { createAsyncThunk } from '@reduxjs/toolkit';

import messaging from '@react-native-firebase/messaging';

type BootstrapOptions = {
  includeMemberInfo?: boolean; // auto-login 등에서 내정보/토큰 필요 여부
};

/** 권한 요청 + 원격 메시지 활성화 + FCM 토큰 획득(없으면 null) */
async function getFcmTokenSafe(): Promise<string | null> {
  try {
    // iOS: 알림 권한 요청 / Android: Tiramisu(API33+)에서도 필수
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.warn('[FCM] 알림 권한 미허용으로 토큰 발급 불가');
      return null;
    }

    // 일부 단말에서 필요: 원격 메시지 수신 준비
    await messaging().registerDeviceForRemoteMessages();

    const token = await messaging().getToken();
    if (!token) {
      console.warn('[FCM] getToken()이 빈 값 반환');
      return null;
    }
    return token;
  } catch (e: any) {
    console.warn('[FCM] 토큰 획득 실패:', e?.message ?? e);
    return null;
  }
}

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
      const token: string | undefined = state.auth.token; // eslint-disable-line @typescript-eslint/no-unused-vars
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

      /* --------------------------------------------------------------------
       * Firebase FCM 토큰 등록 (개별 실패는 전체 진행에 영향 X)
       * ------------------------------------------------------------------ */
      jobs.push(
        (async () => {
          try {
            // 로그인 사용자 식별 불가 시 스킵
            const memberSeq: number | undefined = user?.member?.memberSeq;
            if (!memberSeq || memberSeq <= 0) {
              console.warn('[FCM] memberSeq 미존재로 서버 등록 스킵');
              return null;
            }

            const fcmToken = await getFcmTokenSafe();
            if (!fcmToken) {
              console.warn('[FCM] 토큰 없음 → 서버 등록 스킵');
              return null;
            }

            // 서버 등록 (API 스펙에 맞게 key/shape 조정)
            await AuthService.setFirebaseToken(fcmToken);

            return { memberSeq, fcmToken };
          } catch (e: any) {
            console.error('[postLoginProcess] FCM 등록 실패:', e?.message ?? e);
            return null;
          }
        })()
      );
      keys.push('fcmRegister');

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
            let newMessageCount = 0;
            for (const chatRoom of result ?? []) {
              newMessageCount += chatRoom?.newCnt ?? 0;
            }
            dispatch(setNewMessageCount(newMessageCount));
          } else if (key === 'existUnread') {
            dispatch(setExistUnread(result));
          } else if (key === 'fcmRegister') {
            // 상태 반영할 항목은 없지만, 필요 시 저장 로직 추가 가능
            // e.g., dispatch(setFcmToken(result?.fcmToken))
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
