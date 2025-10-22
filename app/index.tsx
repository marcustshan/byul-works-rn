import { LoadingProgress } from '@/components/common/LoadingProgress';
import { ThemedView } from '@/components/themed-view';
import { useAppDispatch } from '@/store/hooks';
import { postLoginProcess } from '@/store/thunk/postLoginProcess';
import { getAutoLoginInfo } from '@/utils/auth';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

export default function LandingScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const dispatch = useAppDispatch();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkToken = async () => {
      try {
        const autoLoginInfo = await getAutoLoginInfo();
        if (!mounted) return;

        if (autoLoginInfo) {
          await dispatch(postLoginProcess({ includeMemberInfo: true }));
        } else {
          router.replace('/login');
        }

        // 로딩 스피너 약간 보여주고 라우팅
        timerRef.current = setTimeout(() => {
          if (!mounted) return;
          router.replace(autoLoginInfo ? '/main' : '/login'); // ✅ 지역 변수 token 사용 (stale 방지)
        }, 500);
      } finally {
        // no-op
      }
    };

    checkToken();

    return () => {
      mounted = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [dispatch]);

  return (
    <ThemedView style={styles.container}>
      <Image source={require('@/assets/images/icon.png')} style={styles.logo} />
      {isLoading && <LoadingProgress size="large" color="#662D91" />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});
