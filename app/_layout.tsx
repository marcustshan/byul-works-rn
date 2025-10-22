// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert, BackHandler, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import NotificationBell from '@/components/common/NotificationBell';
import Footer from '@/components/layout/Footer';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const currentPath = usePathname();
  const router = useRouter();
  const needFooter = currentPath !== '/' && currentPath !== '/login';
  const needNotificationBell = currentPath !== '/' && currentPath !== '/login' && currentPath !== '/notifications';

  // 안드로이드 백키 이벤트 처리
  useEffect(() => {
    const backAction = () => {
      // 현재 경로에 따른 백키 동작 로직
      if (currentPath === '/main') {
        // 메인 페이지에서 백키를 누르면 앱 종료 확인
        Alert.alert(
          '앱 종료',
          '앱을 종료하시겠습니까?',
          [
            { text: '취소', style: 'cancel' },
            { text: '종료', onPress: () => BackHandler.exitApp() }
          ]
        );
        return true; // 기본 백키 동작 방지
      } else if (currentPath === '/notifications') {
        // 알림 페이지에서 백키를 누르면 메인으로 이동
        router.push('/main');
        return true;
      } else if (currentPath === '/chat-room-list') {
        // 채팅 목록에서 백키를 누르면 메인으로 이동
        router.push('/main');
        return true;
      }
      
      // 기본 동작 허용 (이전 페이지로 이동)
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);

    return () => backHandler.remove();
  }, [currentPath, router]);

  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <SafeAreaProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen name="index" />
              </Stack>
              {needNotificationBell && <NotificationBell />}
              {needFooter && <Footer />}
              <StatusBar style="auto" />
            </SafeAreaView>
          </ThemeProvider>
        </SafeAreaProvider>
      </Provider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
