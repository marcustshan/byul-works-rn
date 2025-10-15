// components/SideMenu.tsx
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { closeMenu } from '@/store/uiSlice';
import { router } from 'expo-router';
import React, { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const MENU_WIDTH = Math.min(320, width * 0.8);
const DURATION = 220;

export default function SideMenu() {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector((s) => s.ui.isMenuOpen);

  const tx = useSharedValue(-MENU_WIDTH);
  const backdrop = useSharedValue(0);

  useEffect(() => {
    tx.value = withTiming(isOpen ? 0 : -MENU_WIDTH, { duration: DURATION });
    backdrop.value = withTiming(isOpen ? 1 : 0, { duration: DURATION });
  }, [isOpen]);

  const menuStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  const close = () => dispatch(closeMenu());

  return (
    <View pointerEvents={isOpen ? 'auto' : 'none'} style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.backdrop, backdropStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      <Animated.View style={[styles.drawer, menuStyle]}>
        <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
          <MenuItem label="메인" onPress={() => { close(); router.push('/main'); }} />

          <View style={styles.sectionDivider} />
          <MenuItem label="로그인" onPress={() => { close(); router.push('/login'); }} />
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

function MenuItem({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
      <Animated.Text style={styles.itemText}>{label}</Animated.Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)' },
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: MENU_WIDTH,
    backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  safe: { flex: 1, paddingHorizontal: 16, paddingTop: 8 },
  sectionDivider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  item: { paddingVertical: 14 },
  itemText: { fontSize: 16, fontWeight: '600' },
});
