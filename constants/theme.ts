// theme.ts
import { Platform } from 'react-native';

const signatureColor = '#662D91';

const tintColorLight = '#662D91';
const tintColorDark = '#ffffff';

/*
const palette = (dark: boolean) => ({
  bgMine: dark ? '#4a4f5a' : '#e9e7ff',
  bgOther: dark ? '#373c43' : '#ffffff',
  text: dark ? '#e6eef6' : '#111827',
  dim: dark ? '#9fb0c0' : '#6b7280',
  senderNameColor: dark ? '#e6eef6' : '#111827',
  link: '#2ea3ff',
  border: dark ? '#1f2530' : '#e5e7eb',
  badgeBg: dark ? 'rgba(159,176,192,0.18)' : 'rgba(107,114,128,0.12)',
  sheetBg: dark ? '#0f141a' : '#fff',
  sheetHandle: dark ? '#2b3440' : '#e5e7eb',
  chipBg: dark ? 'rgba(230,238,246,0.08)' : 'rgba(17,24,39,0.04)',
});
 */

export const Colors = {
  light: {
    signatureColor: signatureColor,
    // Text
    text: '#11181C',
    textDim: '#666666',
    textMuted: '#999999',

    // Link
    link: '#2ea3ff',

    // Surfaces
    background: '#FFFFFF',      // 화면 배경
    surface: '#FFFFFF',         // 카드/모달 배경
    surfaceMuted: '#F1F1F1',    // 약한 면(주말/보조 카드)
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

    // === Chat specific (semantic tokens) ===
    chat: {
      bubbleMineBg: '#D9D7EF',              // 내가 보낸 말풍선 배경
      bubbleOtherBg: '#f1f1f1',             // 상대 말풍선 배경
      readBadgeBg: 'rgba(107,114,128,0.12)',// 배지 배경(은은한 회색)
      chipBg: 'rgba(17,24,39,0.04)',        // 모달 칩 배경
      sheetBg: '#FFFFFF',                   // 모달 시트 배경
      sheetHandle: '#E5E7EB',               // 모달 핸들바 색
      imagePlaceholder: '#F3F4F6',          // 이미지 로딩용(선택)
      senderNameColor: '#111827',           // 보낸 사람 이름 색
    },
  },

  dark: {
    signatureColor: signatureColor,
    // Text
    text: '#ECEDEE',
    textDim: '#B7BDC3',
    textMuted: '#8B9197',

    // Link
    link: '#2ea3ff',

    // Surfaces
    background: '#151718',
    surface: '#1C1F21',
    surfaceMuted: '#272A2C',
    surfaceToday: '#122016',

    // Borders
    border: '#ccc',
    borderMuted: '#777',

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

    // === Chat specific ===
    chat: {
      bubbleMineBg: '#4A4F5A',
      bubbleOtherBg: '#373C43',
      readBadgeBg: 'rgba(159,176,192,0.18)',
      chipBg: 'rgba(230,238,246,0.08)',
      sheetBg: '#0F141A',
      sheetHandle: '#2B3440',
      imagePlaceholder: '#0E1113',
      senderNameColor: '#E6EEF6',           // 보낸 사람 이름 색
    },
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
