// Toast.tsx
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'newMessage';
type ToastPos = 'top' | 'bottom';

export type ToastOptions = {
  id?: string;
  /** 본문 메시지 */
  message: string;
  /** 타이틀(굵게 표시, 없으면 타입에 따른 기본 타이틀) */
  title?: string;
  type?: ToastType;
  durationMs?: number;      // 기본 2200
  position?: ToastPos;      // 기본 'top'
  onPress?: () => void;
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
  newMessage: 'chatbox-ellipses',
};

const DEFAULT_TITLE: Record<ToastType, string> = {
  success: '완료',
  error: '오류',
  info: '알림',
  warning: '주의',
  newMessage: '새 메시지',
};

// theme.ts 토큰 사용
const typeTint = (colors: typeof Colors.light, type: ToastType) => {
  switch (type) {
    case 'success': return colors.success;
    case 'error':   return colors.danger;
    case 'warning': return colors.warning;
    case 'info':
    case 'newMessage':
    default:        return colors.tint;
  }
};

type Item = Required<Pick<ToastOptions, 'id' | 'message' | 'type' | 'position' | 'durationMs'>> & {
  title?: string;
  createdAt: number; // 정렬을 위한 타임스탬프
  onPress?: () => void;
};

const DURATION = 2200;
const MAX_STACK_TOP = 3;
const MAX_STACK_BOTTOM = 3;
const STAGGER_MS = 70; // 동시 등장 시 약간씩 지연

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();

  const [queue, setQueue] = useState<Item[]>([]);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});

  const cancelTimer = useCallback((id: string) => {
    const t = timersRef.current[id];
    if (t) {
      clearTimeout(t);
      delete timersRef.current[id];
    }
  }, []);

  const startTimer = useCallback((item: Item) => {
    cancelTimer(item.id);
    timersRef.current[item.id] = setTimeout(() => {
      setQueue(prev => prev.filter(t => t.id !== item.id));
      delete timersRef.current[item.id];
    }, item.durationMs);
  }, [cancelTimer]);

  const hide = useCallback((id?: string) => {
    if (!id) {
      // 큐의 맨 앞(기본 정책) 제거
      setQueue(prev => {
        const next = [...prev];
        const first = next.shift();
        if (first) cancelTimer(first.id);
        return next;
      });
      return;
    }
    cancelTimer(id);
    setQueue(prev => prev.filter(t => t.id !== id));
  }, [cancelTimer]);

  const show = useCallback((opts: ToastOptions) => {
    const id = opts.id ?? Math.random().toString(36).slice(2);
    const item: Item = {
      id,
      title: opts.title,
      message: opts.message,
      type: opts.type ?? 'info',
      position: opts.position ?? 'top',
      durationMs: Math.max(800, opts.durationMs ?? DURATION),
      createdAt: Date.now(),
      onPress: opts.onPress,
    };
    setQueue(prev => {
      const next = [...prev, item];
      // 타이머 시작은 setState 직후 별도 effect에서 처리하거나, 여기서 바로 시작해도 무방
      // 여기서는 setTimeout 레이스를 피하기 위해 setState 콜백 종료 후 시작하도록 setTimeout 0 처리
      setTimeout(() => startTimer(item), 0);
      return next;
    });
    return id;
  }, [startTimer]);

  const clear = useCallback(() => {
    // 모든 타이머 정리
    Object.keys(timersRef.current).forEach(cancelTimer);
    setQueue([]);
  }, [cancelTimer]);

  useEffect(() => {
    _static = { show, hide, clear };
    return () => {
      _static = null;
      // 언마운트 시 타이머 정리
      Object.keys(timersRef.current).forEach(id => {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      });
    };
  }, [show, hide, clear]);

  // 정렬 및 스택 구성
  const topAll = useMemo(
    () => queue.filter(t => t.position === 'top').sort((a, b) => a.createdAt - b.createdAt),
    [queue]
  );
  const bottomAll = useMemo(
    () => queue.filter(t => t.position === 'bottom').sort((a, b) => a.createdAt - b.createdAt),
    [queue]
  );

  // TOP: 최신이 가장 위에 보이도록 마지막 MAX만 뽑아서 역순
  const top = useMemo(
    () => topAll.slice(-MAX_STACK_TOP).reverse(),
    [topAll]
  );
  // BOTTOM: 최신이 가장 아래에 보이도록 마지막 MAX만 사용(표시는 자연스럽게 아래부터 쌓임)
  const bottom = useMemo(
    () => bottomAll.slice(-MAX_STACK_BOTTOM),
    [bottomAll]
  );

  const ctx = useMemo<Ctx>(() => ({ show, hide, clear }), [show, hide, clear]);

  return (
    <Ctx.Provider value={ctx}>
      {children}

      {/* TOP STACK */}
      <SafeAreaView
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-start', paddingTop: insets.top + 8 }]}
      >
        <View pointerEvents="box-none" style={{ paddingHorizontal: 12 }}>
          {top.map((t, i) => (
            <ToastCard
              key={t.id}
              item={t}
              colors={colors}
              position="top"
              // 동시 등장 시 약간씩 지연 → 떨어지며 순차 등장 느낌
              delay={i * STAGGER_MS}
              onClose={() => hide(t.id)}
            />
          ))}
        </View>
      </SafeAreaView>

      {/* BOTTOM STACK */}
      <SafeAreaView
        pointerEvents="box-none"
        style={[StyleSheet.absoluteFill, { justifyContent: 'flex-end', paddingBottom: insets.bottom + 8 }]}
      >
        <View pointerEvents="box-none" style={{ paddingHorizontal: 12 }}>
          {bottom.map((t, i) => (
            <ToastCard
              key={t.id}
              item={t}
              colors={colors}
              position="bottom"
              delay={i * STAGGER_MS}
              onClose={() => hide(t.id)}
            />
          ))}
        </View>
      </SafeAreaView>
    </Ctx.Provider>
  );
}

