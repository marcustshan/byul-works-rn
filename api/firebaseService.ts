// services/firebaseService.ts
import { ensureFirebaseApp } from '@/config/firebaseConfig';
import { getApp, ReactNativeFirebase } from '@react-native-firebase/app';
import messaging, {
  AuthorizationStatus
} from '@react-native-firebase/messaging';
import { Linking } from 'react-native';

type WaitOpts = { maxWaitMs?: number; intervalMs?: number };

async function waitForFcmToken(opts: WaitOpts = {}): Promise<string | null> {
  const { maxWaitMs = 12000, intervalMs = 400 } = opts;

  // 1) onTokenRefresh를 먼저 연결해놓고, 동시에 getToken 시도
  let resolved = false;
  let cleanup: (() => void) | null = null;

  const tokenPromise = new Promise<string | null>(async (resolve) => {
    // a) 즉시 토큰 시도
    try {
      const t = await messaging().getToken();
      if (t) {
        resolved = true;
        resolve(t);
        return;
      }
    } catch {}

    // b) refresh 이벤트 대기
    const unsub = messaging().onTokenRefresh((t) => {
      if (!resolved && t) {
        resolved = true;
        resolve(t);
      }
    });
    cleanup = unsub;

    // c) 타임아웃 + 폴링 (희박하지만 getToken이 늦게 성공하는 경우)
    const started = Date.now();
    while (!resolved && Date.now() - started < maxWaitMs) {
      try {
        const t = await messaging().getToken();
        if (t) {
          resolved = true;
          resolve(t);
          break;
        }
      } catch {}
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    if (!resolved) resolve(null);
  });

  const token = await tokenPromise;
  if (cleanup) cleanup();
  return token;
}

export async function getFcmTokenSafely(): Promise<string | null> {
  ensureFirebaseApp();
  const app: ReactNativeFirebase.FirebaseApp = getApp();
  // iOS: 권한/등록 순서 중요 — 권한 허용 눌러도 APNs 등록/토큰은 약간 늦게 도착.
  const perm = await messaging().requestPermission({
    alert: true,
    badge: true,
    sound: true,
  });

  const enabled =
    perm === AuthorizationStatus.AUTHORIZED ||
    perm === AuthorizationStatus.PROVISIONAL;

  console.log('[FCM] 권한 상태:', perm);
  if (!enabled) {
    console.warn('[FCM] 권한 미허용 → 설정 앱으로 이동 권장');
    try { await Linking.openSettings(); } catch {}
    return null;
  }

  // (선택) 자동등록이 꺼져 있다면 아래를 호출 (firebase.json에서 auto_register=false일 때)
  // if (Platform.OS === 'ios') {
  //   await messaging().registerDeviceForRemoteMessages();
  // }

  // 토큰이 실제로 준비될 때까지 기다린다 (onTokenRefresh 포함)
  const token = await waitForFcmToken();
  console.log('[FCM] 최종 FCM 토큰:', token ?? '(null)');
  return token;
}

export async function registerFcmTokenIfPossible(
  memberSeq: number | undefined | null,
  registerOnServer: (token: string) => Promise<any>,
  token: string | null,
) {
  if (!memberSeq || memberSeq <= 0) {
    console.warn('[FCM] memberSeq 없음 → 서버 등록 스킵');
    return null;
  }
  try {
    if (token) {
      await registerOnServer(token);
      return token;
    } else {
      const token = await getFcmTokenSafely();
      if (!token) {
        console.warn('[FCM] 토큰 미등록 → 나중에 재시도 필요');
        return null;
      }
      await registerOnServer(token);
      return token;
    }
  } catch (e: any) {
    console.error('[FCM] 서버 등록 실패:', e?.message ?? e);
    return null;
  }
}
