import WorkOnOffService, { WeeklyWorkOnOffResponse, WorkType, workTypes } from '@/api/workOnOff/workOnOffService';
import { ThemedText } from '@/components/themed-text';
import { Colors, Fonts } from '@/constants/theme';
import dayjs, { Dayjs } from 'dayjs';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

/* ------------------------ utils (component 밖) ------------------------ */
const KOREAN_WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

const fmtDateTime = (date: Dayjs, time: string) => `${date.format('YYYY-MM-DD')} ${time}`;
const fmtDisplayDate = (date: Dayjs) => `${date.format('YYYY년 MM월 DD일')} (${KOREAN_WEEKDAYS[date.day()]})`;

const getWeekRange = (date: Dayjs) => ({
  start: date.startOf('week'),
  end: date.endOf('week'),
});

const calcWorkHours = (workOnTime?: string | null, workOffTime?: string | null): string => {
  if (!workOnTime || !workOffTime) return '기록 없음';
  const on = dayjs(workOnTime);
  const off = dayjs(workOffTime);
  if (!on.isValid() || !off.isValid()) return '날짜 형식 오류';
  const mins = off.diff(on, 'minute');
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h && m ? `${h}시간 ${m}분` : h ? `${h}시간` : `${m}분`;
};

type WeeklyCard = {
  date: Dayjs;
  dateStr: string;
  record: WeeklyWorkOnOffResponse[number] | null;
  isToday: boolean;
  isWeekend: boolean;
};

const buildWeeklyRecords = (weekData: WeeklyWorkOnOffResponse | null, weekStart: Dayjs): WeeklyCard[] => {
  if (!weekData) return [];
  const out: WeeklyCard[] = [];
  for (let i = 0; i < 7; i++) {
    const d = weekStart.add(i, 'day');
    const dateStr = d.format('YYYY-MM-DD');
    const record = weekData.find((r) => r.theDate === dateStr) ?? null;
    const isWeekend = d.day() === 0 || d.day() === 6;
    // 주말은 기록 있을 때만 노출
    if (isWeekend && (!record || !record.workOnTime)) continue;
    out.push({
      date: d,
      dateStr,
      record,
      isToday: d.isSame(dayjs(), 'day'),
      isWeekend,
    });
  }
  return out;
};

