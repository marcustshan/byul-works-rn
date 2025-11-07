// components/chat/ChatBubble.tsx
import { ChatService, type ChatMessage, type ChatReaction, type ChatRoom } from '@/api/chat/chatService';
import { getCurrentApiConfig } from '@/constants/environment';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectMemberList, selectMyMemberSeq } from '@/selectors/member/memberSelectors';
import { store } from '@/store';
import {
  aggregateReactions,
  buildPreviewSegments,
  extractLinkFromMessage,
  formatChatTime,
  getLinkOpenGraph,
  getParentPlainText,
  getReadMeta,
  hasCodeFence,
  stripHtmlMentions,
} from '@/utils/chatUtil';
import { encodeBase64, getWeekdayLabel } from '@/utils/commonUtil';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ChatContextMenu from './ChatContextMenu';
import CodeBlock from './CodeBlock';
import FullMessageModal from './FullMessageModal';
import ImageViewerModal from './ImageViewerModal';

import { FileService } from '@/api/fileService';
import { MemberService } from '@/api/memberService';
import { useAppSelector } from '@/store/hooks';
import { EmojiMapper } from '@/utils/emojiMapper';
import { Toast } from '../common/Toast';
import ReactionDetailsSheet from './ReactionDetailsSheet';
import ReadStatusSheet from './ReadStatusSheet';


type Props = {
  chatRoom: ChatRoom | null;
  message: ChatMessage;
  isMine: boolean;
  onScrollToMessage: (chatSeq: number) => void;
  onSendReply: (message: ChatMessage) => void;
  onShareMessage: (message: ChatMessage) => void;
};

