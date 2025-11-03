// src/utils/weekday.ts
import dayjs, { Dayjs } from 'dayjs';

export type WeekdayStyle = 'long' | 'short' | 'narrow';

type InputDate = Date | string | number | Dayjs;

const toDate = (d: InputDate) => (dayjs.isDayjs(d) ? d.toDate() : new Date(d));

/**
 * 날짜의 요일 텍스트를 가져옵니다.
 * @example getWeekdayLabel('2025-10-24') => '금' (ko, short 기본)
 */
export function getWeekdayLabel(
  date: InputDate,
  opts: { locale?: string; style?: WeekdayStyle } = {}
) {
  const { locale = 'ko', style = 'short' } = opts;
  return new Intl.DateTimeFormat(locale, { weekday: style }).format(toDate(date));
}

/**
 * 일(0)~토(6) 배열을 반환합니다.
 * @example getWeekdayArray() => ['일','월','화','수','목','금','토']
 */
export function getWeekdayArray(
  opts: { locale?: string; style?: WeekdayStyle } = {}
) {
  const base = dayjs().startOf('week'); // dayjs 기본: 일요일 시작
  return Array.from({ length: 7 }, (_, i) =>
    getWeekdayLabel(base.add(i, 'day'), opts)
  );
}

/**
 * 한국식 날짜 표기 + 요일 (YYYY년 MM월 DD일 (금)) 포맷
 * locale/style 바꿔도 동작합니다.
 */
export function formatDisplayDate(
  date: InputDate,
  opts: { locale?: string; style?: WeekdayStyle } = {}
) {
  const d = dayjs(date);
  const weekday = getWeekdayLabel(d, opts);
  const locale = opts.locale ?? 'ko';

  if (locale.startsWith('ko')) {
    return `${d.format('YYYY년 MM월 DD일')} (${weekday})`;
  }
  // 기본: ISO 스타일
  return `${d.format('YYYY-MM-DD')} (${weekday})`;
}

/** 주말 여부 (일/토 기준) */
export function isWeekend(date: InputDate) {
  const day = dayjs(date).day(); // 0=일 ~ 6=토
  return day === 0 || day === 6;
}


/**
 * base64 인코딩
 * @param value - 인코딩할 문자열
 * @returns 
 */
export const encodeBase64 = (value: string) => {
  return btoa(unescape(encodeURIComponent(value)));
};

/**
 * base64 디코딩
 * @param value - 디코딩할 문자열
 * @returns 
 */
export const decodeBase64 = (value: string) => {
  return decodeURIComponent(escape(atob(value)));
};