// app/_layout.tsx
import { DarkTheme as RNDarkTheme, DefaultTheme as RNLightTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { Alert, BackHandler, PermissionsAndroid, Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import NotificationBell from '@/components/common/NotificationBell';
import Footer from '@/components/layout/Footer';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';

import { ToastProvider } from '@/components/common/Toast';
import GlobalStompBridge from '@/components/GlobalStompBridge';

import { getFcmTokenSafely } from '@/api/firebaseService';
import { ensureFirebaseApp } from '@/config/firebaseConfig';

ensureFirebaseApp();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const currentPath = usePathname();
  const router = useRouter();
  const needFooter = currentPath !== '/' && currentPath !== '/login';
  const needNotificationBell = currentPath !== '/' && currentPath !== '/login' && currentPath !== '/notifications';

  // React Navigation 테마를 현재 색상에 맞게 커스텀
  const navTheme = useMemo(() => {
    const base = colorScheme === 'dark' ? RNDarkTheme : RNLightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface ?? colors.background,
        text: colors.text ?? base.colors.text,
        border: colors.border ?? base.colors.border,
      },
    };
  }, [colorScheme, colors]);

  // 안드로이드 백키 이벤트 처리
  useEffect(() => {
    const backAction = () => {
      if (router.canGoBack?.()) {
        router.back();              // ✅ 단순 뒤로가기
        return true;                // 우리가 처리했음을 알림
      }
      // 뒤로갈 스택이 없을 때만 종료 확인 (원하지 않으면 아래 블록도 제거 가능)
      Alert.alert('앱 종료', '앱을 종료하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '종료', onPress: () => BackHandler.exitApp() },
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentPath, router]);

  // 🔔 알림 권한/토큰 부트스트랩
  useEffect(() => {
    (async () => {
      // Android 13+ 런타임 권한
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[Notifications] Android POST_NOTIFICATIONS not granted');
          return;
        }
      }

      // iOS/Android 공통: FCM 권한 + 토큰(내부에서 requestPermission 호출)
      const token = await getFcmTokenSafely();
      if (token) {
        console.log('[Notifications] FCM token:', token);
      } else {
        console.warn('[Notifications] FCM token unavailable');
      }
    })();
  }, []);

  return (
    <GestureHandlerRootView style={styles.flex1}>
      <Provider store={store}>
        <SafeAreaProvider>
          <ToastProvider>
            <ThemeProvider value={navTheme}>
              {/* SafeAreaView 배경을 테마 색으로 */}
              <SafeAreaView style={[styles.flex1, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" />
                </Stack>
                {needNotificationBell && <NotificationBell />}
                {needFooter && <Footer />}

                {/* 다크테마에서는 흰색 아이콘이 보이도록 */}
                <StatusBar
                  style={colorScheme === 'dark' ? 'light' : 'dark'}
                  backgroundColor={colors.background} // Android에서 상단 배경 동기화
                  animated
                />
                <GlobalStompBridge />
              </SafeAreaView>
            </ThemeProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 }, // 배경색은 런타임에 테마로 주입
});
