import AnnualLeave from '@/components/main/AnnualLeave';
import TodaySchedule from '@/components/main/TodaySchedule';
import WorkOnOff from '@/components/main/WorkOnOff';
import { ThemedView } from '@/components/themed-view';
import Card from '@/components/ui/Card';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';

export default function Main() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // 동적 스타일(테마 적용)
  const containerStyle: ViewStyle = { backgroundColor: colors.background };
  const scrollViewStyle: ViewStyle = { backgroundColor: colors.background };
  const scrollContentStyle: ViewStyle = {
    paddingVertical: 16,
    paddingHorizontal: 0,
    rowGap: 12, // RN 0.71+ 지원. 낮은 버전이면 카드 사이에 marginBottom 사용
  };

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <ScrollView
        style={[styles.scrollView, scrollViewStyle]}
        contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {/* Card 내부 배경/테두리는 Card 컴포넌트가 colors.surface / colors.border를 사용하도록 해두면 완벽 */}
        <Card title="출퇴근 관리">
          <WorkOnOff />
        </Card>

        <Card title="연차 기록">
          <AnnualLeave />
        </Card>

        <Card title="오늘의 일정">
          <TodaySchedule />
        </Card>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // 배경은 테마로 주입 (여기서 고정값 쓰지 않기)
  },
  scrollView: {
    flex: 1,
    // 배경은 테마로 주입
  },
  scrollContent: {
    // 패딩/간격은 위에서 동적으로 주입
  },
});
