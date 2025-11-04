// components/chat/sheets/ReadStatusSheet.tsx
import { MemberService } from '@/api/memberService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;

  // 데이터
  readSeqs: number[];
  unreadSeqs: number[];

  // 타이틀 커스터마이징(선택)
  title?: string;
};

export default function ReadStatusSheet({
  visible,
  onClose,
  readSeqs,
  unreadSeqs,
  title = '읽음 상태',
}: Props) {
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouch} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: c.chat.sheetBg,
              borderColor: c.border,
              paddingBottom: Math.max(12, insets.bottom + 12),
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.chat.sheetHandle }]} />
          <Text style={[styles.title, { color: c.text }]}>{title}</Text>

          {/* 읽음 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done" size={14} color={c.textDim} />
              <Text style={[styles.sectionTitle, { color: c.textDim }]}>
                읽음 ({readSeqs.length})
              </Text>
            </View>

            {readSeqs.length > 0 && (
              <ScrollView style={{ maxHeight: 180 }}>
                <View style={styles.chips}>
                  {readSeqs.map((seq) => (
                    <View
                      key={seq}
                      style={[styles.chip, { backgroundColor: c.chat.chipBg }]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: MemberService.getMemberProfileColor(seq) },
                        ]}
                      />
                      <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                        {MemberService.getMemberName(seq)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          {/* 안 읽음 */}
          <View style={{ marginTop: 16 }}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={14} color={c.textDim} />
              <Text style={[styles.sectionTitle, { color: c.textDim }]}>
                안 읽음 ({unreadSeqs.length})
              </Text>
            </View>

            {unreadSeqs.length === 0 ? (
              <Text style={[styles.emptyText, { color: c.textDim }]}>모두 읽었어요.</Text>
            ) : (
              <ScrollView style={{ maxHeight: 180 }}>
                <View style={styles.chips}>
                  {unreadSeqs.map((seq) => (
                    <View
                      key={seq}
                      style={[styles.chip, { backgroundColor: c.chat.chipBg }]}
                    >
                      <View
                        style={[
                          styles.dot,
                          { backgroundColor: MemberService.getMemberProfileColor(seq) },
                        ]}
                      />
                      <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                        {MemberService.getMemberName(seq)}
                      </Text>
                    </View>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>

          <Pressable
            onPress={onClose}
            style={[styles.closeBtn, { borderColor: c.border }]}
          >
            <Text style={[styles.closeBtnText, { color: c.text }]}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.45)' },
  overlayTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 999, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  section: { marginTop: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '600' },
  emptyText: { fontSize: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  dot: { width: 12, height: 12, borderRadius: 999, marginRight: 6 },
  chipText: { fontSize: 13, maxWidth: 180 },

  closeBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});
