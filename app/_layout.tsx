// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';

import Header from '@/components/layout/header';
import SideMenu from '@/components/layout/side-menu';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { store } from '@/store';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const currentPath = usePathname();
  const needToHeader = currentPath !== '/' && currentPath !== '/login';

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <Stack
              screenOptions={{
                headerShown: needToHeader,
                header: () => <Header />,
              }}
            >
              <Stack.Screen name="index" />
            </Stack>

            <SideMenu />
            <StatusBar style="auto" />
          </SafeAreaView>
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
