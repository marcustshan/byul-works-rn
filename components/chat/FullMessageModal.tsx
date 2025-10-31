// components/chat/FullMessageModal.tsx
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  content: string;
  chatType?: 'M' | 'L' | 'F' | 'I';
};

export default function FullMessageModal({
  visible,
  onClose,
  title = '메시지',
  content,
  chatType = 'M',
}: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const [copied, setCopied] = useState(false);

  const openIfLink = () => {
    if (chatType === 'L' && content) {
      Linking.openURL(content).catch(() => {});
    }
  };

  const handleCopyAll = async () => {
    try {
      await Clipboard.setStringAsync(content ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // noop
    }
  };

  // useEffect(() => {
  //   const backAction = () => {
  //     console.log('backAction');
  //     onClose();
  //     return true;
  //   }
  //   const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);

  //   // cleanup: 언마운트 시 이벤트 해제
  //   return () => backHandler.remove();
  // }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <Pressable style={styles.touchClose} onPress={onClose} />
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

          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="닫기">
              <Ionicons name="close" size={20} color={c.textDim} />
            </Pressable>
          </View>

          {/* 본문 */}
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ paddingBottom: 8 }}>
            <Text selectable style={[styles.content, { color: c.text }]}>{content}</Text>
          </ScrollView>

          {/* 링크 타입이면 별도 버튼 */}
          {chatType === 'L' && !!content && (
            <Pressable onPress={openIfLink} style={[styles.linkBtn, { backgroundColor: c.primary }]}>
              <Ionicons name="link" size={14} color={c.onPrimary} />
              <Text style={[styles.linkBtnText, { color: c.onPrimary }]}>링크 열기</Text>
            </Pressable>
          )}

          {/* 하단 버튼 영역: 전체복사 / 닫기 */}
          <View style={styles.btnRow}>
            <Pressable
              onPress={handleCopyAll}
              style={[styles.btn, styles.btnPrimary, { backgroundColor: c.primary }]}
              accessibilityRole="button"
              accessibilityLabel="전체 복사"
            >
              <Ionicons name={copied ? 'checkmark' : 'copy'} size={14} color={c.onPrimary} />
              <Text style={[styles.btnTextPrimary, { color: c.onPrimary }]}>
                {copied ? '복사됨' : '전체복사'}
              </Text>
            </Pressable>

            <Pressable
              onPress={onClose}
              style={[styles.btn, styles.btnGhost, { borderColor: c.border }]}
              accessibilityRole="button"
              accessibilityLabel="닫기"
            >
              <Text style={[styles.btnTextGhost, { color: c.text }]}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.45)' },
  touchClose: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 999, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700' },
  content: { fontSize: 15, lineHeight: 22 },

  linkBtn: {
    marginTop: 4,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  linkBtnText: { fontSize: 13, fontWeight: '600' },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  btnPrimary: {},
  btnGhost: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnTextPrimary: {
    fontSize: 14,
    fontWeight: '700',
  },
  btnTextGhost: {
    fontSize: 14,
    fontWeight: '600',
  },
});
