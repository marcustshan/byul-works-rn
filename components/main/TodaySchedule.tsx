import ScheduleService, { Schedule } from '@/api/schedule/scheduleService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Fonts } from '@/constants/theme';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, useColorScheme } from 'react-native';

interface TodayScheduleProps {
  // 필요한 경우 props 추가
}

export default function TodaySchedule(props: TodayScheduleProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const scheme = (useColorScheme() ?? 'light') as 'light' | 'dark';
  const C = Colors[scheme];
  const styles = useMemo(() => makeStyles(C), [scheme]);

  useEffect(() => {
    fetchTodaySchedule();
  }, []);

  // 오늘 일정 조회
  const fetchTodaySchedule = async () => {
    setIsLoading(true);
    
    try {
      const data = await ScheduleService.getTodaySchedule();
      
      // 데이터 유효성 검사
      if (!data || !Array.isArray(data)) {
        setSchedules([]);
        return;
      }
      
      setSchedules(data);
    } catch (error: any) {
      Alert.alert('오류', error.message || '오늘의 일정을 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // 시간 형식 변환 함수
  const formatTime = (dateString: string): string => {
    try {
      return dayjs(dateString).format('HH:mm');
    } catch {
      return '시간 오류';
    }
  };

  // 일정 카드 렌더링
  const renderScheduleCard = (item: Schedule) => (
    <ThemedView key={item.scheduleSeq} style={[styles.scheduleCard, { backgroundColor: C.surface, borderColor: C.border }]}>
      <ThemedView style={styles.cardHeader}>
        <ThemedText style={[styles.scheduleTitle, { color: C.text, fontFamily: Fonts.sans }]} numberOfLines={2}>
          {item.title}
        </ThemedText>
        <ThemedView style={[styles.codeBadge, { backgroundColor: C.surfaceMuted }]}>
          <ThemedView 
            style={[
              styles.colorIndicator, 
              { backgroundColor: item.codeColor || C.primary }
            ]} 
          />
          <ThemedText style={[styles.codeText, { color: C.text, fontFamily: Fonts.sans }]}>
            {item.codeName || '일정'}
          </ThemedText>
        </ThemedView>
      </ThemedView>
      
      <ThemedView style={styles.codeSubNameContainer}>
        <ThemedText style={[styles.codeSubNameText, { color: C.textDim, fontFamily: Fonts.sans }]}>
          {item.codeSubName || ''}
        </ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.timeContainer}>
        <ThemedText style={[styles.timeLabel, { color: C.textDim, fontFamily: Fonts.sans }]}>시간 :</ThemedText>
        <ThemedText style={[styles.timeValue, { color: C.text, fontFamily: Fonts.sans }]}>
          {item.isAllDay ? '종일' : `${formatTime(item.startDate)} - ${formatTime(item.endDate)}`}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );

  // 빈 상태 렌더링
  const renderEmptyState = () => (
    <ThemedView style={styles.emptyContainer}>
      <ThemedText style={[styles.emptyTitle, { color: C.text, fontFamily: Fonts.sans }]}>오늘의 일정이 없습니다</ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: C.textDim, fontFamily: Fonts.sans }]}>새로운 일정을 추가해보세요</ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: C.background }]}>
      {/* 로딩 상태 */}
      {isLoading && (
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <ThemedText style={[styles.loadingText, { color: C.textDim, fontFamily: Fonts.sans }]}>오늘의 일정을 불러오는 중...</ThemedText>
        </ThemedView>
      )}

      {/* 일정 목록 */}
      {!isLoading && (
        <ThemedView style={styles.schedulesSection}>
          {schedules.length > 0 ? (
            <ThemedView style={styles.listContainer}>
              {schedules.map((item) => renderScheduleCard(item))}
            </ThemedView>
          ) : (
            renderEmptyState()
          )}
        </ThemedView>
      )}
    </ThemedView>
  );
}

const makeStyles = (C: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    loadingContainer: {
      padding: 20,
      alignItems: 'center',
    },
    loadingText: {
      marginTop: 10,
      fontSize: 14,
    },
    schedulesSection: {
      flex: 1,
    },
    listContainer: {
      paddingBottom: 10,
    },
    scheduleCard: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      marginBottom: 8,
      borderRadius: 8,
      borderWidth: StyleSheet.hairlineWidth,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 3.84,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    scheduleTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      flex: 1,
      marginRight: 8,
    },
    codeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      minWidth: 60,
    },
    colorIndicator: {
      width: 12,
      height: 12,
      borderRadius: 6,
      marginRight: 6,
    },
    codeText: {
      fontSize: 12,
      fontWeight: '600',
    },
    codeSubNameContainer: {
      marginBottom: 0,
    },
    codeSubNameText: {
      fontSize: 13,
      fontStyle: 'italic',
    },
    timeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    timeLabel: {
      fontSize: 14,
      fontWeight: '600',
      marginRight: 8,
    },
    timeValue: {
      fontSize: 14,
      fontWeight: '500',
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 40,
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
    },
    emptySubtitle: {
      fontSize: 14,
    },
  });
