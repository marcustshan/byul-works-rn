// config/firebaseConfig.ts
import { getApp, getApps, initializeApp } from '@react-native-firebase/app';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { PermissionsAndroid, Platform } from 'react-native';

function readExtra() {
  return (
    Constants.expoConfig?.extra ??                      // dev(local)
    (Constants as any)?.manifest?.extra ??              // classic
    (Updates as any)?.manifest?.extra ??                // EAS runtime
    null
  );
}

export function ensureFirebaseApp() {
  if (getApps().length > 0) return getApp();

  const extra = readExtra();
  const fb = extra?.firebase;
  if (!fb) {
    throw new Error('[firebaseApp] extra.firebase 설정을 찾지 못했습니다.');
  }

  // ❗ 불변으로 새 config 구성(원본 객체를 mutate 하지 않음)
  const config = {
    apiKey: fb.apiKey,
    authDomain: fb.authDomain,                 // 없어도 됨(푸시만 쓰면)
    projectId: fb.projectId,                   // 없어도 됨
    storageBucket: fb.storageBucket,           // 없어도 됨
    messagingSenderId: fb.messagingSenderId,   // ✅ FCM에 필요
    appId: Platform.OS === 'ios' ? fb.appIdIos : fb.appIdAndroid, // ✅ 필수
    databaseURL: '',
  };

  console.log("----------------------------- config",config);

  const app = initializeApp(config);
  console.log('[firebaseApp] Firebase initialized ✅', app);
  return app;
}

export async function ensureAndroidNotifPermission() {
  if (Platform.OS !== 'android') return true;
  if (Platform.Version < 33) return true; // 13 미만은 런타임 권한 없음

  const granted = await PermissionsAndroid.request(
    'android.permission.POST_NOTIFICATIONS'
  );
  console.log("----------------------------- granted",granted);
  return granted === PermissionsAndroid.RESULTS.GRANTED;
}
