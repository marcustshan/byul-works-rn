// hooks/use-color-scheme.ts
import { ThemeContext } from '@/theme/ThemeProvider';
import { useContext } from 'react';

// 실제 적용 중인 스킴만 필요할 때: 'light' | 'dark'
export function useColorScheme() {
  const { colorScheme } = useContext(ThemeContext);
  return colorScheme;
}

// 설정 화면 등에서 선호도(state)와 setter가 필요할 때
export function useThemePreference() {
  const { preference, setPreference, colorScheme } = useContext(ThemeContext);
  return { preference, setPreference, colorScheme };
}
