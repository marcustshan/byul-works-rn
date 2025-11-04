// components/chat/ChatContextMenu.tsx
import { ChatReaction, ChatService, type ChatMessage } from '@/api/chat/chatService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectChatReactionList } from '@/selectors/chat/chatSelectors';
import { setChatReactionList } from '@/store/chatReactionSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo } from 'react';
import {
  FlatList,
  Modal,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View
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

  /** 리액션 선택 시 콜백(선택) — 없으면 기본적으로 ChatService 호출 */
  onSelectReaction?: (message: ChatMessage, reaction: ChatReaction) => void;

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
  onSelectReaction,
  title = '메시지',
}: ChatContextMenuProps) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  const dispatch = useAppDispatch();
  const reactionList = useAppSelector(selectChatReactionList);

  useEffect(() => {
    if (!visible) return;
    if (reactionList && reactionList.length > 0) return; // ✅ 이미 있으면 skip
  
    let canceled = false;
    (async () => {
      try {
        const data = await ChatService.getReactionList();
        if (!canceled) dispatch(setChatReactionList(data));
      } catch {}
    })();
  
    return () => { canceled = true; };
  }, [visible]); // ⚠️ reactionList를 deps에서 뺌 → 최초 1회만 시도

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

  // ─────────────────────────────────────────────────────────
  // 리액션 선택 핸들러 (단일 선택 → 즉시 적용 후 닫기)
  // ─────────────────────────────────────────────────────────
  const handleSelectReaction = useCallback(
    async (reaction: ChatReaction) => {
      onClose();

      // 사용자 콜백이 있으면 그것만 호출
      if (onSelectReaction) {
        setTimeout(() => onSelectReaction(message, reaction), 0);
        return;
      }
    },
    [message, onClose, onSelectReaction]
  );

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

  // 리액션 표시용 렌더러
  const renderReaction = useCallback(
    ({ item }: { item: ChatReaction }) => {
      return (
        <Pressable
          onPress={() => handleSelectReaction(item)}
          style={({ pressed }) => [
            styles.reactionPill,
            { backgroundColor: pressed ? c.surfaceMuted : c.surface },
            { borderColor: c.border },
          ]}
        >
          <Text style={[styles.reactionEmoji, { color: c.text }]} numberOfLines={1}>
            {item}
          </Text>
        </Pressable>
      );
    },
    [c.border, c.surface, c.surfaceMuted, c.text, handleSelectReaction]
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

            {/* ──────────────────────────────────────────────
                리액션 가로 리스트 (단일 선택)
               ────────────────────────────────────────────── */}
            {!!reactionList?.length && (
              <View
              style={[
                styles.reactionRowWrap,
                { backgroundColor: c.surface, borderColor: c.border },
              ]}
              >
                <FlatList
                  horizontal
                  data={reactionList}
                  keyExtractor={(item, idx) =>
                    String((item as any).code ?? (item as any).reactionCode ?? (item as any).id ?? idx)
                  }
                  renderItem={renderReaction}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.reactionRow}
                />
              </View>
            )}

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

const PILL_SIZE = 40;

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

  // ── Reactions Row ──────────────────────────────────────
  reactionRowWrap: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginBottom: 10,
  },
  reactionRow: {
    gap: 8,
    paddingHorizontal: 4,
  },
  reactionPill: {
    width: PILL_SIZE,
    height: PILL_SIZE,
    borderRadius: PILL_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  reactionEmoji: {
    fontSize: 22,
    includeFontPadding: false,
  },
  reactionImg: {
    width: 22,
    height: 22,
  },

  // ── Menu Items ─────────────────────────────────────────
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
