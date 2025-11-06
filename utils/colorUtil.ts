type RGB = { r: number; g: number; b: number };

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function parseColorToRgb(input: string): RGB | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();

  // #rgb, #rrggbb, #aarrggbb
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      return { r, g, b };
    }
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return { r, g, b };
    }
    if (hex.length === 8) {
      // aarrggbb => 무시하고 rgb만 사용
      const r = parseInt(hex.slice(2, 4), 16);
      const g = parseInt(hex.slice(4, 6), 16);
      const b = parseInt(hex.slice(6, 8), 16);
      return { r, g, b };
    }
    return null;
  }

  // rgb/rgba(…)
  const rgbMatch =
    s.match(/^rgba?\(\s*([.\d]+)\s*,\s*([.\d]+)\s*,\s*([.\d]+)(?:\s*,\s*([.\d]+))?\s*\)$/);
  if (rgbMatch) {
    const r = Math.round(parseFloat(rgbMatch[1]));
    const g = Math.round(parseFloat(rgbMatch[2]));
    const b = Math.round(parseFloat(rgbMatch[3]));
    return { r, g, b };
  }

  // 기타 네임드 컬러는 여기서 필요시 매핑 추가
  return null;
}

function srgbToLinear(c: number) {
  const cs = c / 255;
  return cs <= 0.04045 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
}

function relativeLuminance({ r, g, b }: RGB) {
  const R = srgbToLinear(r);
  const G = srgbToLinear(g);
  const B = srgbToLinear(b);
  // Rec. 709
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(l1: number, l2: number) {
  const light = Math.max(l1, l2);
  const dark = Math.min(l1, l2);
  return (light + 0.05) / (dark + 0.05);
}

/**
 * 배경색에 대해 가독성이 더 높은 텍스트 색(흰/검)을 반환
 * @param bg 배경색 (hex, rgb/rgba)
 * @param opts.light 밝은 텍스트 후보
 * @param opts.dark 어두운 텍스트 후보
 * @param opts.minContrast 요구 대비비(기본 4.5:1)
 */
export function getAccessibleTextColor(
  bg: string,
  opts: { light?: string; dark?: string; minContrast?: number } = {}
) {
  const light = opts.light ?? "#FFFFFF";
  const dark = opts.dark ?? "#111111";
  const minContrast = opts.minContrast ?? 4.5;

  const bgRgb = parseColorToRgb(bg);
  const lightRgb = parseColorToRgb(light)!;
  const darkRgb = parseColorToRgb(dark)!;

  if (!bgRgb) return dark; // 파싱 실패 시 안전하게 어두운 텍스트

  const Lbg = relativeLuminance(bgRgb);
  const Llight = relativeLuminance(lightRgb);
  const Ldark = relativeLuminance(darkRgb);

  const cLight = contrastRatio(Lbg, Llight);
  const cDark = contrastRatio(Lbg, Ldark);

  // 둘 다 기준을 넘으면 더 큰 쪽 선택, 아니면 그래도 더 큰 쪽
  if (cLight >= minContrast && cDark >= minContrast) {
    return cLight >= cDark ? light : dark;
  }
  return cLight >= cDark ? light : dark;
}

/** 단순 기준(YIQ)으로 빠르게 흰/검 선택 (속도 우선) */
export function getTextColorQuick(bg: string) {
  const rgb = parseColorToRgb(bg);
  if (!rgb) return "#111111";
  const yiq = (299 * rgb.r + 587 * rgb.g + 114 * rgb.b) / 1000;
  return yiq >= 150 ? "#111111" : "#FFFFFF";
}