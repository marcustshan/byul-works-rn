import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

type ThemePreference = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  /** 실제 적용 중인 색상 스킴 (system일 때도 light/dark로 확정값 제공) */
  colorScheme: Exclude<ColorSchemeName, 'no-preference'>; // 'light' | 'dark'
  /** 사용자가 고른 선호도 (system | light | dark) */
  preference: ThemePreference;
  /** 선호도 변경 (저장까지) */
  setPreference: (p: ThemePreference) => void;
};

export const ThemeContext = createContext<ThemeContextValue>({
  colorScheme: 'light',
  preference: 'system',
  setPreference: () => {},
});

const STORAGE_KEY = 'app.theme.preference';

function getSystemScheme(): 'light' | 'dark' {
  const sys = Appearance.getColorScheme();
  return sys === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<'light' | 'dark'>(getSystemScheme());

  // 실제 적용 스킴
  const colorScheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') return systemScheme;
    return preference;
  }, [preference, systemScheme]);

  // 초기 로드: 저장된 선호도 불러오기
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved === 'light' || saved === 'dark' || saved === 'system') {
          setPreferenceState(saved);
        }
      } catch {}
    })();
  }, []);

  // 시스템 테마 변경 감지 (preference가 system일 때 반영)
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    AsyncStorage.setItem(STORAGE_KEY, p).catch(() => {});
  }, []);

  const value = useMemo(
    () => ({ colorScheme, preference, setPreference }),
    [colorScheme, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
