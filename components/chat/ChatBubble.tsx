// components/chat/ChatBubble.tsx
import { ChatService, type ChatMessage, type ChatReaction, type ChatRoom } from '@/api/chat/chatService';
import { getCurrentApiConfig } from '@/constants/environment';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectMemberBySeq, selectMemberList, selectMemberProfileColor, selectMyMemberSeq } from '@/selectors/member/memberSelectors';
import { store } from '@/store';
import { encodeBase64, getWeekdayLabel } from '@/utils/commonUtil';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ChatContextMenu from './ChatContextMenu';
import FullMessageModal from './FullMessageModal';
import ImageViewerModal from './ImageViewerModal';

import { FileService } from '@/api/fileService';
import { MemberService } from '@/api/memberService';
import { useAppSelector } from '@/store/hooks';
import { EmojiMapper } from '@/utils/emojiMapper';
import { Toast } from '../common/Toast';


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

  const myMemberSeq = useAppSelector(selectMyMemberSeq);

  const [menuOpen, setMenuOpen] = useState(false);
  const openContextMenu = (message: ChatMessage) => {
    const senderName = MemberService.getMemberName(message.memberSeq);
    switch (message.chatType) {
      case 'M':
        setPressedMessage(`${senderName} : ${message.content}`);
        break;
      case 'I':
        setPressedMessage(`${senderName} : ${message.fileName ?? ''}`);
        break;
      case 'E':
        setPressedMessage(`${senderName} : ${message.content ?? ''}`);
        break;
      case 'F':
        setPressedMessage(`${senderName} : ${message.fileName ?? ''}`);
        break;
      case 'L':
        setPressedMessage(`${senderName} : ${message.content ?? ''}`);
        break;
    }
    setMenuOpen(true);
  };
  const [pressedMessage, setPressedMessage] = useState<string | null>(null);

  // 리액션 관련 state
  const [showReactionModal, setShowReactionModal] = useState(false);
  const [activeReactionKey, setActiveReactionKey] = useState<string | null>(null);
  const [reactions, setReactions] = useState<ChatReaction[]>(message.chatReactions ?? []);

  // message가 바뀌면 동기화 (메시지 교체/갱신 시 반영)
  useEffect(() => {
    setReactions(message.chatReactions ?? []);
  }, [message.chatSeq, message.chatReactions]);


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
    // TODO - 채팅 답장 기능 구현
    Toast.show({
      message: '답장 기능은 추후 추가 예정입니다.',
      type: 'info',
    });
  };
  
  const handleCopy = async (text: string) => {
    if (text) await Clipboard.setStringAsync(text);
  };
  
  const handleShare = (payload: { message?: string; url?: string }) => {
    // TODO - 채팅 공유 기능 구현
    Toast.show({
      message: '공유 기능은 추후 추가 예정입니다.',
      type: 'info',
    });
  };

  const renderContent = () => {
    switch (message.chatType) {
      case 'I':
        const API_BASE_URL = getCurrentApiConfig().BASE_URL;
        const encodedFileSeq = encodeBase64(message.fileSeq?.toString() ?? '');
        return (
          <>
            <Pressable onLongPress={() => openContextMenu(message)} onPress={() => setShowImageViewer(true)}>
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
          <TouchableOpacity onLongPress={() => openContextMenu(message)} onPress={() => { downloadFile(message) }}>
            <View style={styles.fileWrap}>
              <View style={styles.fileIcon}>
                <Ionicons name="document-text" size={16} color={c.text} />
              </View>
              <View style={styles.fileContent}>
                <Text style={[styles.file, { color: c.text }]} numberOfLines={2}>
                  {message.fileName ?? message.content}
                </Text>
                <Text style={[styles.hint, { color: c.textDim }]}>크기 : {message.fileSize ?? '0'}</Text>
              </View>
            </View>
          </TouchableOpacity>
        );
      case 'L':
        return (
          <Text style={[styles.link, { color: c.tint }]} onLongPress={() => openContextMenu(message)} onPress={() => Linking.openURL(message.content)}>
            {message.content}
          </Text>
        );
      default:
        return (
          <Pressable onLongPress={() => openContextMenu(message)}>
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

  const reactionAgg = useMemo(() => {
    const map = new Map<
      string,
      { key: string; label: string; members: number[] }
    >();

    (reactions ?? []).forEach((r: ChatReaction) => {
      // key는 서버 스키마에 맞게 reactionCode/emoji 등 fallback
      const key = r.chatReactionSeq.toString();

      const label = r.reaction;

      const memberSeq: number = r.memberSeq;

      if (!map.has(key)) {
        map.set(key, { key, label, members: [] });
      }
      map.get(key)!.members.push(memberSeq);
    });

    const list = Array.from(map.values()).sort(
      (a, b) => b.members.length - a.members.length
    );

    return {
      list,
      hasAny: list.length > 0,
      defaultKey: list[0]?.key ?? null,
    };
  }, [reactions, myMemberSeq]);

  // 리액션 선택 핸들러
  const handleSelectReaction = async (message: ChatMessage, reaction: string) => {
    const result = await ChatService.setMessageReaction(message, reaction);
    setReactions(prev => [...prev, result]);
    setShowReactionModal(false);
  };

  // 리액션 삭제 핸들러
  const handleDeleteReaction = async (chatSeq: number) => {
    const result = await ChatService.deleteMessageReaction(chatSeq);
    setReactions(prev => prev?.filter(r => r.chatReactionSeq !== result.chatReactionSeq) ?? []);
    setShowReactionModal(false);
  };

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

        {reactionAgg.hasAny && (
          <Pressable
            onPress={() => {
              setActiveReactionKey(activeReactionKey ?? reactionAgg.defaultKey);
              setShowReactionModal(true);
            }}
          >
            <View style={[styles.rxRow, { borderColor: c.border, backgroundColor: c.chat.chipBg }]}>
              {reactionAgg.list.map((rx) => (
                <View key={rx.key} style={[styles.rxPill, { backgroundColor: c.surface, borderColor: c.border }]}>
                  <Text style={[styles.rxLabel, { color: c.text }]}>{rx.label}</Text>
                  <Text style={[styles.rxCount, { color: c.textDim }]}>{rx.members.length}</Text>
                </View>
              ))}
            </View>
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
        onSelectReaction={handleSelectReaction}
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

            <View style={styles.unreadSection}>
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

      {/* ─────────────────────────────────────────────
          리액션 상세 모달: 탭(리액션) + 사용자 목록
        ───────────────────────────────────────────── */}
      <Modal
        visible={showReactionModal}
        animationType="slide"
        transparent
        statusBarTranslucent
        hardwareAccelerated
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowReactionModal(false)}
      >
        <View style={styles.readModalOverlay}>
          <Pressable style={styles.readOverlayTouch} onPress={() => setShowReactionModal(false)} />
          <View
            style={[
              styles.readSheet,
              {
                backgroundColor: c.chat.sheetBg,
                borderColor: c.border,
                paddingBottom: Math.max(12, insets.bottom + 12),
              },
            ]}
          >
            <View style={[styles.readSheetHandle, { backgroundColor: c.chat.sheetHandle }]} />
            <Text style={[styles.readSheetTitle, { color: c.text }]}>리액션</Text>

            {/* 탭: 리액션 가로 스크롤 */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 8 }}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            >
              {reactionAgg.list.map((rx) => {
                const isActive = rx.key === activeReactionKey;
                return (
                  <Pressable
                    key={rx.key}
                    onPress={() => setActiveReactionKey(rx.key)}
                    style={[
                      styles.rxTab,
                      {
                        backgroundColor: isActive ? c.surface : c.chat.chipBg,
                        borderColor: isActive ? c.tint : c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.rxTabLabel, { color: isActive ? c.tint : c.text }]}>{rx.label}</Text>
                    <Text style={[styles.rxTabCount, { color: isActive ? c.tint : c.textDim }]}>
                      {rx.members.length}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* 선택된 탭의 사용자 목록 */}
            {(() => {
              const current = reactionAgg.list.find((r) => r.key === activeReactionKey)
                ?? (reactionAgg.defaultKey ? reactionAgg.list[0] : null);

              if (!current || current.members.length === 0) {
                return <Text style={[styles.readEmptyText, { color: c.textDim }]}>아직 아무도 누르지 않았어요.</Text>;
              }

              return (
                <ScrollView style={{ maxHeight: 260 }}>
                  <View style={styles.readChips}>
                    {current.members.map((seq) => (
                      <View key={seq} style={[styles.readChip, { backgroundColor: c.chat.chipBg }]}>
                        <View style={[styles.readChipDot, { backgroundColor: getMemberProfileColor(seq) }]} />
                        <Text style={[styles.readChipText, { color: c.text }]} numberOfLines={1}>
                          {getMemberName(seq)}
                        </Text>
                        {seq === myMemberSeq && (
                          <Pressable
                            onPress={() => handleDeleteReaction(message.chatSeq)}
                            hitSlop={8}
                            style={styles.rxDeleteXBtn}
                          >
                            <Ionicons name="close-circle" size={14} color={c.textDim} />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>
                </ScrollView>
              );
            })()}

            <Pressable
              onPress={() => setShowReactionModal(false)}
              style={[styles.readCloseBtn, { borderColor: c.border }]}
            >
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
    maxWidth: '80%',
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

  fileWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fileIcon: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  fileContent: { textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '80%' },

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
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  unreadSection: { marginTop: 16 },
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

  // 리액션 요약(버블 아래 줄)
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rxPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  rxLabel: { fontSize: 10, includeFontPadding: false },
  rxCount: { fontSize: 10, includeFontPadding: false },

  // 탭 스타일
  rxTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  rxTabLabel: { fontSize: 18, fontWeight: '600' },
  rxTabCount: { fontSize: 14, marginLeft: 6 },
  rxDeleteXBtn: {
    marginLeft: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
});
