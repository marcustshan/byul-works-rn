// app/schedule/ScheduleScreen.tsx
import { Schedule, ScheduleCode, ScheduleService } from '@/api/schedule/scheduleService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useThemeColor } from '@/hooks/use-theme-color';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';

// ────────────────────────────────────────────────────────────────────────────────
// 1) Korean locale
// ────────────────────────────────────────────────────────────────────────────────
LocaleConfig.locales.ko = {
  monthNames: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  monthNamesShort: ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'],
  dayNames: ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'],
  dayNamesShort: ['일','월','화','수','목','금','토'],
  today: '오늘',
};
LocaleConfig.defaultLocale = 'ko';

// 날짜 문자열 헬퍼
const D = (s: string) => dayjs(s);
const fmt = (d: dayjs.Dayjs) => d.format('YYYY-MM-DD');

// 달력 그리드 범위 계산(해당 월의 시작~끝을 주/주단위로 확장)
function getCalendarRange(year: number, month: number) {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month').startOf('week');
  const end = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month').endOf('week');
  return { start: fmt(start), end: fmt(end) };
}

// 선택된 월 범위(달력 그리드 말고 순수 월 범위)
function getMonthRange(year: number, month: number) {
  const start = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).startOf('month');
  const end = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).endOf('month');
  return { start: fmt(start), end: fmt(end) };
}

// 날짜 범위 포함 여부(시작~끝 모두 날짜 부분만 비교)
function dateInRange(dateStr: string, startISO: string, endISO: string) {
  const d = dateStr;
  const s = startISO.split('T')[0];
  const e = endISO.split('T')[0];
  return d >= s && d <= e;
}

// scheduleCodeList에서 일정 코드 색상 찾기
function getScheduleColor(
  item: Schedule,
  scheduleCodeList: ScheduleCode[],
  fallback: string
): string {
  // 개인 일정이거나 scheduleCodeSeq가 없으면 fallback 사용
  if (!item.scheduleCodeSeq || item.isPersonal || item.personal) {
    return fallback;
  }
  
  // scheduleCodeList에서 일치하는 코드 찾기
  const code = scheduleCodeList.find(
    (c) => c.scheduleCodeSeq === item.scheduleCodeSeq
  );
  
  return code?.scheduleCodeColor || fallback;
}

