// components/chat/ChatContextMenu.tsx
import type { ChatMessage } from '@/api/chat/chatService';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ChatContextMenuProps = {
  visible: boolean;
  onClose: () => void;

  /** 대상 메시지 */
  message: ChatMessage;

  /** 동작 콜백들 */
  onReply: (message: ChatMessage) => void;
  onCopy: (text: string) => void;
  onShare?: (payload: { message?: string; url?: string }) => void;

  /** 메뉴 타이틀 (선택) */
  title?: string;
};

function stripHtmlMentions(html: string) {
  return html
    .replace(/<m [^>]*>(.*?)<\/m>/g, '$1')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
}

export default function ChatContextMenu({
  visible,
  onClose,
  message,
  onReply,
  onCopy,
  onShare,
  title = '메시지',
}: ChatContextMenuProps) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const payload = useMemo(() => {
    // 공유/복사 기본 재료 구성
    if (message.chatType === 'L') {
      // 링크
      return { copyText: message.content ?? '', share: { url: message.content ?? '' } };
    }
    if (message.chatType === 'M') {
      const text = stripHtmlMentions(message.content ?? '');
      return { copyText: text, share: { message: text } };
    }
    if (message.chatType === 'I') {
      // 이미지: 서버 URL/프리뷰 URL이 message.content 또는 별도 필드에 있다면 사용
      // 일단 content에 URL이 온다고 가정
      return { copyText: message.fileName ?? '[이미지]', share: { url: message.content ?? undefined } };
    }
    if (message.chatType === 'F') {
      return { copyText: `${message.fileName ?? '[파일]'}`, share: { message: `${message.fileName ?? ''}` } };
    }
    return { copyText: '', share: {} as { message?: string; url?: string } };
  }, [message]);

  const handleShare = async () => {
    if (onShare) {
      onShare(payload.share);
      return;
    }
    try {
      await Share.share(payload.share);
    } catch {
      // noop
    }
  };

  const items = [
    {
      key: 'reply',
      label: '답장',
      icon: 'return-up-back',
      onPress: () => onReply(message),
    },
    {
      key: 'copy',
      label: '복사',
      icon: 'copy',
      disabled: !payload.copyText,
      onPress: () => onCopy(payload.copyText),
    },
    {
      key: 'share',
      label: '공유',
      icon: Platform.OS === 'ios' ? 'share-outline' : 'share-social',
      disabled: !payload.share.message && !payload.share.url,
      onPress: handleShare,
    },
  ];

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
        {/* 외부 터치로 닫기 */}
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <SafeAreaView style={styles.sheetWrap} edges={['bottom']}>
          <View
            style={[
              styles.sheet,
              { backgroundColor: c.surface, borderColor: c.border },
            ]}
          >
            <Text style={[styles.title, { color: c.textDim }]}>{title}</Text>

            <View style={styles.list}>
              {items.map((it) => (
                <Pressable
                  key={it.key}
                  disabled={it.disabled}
                  onPress={() => {
                    onClose();
                    setTimeout(() => it.onPress(), 0);
                  }}
                  style={({ pressed }) => [
                    styles.item,
                    pressed && { backgroundColor: c.surfaceMuted },
                    it.disabled && styles.disabled,
                  ]}
                >
                  <Ionicons
                    name={it.icon as any}
                    size={18}
                    color={it.disabled ? c.textMuted : c.icon}
                    style={{ width: 24 }}
                  />
                  <Text
                    style={[
                      styles.itemLabel,
                      { color: it.disabled ? c.textMuted : c.text },
                    ]}
                  >
                    {it.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={onClose}
              style={[styles.cancel, { backgroundColor: c.surface }]}
            >
              <Text style={[styles.cancelLabel, { color: c.text }]}>취소</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    padding: 12,
  },
  sheet: {
    borderRadius: 16,
    paddingTop: 10,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  title: {
    fontSize: 16,
    paddingHorizontal: 10,
    marginBottom: 8,
    maxWidth: '100%',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
  },
  list: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  item: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancel: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  disabled: { opacity: 0.5 },
});
