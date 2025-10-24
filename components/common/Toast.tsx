import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info' | 'warning';
type ToastPos = 'top' | 'bottom';

export type ToastOptions = {
  id?: string;
  message: string;
  type?: ToastType;
  durationMs?: number;      // 기본 2200
  position?: ToastPos;      // 기본 'top'
};

type Ctx = {
  show: (opts: ToastOptions) => string;
  hide: (id?: string) => void;
  clear: () => void;
};

const Ctx = createContext<Ctx | null>(null);

// 정적 접근(어디서든 Toast.show())
let _static: Ctx | null = null;

const ICON: Record<ToastType, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
  warning: 'warning',
};

const tint = (colors: typeof Colors.light, type: ToastType) => {
  switch (type) {
    case 'success': return '#22c55e';
    case 'error':   return '#ef4444';
    case 'warning': return '#f59e0b';
    case 'info':    return colors.tint;
  }
};

type Item = Required<Pick<ToastOptions, 'id' | 'message' | 'type' | 'position' | 'durationMs'>>;
const DURATION = 2200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<Item[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const hide = useCallback((id?: string) => {
    setQueue(prev => (id ? prev.filter(t => t.id !== id) : prev.slice(1)));
  }, []);

  const show = useCallback((opts: ToastOptions) => {
    const id = opts.id ?? Math.random().toString(36).slice(2);
    const item: Item = {
      id,
      message: opts.message,
      type: opts.type ?? 'info',
      position: opts.position ?? 'top',
      durationMs: Math.max(800, opts.durationMs ?? DURATION),
    };
    setQueue(prev => [...prev, item]);
    return id;
  }, []);

  const clear = useCallback(() => setQueue([]), []);

  useEffect(() => {
    _static = { show, hide, clear };
    return () => { _static = null; };
  }, [show, hide, clear]);

  // 현재 맨 앞 토스트 자동 종료
  useEffect(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (queue.length === 0) return;
    timerRef.current = setTimeout(() => hide(queue[0].id), queue[0].durationMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [queue, hide]);

  const top = queue.filter(t => t.position === 'top').slice(0, 1);
  const bottom = queue.filter(t => t.position === 'bottom').slice(0, 1);

  const ctx = useMemo<Ctx>(() => ({ show, hide, clear }), [show, hide, clear]);

  return (
    <Ctx.Provider value={ctx}>
      {children}

      {/* TOP */}
      <SafeAreaView pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', paddingTop: insets.top + 8 }]}>
        <View pointerEvents="box-none" style={{ paddingHorizontal: 12 }}>
          {top.map(t => <ToastCard key={t.id} item={t} colors={colors} onClose={() => hide(t.id)} />)}
        </View>
      </SafeAreaView>

      {/* BOTTOM */}
      <SafeAreaView pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: insets.bottom + 8 }]}>
        <View pointerEvents="box-none" style={{ paddingHorizontal: 12 }}>
          {bottom.map(t => <ToastCard key={t.id} item={t} colors={colors} onClose={() => hide(t.id)} />)}
        </View>
      </SafeAreaView>
    </Ctx.Provider>
  );
}

function ToastCard({ item, colors, onClose }: { item: Item; colors: typeof Colors.light; onClose: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 160, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, slide]);

  const color = tint(colors, item.type);
  const icon = ICON[item.type];

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.wrap, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      <Pressable onPress={onClose} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, shadowColor: '#000' }]}>
        <Ionicons name={icon} size={18} color={color} style={{ marginRight: 8 }} />
        <ThemedText style={{ color: colors.text }} numberOfLines={3}>{item.message}</ThemedText>
      </Pressable>
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}

// 전역 정적 API
export const Toast = {
  show: (opts: ToastOptions) => {
    if (!_static) throw new Error('ToastProvider not mounted');
    return _static.show(opts);
  },
  hide: (id?: string) => _static?.hide(id),
  clear: () => _static?.clear(),
};

const styles = StyleSheet.create({
  wrap: { marginBottom: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
  },
});
