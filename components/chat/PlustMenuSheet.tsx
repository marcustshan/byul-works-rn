// components/chat/PlusMenuSheet.tsx
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onPickFile: () => void;
  onOpenEmoji: () => void;
};

export default function PlusMenuSheet({
  visible,
  onClose,
  onPickImage,
  onPickFile,
  onOpenEmoji,
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const Item = ({
    icon,
    label,
    onPress,
  }: { icon: any; label: string; onPress: () => void }) => (
    <Pressable
      style={({ pressed }) => [
        styles.item,
        pressed && { backgroundColor: c.surfaceMuted },
      ]}
      onPress={() => {
        onPress();
      }}
    >
      <Ionicons name={icon} size={18} color={c.icon} style={{ width: 24 }} />
      <Text style={[styles.label, { color: c.text }]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Item icon="image" label="이미지" onPress={onPickImage} />
            <Item icon="document-text" label="파일" onPress={onPickFile} />
            <Item icon="happy" label="이모티콘" onPress={onOpenEmoji} />
            <Pressable
              onPress={onClose}
              style={[styles.cancel, { backgroundColor: c.surface }]}
            >
              <Text style={[styles.cancelLabel, { color: c.text }]}>닫기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheetWrap: { padding: 12 },
  sheet: {
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  label: { fontSize: 16, fontWeight: '600', marginLeft: 6 },
  cancel: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: { fontSize: 16, fontWeight: '700' },
});