// ────────────────────────────────────────────────────────────────────────────────
// Screen
// ────────────────────────────────────────────────────────────────────────────────
export default function ScheduleScreen() {
  const backgroundColor = useThemeColor({}, 'background') as string;
  const textColor = useThemeColor({}, 'text') as string;
  const borderColor = useThemeColor({}, 'border') as string;
  const surface = useThemeColor({}, 'surface') as string;
  const surfaceToday = useThemeColor({}, 'surfaceToday') as string;
  const tint = useThemeColor({}, 'tint') as string;
  const onPrimary = useThemeColor({}, 'onPrimary') as string;
  const danger = useThemeColor({}, 'danger') as string;
  const link = useThemeColor({}, 'link') as string;
  const tabIconDefault = useThemeColor({}, 'tabIconDefault') as string;

  const today = dayjs();
  const [viewMode, setViewMode] = useState<'compact'|'large'>('compact');
  const [selectedDate, setSelectedDate] = useState<string>(today.format('YYYY-MM-DD'));
  const [yearMonth, setYearMonth] = useState<{year:number; month:number}>({
    year: today.year(),
    month: today.month() + 1,
  });

  // 일정 코드 정보 조회
  const [scheduleCodeList, setScheduleCodeList] = useState<ScheduleCode[]>([]);

  // 서버 일정
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);

  const [calendarMeasuredH, setCalendarMeasuredH] = useState<number | undefined>(undefined);
  const [measureKey, setMeasureKey] = useState(0); // 월 바뀔 때 재측정 트리거

  // 월 변경 시 데이터 로드 (달력에 보이는 주 범위 전체를 조회해도 되지만,
  // API는 월 범위 기준이라 월 시작~끝만 조회한 뒤, 화면에서는 기간 포함으로 매핑)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { start, end } = getMonthRange(yearMonth.year, yearMonth.month);
        const scheduleCodeList: ScheduleCode[] = await ScheduleService.getScheduleCodeList();
        setScheduleCodeList(scheduleCodeList);
        const list = await ScheduleService.getMonthlySchedule(start, end);
        setSchedules(list);
      } catch (e) {
        console.warn('월별 일정 조회 실패:', e);
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [yearMonth.year, yearMonth.month]);

  // 날짜별 일정 맵: { 'YYYY-MM-DD': Schedule[] }
  const scheduleByDate = useMemo(() => {
    const map: Record<string, Schedule[]> = {};
    // 달력 보이는 범위(주 확장)만 미리 키 만들어두면 large 모드에서 빈 셀 접근 방지
    const { start, end } = getCalendarRange(yearMonth.year, yearMonth.month);
    let cursor = D(start);
    const endD = D(end);
    while (cursor.isBefore(endD) || cursor.isSame(endD, 'day')) {
      map[fmt(cursor)] = [];
      cursor = cursor.add(1, 'day');
    }
    // 일정들을 기간으로 펼쳐서 맵에 넣기
    for (const item of schedules) {
      const s = item.startDate.split('T')[0];
      const e = item.endDate.split('T')[0];
      let d = D(s);
      const eD = D(e);
      while (d.isBefore(eD) || d.isSame(eD, 'day')) {
        const key = fmt(d);
        if (!map[key]) map[key] = [];
        map[key].push(item);
        d = d.add(1, 'day');
      }
    }
    // 각 날짜별 표시 순서 간단화(종일 먼저)
    Object.keys(map).forEach(k => {
      map[k].sort((a,b) => {
        const aAll = !!a.isAllDay, bAll = !!b.isAllDay;
        if (aAll !== bAll) return aAll ? -1 : 1;
        return (a.startDate || '').localeCompare(b.startDate || '');
      });
    });
    return map;
  }, [schedules, yearMonth.year, yearMonth.month]);

  // compact 모드용 dot 표시 + 선택 표시
  const markedDates = useMemo(() => {
    const marks: Record<string, any> = {};
    // dot
    Object.keys(scheduleByDate).forEach(dateStr => {
      if (scheduleByDate[dateStr]?.length) {
        marks[dateStr] = { marked: true, dotColor: tint };
      }
    });
    // selected
    marks[selectedDate] = {
      ...(marks[selectedDate] || {}),
      selected: true,
      selectedColor: tint,
      selectedTextColor: onPrimary,
    };
    return marks;
  }, [scheduleByDate, selectedDate, tint, onPrimary]);

  const onDayPress = (day: { dateString: string }) => setSelectedDate(day.dateString);
  const onMonthChange = (m: { year: number; month: number }) => {
    setYearMonth({ year: m.year, month: m.month });
    setCalendarMeasuredH(undefined);
    setMeasureKey((k) => k + 1);
  };
  const toggleView = () => setViewMode((p) => (p === 'compact' ? 'large' : 'compact'));
  const goToToday = () => {
    const t = dayjs();
    setSelectedDate(t.format('YYYY-MM-DD'));
    setYearMonth({ year: t.year(), month: t.month() + 1 });
  };

  // large 모드 day cell
  const DayCell = ({ date }: any) => {
    const dStr = date.dateString;
    const d = dayjs(dStr);
    const isToday = d.isSame(today, 'day');
    const isSelected = dStr === selectedDate;
    const dow = d.day();
    const isSun = dow === 0; const isSat = dow === 6;

    const items = scheduleByDate[dStr] || [];
    const preview = items.slice(0, 3);

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[
          styles.dayCell,
          { borderColor, backgroundColor: surface },
          isSelected && { borderColor: tint, borderWidth: 2 },
          isToday && { backgroundColor: surfaceToday },
        ]}
        onPress={() => onDayPress(date)}
      >
        <ThemedText
          style={[
            styles.dayNumber,
            isSun && { color: danger },
            isSat && { color: link },
            isSelected && { color: tint, fontWeight: '700' },
          ]}
        >
          {d.date()}
        </ThemedText>

        <View style={{ gap: 4, marginTop: 6 }}>
          {preview.map((s, i) => (
            <View
              key={(s.scheduleSeq ?? s.personalScheduleSeq ?? i).toString() + '-' + i}
              style={[
                styles.badge,
                { backgroundColor: getScheduleColor(s, scheduleCodeList, tint) },
              ]}
            >
              <ThemedText style={styles.badgeText} numberOfLines={1}>
                {s.title || (s.personalScheduleType ?? '일정')}
              </ThemedText>
            </View>
          ))}
          {items.length > 3 && (
            <ThemedText style={[styles.moreText]} numberOfLines={1}>
              +{items.length - 3}개 더보기
            </ThemedText>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // 하단 리스트: 선택된 날짜 일정
  const selectedList = useMemo(() => scheduleByDate[selectedDate] || [], [scheduleByDate, selectedDate]);

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Controls */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: tint }]} onPress={toggleView}>
            <ThemedText style={[styles.primaryBtnText, { color: onPrimary }]}>{viewMode === 'compact' ? '크게 보기' : '작게 보기'}</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.ghostBtn, { borderColor }]} onPress={goToToday}>
            <ThemedText style={styles.ghostBtnText}>오늘</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Calendar */}
        <View style={[styles.calendarWrap, { borderColor }]}>
        {viewMode === 'large' ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled>
            <View
              // Calendar 바깥 래퍼의 onLayout은 안의 실제 컨텐츠 높이를 돌려줍니다
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                if (!calendarMeasuredH || Math.abs(calendarMeasuredH - h) > 1) {
                  setCalendarMeasuredH(h);
                }
              }}
              // key를 바꿔서 월 변경 시 강제 재렌더(측정 초기화)
              key={`measure-${measureKey}`}
              style={{ alignSelf: 'flex-start' }} // 가로 스크롤 시 자연 폭 유지
            >
              <Calendar
                key={`${viewMode}-${yearMonth.year}-${yearMonth.month}`}
                current={`${yearMonth.year}-${String(yearMonth.month).padStart(2, '0')}-01`}
                onDayPress={onDayPress}
                onMonthChange={onMonthChange}
                markedDates={{}}
                hideExtraDays={false}
                enableSwipeMonths={false}
                dayComponent={DayCell}
                renderArrow={(direction) => (
                  <View style={[styles.arrow, { backgroundColor: tint }]}>
                    <ThemedText style={[styles.arrowText, { color: onPrimary }]}>
                      {direction === 'left' ? '◀' : '▶'}
                    </ThemedText>
                  </View>
                )}
                theme={{
                  backgroundColor,
                  calendarBackground: backgroundColor,
                  textSectionTitleColor: textColor,
                  selectedDayTextColor: onPrimary,
                  todayTextColor: tint,
                  dayTextColor: textColor,
                  textDisabledColor: tabIconDefault,
                  arrowColor: tint,
                  monthTextColor: textColor,
                  textDayFontWeight: '600',
                  textMonthFontWeight: '700',
                  textDayHeaderFontWeight: '600',
                  textDayFontSize: 16,
                  textMonthFontSize: 18,
                  textDayHeaderFontSize: 12,
                }}
                // ★ 여기서 높이를 “측정값”으로만 세팅 (수식/상수 없음)
                style={[
                  styles.calendar,
                  { width: 820 },
                  calendarMeasuredH ? { height: calendarMeasuredH } : null,
                ]}
              />
            </View>
          </ScrollView>
        ) : (
          <Calendar
            key={`${viewMode}-${yearMonth.year}-${yearMonth.month}`}
            current={`${yearMonth.year}-${String(yearMonth.month).padStart(2, '0')}-01`}
            onDayPress={onDayPress}
            onMonthChange={onMonthChange}
            markedDates={markedDates}
            hideExtraDays={false}
            enableSwipeMonths={false}
            renderArrow={(direction) => (
              <View style={[styles.arrow, { backgroundColor: tint }]}>
                <ThemedText style={[styles.arrowText, { color: onPrimary }]}>
                  {direction === 'left' ? '◀' : '▶'}
                </ThemedText>
              </View>
            )}
            theme={{
              backgroundColor,
              calendarBackground: backgroundColor,
              textSectionTitleColor: textColor,
              selectedDayTextColor: onPrimary,
              todayTextColor: tint,
              dayTextColor: textColor,
              textDisabledColor: tabIconDefault,
              arrowColor: tint,
              monthTextColor: textColor,
              textDayFontWeight: '600',
              textMonthFontWeight: '700',
              textDayHeaderFontWeight: '600',
              textDayFontSize: 14,
              textMonthFontSize: 16,
              textDayHeaderFontSize: 11,
            }}
            style={[styles.calendar, { width: '100%' }]}
          />
        )}
      </View>

        {/* Selected date list */}
        <ThemedView style={[styles.listWrap, { borderColor }]}>
          <View style={styles.listHeader}>
            <ThemedText style={styles.listTitle}>선택한 날짜: {selectedDate}</ThemedText>
            {loading && <ThemedText style={{ opacity: 0.6 }}>불러오는 중…</ThemedText>}
          </View>

          {selectedList.length === 0 ? (
            <View style={styles.emptyBox}>
              <ThemedText style={{ opacity: 0.6 }}>등록된 일정이 없습니다.</ThemedText>
            </View>
          ) : (
            <FlatList
              data={selectedList}
              keyExtractor={(item, idx) => (item.scheduleSeq ?? item.personalScheduleSeq ?? idx).toString() + '-' + idx}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              scrollEnabled={false}
              renderItem={({ item }) => {
                const color = getScheduleColor(item, scheduleCodeList, tint);
                // 시간 표기(개인/종일은 간단 표기)
                let timeStr: string | null = null;
                if (item.isPersonal || item.personal) {
                  timeStr = null;
                } else if (item.isAllDay) {
                  timeStr = '종일';
                } else {
                  const s = new Date(item.startDate);
                  const e = new Date(item.endDate);
                  const pad = (n: number) => n.toString().padStart(2, '0');
                  timeStr = `${pad(s.getHours())}:${pad(s.getMinutes())} ~ ${pad(e.getHours())}:${pad(e.getMinutes())}`;
                }
                return (
                  <View style={[styles.card, { borderColor }]}>
                    <View style={[styles.colorBar, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.cardTitle} numberOfLines={1}>
                        {item.title || item.personalScheduleType || '제목 없음'}
                      </ThemedText>
                      {!!timeStr && (
                        <ThemedText style={styles.cardSub} numberOfLines={1}>{timeStr}</ThemedText>
                      )}
                      {!!item.place && (
                        <ThemedText style={styles.cardSub} numberOfLines={1}>📍 {item.place}</ThemedText>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Styles
// ────────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 24 },
  controlsRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  primaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { fontWeight: '700' },
  ghostBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  ghostBtnText: { fontWeight: '700' },

  calendarWrap: { borderWidth: 1, borderRadius: 12, marginBottom: 12 },
  calendar: { padding: 8 },
  arrow: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, minWidth: 40, alignItems: 'center' },
  arrowText: { fontWeight: '700' },

  dayCell: { height: 120, width: 110, borderWidth: 1, borderRadius: 8, padding: 6, margin: 2, justifyContent: 'flex-start' },
  dayNumber: { fontSize: 16, fontWeight: '700' },
  badge: { height: 20, borderRadius: 4, justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 11, color: '#fff', fontWeight: '600' },
  moreText: { fontSize: 11, opacity: 0.7 },

  listWrap: { padding: 12, borderRadius: 10, borderWidth: 1 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  listTitle: { fontWeight: '700' },
  emptyBox: { paddingVertical: 20, alignItems: 'center' },

  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 10, gap: 10 },
  colorBar: { width: 6, height: '100%', borderRadius: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardSub: { fontSize: 12, opacity: 0.75 },
});