export default function ChatBubble({ chatRoom, message, isMine, onScrollToMessage = () => {}, onSendReply = () => {}, onShareMessage = () => {} }: Props) {
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];
  const [showReadModal, setShowReadModal] = useState(false);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showImageViewer, setShowImageViewer] = useState(false);

  const myMemberSeq = useAppSelector(selectMyMemberSeq) ?? 0;

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

  // OpenGraph 관련 state
  const [linkOpenGraph, setLinkOpenGraph] = useState<{ title: string; description: string; imageUrl: string } | null>(null);
  const [loadingOpenGraph, setLoadingOpenGraph] = useState(false);

  // 링크 타입 메시지일 때 OpenGraph 데이터 가져오기
  useEffect(() => {
    let cancelled = false;
    
    if (message.chatType === 'L' && message.content) {
      const extractedLinks = extractLinkFromMessage(message.content);
      const url = extractedLinks?.[0];
      
      if (url) {
        setLoadingOpenGraph(true);
        getLinkOpenGraph(url)
          .then((data) => {
            // 컴포넌트가 언마운트되었거나 메시지가 변경된 경우 state 업데이트 방지
            if (!cancelled) {
              setLinkOpenGraph(data);
              setLoadingOpenGraph(false);
            }
          })
          .catch((error) => {
            if (!cancelled) {
              console.error('OpenGraph 조회 실패:', error);
              setLoadingOpenGraph(false);
            }
          });
      } else {
        if (!cancelled) {
          setLinkOpenGraph(null);
          setLoadingOpenGraph(false);
        }
      }
    } else {
      // 링크 타입이 아니면 초기화
      if (!cancelled) {
        setLinkOpenGraph(null);
        setLoadingOpenGraph(false);
      }
    }
    
    // cleanup 함수: 메시지가 변경되거나 컴포넌트가 언마운트될 때 취소 플래그 설정
    return () => {
      cancelled = true;
    };
  }, [message.chatSeq, message.chatType, message.content]);

  const senderProfileColor = message.profileColor ?? '#CCCCCC';

  const getMemberList = () => {
    return selectMemberList(store.getState());
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
    // 채팅 답장
    if (onSendReply) {
      onSendReply(msg);
    }
  };
  
  const handleCopy = async (text: string) => {
    if (text) {
      await Clipboard.setStringAsync(text);
      Toast.show({ message: '복사되었습니다.', type: 'success' });
    }
  };
  
  const handleShare = (message: ChatMessage) => {
    // 채팅 공유
    if (onShareMessage) {
      onShareMessage(message);
    }
  };

  // 답장 채팅에 대한 정보 처리
  const getSenderName = (memberSeq?: number) => memberSeq ? MemberService.getMemberName(memberSeq) : '알 수 없음';
  const parent = message.parentChat ?? null;

  let parentPlainText = getParentPlainText(parent);

  const preview = useMemo(() => {
    const raw = message.content ?? '';
    return buildPreviewSegments(raw, { previewMaxChars: 240, maxCodeBlocks: 1 });
  }, [message.content]);

  const API_BASE_URL = getCurrentApiConfig().BASE_URL;
  const parentEncodedFileSeq = encodeBase64(parent?.fileSeq?.toString() ?? '');
  const parentImagePreviewUri =
    parent?.chatType === 'I'
      ? `${API_BASE_URL}/file/preview/${parentEncodedFileSeq}`
      : undefined;

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
          <View>
            <Text style={[styles.link, { color: c.tint }]} onLongPress={() => openContextMenu(message)} onPress={() => Linking.openURL(message.content)}>
              {extractLinkFromMessage(message.content)?.[0]}
            </Text>
            {linkOpenGraph && (
              <View style={styles.linkOpenGraph}>
                {linkOpenGraph.imageUrl && (
                  <Image source={{ uri: linkOpenGraph.imageUrl }} style={styles.linkOpenGraphImage} resizeMode="cover" />
                )}
                <View style={styles.linkOpenGraphContent}>
                  <Text style={[styles.linkOpenGraphTitle, { color: c.text }]}>{linkOpenGraph.title || '제목 없음'}</Text>
                  <Text style={[styles.linkOpenGraphDescription, { color: c.textDim }]}>{linkOpenGraph.description || '설명 없음'}</Text>
                </View>
              </View>
            )}
            {loadingOpenGraph && (
              <Text style={[styles.linkOpenGraphDescription, { color: c.textDim }]}>로딩 중...</Text>
            )}
          </View>
        );
      default:
        return (
          <Pressable
            onLongPress={() => openContextMenu(message)}
            onPress={() => {
              const raw = message.content ?? '';
              const longText = stripHtmlMentions(raw).length > 240;
              if (longText || hasCodeFence(raw)) setShowContentModal(true);
            }}
          >
            <View style={{ gap: 8 }}>
              {preview.segments.map((seg, i) =>
                seg.type === 'code' ? (
                  <CodeBlock
                    key={`code_${i}`}
                    code={seg.content}
                    lang={seg.lang}
                    dark={dark}
                    showLineNumbers={false}
                    wrapLongLines
                    copyable
                  />
                ) : (
                  <Text key={`txt_${i}`} style={[styles.text, { color: c.text }]} selectable>
                    {stripHtmlMentions(seg.content)}
                  </Text>
                )
              )}
              {preview.truncated && (
                <Text style={{ color: c.tint, fontSize: 12, alignSelf: 'flex-end' }}>더보기</Text>
              )}
            </View>
          </Pressable>
        );
    }
  };

  const readMeta = getReadMeta(chatRoom, message);

  const reactionAgg = useMemo(() => {
    return aggregateReactions(reactions, myMemberSeq);
  }, [reactions, myMemberSeq]);
  

  // 리액션 선택 핸들러
  const handleSelectReaction = async (message: ChatMessage, reaction: string) => {
    const result = await ChatService.setMessageReaction(message, reaction);
    setReactions(prev => [...prev, result]);
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
        {parent && (
          <Pressable
            onPress={() => {
              if (parent?.chatSeq && onScrollToMessage) {
                onScrollToMessage(parent.chatSeq); // ✅ 부모 메시지로 이동
              }
            }}
            onLongPress={() => openContextMenu(parent)}
            style={[
              styles.replyBox,
              { borderColor: c.border, backgroundColor: c.chat.chipBg },
            ]}
            hitSlop={6}
          >
            <View style={[styles.replyLeftBar, { backgroundColor: MemberService.getMemberProfileColor(parent?.memberSeq) }]} />
            {/* 썸네일/아이콘 */}
            <View style={styles.replyThumbWrap}>
              {parent?.chatType === 'I' && !!parentImagePreviewUri ? (
                <Image source={{ uri: parentImagePreviewUri }} style={styles.replyThumbImage} />
              ) : parent?.chatType === 'F' ? (
                <View style={styles.replyFileIcon}>
                  <Ionicons name="document-text" size={14} color={c.textDim} />
                </View>
              ) : parent?.chatType === 'E' ? (
                <View style={styles.replyEmojiIcon}>
                  <Ionicons name="happy" size={14} color={c.textDim} />
                </View>
              ) : parent?.chatType === 'L' ? (
                <View style={styles.replyLinkIcon}>
                  <Ionicons name="link" size={14} color={c.textDim} />
                </View>
              ) : (
                <View style={styles.replyTextIcon}>
                  <Ionicons name="chatbubble-ellipses" size={14} color={c.textDim} />
                </View>
              )}
            </View>

            {/* 텍스트 */}
            <View>
              <Text style={[styles.replySender, { color: c.text }]} numberOfLines={1}>
                {getSenderName(parent?.memberSeq)}
              </Text>
              <Text
                style={[
                  styles.replySnippet,
                  { color: parent?.chatType === 'L' ? c.tint : c.textDim },
                ]}
                numberOfLines={2}
              >
                {parentPlainText || '(내용 없음)'}
              </Text>
            </View>
          </Pressable>
        )}
        {renderContent()}

        {/* (추가) 메시지 전체보기 모달 */}
        {showContentModal && (
          <FullMessageModal
            visible={showContentModal}
            onClose={() => setShowContentModal(false)}
            title="메시지"
            content={message.content ?? ''}
            chatType={message.chatType as 'M' | 'I' | 'F' | 'L'}
          />
        )}
      </View>

      {/* 시간 + 읽음 배지 */}
      <View style={[styles.metaRow, { alignSelf: isMine ? 'flex-end' : 'flex-start' }]}>
        <Text style={[styles.time, { color: c.textDim }]}>{formatChatTime(message.createDate, 'ko')}</Text>

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
        onSelectReaction={(message, reaction) => handleSelectReaction(message, reaction)}
        title={pressedMessage ?? '메시지'}
      />

      <ReadStatusSheet
        visible={showReadModal}
        onClose={() => setShowReadModal(false)}
        readSeqs={lists.readList}
        unreadSeqs={lists.unreadList}
      />

      <ReactionDetailsSheet
        visible={showReactionModal}
        onClose={() => setShowReactionModal(false)}
        chatSeq={message.chatSeq}
        reactions={reactions}
        myMemberSeq={myMemberSeq}
        onDeleteMyReaction={async (chatSeq) => {
          const result = await ChatService.deleteMessageReaction(chatSeq);
          setReactions(prev => prev?.filter(r => r.chatReactionSeq !== result.chatReactionSeq) ?? []);
          setShowReactionModal(false);
        }}
      />
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

const styles = StyleSheet.create({
  wrap: { marginVertical: 8, maxWidth: '100%', paddingHorizontal: 6 },
  senderWrap: { flexDirection: 'row', alignItems: 'center', gap: 4, marginVertical: 2 },
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
  
  // ✅ 답장 미리보기
  replyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  replyLeftBar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  replyThumbWrap: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  replyThumbImage: {
    width: 28,
    height: 28,
    resizeMode: 'cover',
  },
  replyFileIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyEmojiIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyLinkIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyTextIcon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replySnippet: {
    fontSize: 12,
    lineHeight: 16,
    maxWidth: '90%',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    flexWrap: 'nowrap',
  },
  linkOpenGraph: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    marginTop: 8
  },
  linkOpenGraphImage: { width: 100, height: 100, resizeMode: 'cover' },
  linkOpenGraphContent: { flexDirection: 'column', gap: 2 },
  linkOpenGraphTitle: { fontSize: 12, fontWeight: '700', textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' },
  linkOpenGraphDescription: { fontSize: 12, textOverflow: 'ellipsis', overflow: 'hidden', maxWidth: '100%' },
});