/* ----------------------------- component ------------------------------ */
export default function WorkOnOff() {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [weeklyData, setWeeklyData] = useState<WeeklyWorkOnOffResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkType, setSelectedWorkType] = useState<WorkType>('본사');
  const [showWorkTypeModal, setShowWorkTypeModal] = useState(false);
  const router = useRouter();

  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];
  const styles = useMemo(() => makeStyles(C), [scheme]);

  const { start, end } = useMemo(() => getWeekRange(currentDate), [currentDate]);

  const todayState = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD');
    const todayRecord = weeklyData?.find((r) => r.theDate === todayStr) ?? null;
    const isWeekend = [0, 6].includes(dayjs().day());
    return {
      todayRecord,
      canCheckOut: Boolean(todayRecord?.workOnTime && !todayRecord?.workOffTime),
      canCheckIn: !todayRecord && !isWeekend,
      effectiveWorkType: (todayRecord?.workType ?? selectedWorkType) as WorkType,
    };
  }, [weeklyData, selectedWorkType]);

  const weeklyRecords = useMemo(() => buildWeeklyRecords(weeklyData, start), [weeklyData, start]);

  const showAuthOrError = useCallback(
    (error: any, fallbackMsg: string) => {
      if (error?.requiresLogin) {
        Alert.alert('로그인 필요', '로그인이 필요합니다. 로그인 화면으로 이동합니다.', [
          { text: '확인', onPress: () => router.replace('/login') },
        ]);
      } else {
        Alert.alert('오류', error?.message || fallbackMsg);
      }
    },
    [router],
  );

  const fetchWeeklyData = useCallback(
    async (target: Dayjs) => {
      setIsLoading(true);

      try {
        const { start: s, end: e } = getWeekRange(target);
        const data = await WorkOnOffService.getWeeklyWorkOnOff(fmtDateTime(s, '00:00'), fmtDateTime(e, '23:59'));
        console.log('data', data);
        setWeeklyData(data);
      } catch (e: any) {
        showAuthOrError(e, '출퇴근 기록을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    },
    [showAuthOrError],
  );

  // 주 변경 시 데이터 로드
  useEffect(() => {
    fetchWeeklyData(currentDate);
  }, [currentDate, fetchWeeklyData]);

  const goToPreviousWeek = useCallback(() => setCurrentDate((d) => d.subtract(1, 'week')), []);
  const goToNextWeek = useCallback(() => setCurrentDate((d) => d.add(1, 'week')), []);

  const handleCheckIn = useCallback(() => {
    Alert.alert('출근 확인', `${todayState.effectiveWorkType}으로 출근하시겠습니까?`, [
      { text: '취소', style: 'cancel' },
      {
        text: '확인',
        onPress: async () => {
          try {
            await WorkOnOffService.workOn(todayState.effectiveWorkType);
            Alert.alert('성공', '출근이 완료되었습니다.');
            fetchWeeklyData(currentDate);
          } catch (e: any) {
            Alert.alert('오류', e?.message || '출근 처리에 실패했습니다.');
          }
        },
      },
    ]);
  }, [todayState.effectiveWorkType, currentDate, fetchWeeklyData]);

  const handleWorkTypeChange = useCallback(
    (workType: WorkType) => {
      const seq = todayState.todayRecord?.workOnTimeSeq;
      if (!seq) return Alert.alert('오류', '출근 기록을 찾을 수 없습니다.');
      if (todayState.todayRecord?.workType === workType) return Alert.alert('알림', '이미 선택된 근무형태입니다.');
      Alert.alert('근무형태 변경', `근무형태를 ${workType}(으)로 변경하시겠습니까?`, [
        { text: '취소', style: 'cancel' },
        {
          text: '확인',
          onPress: async () => {
            try {
              await WorkOnOffService.changeWorkStatus(seq, workType);
              Alert.alert('성공', '근무형태가 변경되었습니다.');
              fetchWeeklyData(currentDate);
            } catch (e: any) {
              Alert.alert('오류', e?.message || '근무형태 변경에 실패했습니다.');
            }
          },
        },
      ]);
    },
    [todayState.todayRecord, currentDate, fetchWeeklyData],
  );

  const handleCheckOut = useCallback(async () => {
    const seq = todayState.todayRecord?.workOnTimeSeq;
    if (!seq) return Alert.alert('오류', '출근 기록을 찾을 수 없습니다.');
    try {
      const isEarly = await WorkOnOffService.checkEarlyLeave(seq);
      Alert.alert(isEarly ? '조퇴 확인' : '퇴근 확인', isEarly ? '조퇴 처리됩니다. 계속하시겠습니까?' : '퇴근하시겠습니까?', [
        { text: '취소', style: 'cancel' },
        { text: '확인', onPress: async () => {
          try {
            await WorkOnOffService.workOff(seq);
            Alert.alert('성공', '퇴근이 완료되었습니다.');
            fetchWeeklyData(currentDate);
          } catch (e: any) {
            Alert.alert('오류', e?.message || '퇴근 처리에 실패했습니다.');
          }
        }},
      ]);
    } catch (e: any) {
      Alert.alert('오류', e?.message || '퇴근 가능 여부 확인에 실패했습니다.');
    }
  }, [todayState.todayRecord, currentDate, fetchWeeklyData]);

  return (
    <View style={[styles.workOnOffContainer, { backgroundColor: C.background }]}>
      {/* 주간 네비게이션 */}
      <View style={[styles.navigationContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
        <TouchableOpacity style={[styles.navButton, { backgroundColor: C.primary }]} onPress={goToPreviousWeek} disabled={isLoading}>
          <Text style={[styles.navButtonText, { color: C.onPrimary, fontFamily: Fonts.sans }]}>◀</Text>
        </TouchableOpacity>

        <View style={styles.dateContainer}>
          <Text style={[styles.dateText, { color: C.text, fontFamily: Fonts.sans }]}>{fmtDisplayDate(currentDate)}</Text>
          <Text style={[styles.weekRangeText, { color: C.textDim, fontFamily: Fonts.sans }]}>
            {start.format('MM/DD')} ~ {end.format('MM/DD')}
          </Text>
        </View>

        <TouchableOpacity style={[styles.navButton, { backgroundColor: C.primary }]} onPress={goToNextWeek} disabled={isLoading}>
          <Text style={[styles.navButtonText, { color: C.onPrimary, fontFamily: Fonts.sans }]}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 출근/퇴근 CTA */}
      {!isLoading && (todayState.canCheckIn || todayState.canCheckOut) && (
        <View style={styles.centerRow}>
          <View style={styles.workTypeContainer}>
            <TouchableOpacity
              style={[styles.workTypeButton, { backgroundColor: C.surface, borderColor: C.border }]}
              onPress={() => setShowWorkTypeModal(true)}
            >
              <Text style={[styles.workTypeButtonText, { color: C.text }]}>{todayState.effectiveWorkType}</Text>
              <Text style={[styles.workTypeButtonText, { color: C.text }]}>▼</Text>
            </TouchableOpacity>

            {todayState.canCheckIn ? (
              <TouchableOpacity style={[styles.actionButton, { backgroundColor: C.success }]} onPress={handleCheckIn}>
                <ThemedText style={[styles.actionButtonText, { color: C.onPrimary }]}>출근하기</ThemedText>
              </TouchableOpacity>
            ) : (
              todayState.canCheckOut && (
                <TouchableOpacity style={[styles.actionButton, { backgroundColor: C.primary }]} onPress={handleCheckOut}>
                  <ThemedText style={[styles.actionButtonText, { color: C.onPrimary }]}>퇴근하기</ThemedText>
                </TouchableOpacity>
              )
            )}
          </View>
        </View>
      )}

      {/* 로딩 */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.textDim }]}>주간 출퇴근 기록을 불러오는 중...</Text>
        </View>
      )}

      {/* 주간 기록 */}
      {!isLoading && (
        <View style={styles.recordsSection}>
          <View style={styles.gridContainer}>
            {weeklyRecords.map((d, i) => {
              const isWeekend = d.isWeekend;
              const baseCard = [
                styles.dayRecordItem,
                { backgroundColor: C.surface, borderColor: C.border },
                isWeekend && { backgroundColor: C.surfaceMuted, borderColor: C.borderMuted },
                d.isToday && { backgroundColor: C.surfaceToday, borderColor: C.success },
              ];
              const dateColor = isWeekend ? C.textMuted : C.text;

              return (
                <View key={d.dateStr ?? i} style={baseCard}>
                  <View style={styles.dayHeader}>
                    <Text style={[styles.dayDate, { color: dateColor }]}>{d.date.format('MM/DD')}</Text>
                    <Text style={[styles.dayName, { color: dateColor }]}>{KOREAN_WEEKDAYS[d.date.day()]}</Text>
                    {d.isToday && (
                      <View style={[styles.todayBadge, { backgroundColor: C.success }]}>
                        <Text style={[styles.todayBadgeText, { color: C.onPrimary }]}>오늘</Text>
                      </View>
                    )}
                  </View>

                  {d.record ? (
                    <View style={styles.recordDetails}>
                      <Row label="출근" value={dayjs(d.record.workOnTime).format('HH:mm')} color={C.text} dim={C.textDim} />
                      <Row label="퇴근" value={d.record.workOffTime ? dayjs(d.record.workOffTime).format('HH:mm') : '기록 없음'} color={C.text} dim={C.textDim} />
                      {d.record.workOffTime && (
                        <Row label="근무시간" value={calcWorkHours(d.record.workOnTime, d.record.workOffTime)} color={C.text} dim={C.textDim} />
                      )}
                      <Row label="근무유형" value={d.record.workType} color={C.text} dim={C.textDim} />

                      {(d.record.isLate || d.record.isLeaveEarly) && (
                        <View style={styles.alertContainer}>
                          {d.record.isLate && <Text style={[styles.alertText, { color: C.danger }]}>⚠️ 지각</Text>}
                          {d.record.isLeaveEarly && <Text style={[styles.alertText, { color: C.danger }]}>⚠️ 조퇴</Text>}
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.noRecord}>
                      <Text style={[styles.noRecordText, { color: C.textMuted }]}>기록 없음</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* 근무형태 선택 모달 */}
      <Modal visible={showWorkTypeModal} transparent animationType="fade" onRequestClose={() => setShowWorkTypeModal(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: C.overlay }]}>
          <View style={[styles.modalContainer, { backgroundColor: C.surface, borderColor: C.border }]}>
            <Text style={[styles.modalTitle, { color: C.text }]}>근무형태 선택</Text>
            {workTypes.map((workType) => {
              const { canCheckIn, effectiveWorkType } = todayState;
              const isCurrent = effectiveWorkType === workType;
              return (
                <TouchableOpacity
                  key={workType}
                  style={[
                    styles.modalItem,
                    { backgroundColor: isCurrent ? C.surfaceToday : C.surface, borderColor: isCurrent ? C.primary : C.border },
                  ]}
                  onPress={() => {
                    if (canCheckIn) setSelectedWorkType(workType);
                    else handleWorkTypeChange(workType);
                    setShowWorkTypeModal(false);
                  }}
                >
                  <Text style={[styles.modalItemText, { color: isCurrent ? C.primary : C.text }]}>{workType}</Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={[styles.modalCloseButton, { borderColor: C.border }]} onPress={() => setShowWorkTypeModal(false)}>
              <Text style={[styles.modalCloseButtonText, { color: C.text }]}>취소</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* ------------------------------- sub view ------------------------------ */
const Row = memo(function Row({
  label,
  value,
  color,
  dim,
}: {
  label: string;
  value: string;
  color: string;
  dim: string;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
      <Text style={{ fontSize: 12, color: dim }}>{label}</Text>
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{value}</Text>
    </View>
  );
});

/* -------------------------------- styles ------------------------------- */
const makeStyles = (_C: any) =>
  StyleSheet.create({
    workOnOffContainer: {},
    navigationContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 10,
      borderRadius: 8,
      marginBottom: 0,
      marginHorizontal: 0,
      borderWidth: StyleSheet.hairlineWidth,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    navButton: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      minWidth: 40,
      alignItems: 'center',
    },
    navButtonText: { fontSize: 14, fontWeight: '600' },
    dateContainer: { flex: 1, alignItems: 'center' },
    dateText: { fontSize: 14, fontWeight: 'bold' },
    weekRangeText: { fontSize: 12, marginTop: 4 },
    loadingContainer: { padding: 20, alignItems: 'center' },
    loadingText: { marginTop: 10, fontSize: 14 },
    recordsSection: { marginTop: 0, paddingHorizontal: 0 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    dayRecordItem: { flexDirection: 'column', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, width: '48%', marginBottom: 8, borderRadius: 8 },
    dayHeader: { flexDirection: 'row', alignItems: 'center' },
    dayDate: { fontSize: 14, fontWeight: '600' },
    dayName: { fontSize: 14, marginLeft: 8 },
    todayBadge: { borderRadius: 5, marginLeft: 10, paddingHorizontal: 6, paddingVertical: 2 },
    todayBadgeText: { fontSize: 10, fontWeight: '700' },
    recordDetails: { flexDirection: 'column', marginTop: 8 },
    noRecord: { alignItems: 'center', paddingVertical: 12 },
    noRecordText: { fontSize: 14 },
    alertContainer: { flexDirection: 'row', marginTop: 8, gap: 6 },
    alertText: { fontSize: 12, fontWeight: '700' },
    centerRow: { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
    actionButton: {
      paddingHorizontal: 6,
      paddingVertical: 6,
      borderRadius: 8,
      minWidth: 100,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
    workTypeContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    workTypeButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      borderWidth: 1,
      minWidth: 88,
    },
    workTypeButtonText: { fontSize: 14, fontWeight: '500' },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContainer: { borderRadius: 12, padding: 20, width: '80%', maxWidth: 320, borderWidth: StyleSheet.hairlineWidth },
    modalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
    modalItem: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, marginBottom: 8 },
    modalItemText: { fontSize: 16, textAlign: 'center' },
    modalCloseButton: { marginTop: 16, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
    modalCloseButtonText: { fontSize: 16, fontWeight: '600' },
  });
