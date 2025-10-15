import { LoadingProgress } from '@/components/common/LoadingProgress';
import { ThemedView } from '@/components/themed-view';
import { getStoredToken } from '@/utils/auth';
import React, { useEffect, useState } from 'react';
import { Image, StyleSheet } from 'react-native';

import { router } from 'expo-router';

export default function LandingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true; // 언마운트 후 setState 방지용

    const checkToken = async () => {
      try {
        const token = await getStoredToken();
        if (!isMounted) return;

        setTimeout(() => {
          setIsLoading(false);
          if (token) {
            router.push('/main');
          } else {
            router.push('/login');
          }
        }, 500);
      } finally {
      }
    };

    checkToken();

    return () => {
      isMounted = false;
    };
  }, []);

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