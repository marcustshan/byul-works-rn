// components/chat/ChatBubble.tsx
import type { ChatMessage, ChatRoom } from '@/api/chat/chatService';
import { selectMemberBySeq, selectMemberList, selectMemberProfileColor } from '@/selectors/member/memberSelectors';
import { store } from '@/store';
import { getWeekdayLabel } from '@/utils/commonUtil';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const palette = (dark: boolean) => ({
  bgMine: dark ? '#4a4f5a' : '#e9e7ff',
  bgOther: dark ? '#373c43' : '#ffffff',
  text: dark ? '#e6eef6' : '#111827',
  dim: dark ? '#9fb0c0' : '#6b7280',
  senderNameColor: dark ? '#e6eef6' : '#111827',
  link: '#2ea3ff',
  border: dark ? '#1f2530' : '#e5e7eb',
  badgeBg: dark ? 'rgba(159,176,192,0.18)' : 'rgba(107,114,128,0.12)',
  sheetBg: dark ? '#0f141a' : '#fff',
  sheetHandle: dark ? '#2b3440' : '#e5e7eb',
  chipBg: dark ? 'rgba(230,238,246,0.08)' : 'rgba(17,24,39,0.04)',
});

type Props = {
  chatRoom: ChatRoom | null;
  message: ChatMessage;
  isMine: boolean;
};

