import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import React from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';

interface LoadingProgressProps {
  /** 로딩 스피너를 표시할지 여부 */
  showSpinner?: boolean;
  /** 로딩 메시지 텍스트 */
  message?: string;
  /** 스피너 크기 */
  size?: 'small' | 'large';
  /** 스피너 색상 */
  color?: string;
  /** 전체 컨테이너 스타일 */
  containerStyle?: any;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  showSpinner = true,
  message,
  size = 'large',
  color,
  containerStyle,
}) => {
  if (!showSpinner) {
    return null;
  }

  return (
    <ThemedView style={[styles.container, containerStyle]}>
      <ActivityIndicator 
        size={size} 
        color={color}
        style={styles.spinner}
      />
      {message && (
        <ThemedText style={styles.message}>
          {message}
        </ThemedText>
      )}
    </ThemedView>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  spinner: {
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.7,
  },
});
