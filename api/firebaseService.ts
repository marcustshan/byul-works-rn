// services/firebaseService.ts
import { ensureFirebaseApp } from '@/config/firebaseConfig';
import { getApp, ReactNativeFirebase } from '@react-native-firebase/app';
import { AuthorizationStatus, getMessaging, getToken, registerDeviceForRemoteMessages, requestPermission } from '@react-native-firebase/messaging';

export async function getFcmTokenSafely(): Promise<string | null> {
  ensureFirebaseApp();
  const app: ReactNativeFirebase.FirebaseApp = getApp();
  const messaging = getMessaging(app);

  const status = await requestPermission(messaging);
  const enabled =
    status === AuthorizationStatus.AUTHORIZED ||
    status === AuthorizationStatus.PROVISIONAL;
  if (!enabled) {
    console.warn('[FCM] 권한 미허용 → 토큰 발급 불가');
    return null;
  }

  await registerDeviceForRemoteMessages(messaging);
  const token = await getToken(messaging);
  return token || null;
}

export async function registerFcmTokenIfPossible(
  memberSeq: number | undefined | null,
  registerOnServer: (token: string) => Promise<any>,
) {
  if (!memberSeq || memberSeq <= 0) {
    console.warn('[FCM] memberSeq 없음 → 서버 등록 스킵');
    return null;
  }
  try {
    const token = await getFcmTokenSafely();
    if (!token) return null;
    await registerOnServer(token);
    return token;
  } catch (e: any) {
    console.error('[FCM] 서버 등록 실패:', e?.message ?? e);
    return null;
  }
}
