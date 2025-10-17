import { ThemedText } from '@/components/themed-text';
import React from 'react';
import { DimensionValue, Platform, Pressable, StyleSheet, View, ViewStyle } from 'react-native';

export type CardProps = {
  /** Content to render inside the card */
  children: React.ReactNode;
  /** Card title text */
  title?: string;
  /** Extra style for the outer card container */
  style?: ViewStyle | ViewStyle[];
  /** Extra style for the inner content wrapper */
  contentStyle?: ViewStyle | ViewStyle[];
  /** Tap handler. If provided, the card becomes pressable */
  onPress?: () => void;
  /** Visual style */
  variant?: 'filled' | 'outlined' | 'ghost';
  /** Border radius (default: 16) */
  radius?: number;
  /** Content padding (default: 16) */
  padding?: number;
  /** Card width (default: '95%') */
  width?: DimensionValue;
  /** Horizontal placement of the card container (default: 'center') */
  align?: 'center' | 'left' | 'right';
  /** Enable drop shadow (default: true) */
  shadow?: boolean;
  /** Background color override (only for 'filled' variant) */
  backgroundColor?: string;
  /** Border color override (only for 'outlined' variant) */
  borderColor?: string;
};

/**
 * A reusable Card component.
 *
 * - Centers itself and defaults to 90% width
 * - Accepts any children (render your own components inside)
 * - Optional pressable behavior via `onPress`
 * - Variants: filled | outlined | ghost
 */
export default function Card({
  children,
  title,
  style,
  contentStyle,
  onPress,
  variant = 'filled',
  radius = 10,
  padding = 16,
  width = '95%',
  align = 'center',
  shadow = true,
  backgroundColor,
  borderColor,
}: CardProps) {
  const Wrapper = onPress ? Pressable : View;

  const alignmentStyle: ViewStyle =
    align === 'center'
      ? { alignSelf: 'center' }
      : align === 'left'
      ? { alignSelf: 'flex-start' }
      : { alignSelf: 'flex-end' };

  const variantStyles: ViewStyle[] = [];
  if (variant === 'filled') {
    variantStyles.push({ backgroundColor: backgroundColor ?? '#ffffff' });
  } else if (variant === 'outlined') {
    variantStyles.push({
      backgroundColor: 'transparent',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: borderColor ?? 'rgba(0,0,0,0.15)',
    });
  } else if (variant === 'ghost') {
    variantStyles.push({ backgroundColor: 'transparent' });
  }

  const shadowStyle: ViewStyle = shadow
    ? Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOpacity: 0.08,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        },
        android: { elevation: 2 },
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
        // Only apply inner padding when not ghost, so ghost can be layout-only
        variant !== 'ghost' ? { padding } : null,
        style,
      ]}
      onPress={onPress}
    >
      {title && (
        <ThemedText style={styles.title}>{title}</ThemedText>
      )}
      <View style={[styles.content, contentStyle]}>{children}</View>
    </Wrapper>
  );
}

/** Optional: simple divider to use inside cards */
export function CardDivider({ style }: { style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  base: {
    // Prevent content from bleeding outside rounded corners on Android
    overflow: Platform.select({ android: 'hidden', default: 'visible' }) as 'hidden' | 'visible',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  content: {
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 8,
  },
});

/**
 * USAGE EXAMPLE
 *
 * import Card, { CardDivider } from '@/components/ui/Card';
 * import { ThemedText } from '@/components/themed-text';
 *
 * export function Example() {
 *   return (
 *     <Card title="카드 제목">
 *       <ThemedText>본문이나 원하는 컴포넌트를 자유롭게 넣으세요.</ThemedText>
 *       <CardDivider />
 *       <ThemedText>추가 콘텐츠</ThemedText>
 *     </Card>
 *   );
 * }
 *
 * // Pressable variant
 * <Card title="클릭 가능한 카드" onPress={() => console.log('pressed')} variant="outlined">...
 *
 * // Layout control
 * <Card title="커스텀 카드" width={360} align="left" padding={20} radius={20}>...
 *
 * // Content style customization
 * <Card title="스크롤 가능한 카드" contentStyle={{ maxHeight: 300 }}>
 *   <ScrollView>
 *     <ThemedText>긴 콘텐츠...</ThemedText>
 *   </ScrollView>
 * </Card>
 */
