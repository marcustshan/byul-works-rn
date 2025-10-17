import WorkOnOff from '@/components/main/WorkOnOff';
import { ThemedView } from '@/components/themed-view';
import Card from "@/components/ui/Card";
import { StyleSheet } from 'react-native';

export default function Main() {
  return (
    <ThemedView style={styles.container}>
      <Card title="출퇴근 관리">
        <WorkOnOff />
      </Card>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingVertical: 15,
  },
});