import AnnualLeave from '@/components/main/AnnualLeave';
import TodaySchedule from '@/components/main/TodaySchedule';
import WorkOnOff from '@/components/main/WorkOnOff';
import { ThemedView } from '@/components/themed-view';
import Card from "@/components/ui/Card";
import { ScrollView, StyleSheet } from 'react-native';

export default function Main() {
  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
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
    backgroundColor: 'white',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 15,
    paddingHorizontal: 0,
  },
});