function ToastCard({
  item,
  colors,
  position,
  delay = 0,
  onClose,
}: {
  item: Item;
  colors: typeof Colors.light;
  position: ToastPos;
  delay?: number;
  onClose: () => void;
}) {
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(position === 'top' ? -12 : 12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,  { toValue: 1, duration: 160, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 160, delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [fade, slide, delay]);

  // 요구사항: 라이트=보라 배경, 다크=밝은 배경(화이트)
  const backgroundColor = colors.primary;     // light: #662D91, dark: #ffffff
  const textColor = colors.onPrimary;         // light: #ffffff,  dark: #0F1115
  const iconColor = textColor;

  const accent = typeTint(colors, item.type);
  const icon = ICON[item.type];
  const titleText = item.title ?? DEFAULT_TITLE[item.type];

  return (
    <Animated.View
      accessibilityRole="alert"
      style={[styles.wrap, { opacity: fade, transform: [{ translateY: slide }] }]}
    >
      <Pressable
        onPress={item.onPress ?? onClose}
        style={[
          styles.card,
          {
            backgroundColor,
            borderColor: colors.border,
            shadowColor: '#000',
          },
        ]}
      >
        {/* 타입 강조 바 */}
        <View style={[styles.accent, { backgroundColor: accent }]} />

        {/* 아이콘 */}
        <Ionicons name={icon} size={18} color={iconColor} style={{ marginRight: 10 }} />

        {/* 텍스트 영역 */}
        <View style={{ flex: 1 }}>
          <ThemedText style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {titleText}
          </ThemedText>
          <ThemedText style={{ color: textColor, opacity: 0.95 }} numberOfLines={3}>
            {item.message}
          </ThemedText>
        </View>
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
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    overflow: 'hidden',
  },
  accent: {
    width: 3,
    height: '100%',
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginRight: 10,
  },
  title: {
    fontWeight: '700',
    marginBottom: 2,
  },
});
