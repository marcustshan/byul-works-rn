// screens/ChatRoomScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ChatService, { ChatMessage, ChatPageRequest, ChatSendType } from '@/api/chat/chatService';
import { ChatSocketService } from '@/api/chat/chatSocketService';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import { Colors } from '@/constants/theme';
import { selectUserInfo } from '@/hooks/selectors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { UserInfo } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';

export default function ChatRoomScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ chatRoomSeq: string; name?: string }>();
  const chatRoomSeq = Number(params.chatRoomSeq);
  const roomTitle = params.name ?? '채팅';

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const userInfo: UserInfo | null = useAppSelector(selectUserInfo);
  const memberSeq = userInfo?.member?.memberSeq ?? 0;
  const memberName = userInfo?.member?.name ?? '나';

  // 데이터 상태
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  // 더보기 상태
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [minChatSeq, setMinChatSeq] = useState<number | null>(null);
  const [maxChatSeq, setMaxChatSeq] = useState<number | null>(null);

  // 스크롤 bottom 여부 확인
  const [needScrollToBottom, setNeedScrollToBottom] = useState(true);

  // FAB 표시/위치
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputBarH, setInputBarH] = useState(56); // 입력바 높이(멀티라인 대응)

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // --- 유틸: 정렬(오래된 -> 최신) ---
  const sortMessages = useCallback((rows: ChatMessage[]) => {
    return [...rows].sort((a, b) => a.chatSeq - b.chatSeq);
  }, []);

  /* ----------------------------- 초기 로딩 ----------------------------- */
  const loadInitial = useCallback(async () => {
    if (!Number.isFinite(chatRoomSeq)) return;
    setLoading(true);
    try {
      await ChatService.joinRoom(chatRoomSeq).catch(() => {});
      const page = await ChatService.getRoomMessages(chatRoomSeq, { size: 30 });
      setMessages(page.content ?? []);

      // ✅ 페이징 상태 업데이트
      setHasMoreMessages(!!page?.hasPrev);
      setMinChatSeq(page?.minChatSeq ?? null);
      setMaxChatSeq(page?.maxChatSeq ?? null);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    }
  }, [chatRoomSeq]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // ✅ 최상단에서 더 불러오기 (스크롤 이동/복원 없음)
  const loadOlder = useCallback(async () => {
    if (!chatRoomSeq || !hasMoreMessages || isLoadingMore || !minChatSeq) return;

    setIsLoadingMore(true);
    setNeedScrollToBottom(false);
    try {
      const pageRequest: ChatPageRequest = {
        size: 20,
        hasPrev: true,
        hasNext: false,
        prev: true,
        baseChatSeq: minChatSeq,
        minChatSeq: minChatSeq,
        maxChatSeq: maxChatSeq || undefined,
        includeBase: false,
      };

      const result = await ChatService.getRoomMessages(chatRoomSeq, pageRequest);

      if (result.content?.length) {
        setMessages(prev => {
          const exists = new Set(prev.map(m => m.chatSeq));
          const newOnes = result.content.filter(m => !exists.has(m.chatSeq));
          if (newOnes.length === 0) return prev;
          return sortMessages([...newOnes, ...prev]); // ✅ 앞에 prepend
        });

        // ✅ 페이징 상태 갱신
        setHasMoreMessages(!!result.hasPrev);
        setMinChatSeq(result.minChatSeq ?? minChatSeq);
        setMaxChatSeq(result.maxChatSeq ?? maxChatSeq);
      } else {
        setHasMoreMessages(false);
      }
    } catch (e) {
      console.error('❌ 추가 메시지 로드 실패:', e);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatRoomSeq, hasMoreMessages, isLoadingMore, minChatSeq, maxChatSeq, sortMessages]);

  /* ----------------------------- 메시지 렌더 ----------------------------- */
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble message={item} isMine={item.memberSeq === memberSeq} />
    ),
    [memberSeq]
  );

  /* ----------------------------- 메시지 전송 ----------------------------- */
  const sendTextMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);

    const sendMessage: ChatSendType = {
      content: trimmed,
      memberName,
      chatRoomName: roomTitle,
      chatRoomSeq,
      chatType: 'M',
    };

    const optimistic: ChatMessage = {
      chatSeq: Date.now() * -1,
      chatRoomSeq,
      chatRoomName: roomTitle,
      memberSeq,
      memberName,
      profileColor: null,
      chatType: 'M',
      content: trimmed,
      emojiPath: null,
      fileSeq: null,
      fileName: null,
      fileSize: null,
      parentChatSeq: null,
      parentChat: null,
      taskCardSeq: null,
      deleted: false,
      createDate: new Date().toISOString(),
      readMembers: [memberSeq],
      chatReactions: [],
    };

    setMessages(prev => [...prev, optimistic]);
    setInput('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    setShowScrollToBottom(false); // 전송 후엔 하단으로 이동하므로 FAB 숨김

    try {
      ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
    } catch {
      setMessages(prev => prev.filter(m => m.chatSeq !== optimistic.chatSeq));
      setInput(trimmed);
    } finally {
      setSending(false);
    }
  }, [chatRoomSeq, memberSeq, memberName, roomTitle, sending]);

  /* ----------------------------- 렌더링 ----------------------------- */
  if (!Number.isFinite(chatRoomSeq)) {
    return (
      <View style={styles.center}>
        <Text>잘못된 채팅방입니다.</Text>
      </View>
    );
  }

  // 상/하단 임계값
  const TOP_THRESHOLD = 24;
  const BOTTOM_SHOW_THRESHOLD = 50; // 하단에서 이 정도 이상 떨어져 있으면 FAB 노출
  const onContentSizeChange = useCallback(() => {
    if (needScrollToBottom) {
      console.log('onContentSizeChange');
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: false }));
    } else {
      setNeedScrollToBottom(true);
    }
  }, [needScrollToBottom, setNeedScrollToBottom]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar />

      {/* 상단 헤더 (고정) */}
      <ChatRoomHeader
        title={roomTitle}
        showSearch={false}
        query={''}
        onChangeQuery={() => {}}
        onBack={() => router.back()}
        onToggleSearch={() => {}}
        onClearQuery={() => {}}
        onSubmitSearch={() => {}}
      />

      {/* 본문 영역 (채팅 + 입력창) */}
      <KeyboardAvoidingView
        style={[styles.body, { position: 'relative' }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
      >
        {/* 메시지 리스트 */}
        <View style={styles.listWrap}>
          {loading ? (
            <View style={styles.center}><ActivityIndicator color={colors.primary} /></View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={m => String(m.chatSeq)}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              onContentSizeChange={onContentSizeChange}
              // ✅ 스크롤 감지: 상단 로드 + 하단 FAB 노출
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const y = contentOffset.y;

                // 상단 가까우면 이전 메시지 로드
                if (y <= TOP_THRESHOLD) loadOlder();

                // 하단과의 거리 계산
                const distanceFromBottom = contentSize.height - (layoutMeasurement.height + y);
                setShowScrollToBottom(distanceFromBottom > BOTTOM_SHOW_THRESHOLD);
              }}
              scrollEventThrottle={16}
              // ✅ 최상단 로딩 스피너 표시 (비-inverted에서 상단 헤더 자리에 보임)
              ListHeaderComponent={
                isLoadingMore ? (
                  <View style={{ paddingVertical: 8, alignItems: 'center' }}>
                    <ActivityIndicator />
                  </View>
                ) : null
              }
            />
          )}
        </View>

        {/* 🔽 스크롤-투-바텀 FAB: 입력바 바로 위에 뜨도록 inputBarH를 반영 */}
        {showScrollToBottom && (
          <TouchableOpacity
            onPress={() => listRef.current?.scrollToEnd({ animated: true })}
            style={[
              styles.scrollFab,
              {
                backgroundColor: colors.primary,
                bottom: inputBarH + 16,
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="맨 아래로 이동"
          >
            <Ionicons name="arrow-down" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        )}

        {/* 하단 입력창 */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
          onLayout={(e) => setInputBarH(e.nativeEvent.layout.height)}
        >
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: colors.text }]}
            value={input}
            onChangeText={setInput}
            placeholder="메시지를 입력하세요"
            placeholderTextColor={colors.textMuted}
            multiline
          />
          <TouchableOpacity
            onPress={() => sendTextMessage(input)}
            disabled={!input.trim() || sending}
            style={[
              styles.sendBtn,
              { backgroundColor: colors.primary },
              (!input.trim() || sending) && styles.sendBtnDisabled,
            ]}
          >
            <Ionicons name="send" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1 },

  listWrap: { flex: 1 },
  listContent: { paddingHorizontal: 12, paddingVertical: 10 },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    fontSize: 15,
    maxHeight: 140,
    paddingVertical: 6,
    paddingRight: 8,
  },
  sendBtn: {
    marginLeft: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  sendBtnDisabled: { opacity: 0.6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // 🔽 우하단 FAB
  scrollFab: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
