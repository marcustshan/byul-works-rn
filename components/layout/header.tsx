// components/Header.tsx
import { useAppDispatch } from '@/store/hooks';
import { toggleMenu } from '@/store/uiSlice';
import { usePathname, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const canGoBack = pathname !== '/' && pathname !== '/login';

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.wrap}>
        <Pressable
          onPress={() => (canGoBack ? router.back() : null)}
          disabled={!canGoBack}
          style={({ pressed }) => [styles.iconBtn, !canGoBack && { opacity: 0.2 }, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.icon}>{'‹'}</Text>
        </Pressable>

        <Text style={styles.title}>ByulWorks</Text>

        <Pressable onPress={() => dispatch(toggleMenu())} style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}>
          <Text style={styles.icon}>≡</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: 'white' },
  wrap: {
    height: 52, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eaeaea',
  },
  title: { fontSize: 18, fontWeight: '700' },
  iconBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 22, fontWeight: '700' },
});
