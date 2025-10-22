// theme.ts
import { Platform } from 'react-native';

const tintColorLight = '#662D91';
const tintColorDark = '#ffffff';

export const Colors = {
  light: {
    // Text
    text: '#11181C',
    textDim: '#666666',
    textMuted: '#999999',

    // Surfaces
    background: '#FFFFFF',      // 화면 배경
    surface: '#FFFFFF',         // 카드/모달 배경
    surfaceMuted: '#F7F8FA',    // 약한 면(주말/보조 카드)
    surfaceToday: '#E8F5E8',    // 오늘 하이라이트 카드

    // Borders
    border: '#E5E7EB',
    borderMuted: '#E0E0E0',

    // Brand & states
    tint: tintColorLight,       // 기존 값 유지
    primary: tintColorLight,    // = tint
    onPrimary: '#FFFFFF',
    icon: '#687076',
    success: '#4CAF50',
    danger: '#FF6B6B',
    warning: '#F59E0B',

    // Overlays
    overlay: 'rgba(0,0,0,0.5)',

    // Tabs (기존 값 유지)
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },

  dark: {
    // Text
    text: '#ECEDEE',
    textDim: '#B7BDC3',
    textMuted: '#8B9197',

    // Surfaces
    background: '#151718',
    surface: '#1C1F21',
    surfaceMuted: '#171A1C',
    surfaceToday: '#122016',

    // Borders
    border: '#2A2F33',
    borderMuted: '#23272B',

    // Brand & states
    tint: tintColorDark,
    primary: tintColorDark,     // = tint
    onPrimary: '#0F1115',
    icon: '#9BA1A6',
    success: '#7DDA77',
    danger: '#FF6B6B',
    warning: '#F59E0B',

    // Overlays
    overlay: 'rgba(0,0,0,0.6)',

    // Tabs (기존 값 유지)
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export type AppColors = typeof Colors.light;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
