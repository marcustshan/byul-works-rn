import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import {
  DimensionValue,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';

export type CardProps = {
  children: React.ReactNode;
  title?: string;
  style?: ViewStyle | ViewStyle[];
  contentStyle?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  variant?: 'filled' | 'outlined' | 'ghost';
  radius?: number;
  padding?: number;
  width?: DimensionValue;
  align?: 'center' | 'left' | 'right';
  shadow?: boolean;
  /** 배경색 강제 지정(variant='filled'일 때만 사용) */
  backgroundColor?: string;
  /** 테두리색 강제 지정(variant='outlined'일 때만 사용) */
  borderColor?: string;
};

export default function Card({
  children,
  title,
  style,
  contentStyle,
  onPress,
  variant = useColorScheme() === 'dark' ? 'outlined' : 'filled',
  radius = 10,
  padding = 16,
  width = '95%',
  align = 'center',
  shadow = true,
  backgroundColor,
  borderColor,
}: CardProps) {
  const Wrapper = onPress ? Pressable : View;

  // THEME
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];

  // Align self
  const alignmentStyle: ViewStyle =
    align === 'center'
      ? { alignSelf: 'center' }
      : align === 'left'
      ? { alignSelf: 'flex-start' }
      : { alignSelf: 'flex-end' };

  // Variant styles (theme-aware)
  const variantStyles: ViewStyle[] = [];
  if (variant === 'filled') {
    variantStyles.push({
      backgroundColor: backgroundColor ?? c.surface, // light=white, dark=카드표면
      borderWidth: 0,
    });
  } else if (variant === 'outlined') {
    variantStyles.push({
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: borderColor ?? c.border, // light/dark 모두 테마 토큰 사용
    });
  } else if (variant === 'ghost') {
    variantStyles.push({
      backgroundColor: 'transparent',
      borderWidth: 0,
    });
  }

  // Shadow (dark에서 너무 튀지 않게 강도 완화)
  const shadowStyle: ViewStyle =
    shadow
      ? Platform.select({
          ios: {
            shadowColor: scheme === 'dark' ? '#000' : '#000',
            shadowOpacity: scheme === 'dark' ? 0.25 : 0.08,
            shadowRadius: scheme === 'dark' ? 6 : 12,
            shadowOffset: { width: 0, height: scheme === 'dark' ? 2 : 6 },
          },
          android: {
            // elevation은 배경 대비 과도하게 보일 수 있어 소폭 조정
            elevation: scheme === 'dark' ? 1 : 2,
          },
          default: {},
        }) || {}
      : {};

  return (
    <Wrapper
      style={[
        styles.base,
        alignmentStyle,
        { width, borderRadius: radius },
        variantStyles,
        shadowStyle,
        // ghost는 레이아웃 전용으로 패딩 적용 안 함
        variant !== 'ghost' ? { padding } : null,
        style,
      ]}
      onPress={onPress}
      {...(onPress
        ? {
            android_ripple:
              variant !== 'filled'
                ? { color: 'rgba(255,255,255,0.08)' } // outlined/ghost에서만 은은한 리플
                : { color: 'rgba(0,0,0,0.06)' },
            accessibilityRole: 'button' as const,
          }
        : {})}
    >
      {title && (
        <ThemedText style={[styles.title, { color: c.text }]}>{title}</ThemedText>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Wrapper>
  );
}

/** 내부 구분선 (테마 대응) */
export function CardDivider({ style }: { style?: ViewStyle | ViewStyle[] }) {
  const scheme = useColorScheme() ?? 'light';
  const c = Colors[scheme];
  return (
    <View
      style={[
        styles.divider,
        { backgroundColor: c.borderMuted }, // 테마 토큰 사용
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    // 안드로이드에서 모서리 깎임 유지
    overflow: Platform.select({ android: 'hidden', default: 'visible' }) as
      | 'hidden'
      | 'visible',
    marginBottom: 15,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  content: {},
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 8,
  },
});
