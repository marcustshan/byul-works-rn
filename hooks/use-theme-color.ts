// hooks/use-theme-color.ts
/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useMemo } from 'react';

// Colors 객체에서 light 팔레트의 키를 공통 키로 사용 (light/dark 키셋 동일 가정)
type ColorKey = keyof typeof Colors['light'];
type Palette = typeof Colors['light']; // light/dark 모두 같은 구조라고 가정

/**
 * 기존 시그니처 유지:
 * props에 light/dark 중 현재 스킴에 해당하는 값이 있으면 그걸 우선 사용,
 * 없으면 Colors[scheme][colorName]에서 가져옴.
 */
export function useThemeColor(
  props: { light?: string; dark?: string } = {},
  colorName: ColorKey
) {
  const scheme = useColorScheme() ?? 'light'; // 'light' | 'dark'
  const fromProps = props[scheme];

  if (fromProps) return fromProps;
  return Colors[scheme][colorName];
}

/**
 * 편의 훅: 현재 스킴의 팔레트를 통째로 반환
 * 예) const c = useThemeColors(); style={{ backgroundColor: c.background, color: c.text }}
 */
export function useThemeColors(): Palette {
  const scheme = useColorScheme() ?? 'light';
  return Colors[scheme];
}

/**
 * 편의 훅: 팔레트를 입력으로 받아 스타일 객체를 메모이즈해서 생성
 * 예)
 * const styles = useThemedStyles((c) => StyleSheet.create({
 *   container: { backgroundColor: c.background },
 *   title: { color: c.text },
 * }));
 */
export function useThemedStyles<T>(factory: (c: Palette) => T): T {
  const palette = useThemeColors();
  // palette 객체 레퍼런스가 바뀔 때만 재계산 (Colors[scheme]는 불변 객체라고 가정)
  return useMemo(() => factory(palette), [palette, factory]);
}
