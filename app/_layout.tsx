// app/_layout.tsx
import {
  ThemeProvider as NavigationThemeProvider,
  DarkTheme as RNDarkTheme,
  DefaultTheme as RNLightTheme,
} from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
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

import { getFcmTokenSafely, registerFcmTokenIfPossible } from '@/api/firebaseService';
import { ensureFirebaseApp } from '@/config/firebaseConfig';

// ⬇️ 앱 전역 테마 컨텍스트
import { AuthService } from '@/api/authService';
import { ThemeProvider as AppThemeProvider } from '@/theme/ThemeProvider';

ensureFirebaseApp();

/**
 * 컨텍스트(앱 전역 ThemeProvider)를 필요로 하는 훅(useColorScheme 등)은
 * 반드시 해당 Provider 하위에서 호출해야 하므로 별도 컴포넌트로 분리
 */
function AppShell() {
  const colorScheme = useColorScheme(); // 'light' | 'dark' (앱 전역 선호도 반영)
  const colors = Colors[colorScheme ?? 'light'];

  const currentPath = usePathname();
  const router = useRouter();

  const needFooter = currentPath !== '/' && currentPath !== '/login';
  const needNotificationBell =
    currentPath !== '/' && currentPath !== '/login' && currentPath !== '/notifications';

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
        router.back();
        return true;
      }
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
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS');
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[Notifications] Android POST_NOTIFICATIONS not granted');
          return;
        }
      }
      const token = await getFcmTokenSafely();
      if (token) {
        const memberSeq = store.getState().auth.userInfo?.member?.memberSeq ?? 0;
        registerFcmTokenIfPossible(memberSeq, async (token: string) => {
          await AuthService.setFirebaseToken(token);
          return token;
        }, token);
      }else {
        console.warn('[Notifications] FCM token unavailable');
      }
    })();
  }, []);

  return (
    <NavigationThemeProvider value={navTheme}>
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
          backgroundColor={colors.background}
          animated
        />
        <GlobalStompBridge />
      </SafeAreaView>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.flex1}>
      <Provider store={store}>
        <SafeAreaProvider>
          <ToastProvider>
            {/* ⬇️ 앱 전역 테마 컨텍스트(AsyncStorage 연동, system/light/dark 선호도 저장) */}
            <AppThemeProvider>
              <AppShell />
            </AppThemeProvider>
          </ToastProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
});
