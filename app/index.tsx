import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function LandingScreen() {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Byul Works</ThemedText>
      <ThemedText>간단한 랜딩 페이지입니다.</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
});


