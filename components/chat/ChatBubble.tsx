// components/chat/ChatBubble.tsx
import type { ChatMessage, ChatRoom } from '@/api/chat/chatService';
import { getCurrentApiConfig } from '@/constants/environment';
import { Colors } from '@/constants/theme';
import { selectMemberBySeq, selectMemberList, selectMemberProfileColor } from '@/selectors/member/memberSelectors';
import { store } from '@/store';
import { encodeBase64, getWeekdayLabel } from '@/utils/commonUtil';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Clipboard from 'expo-clipboard';
import React, { useMemo, useState } from 'react';
import {
  Alert,
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
import ChatContextMenu from './ChatContextMenu';
import FullMessageModal from './FullMessageModal';
import ImageViewerModal from './ImageViewerModal';

import { FileService } from '@/api/fileService';
import { EmojiMapper } from '@/utils/emojiMapper';


type Props = {
  chatRoom: ChatRoom | null;
  message: ChatMessage;
  isMine: boolean;
};

export default function ChatBubble({ chatRoom, message, isMine }: Props) {
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const insets = useSafeAreaInsets(); // ← 하단 인셋 확보
  const [showReadModal, setShowReadModal] = useState(false);
  // ...컴포넌트 내부 state (추가)
  const [showContentModal, setShowContentModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const openContextMenu = (message: string) => {
    setPressedMessage(message);
    setMenuOpen(true);
  };
  const [pressedMessage, setPressedMessage] = useState<string | null>(null);

  // (추가) 길이 판단 유틸 — 너무 정교할 필요 없이 글자수 기준
  const plainText = stripHtmlMentions(message.content ?? '');
  const isLong = message.chatType === 'M' && plainText.length > 240; // 240자 이상이면 '더보기'

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

  const downloadFile = (message: ChatMessage) => {
    Alert.alert('파일 다운로드', '파일을 다운로드 하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '다운로드', onPress: () => {
        FileService.downloadFile(message);
      } },
    ]);
  }

  const handleReply = (msg: ChatMessage) => {
    // 화면 단(예: ChatRoomScreen)에서 reply UI를 띄우도록 콜백을 끌어올리는 것도 추천
    // props.onReply?.(msg);
  };
  
  const handleCopy = async (text: string) => {
    if (text) await Clipboard.setStringAsync(text);
  };
  
  const handleShare = (payload: { message?: string; url?: string }) => {
    // 필요 시 커스텀 공유 로직으로 대체 가능 (기본은 ChatContextMenu 내에서 Share.share 호출)
  };

  const renderContent = () => {
    switch (message.chatType) {
      case 'I':
        const API_BASE_URL = getCurrentApiConfig().BASE_URL;
        const encodedFileSeq = encodeBase64(message.fileSeq?.toString() ?? '');
        return (
          <>
            <Pressable onLongPress={() => openContextMenu(message.fileName ?? '')} onPress={() => setShowImageViewer(true)}>
              <Image
                source={{ uri: `${API_BASE_URL}/file/preview/${encodedFileSeq}` }}
                style={styles.image}
              />
            </Pressable>
            <ImageViewerModal
              visible={showImageViewer}
              uri={`${API_BASE_URL}/file/preview/original/${encodedFileSeq}`}
              onClose={() => setShowImageViewer(false)}
              title={`${message.fileName ?? message.content}`}
              background="light"   // 항상 흰 배경 (옵션)
              minScale={0.5}
              maxScale={4}
            />
          </>
        );
      case 'E':
        return (
          <View style={styles.emojiWrap}>
          <Image source={EmojiMapper[message.emojiPath ?? '']} style={styles.emojiImage} />
          </View>
        );
      case 'F':
        return (
          <TouchableOpacity onLongPress={() => openContextMenu(message.fileName ?? '')} onPress={() => { downloadFile(message) }}>
            <Text style={[styles.file, { color: c.text }]} numberOfLines={2}>
              📎 {message.fileName ?? message.content}
            </Text>
            <Text style={[styles.hint, { color: c.textDim }]}>크기 : {message.fileSize ?? '0'}</Text>
          </TouchableOpacity>
        );
      case 'L':
        return (
          <Text style={[styles.link, { color: c.tint }]} onLongPress={() => openContextMenu(message.content)} onPress={() => Linking.openURL(message.content)}>
            {message.content}
          </Text>
        );
      default:
        return (
          <Pressable onLongPress={() => openContextMenu(plainText)}>
            <Text
              style={[styles.text, { color: c.text }]}
              numberOfLines={isLong ? 6 : undefined} // 미리보기는 6줄로 제한
            >
              {plainText}
            </Text>
            {isLong && (
              <Pressable onPress={() => setShowContentModal(true)} style={{ alignSelf: 'flex-end', marginTop: 6 }} hitSlop={6}>
                <Text style={{ color: c.tint, fontSize: 12 }}>더보기</Text>
              </Pressable>
            )}
          </Pressable>
        );
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
          <Text style={[styles.sender, { color: c.chat.senderNameColor }]}>{message.memberName}</Text>
        </View>
      )}

      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? c.chat.bubbleMineBg : c.chat.bubbleOtherBg,
            borderColor: c.border,
            alignSelf: isMine ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {renderContent()}

        {/* (추가) 메시지 전체보기 모달 */}
        {showContentModal && (
          <FullMessageModal
            visible={showContentModal}
            onClose={() => setShowContentModal(false)}
            title="메시지"
            content={plainText}
            chatType={message.chatType as 'M' | 'I' | 'F' | 'L'}
          />
        )}
      </View>

      {/* 시간 + 읽음 배지 */}
      <View style={[styles.metaRow, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.time, { color: c.textDim }]}>{getFormattedTime(message.createDate)}</Text>

        {readMeta.show && (
          <Pressable
            onPress={() => setShowReadModal(true)}
            style={[styles.readBadge, { backgroundColor: c.chat.readBadgeBg, borderColor: c.border }]}
            hitSlop={6}
          >
            <Ionicons name="person" size={11} color={c.textDim} style={{ marginRight: 3, marginTop: 0.5 }} />
            <Text style={[styles.readBadgeText, { color: c.textDim }]}>{ readMeta.count ?? 0}</Text>
          </Pressable>
        )}
      </View>

      <ChatContextMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        message={message}
        onReply={handleReply}
        onCopy={handleCopy}
        onShare={handleShare}
        title={pressedMessage ?? '메시지'}
      />

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
                backgroundColor: c.chat.sheetBg,
                borderColor: c.border,
                paddingBottom: Math.max(12, insets.bottom + 12), // ← 하단 safe area
              },
            ]}
          >
            <View style={[styles.readSheetHandle, { backgroundColor: c.chat.sheetHandle }]} />
            <Text style={[styles.readSheetTitle, { color: c.text }]}>읽음 상태</Text>

            <View style={styles.readSection}>
              <View style={styles.readSectionHeader}>
                <Ionicons name="checkmark-done" size={14} color={c.textDim} />
                <Text style={[styles.readSectionTitle, { color: c.textDim }]}>읽음 ({lists.readList.length})</Text>
              </View>
              {lists.readList.length > 0 && (
                <ScrollView style={{ maxHeight: 180 }}>
                  <View style={styles.readChips}>
                    {lists.readList.map((seq) => (
                      <View key={seq} style={[styles.readChip, { backgroundColor: c.chat.chipBg }]}>
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
                <Ionicons name="time" size={14} color={c.textDim} />
                <Text style={[styles.readSectionTitle, { color: c.textDim }]}>안 읽음 ({lists.unreadList.length})</Text>
              </View>
              {lists.unreadList.length === 0 ? (
                <Text style={[styles.readEmptyText, { color: c.textDim }]}>모두 읽었어요.</Text>
              ) : (
                <ScrollView style={{ maxHeight: 180 }}>
                  <View style={styles.readChips}> 
                    {lists.unreadList.map((seq) => (
                      <View key={seq} style={[styles.readChip, { backgroundColor: c.chat.chipBg }]}>
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
  wrap: { marginVertical: 6, maxWidth: '100%', paddingHorizontal: 6 },
  senderWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderProfileCircle: { width: 14, height: 14, borderRadius: 10, marginBottom: 2 },
  sender: { fontSize: 14, marginBottom: 4, fontWeight: '600' },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  text: { fontSize: 15, lineHeight: 21 },
  link: { fontSize: 15, textDecorationLine: 'underline' },
  emojiWrap: { backgroundColor: '#ffffff', borderRadius: 16 },
  emojiImage: { width: 120, height: 120, resizeMode: 'contain' },
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
  },
  readBadgeText: {
    fontSize: 10,
    includeFontPadding: false,
  },

  image: { width: 200, height: 200, borderRadius: 12, resizeMode: 'cover' },

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
