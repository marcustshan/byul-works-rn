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
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import ChatService, { ChatMessage, ChatPageRequest, ChatReaction, ChatSendType } from '@/api/chat/chatService';
import { ChatSocketService } from '@/api/chat/chatSocketService';
import { FileService, FileUploadRes } from '@/api/fileService';
import { MemberService } from '@/api/memberService';
import ChatBubble from '@/components/chat/ChatBubble';
import ChatRoomHeader from '@/components/chat/ChatRoomHeader';
import EmojiPickerModal from '@/components/chat/EmojiPickerModal';
import PlusMenuSheet from '@/components/chat/PlustMenuSheet';
import { Toast } from '@/components/common/Toast';
import { Colors } from '@/constants/theme';
import { selectUserInfo } from '@/hooks/selectors';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { selectChatRoomBySeq } from '@/selectors/chat/chatSelectors';
import { stompManager } from '@/socket/stompClient';
import type { UserInfo } from '@/store/authSlice';
import { clearActiveChatRoomSeq, clearChatRoomUnread, setActiveChatRoomSeq, updateChatRoom } from '@/store/chatRoomSlice';
import { useAppSelector } from '@/store/hooks';
import { toRnFileFromPickerAsset } from '@/utils/fileNormalize';
import { useHeaderHeight } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const messagesRef = useRef<ChatMessage[]>([]);
  useEffect(() => {
    messagesRef.current = [...messages];
  }, [messages]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');

  // 더보기 상태
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [minChatSeq, setMinChatSeq] = useState<number | null>(null);
  const [maxChatSeq, setMaxChatSeq] = useState<number | null>(null);

  const minChatSeqRef = useRef<number | null>(null);
  useEffect(() => { minChatSeqRef.current = minChatSeq; }, [minChatSeq]);
  const maxChatSeqRef = useRef<number | null>(null);
  useEffect(() => { maxChatSeqRef.current = maxChatSeq; }, [maxChatSeq]);
  const hasMoreMessagesRef = useRef<boolean>(true);
  useEffect(() => { hasMoreMessagesRef.current = hasMoreMessages; }, [hasMoreMessages]);

  // 목표 메시지 찾는 중 플래그
  const [findingTarget, setFindingTarget] = useState(false);
  const findingRef = useRef(false);

  // FAB 표시/위치
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputBarH, setInputBarH] = useState(56); // 입력바 높이(멀티라인 대응)

  const listRef = useRef<FlatList<ChatMessage>>(null);
  const inputRef = useRef<TextInput>(null);

  // 더보기 모달 상태
  const [plusOpen, setPlusOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // 답장 대상 메시지
  const [replyTarget, setReplyTarget] = useState<ChatMessage | null>(null);
  const replyRef = useRef<ChatMessage | null>(null);
  useEffect(() => {
    replyRef.current = replyTarget;
  }, [replyTarget]);

  // 소켓 매니저
  const mgr = stompManager();

  // 소켓 구독 참조
  const roomSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const readSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const reactionSubRef = useRef<{ unsubscribe: () => void } | null>(null);
  const reactionDeleteSubRef = useRef<{ unsubscribe: () => void } | null>(null);

  // 첨부파일 종류: 이미지, 파일
  type AttachmentKind = 'image' | 'file';

  // --- 유틸: 정렬(오래된 -> 최신) ---
  const sortMessages = useCallback((rows: ChatMessage[]) => {
    return [...rows].sort((a, b) => b.chatSeq - a.chatSeq);
  }, []);

  // ------ 업로드 API 연동 ------
  async function uploadFileToServer(
    rnFile: { uri: string; name: string; type: string },
    kind: AttachmentKind
  ): Promise<FileUploadRes> {
    const chatType = kind === 'image' ? 'I' : 'F';
    return await FileService.uploadFile({ file: rnFile, fileType: chatType, tableName: 'chat' });
  }

  // ------ 전송 도우미 ------
  const sendAttachment = useCallback(async (kind: AttachmentKind) => {
    setPlusOpen(false);

    const parent = replyRef.current;
    const parentSeq = parent?.chatSeq ?? null;
  
    // 파일 선택(이미지, 파일)
    let asset:
      | { uri: string; name?: string; fileName?: string; mimeType?: string; type?: string }
      | null = null;
  
    if (kind === 'image') {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 1,
      });
      if (picked.canceled) return;
      asset = picked.assets[0];
    } else {
      const picked = await DocumentPicker.getDocumentAsync({
        multiple: false,
        type: '*/*',
        copyToCacheDirectory: true,
      });
      if (picked.canceled) return;
      asset = picked.assets[0]; // { uri, name, mimeType }
    }
  
    try {
      // RN 파일 정규화
      const rnFile = await toRnFileFromPickerAsset(asset!);
  
      // (선택) 파일 크기 추출
      let fileSize: number | null = null;
      try {
        const stat = await FileSystem.getInfoAsync(rnFile.uri);
        fileSize = typeof stat.size === 'number' ? stat.size : null;
      } catch {}

      // 업로드
      const uploaded = await uploadFileToServer(rnFile, kind);
      const chatType = kind === 'image' ? 'I' : 'F';
  
      // 서버 전송 payload
      const sendMessage: ChatSendType = {
        content: '',
        memberName,
        chatRoomName: roomTitle,
        chatRoomSeq,
        chatType, // 'I' | 'F'
        fileSeq: uploaded.fileSeq,
        parentChat: parent ?? undefined,
      };
  
      // 낙관적 메시지
      const optimistic: ChatMessage = {
        chatSeq: Date.now() * -1,
        chatRoomSeq,
        chatRoomName: roomTitle,
        memberSeq,
        memberName,
        profileColor: MemberService.getMemberProfileColor(memberSeq),
        chatType,
        content: '',
        emojiPath: null,
        fileSeq: uploaded.fileSeq ?? null,
        fileName: uploaded.fileName ?? rnFile.name,
        fileSize: uploaded.fileSize ?? fileSize,
        parentChatSeq: parentSeq ?? null,
        parentChat: parent ?? null,
        taskCardSeq: null,
        deleted: false,
        createDate: new Date().toISOString(),
        readMembers: [memberSeq],
        chatReactions: [],
      };
  
      setMessages(prev => [...prev, optimistic]);
      ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
      requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
      setReplyTarget(null);
    } catch (e) {
      // TODO: 토스트/알럿
      console.error('attachment failed', e);
    }
  }, [chatRoomSeq, memberSeq, memberName, roomTitle]);
  

  const sendEmoji = useCallback(async (emojiPath: string) => {
    setEmojiOpen(false);

    const parent = replyRef.current;
    const parentSeq = parent?.chatSeq ?? null;

    const sendMessage: ChatSendType = {
      content: '', // 이모지는 emojiPath로 렌더
      memberName,
      chatRoomName: roomTitle,
      chatRoomSeq,
      chatType: 'E',
      emojiPath,
      parentChat: parent ?? undefined,
    };

    const optimistic: ChatMessage = {
      chatSeq: Date.now() * -1,
      chatRoomSeq,
      chatRoomName: roomTitle,
      memberSeq,
      memberName,
      profileColor: MemberService.getMemberProfileColor(memberSeq),
      chatType: 'E',
      content: '',
      emojiPath,
      fileSeq: null,
      fileName: null,
      fileSize: null,
      parentChatSeq: parentSeq ?? null,
      parentChat: parent ?? null,
      taskCardSeq: null,
      deleted: false,
      createDate: new Date().toISOString(),
      readMembers: [memberSeq],
      chatReactions: [],
    };

    setMessages(prev => [...prev, optimistic]);
    ChatSocketService.sendChatMessage(chatRoomSeq, sendMessage);
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
    setReplyTarget(null);
  }, [chatRoomSeq, memberSeq, memberName, roomTitle]);

  // 답장 관련 소스 시작 ------------------------------------------------------------
  const beginReply = useCallback((parent: ChatMessage) => {
    setReplyTarget(parent);
    requestAnimationFrame(() => inputRef.current?.focus());
    // 하단으로 스크롤
    requestAnimationFrame(() => listRef.current?.scrollToOffset({ offset: 0, animated: true }));
  }, []);
  
  const cancelReply = useCallback(() => setReplyTarget(null), []);
  
  const getSenderName = (seq?: number) =>
    seq ? MemberService.getMemberName(seq) : '알 수 없음';
  
  const getReplySnippet = (m: ChatMessage) => {
    if (!m) return '';
    if (m.chatType === 'M') {
      return (m.content ?? '').replace(/<m [^>]*>(.*?)<\/m>/g, '$1')
                              .replace(/<br\s*\/?>/g, '\n')
                              .replace(/<[^>]+>/g, '');
    }
    if (m.chatType === 'L') return m.content ?? '';
    return m.fileName ?? m.content ?? '';
  };

  // 답장 채팅 찾아가기
  const scrollToMessageOrFetch = useCallback(async (targetSeq: number) => {
    // 1) 먼저 로컬에서 시도
    const tryScroll = () => {
      const list = messagesRef.current;
      const idx = list.findIndex(m => m.chatSeq === targetSeq);
      if (idx >= 0) {
        try {
          listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.5 });
        } catch {
          // 레이아웃 미계산 시 폴백
          listRef.current?.scrollToOffset({ offset: 0, animated: true });
        }
        return true;
      }
      return false;
    };
  
    if (tryScroll()) return;
  
    // 2) 이미 다른 탐색이 진행 중이면 무시
    if (findingRef.current) return;
    findingRef.current = true;
    setFindingTarget(true);
  
    try {
      // 안전장치: 너무 오래 끌지 않도록 최대 N페이지
      const MAX_HOPS = 10;
  
      for (let hop = 0; hop < MAX_HOPS; hop++) {
        // 더 불러올 과거가 없으면 중단
        if (!hasMoreMessagesRef.current || !minChatSeqRef.current) break;
  
        const pageRequest: ChatPageRequest = {
          size: 50,                // 한 번에 좀 더 크게
          hasPrev: true,
          hasNext: false,
          prev: true,
          baseChatSeq: minChatSeqRef.current!,
          minChatSeq: minChatSeqRef.current!,
          maxChatSeq: maxChatSeqRef.current || undefined,
          includeBase: false,
        };
  
        const result = await ChatService.getRoomMessages(chatRoomSeq, pageRequest);
  
        // 머지(중복 제거 + 정렬)
        if (result?.content?.length) {
          setMessages(prev => {
            const seen = new Set(prev.map(m => m.chatSeq));
            const add = result.content.filter(m => !seen.has(m.chatSeq));
            if (add.length === 0) return prev;
            const merged = [...prev, ...add];
            return sortMessages(merged);
          });
  
          // 페이징 상태 업데이트
          setHasMoreMessages(!!result.hasPrev);
          setMinChatSeq(result.minChatSeq ?? minChatSeqRef.current);
          setMaxChatSeq(result.maxChatSeq ?? maxChatSeqRef.current);
  
          // 병합 후 한 번 더 시도
          await new Promise(r => requestAnimationFrame(r)); // 레이아웃 한 틱 대기
          if (tryScroll()) return;
        } else {
          setHasMoreMessages(false);
          break;
        }
      }
  
      // 여기까지 못 찾으면 포기
      Toast.show({ message: '메시지를 더 불러왔지만 찾지 못했습니다.', type: 'info' });
    } finally {
      findingRef.current = false;
      setFindingTarget(false);
    }
  }, [chatRoomSeq, sortMessages]);

  // 답장 관련 소스 끝 ------------------------------------------------------------

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

  /* ----------------------------- 초기 로딩 ----------------------------- */
  const loadInitial = useCallback(async () => {
    if (!Number.isFinite(chatRoomSeq)) return;
    setLoading(true);
    try {
      const page = await ChatService.getRoomMessages(chatRoomSeq, { size: 30 });
      setMessages(sortMessages(page.content) ?? []);

      // 방 참여 처리 (읽음 처리 포함)
      await ChatService.joinRoom(chatRoomSeq).catch(() => {});
      // 해당 방에 대한 안읽음 초기화 (전부 읽음으로 가정)
      dispatch(clearChatRoomUnread(chatRoomSeq));

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
    incoming.profileColor = MemberService.getMemberProfileColor(incoming.memberSeq);
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
      reactionSubRef.current?.unsubscribe?.();
      roomSubRef.current = null;
      readSubRef.current = null;
      reactionSubRef.current = null;

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

      // 채팅 리액션 구독
      const reactionSub = mgr.subscribe(`/topic/create/reaction`, (frame) => {
        if (canceled) return;
        const body: ChatReaction = JSON.parse(frame.body);
        setMessages(prev => prev.map(m => m.chatSeq === body.chatSeq ? { ...m, chatReactions: [...(m.chatReactions ?? []), body] } : m));
      });
      // 채팅 리액션 삭제 구독
      const reactionDeleteSub = mgr.subscribe(`/topic/remove/reaction`, (frame) => {
        if (canceled) return;
        const body: ChatReaction = JSON.parse(frame.body);
        setMessages(prev => prev.map(m => m.chatSeq === body.chatSeq ? { ...m, chatReactions: (m.chatReactions ?? []).filter(r => r.chatReactionSeq !== body.chatReactionSeq) } : m));
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
        if (!showScrollToBottom) {
          requestAnimationFrame(() => {
            // inverted=true 이므로 'offset 0'이 맨 아래
            // 조건 로직이 있으면 넣고, 단순하게는 무조건 붙여도 OK
            listRef.current?.scrollToOffset({ offset: 0, animated: true });
          });
        }
      });

      roomSubRef.current = sub;
      readSubRef.current = readSub;
      reactionSubRef.current = reactionSub;
      reactionDeleteSubRef.current = reactionDeleteSub;
    }

    connectAndSubscribe();

    return () => {
      canceled = true;
      roomSubRef.current?.unsubscribe?.();
      roomSubRef.current = null;
      readSubRef.current?.unsubscribe?.();
      readSubRef.current = null;
      reactionSubRef.current?.unsubscribe?.();
      reactionSubRef.current = null;
      reactionDeleteSubRef.current?.unsubscribe?.();
      reactionDeleteSubRef.current = null;
    };
    // ⬇️ socket 연결 상태 플래그가 있다면 여기에 함께 의존시키면 재연결 시 자동 재구독됩니다.
  }, [chatRoomSeq, upsertNewMessage /* , connected */]);


  // ✅ 최상단에서 더 불러오기 (스크롤 이동/복원 없음)
  const loadMoreChatList = useCallback(async () => {
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
      <ChatBubble
        chatRoom={chatRoom}
        message={item}
        isMine={item.memberSeq === memberSeq}
        onSendReply={(parentMessage: ChatMessage) => {
          // 채팅 답장
          beginReply(parentMessage);
        }}
        onShareMessage={(targetMessage: ChatMessage) => {
          // 채팅 공유
        }}
        onScrollToMessage={(seq) => {
          scrollToMessageOrFetch(seq);
        }}
      />
    ),
    [memberSeq]
  );

  
  /* ----------------------------- 메시지 전송 ----------------------------- */
  const sendTextMessage = useCallback(async (message: string) => {
    const trimmed = message.trim();
    if (!trimmed || sending) return;
    setSending(true);

    const parent = replyRef.current;
    const parentSeq = parent?.chatSeq ?? null;

    const sendMessage: ChatSendType = {
      content: trimmed,
      memberName,
      chatRoomName: roomTitle,
      chatRoomSeq,
      chatType: 'M',
      parentChat: parent ?? undefined,
    };

    const optimistic: ChatMessage = {
      chatSeq: Date.now() * -1,
      chatRoomSeq,
      chatRoomName: roomTitle,
      memberSeq,
      memberName,
      profileColor: MemberService.getMemberProfileColor(memberSeq),
      chatType: 'M',
      content: trimmed,
      emojiPath: null,
      fileSeq: null,
      fileName: null,
      fileSize: null,
      parentChatSeq: parentSeq ?? null,
      parentChat: parent ?? null,
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
      setReplyTarget(null);
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

  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const iosOffset = headerHeight + insets.top;

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
        keyboardVerticalOffset={Platform.OS === 'ios' ? iosOffset : 30}
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
              onEndReached={loadMoreChatList}
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

        {findingTarget && (
          <View style={{ position: 'absolute', top: '50%', alignSelf: 'center', padding: 6, borderRadius: 8, backgroundColor: colors.surface }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        {/* 하단 입력창 */}
        <View
          style={[
            styles.inputBar,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
          onLayout={(e) => setInputBarH(e.nativeEvent.layout.height)}
        >
          {replyTarget && (
            <Pressable
              onPress={() => {
                const seq = replyTarget.chatSeq;
                const index = messages.findIndex(m => m.chatSeq === seq);
                if (index >= 0) {
                  listRef.current?.scrollToIndex({ index, animated: true });
                } else {
                  Toast.show({ message: '원본 메시지를 찾을 수 없습니다.', type: 'info' });
                }
              }}
              style={[
                styles.replyBar,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <View style={[styles.replyBarLeft, { backgroundColor: MemberService.getMemberProfileColor(replyTarget.memberSeq) }]} />
              <View style={styles.replyBarBody}>
                <Text style={[styles.replyBarSender, { color: colors.text }]}>
                  {getSenderName(replyTarget.memberSeq)}
                </Text>
                <Text
                  style={[styles.replyBarText, { color: replyTarget.chatType === 'L' ? colors.tint : colors.textMuted }]}
                  numberOfLines={2}
                >
                  {getReplySnippet(replyTarget) || '(내용 없음)'}
                </Text>
              </View>
              <TouchableOpacity onPress={cancelReply} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </Pressable>
          )}
          <View style={styles.inputRow}>
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
        </View>

        {/* ➕ 메뉴 시트 */}
        <PlusMenuSheet
          visible={plusOpen}
          onClose={() => setPlusOpen(false)}
          onPickImage={() => sendAttachment('image')}
          onPickFile={() => sendAttachment('file')}
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
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
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

  // ✅ 답장 미리보기 바
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 6,
  },
  replyBarLeft: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  replyBarBody: {
    flex: 1,
  },
  replyBarSender: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 12,
    lineHeight: 16,
    maxHeight: 40,
    overflow: 'scroll',
  },
});
