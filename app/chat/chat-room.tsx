// screens/ChatRoomScreen.tsx
import { useAppDispatch } from '@/store/hooks';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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
import { FileService, FileUpload } from '@/api/fileService';
import { MemberService } from '@/api/memberService';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import EmojiPickerModal from '@/components/chat/EmojiPickerModal';
import PlusMenuSheet from '@/components/chat/PlustMenuSheet';
import { Colors } from '@/constants/theme';
import { selectUserInfo } from '@/hooks/selectors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectChatRoomBySeq } from '@/selectors/chat/chatSelectors';
import { stompManager } from '@/socket/stompClient';
import type { UserInfo } from '@/store/authSlice';
import { clearActiveChatRoomSeq, clearChatRoomUnread, setActiveChatRoomSeq, updateChatRoom } from '@/store/chatRoomSlice';
import { useAppSelector } from '@/store/hooks';

export default function ChatRoomScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useLocalSearchParams<{ chatRoomSeq: string; name?: string }>();
  const chatRoomSeq = Number(params.chatRoomSeq);
  const roomTitle = params.name ?? '채팅';
  const chatRoom = useAppSelector(selectChatRoomBySeq(chatRoomSeq)) ?? null;

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

  // FAB 표시/위치
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputBarH, setInputBarH] = useState(56); // 입력바 높이(멀티라인 대응)

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // 더보기 모달 상태
  const [plusOpen, setPlusOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // 소켓 매니저
  const mgr = stompManager();

  // 소켓 구독 참조
  const roomSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const readSubRef = useRef<{ unsubscribe: () => void } | null>(null);  // ------ 업로드 API 연동 (서버 스펙에 맞게 구현) ------

  // ------ 업로드 API 연동 (서버 스펙에 맞게 구현) ------
  async function uploadFileToServer(
    file: File, 
    fileType: string,
    tableName: string,
  ): Promise<FileUpload> {
    try {
      const uploaded = await FileService.uploadFile({
        fileType: fileType,
        tableName: tableName,
        file, 
      });
      return uploaded;
    } catch (e) {
      console.error('file upload failed', e);
      throw e;
    }
  }

  // ------ 전송 도우미 ------
  const sendImageFromPicker = useCallback(async () => {
    setPlusOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const picked = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (picked.canceled) return;

    try {
      const asset = picked.assets[0];
      const fileName = asset.fileName || `image_${Date.now()}.jpg`;
      const mime = asset.type === 'image' ? 'image/jpeg' : undefined;

      const uploaded = await uploadFileToServer(asset.file, 'I', 'chat',);

      // 서버가 fileSeq를 주면 이미지 메시지 전송
      const sendMessage: ChatSendType = {
        content: '', // 이미지 컨텐츠는 서버에서 fileSeq로 식별
        memberName,
        chatRoomName: roomTitle,
        chatRoomSeq,
        chatType: 'I',
        fileSeq: uploaded.fileSeq,
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize ?? null,
      };

      // 낙관적 메세지
      const optimistic: ChatMessage = {
        chatSeq: Date.now() * -1,
        chatRoomSeq,
        chatRoomName: roomTitle,
        memberSeq,
        memberName,
        profileColor: null,
        chatType: 'I',
        content: '',               // 미리보기는 ChatBubble에서 fileSeq 기반으로 처리
        emojiPath: null,
        fileSeq: uploaded.fileSeq, // ★ 미리 fileSeq를 할당해야 미리보기 가능
        fileName: uploaded.fileName,
        fileSize: uploaded.fileSize ?? null,
        parentChatSeq: null,
        parentChat: null,
        taskCardSeq: null,
        deleted: false,
        createDate: new Date().toISOString(),
        readMembers: [memberSeq],
        chatReactions: [],
      };

      setMessages(prev => [...prev, optimistic]);
      ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (e) {
      // TODO: 에러 핸들링(토스트 등)
    }
  }, [chatRoomSeq, memberSeq, memberName, roomTitle]);

  const sendFileFromPicker = useCallback(async () => {
    setPlusOpen(false);
    const picked = await DocumentPicker.getDocumentAsync({ multiple: false });
    if (picked.canceled) return;

    try {
      const file = picked.assets[0];
      console.log('file', file);

      const uploaded = await uploadFileToServer(file.file, 'F', 'chat',);

      const sendMessage: ChatSendType = {
        content: '', // 파일은 fileSeq로 식별
        memberName,
        chatRoomName: roomTitle,
        chatRoomSeq,
        chatType: 'F',
        fileSeq: uploaded.fileSeq,
      };

      const optimistic: ChatMessage = {
        chatSeq: Date.now() * -1,
        chatRoomSeq,
        chatRoomName: roomTitle,
        memberSeq,
        memberName,
        profileColor: null,
        chatType: 'F',
        content: '',
        emojiPath: null,
        fileSeq: uploaded.fileSeq ?? null,
        parentChatSeq: null,
        parentChat: null,
        taskCardSeq: null,
        deleted: false,
        createDate: new Date().toISOString(),
        readMembers: [memberSeq],
        chatReactions: [],
      };

      setMessages(prev => [...prev, optimistic]);
      ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    } catch (e) {
      // TODO: 에러 핸들링
    }
  }, [chatRoomSeq, memberSeq, memberName, roomTitle]);

  const sendEmoji = useCallback(async (emojiPath: string) => {
    setEmojiOpen(false);

    const sendMessage: ChatSendType = {
      content: '', // 이모지는 emojiPath로 렌더
      memberName,
      chatRoomName: roomTitle,
      chatRoomSeq,
      chatType: 'E',
      emojiPath,
    };

    const optimistic: ChatMessage = {
      chatSeq: Date.now() * -1,
      chatRoomSeq,
      chatRoomName: roomTitle,
      memberSeq,
      memberName,
      profileColor: null,
      chatType: 'E',
      content: '',
      emojiPath,
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
    ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, [chatRoomSeq, memberSeq, memberName, roomTitle]);

  useFocusEffect(
    useCallback(() => {
      // ✅ 화면에 진입했을 때 실행
      const seq = Number(chatRoomSeq);
      if (!Number.isNaN(seq)) {
        dispatch(setActiveChatRoomSeq(seq));
      }

      // ✅ 화면에서 벗어날 때 실행 (다른 페이지로 이동)
      return () => {
        dispatch(clearActiveChatRoomSeq());
      };
    }, [dispatch, chatRoomSeq])
  );

  // --- 유틸: 정렬(오래된 -> 최신) ---
  const sortMessages = useCallback((rows: ChatMessage[]) => {
    return [...rows].sort((a, b) => b.chatSeq - a.chatSeq);
  }, []);

  /* ----------------------------- 초기 로딩 ----------------------------- */
  const loadInitial = useCallback(async () => {
    if (!Number.isFinite(chatRoomSeq)) return;
    setLoading(true);
    try {
      // 방 참여 처리 (읽음 처리 포함)
      await ChatService.joinRoom(chatRoomSeq).catch(() => {});
      // 해당 방에 대한 안읽음 초기화 (전부 읽음으로 가정)
      dispatch(clearChatRoomUnread(chatRoomSeq));
      const page = await ChatService.getRoomMessages(chatRoomSeq, { size: 30 });
      setMessages(sortMessages(page.content) ?? []);

      // ✅ 페이징 상태 업데이트
      setHasMoreMessages(!!page?.hasPrev);
      setMinChatSeq(page?.minChatSeq ?? null);
      setMaxChatSeq(page?.maxChatSeq ?? null);
    } finally {
      setLoading(false);
    }
  }, [chatRoomSeq]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const upsertNewMessage = useCallback((incoming: ChatMessage) => {
    if (incoming.memberSeq === memberSeq) {
      incoming.readMembers = [...(incoming.readMembers ?? []), memberSeq];
    } else {
      incoming.readMembers = [...(incoming.readMembers ?? []), ...[memberSeq, incoming.memberSeq]];
    }

    incoming.memberName = MemberService.getMemberName(incoming.memberSeq);
    ChatSocketService.sendReadMessage(memberSeq, chatRoomSeq, incoming.chatSeq);
    setMessages((prev) => {
      // ❗중복 방지 (chatSeq가 서버 고유키라면 이걸로 충분)
      if (prev.some((m) => m.chatSeq === incoming.chatSeq)) return prev;

      // 일반 케이스: 추가 후 정렬(당신의 sortMessages는 내림차순)
      return sortMessages([...prev, incoming]);
    });
  }, [sortMessages]);

  // ✅ 방 토픽 구독 (재연결/방 변경 시 재구독)
  useEffect(() => {
    let canceled = false;

    async function connectAndSubscribe() {
      // (선택) 연결 대기 유틸이 있으면 여기서 await
      if (!mgr.isConnected()) {
        // 간단 가드: 연결 안돼 있으면 다음 기회에(connected 플래그가 있다면 그걸 의존성에 추가)
        return;
      }

      // 기존 구독 정리(중복 구독 방지)
      roomSubRef.current?.unsubscribe?.();
      readSubRef.current?.unsubscribe?.();
      roomSubRef.current = null;
      readSubRef.current = null;

      // 채팅 읽음 처리 구독
      const readSub = mgr.subscribe(`/topic/joinRoom/${chatRoomSeq}`, (frame) => {
        if (canceled) return;
        const body: ChatMessage = JSON.parse(frame.body);

        const readMessage = messages.find(m => m.chatSeq === body.chatSeq)
        if (!readMessage) return;
        setMessages(prev =>
          prev.map(m => {
            if (m.readMembers?.includes(body.memberSeq)) return m;
            return { ...m, readMembers: [...(m.readMembers ?? []), body.memberSeq] };
          })
        );

        dispatch(updateChatRoom({
          chatRoomSeq: body.chatRoomSeq,
          content: body.content,
          createDate: body.createDate,
          memberSeq: body.memberSeq,
          incUnread: false,
        }));
      });

      // 채팅 메시지 구독
      const sub = mgr.subscribe(`/topic/newMessage/${chatRoomSeq}`, (frame) => {
        if (canceled) return;
        const body: ChatMessage = JSON.parse(frame.body);

        upsertNewMessage(body);
        
        dispatch(updateChatRoom({
          chatRoomSeq: body.chatRoomSeq,
          content: body.content,
          createDate: body.createDate,
          memberSeq: body.memberSeq,
          incUnread: false,
        }));

        // 내가 하단 근처일 때만 자동 스크롤(선택)
        requestAnimationFrame(() => {
          // inverted=true 이므로 'offset 0'이 맨 아래
          // 조건 로직이 있으면 넣고, 단순하게는 무조건 붙여도 OK
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        });
      });

      roomSubRef.current = sub;
      readSubRef.current = readSub;
    }

    connectAndSubscribe();

    return () => {
      canceled = true;
      roomSubRef.current?.unsubscribe?.();
      roomSubRef.current = null;
      readSubRef.current?.unsubscribe?.();
      readSubRef.current = null;
    };
    // ⬇️ socket 연결 상태 플래그가 있다면 여기에 함께 의존시키면 재연결 시 자동 재구독됩니다.
  }, [chatRoomSeq, upsertNewMessage /* , connected */]);


  // ✅ 최상단에서 더 불러오기 (스크롤 이동/복원 없음)
  const loadOlder = useCallback(async () => {
    if (!chatRoomSeq || !hasMoreMessages || isLoadingMore || !minChatSeq) return;
    setIsLoadingMore(true);
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
        setMessages((prev) => {
          const exists = new Set(prev.map((m) => m.chatSeq));
          const newOnes = result.content.filter((m) => !exists.has(m.chatSeq));
          if (newOnes.length === 0) return prev;
          // ✅ inverted에서는 뒤에 붙이는 게 "위쪽"에 붙는 효과
          return [...prev, ...sortMessages(newOnes)];
        });
        setHasMoreMessages(!!result.hasPrev);
        setMinChatSeq(result.minChatSeq ?? minChatSeq);
        setMaxChatSeq(result.maxChatSeq ?? maxChatSeq);
      } else {
        setHasMoreMessages(false);
      }
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatRoomSeq, hasMoreMessages, isLoadingMore, minChatSeq, maxChatSeq, sortMessages]);

  /* ----------------------------- 메시지 렌더 ----------------------------- */
  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => (
      <ChatBubble chatRoom={chatRoom} message={item} isMine={item.memberSeq === memberSeq} />
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
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
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
  const BOTTOM_SHOW_THRESHOLD = 50; // 하단에서 이 정도 이상 떨어져 있으면 FAB 노출

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
              inverted={true}
              onEndReached={loadOlder}
              onEndReachedThreshold={0.5}
              // ✅ 스크롤 감지: 상단 로드 + 하단 FAB 노출
              onScroll={(e) => {
                const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
                const y = contentOffset.y;
                setShowScrollToBottom(y > BOTTOM_SHOW_THRESHOLD);
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
            onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
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
          {/* ✅ + 버튼 */}
          <TouchableOpacity
            onPress={() => setPlusOpen(true)}
            style={{ marginRight: 6, padding: 8 }}
            accessibilityRole="button"
            accessibilityLabel="더 많은 전송 옵션"
          >
            <Ionicons name="add" size={22} color={colors.primary} />
          </TouchableOpacity>

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

        {/* ➕ 메뉴 시트 */}
        <PlusMenuSheet
          visible={plusOpen}
          onClose={() => setPlusOpen(false)}
          onPickImage={sendImageFromPicker}
          onPickFile={sendFileFromPicker}
          onOpenEmoji={() => {
            setPlusOpen(false);
            setEmojiOpen(true);
          }}
        />

        {/* 😊 이모지 피커 */}
        <EmojiPickerModal
          visible={emojiOpen}
          onClose={() => setEmojiOpen(false)}
          onSelect={sendEmoji}
        />
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
