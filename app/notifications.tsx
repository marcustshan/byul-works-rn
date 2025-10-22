import React from 'react';
import {
  StyleSheet
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export default function NotificationScreen() {
  return (
    <ThemedView>
      <ThemedText>알림 화면</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  
});