export default function ChatBubble({ chatRoom, message, isMine }: Props) {
  const dark = useColorScheme() === 'dark';
  const c = palette(dark);
  const insets = useSafeAreaInsets(); // ← 하단 인셋 확보
  const [showReadModal, setShowReadModal] = useState(false);

  const senderProfileColor = message.profileColor ?? '#CCCCCC';

  const getMemberList = () => {
    return selectMemberList(store.getState());
  }
  const getMemberName = (seq: number) => {
    const member = selectMemberBySeq(seq)(store.getState());
    return member?.name ?? `#${seq}`;
  }
  const getMemberProfileColor = (seq: number) => {
    return selectMemberProfileColor(seq)(store.getState());
  }

  const renderContent = () => {
    switch (message.chatType) {
      case 'I':
        return <Image source={{ uri: message.content }} style={styles.image} />;
      case 'F':
        return (
          <TouchableOpacity onPress={() => { /* TODO */ }}>
            <Text style={[styles.file, { color: c.text }]} numberOfLines={2}>
              📎 {message.fileName ?? message.content}
            </Text>
            <Text style={[styles.hint, { color: c.dim }]}>탭하여 파일 열기</Text>
          </TouchableOpacity>
        );
      case 'L':
        return (
          <Text style={[styles.link, { color: c.link }]} onPress={() => Linking.openURL(message.content)}>
            {message.content}
          </Text>
        );
      default:
        return <Text style={[styles.text, { color: c.text }]}>{stripHtmlMentions(message.content)}</Text>;
    }
  };

  const readMeta = getReadMeta(chatRoom, message);

  // 모달에서 표시할 사용자 목록
  const lists = useMemo(() => {
    const memberList = getMemberList();
    const readList = readMeta.readSeqs ?? []
    const unreadList = readMeta.unreadSeqs ?? []
    return { readList, unreadList, memberList };
  }, [chatRoom, readMeta.readSeqs, readMeta.unreadSeqs]);

  return (
    <View style={[styles.wrap, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
      {!isMine && (
        <View style={styles.senderWrap}>
          <View style={[styles.senderProfileCircle, { backgroundColor: senderProfileColor }]} />
          <Text style={[styles.sender, { color: c.senderNameColor }]}>{message.memberName}</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? c.bgMine : c.bgOther,
            borderColor: c.border,
            alignSelf: isMine ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {renderContent()}
      </View>

      {/* 시간 + 읽음 배지 */}
      <View style={[styles.metaRow, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.time, { color: c.dim }]}>{getFormattedTime(message.createDate)}</Text>

        {readMeta.show && (
          <Pressable
            onPress={() => setShowReadModal(true)}
            style={[styles.readBadge, { backgroundColor: c.badgeBg, borderColor: c.border }]}
            hitSlop={6}
          >
            <Ionicons name="person" size={11} color={c.dim} style={{ marginRight: 3, marginTop: 0.5 }} />
            <Text style={[styles.readBadgeText, { color: c.dim }]}>{ readMeta.count ?? 0}</Text>
          </Pressable>
        )}
      </View>

      {/* 읽음/안읽음 모달 */}
      <Modal
        visible={showReadModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        hardwareAccelerated
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowReadModal(false)}
      >
        <View style={styles.readModalOverlay}>
          <Pressable style={styles.readOverlayTouch} onPress={() => setShowReadModal(false)} />
          <View
            style={[
              styles.readSheet,
              {
                backgroundColor: c.sheetBg,
                borderColor: c.border,
                paddingBottom: Math.max(12, insets.bottom + 12), // ← 하단 safe area
              },
            ]}
          >
            <View style={[styles.readSheetHandle, { backgroundColor: c.sheetHandle }]} />
            <Text style={[styles.readSheetTitle, { color: c.text }]}>읽음 상태</Text>

            <View style={styles.readSection}>
              <View style={styles.readSectionHeader}>
                <Ionicons name="checkmark-done" size={14} color={c.dim} />
                <Text style={[styles.readSectionTitle, { color: c.dim }]}>읽음 ({lists.readList.length})</Text>
              </View>
              {lists.readList.length > 0 && (
                <ScrollView style={{ maxHeight: 180 }}>
                  <View style={styles.readChips}>
                    {lists.readList.map((seq) => (
                      <View key={seq} style={[styles.readChip, { backgroundColor: c.chipBg }]}>
                        <View style={[styles.readChipDot, { backgroundColor: getMemberProfileColor(seq) }]} />
                        <Text style={[styles.readChipText, { color: c.text }]} numberOfLines={1}>
                          {getMemberName(seq)}
                        </Text>
                      </View>
                    ))}
  
                  </View>
                </ScrollView>
              )}
            </View>

            <View style={styles.readSection}>
              <View style={styles.readSectionHeader}>
                <Ionicons name="time" size={14} color={c.dim} />
                <Text style={[styles.readSectionTitle, { color: c.dim }]}>안 읽음 ({lists.unreadList.length})</Text>
              </View>
              {lists.unreadList.length === 0 ? (
                <Text style={[styles.readEmptyText, { color: c.dim }]}>모두 읽었어요.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 180 }}>
                  <View style={styles.readChips}> 
                    {lists.unreadList.map((seq) => (
                      <View key={seq} style={[styles.readChip, { backgroundColor: c.chipBg }]}>
                        <View style={[styles.readChipDot, { backgroundColor: getMemberProfileColor(seq) }]} />
                        <Text style={[styles.readChipText, { color: c.text }]} numberOfLines={1}>
                          {getMemberName(seq)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>

            <Pressable onPress={() => setShowReadModal(false)} style={[styles.readCloseBtn, { borderColor: c.border }]}>
              <Text style={[styles.readCloseBtnText, { color: c.text }]}>닫기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function getFormattedTime(createDate: string) {
  const date = dayjs(createDate);
  if (date.isSame(dayjs(), 'day')) {
    return date.format('HH:mm');
  }
  return date.format(`YYYY-MM-DD(${getWeekdayLabel(date, { locale: 'ko', style: 'short' })}) HH:mm`);
}

function getReadMeta(
  chatRoom: ChatRoom | null,
  msg: ChatMessage
): { show: boolean; count: number; readSeqs: number[]; unreadSeqs: number[] } {
  const read = msg.readMembers.length;

  if (read <= 0) return { show: false, count: 0, readSeqs: [], unreadSeqs: [] };

  const unreadSeqs = chatRoom?.joiningMemberSeqList.filter((s) => !msg.readMembers.includes(s)) ?? [];

  return {
    show: true,
    count: read,
    readSeqs: msg.readMembers,
    unreadSeqs,
  };
}

function stripHtmlMentions(html: string) {
  return html
    .replace(/<m [^>]*>(.*?)<\/m>/g, '$1')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, '');
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 6, maxWidth: '90%' },
  senderWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderProfileCircle: { width: 14, height: 14, borderRadius: 10, marginBottom: 2 },
  sender: { fontSize: 14, marginBottom: 4, fontWeight: '600' },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 15, lineHeight: 21 },
  link: { fontSize: 15, textDecorationLine: 'underline' },
  file: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 2 },

  /** 메타 영역 */
  metaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  time: { fontSize: 12 },

  /** 읽음 배지 */
  readBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  readBadgeText: {
    fontSize: 10,
    includeFontPadding: false,
  },

  image: { width: 220, height: 160, borderRadius: 12 },

  /** 모달 & 바텀시트 (네임스페이스: readModal*) */
  readModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17, 24, 39, 0.45)',
  },
  readOverlayTouch: { flex: 1 },
  readSheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readSheetHandle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  readSheetTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  readSection: { marginTop: 6 },
  readSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  readSectionTitle: { fontSize: 12, fontWeight: '600' },
  readEmptyText: { fontSize: 12 },

  readChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  readChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  readChipDot: { width: 12, height: 12, borderRadius: 999, marginRight: 6 },
  readChipText: { fontSize: 13, maxWidth: 180 },

  readCloseBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  readCloseBtnText: { fontSize: 14, fontWeight: '600' },
});
