import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

// ⬇️ 변경: react-native의 useColorScheme 대신 우리 컨텍스트 훅 사용
import { Toast } from '@/components/common/Toast';
import { useThemePreference } from '@/hooks/use-color-scheme';

type Opt = 'system' | 'light' | 'dark';

const OPTIONS: { key: Opt; label: string; desc: string }[] = [
  { key: 'system', label: '시스템 기본', desc: '기기 테마(라이트/다크)에 자동으로 맞춤' },
  { key: 'light', label: '라이트', desc: '항상 밝은 테마' },
  { key: 'dark', label: '다크', desc: '항상 어두운 테마' },
];

export default function SettingsScreen() {
  // ⬇️ 현재 적용 중 스킴 + 사용자 선호도 + setter
  const { preference, setPreference, colorScheme } = useThemePreference(); // colorScheme: 'light' | 'dark'
  const c = Colors[colorScheme ?? 'light'];
  const router = useRouter();

  const handleThemeChange = (key: Opt) => {
    Toast.show({
      message: '테마가 변경됩니다.\n시간이 좀 걸릴 수 있습니다.',
      type: 'info',
    });
    setTimeout(() => {
      setPreference(key);
    }, 100);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={24} color={c.text} />
        </Pressable>
        <ThemedText type="title">설정</ThemedText>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle" style={styles.sectionTitle}>테마</ThemedText>
        {OPTIONS.map(opt => {
          const selected = preference === opt.key; // ⬅️ 선호도 기준으로 체크
          return (
            <Pressable
              key={opt.key}
              onPress={() => handleThemeChange(opt.key)}   // ⬅️ 실제 저장 + 적용
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.rowLeft}>
                <ThemedText style={styles.rowTitle}>{opt.label}</ThemedText>
                <ThemedText style={styles.rowDesc}>{opt.desc}</ThemedText>
              </View>
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? (colorScheme === 'dark' ? '#8AB4F8' : '#1f6feb') : c.text}
              />
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 8 },
  header: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  back: { padding: 4 },
  section: { marginTop: 12 },
  sectionTitle: { marginHorizontal: 16, marginBottom: 8 },
  row: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLeft: { flexShrink: 1, paddingRight: 12 },
  rowTitle: { fontSize: 16, fontWeight: '600' },
  rowDesc: { fontSize: 12, opacity: 0.7, marginTop: 2 },
});
