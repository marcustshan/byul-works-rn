import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { ChatRoom } from '@/api/chat/chatService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

import { getCurrentApiConfig } from '@/constants/environment';
import { Colors, type AppColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { encodeBase64 } from '@/utils/commonUtil';

// ✅ Redux
import { MemberService } from '@/api/memberService';
import { selectChatRoomError, selectChatRoomList, selectChatRoomLoading } from '@/hooks/selectors';
import { clearChatRoomUnread } from '@/store/chatRoomSlice';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { loadChatRooms } from '@/store/thunk/chatRoomThunk';

import { selectMyMemberSeq } from '@/selectors/member/memberSelectors';
import { getTextColorQuick } from '@/utils/colorUtil';
import { useRouter } from 'expo-router';

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                              */
/* -------------------------------------------------------------------------- */

const timeFormat = (iso?: string) => {
  if (!iso) return '';
  const d = dayjs(iso);
  return d.isSame(dayjs(), 'day') ? d.format('HH:mm:ss') : d.format('YYYY-MM-DD HH:mm:ss');
};

/* -------------------------------------------------------------------------- */
/*                                   Screen                                    */
/* -------------------------------------------------------------------------- */

export default function ChatRoomListScreen() {
  const dispatch = useAppDispatch();

  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // 로컬 UI 상태
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Redux 상태 구독
  const chatRoomList = useAppSelector(selectChatRoomList); // ChatRoom[] | null
  const loading = useAppSelector(selectChatRoomLoading);
  const error = useAppSelector(selectChatRoomError);

  const searchRef = useRef<TextInput>(null);

  const router = useRouter();

  const memberSeq = useAppSelector(selectMyMemberSeq);

  // 채팅방 선택
  const openRoom = useCallback((room: ChatRoom) => {
    dispatch(clearChatRoomUnread(room.chatRoomSeq));
    router.push({
      pathname: '/chat/[chatRoomSeq]',
      params: {
        chatRoomSeq: room.chatRoomSeq.toString(),
        name: room.chatRoomName,
      },
    });
  }, [dispatch, router]);

  // 최초 로드
  useEffect(() => {
    dispatch(loadChatRooms());
  }, [dispatch]);

  // Pull-to-refresh
  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await dispatch(loadChatRooms());
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // 필터/정렬
  const visibleRooms = useMemo(() => {
    const src = chatRoomList ?? [];
    let list = src;
    if (tab === 'unread') list = list.filter(r => (r.newCnt ?? 0) > 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        (r.chatRoomName ?? '').toLowerCase().includes(q) ||
        (r.lastInsertMsg ?? '').toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      if (a.fixed !== b.fixed) return a.fixed ? -1 : 1;
      const at = new Date(a.lastInsertDate || a.createDate).getTime();
      const bt = new Date(b.lastInsertDate || b.createDate).getTime();
      return bt - at;
    });
  }, [chatRoomList, tab, query]);

  const renderItem: ListRenderItem<ChatRoom> = useCallback(({ item }) => (
    <ChatListItem room={item} colors={colors} memberSeq={memberSeq ?? 0} onPress={() => openRoom(item)} />
  ), [colors, memberSeq, openRoom]);

  const keyExtractor = useCallback((item: ChatRoom) => String(item.chatRoomSeq), []);

  // 🔻 리스트 구분선 컴포넌트(플랫한 룩 + 테마 경계색)
  const ItemSeparator = useCallback(() => (
    <View style={[styles.separator, { backgroundColor: colors.border }]} />
  ), [colors.border]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ThemedView style={styles.headerWrap}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="chatbubble-ellipses" size={22} color={colors.primary} />
          <ThemedText style={[styles.headerTitle, { color: colors.text }]}>채팅</ThemedText>
        </View>
        <TouchableOpacity
          onPress={() => searchRef.current?.focus()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="검색 포커스"
        >
          <Ionicons name="search" size={22} color={colors.primary} />
        </TouchableOpacity>
      </ThemedView>

      {/* 🔻 Card 제거: 평평한 검색 컨테이너 */}
      <View style={[styles.searchContainer]}>
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surfaceMuted,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            placeholder="채팅방 또는 메시지 검색"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>

        <FilterTabs value={tab} onChange={setTab} colors={colors} />
      </View>

      {/* List / Loading / Error */}
      {loading ? (
        <ThemedView style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </ThemedView>
      ) : (
        <FlatList<ChatRoom>
          data={visibleRooms}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ItemSeparator}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={() =>
            error
              ? <ErrorState message={error} onRetry={() => dispatch(loadChatRooms())} colors={colors} />
              : <EmptyState tab={tab} query={query} colors={colors} />
          }
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB (다크 대비 유지) */}
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: colors.primary,
            shadowColor: Platform.OS === 'ios' ? '#000' : 'transparent',
          },
        ]}
        onPress={() => { /* router.push('/chat/new') */ }}
        accessibilityRole="button"
        accessibilityLabel="새 채팅 만들기"
      >
        <Ionicons name="chatbubble-ellipses" size={22} color={colors.onPrimary} />
      </TouchableOpacity>
    </ThemedView>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Filter Tabs (Chips)                           */
/* -------------------------------------------------------------------------- */

const FilterTabs = React.memo(function FilterTabs({
  value, onChange, colors
}: { value: 'all' | 'unread'; onChange: (v: 'all' | 'unread') => void; colors: AppColors }) {
  const tabs: Array<{ key: 'all' | 'unread'; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'all', label: '전체', icon: 'albums-outline' },
    { key: 'unread', label: '안읽음', icon: 'mail-unread-outline' },
  ];
  return (
    <View style={styles.tabsWrap}>
      {tabs.map(t => {
        const active = value === t.key;
        const bg = active ? colors.primary : colors.surfaceMuted;
        const bd = active ? colors.primary : colors.border;
        const fg = active ? colors.onPrimary : colors.text;
        const ic = active ? colors.onPrimary : colors.textDim;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.chip, { backgroundColor: bg, borderColor: bd }]}
            onPress={() => onChange(t.key)}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} 필터`}
          >
            <Ionicons name={t.icon} size={14} color={ic} style={{ marginRight: 6 }} />
            <ThemedText style={{ color: fg, fontWeight: active ? '700' : '500', fontSize: 14 }}>
              {t.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

/* -------------------------------------------------------------------------- */
/*                                Chat List Item                               */
/* -------------------------------------------------------------------------- */

const ChatListItem = React.memo(function ChatListItem({
  room, colors, onPress, memberSeq
}: { room: ChatRoom; colors: AppColors; onPress: () => void; memberSeq: number }) {
  const isGroup = (room.joinCnt ?? 0) >= 3;
  const unreadCount = room.newCnt ?? 0;
  const lastMessageMemberSeq = room.lastMsgMemberSeq ?? 0;
  const lastMessageMemberName = MemberService.getMemberName(lastMessageMemberSeq);
  const lastMessage = lastMessageMemberName + ' : ' + room.lastInsertMsg;
  const lastTimestamp = room.lastInsertDate || room.createDate;

  let title = room.chatRoomName ?? '';
  let profileColor = '#CCCCCC';
  if (!isGroup) {
    const otherMember = room.joiningMemberSeqList.find(seq => seq !== memberSeq);
    if (otherMember) {
      const otherMemberInfo = MemberService.getMemberBySeq(otherMember);
      if (otherMemberInfo) {
        title = otherMemberInfo.name;
        profileColor = otherMemberInfo.profileColor ?? '#CCCCCC';
      }
    }
  }
  const initials = isGroup ? (title.slice(0, 2) || '채팅').toUpperCase() : (title.slice(1, 3) || '채팅').toUpperCase();

  const API_BASE_URL = getCurrentApiConfig().BASE_URL;
  const encodedFileSeq = encodeBase64(room.chatRoomImgId ?? '');

  // 🔻 다크테마 대비 개선: 배경에 따라 텍스트 색 자동 선택
  const hasImage = !!room.chatRoomImgId;
  const roomIconBg = hasImage ? colors.surface : (isGroup ? colors.primary : colors.surfaceMuted);
  const roomIconTextColor = hasImage
    ? colors.text
    : (roomIconBg === colors.primary ? colors.onPrimary : colors.text);

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: colors.borderMuted || colors.border }}
      style={({ pressed }) => [
        styles.itemRow,
        {
          backgroundColor: colors.surface,
          opacity: pressed && Platform.OS === 'ios' ? 0.85 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`${title} 채팅방으로 이동`}
    >
      {/* RoomIcon */}
      <View style={[styles.roomIcon, { backgroundColor: isGroup ? roomIconBg : profileColor }]}>
        {hasImage ? (
          <Image
            source={{ uri: `${API_BASE_URL}/file/preview/${encodedFileSeq}` }}
            style={styles.roomImage}
            resizeMode="cover"
          />
        ) : (
          isGroup ? <Ionicons name="people" size={24} color={roomIconTextColor} />
            : (
              <ThemedText style={[styles.roomIconText, { color: getTextColorQuick(profileColor) }]}>{initials}</ThemedText>
            )
        )}
        {isGroup && (
          <View style={[styles.groupBadge, { backgroundColor: colors.primary, borderColor: colors.surface }]}>
            <Ionicons name="people" size={10} color={colors.onPrimary} />
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.itemTextContent}>
        <View style={styles.rowBetween}>
          <View style={styles.titleRow}>
            {room.fixed && <ThemedText style={{ marginRight: 6 }}>📌</ThemedText>}
            <ThemedText numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
          </View>
          <ThemedText style={[styles.time, { color: colors.textDim }]}>{timeFormat(lastTimestamp)}</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText numberOfLines={1} style={[styles.preview, { color: colors.textMuted }]}>{lastMessage}</ThemedText>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
              <ThemedText style={[styles.unreadText, { color: colors.onPrimary }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

/* -------------------------------------------------------------------------- */
/*                                  Empty/Error                                */
/* -------------------------------------------------------------------------- */

const EmptyState = React.memo(function EmptyState({ query, tab, colors }: { query: string; tab: 'all' | 'unread'; colors: AppColors }) {
  return (
    <ThemedView style={styles.emptyWrap}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textMuted} />
      <ThemedText style={{ marginTop: 12, color: colors.textDim, fontSize: 16 }}>
        {query ? '검색 결과가 없어요.' : tab === 'unread' ? '안읽은 대화가 없어요.' : '아직 대화가 없어요. 새 채팅을 시작해보세요!'}
      </ThemedText>
    </ThemedView>
  );
});

const ErrorState = React.memo(function ErrorState({
  message, onRetry, colors
}: { message: string; onRetry: () => void; colors: AppColors }) {
  return (
    <ThemedView style={styles.emptyWrap}>
      <Ionicons name="warning-outline" size={48} color={colors.danger} />
      <ThemedText style={{ marginTop: 12, color: colors.danger, fontSize: 15, fontWeight: '700' }}>
        {message}
      </ThemedText>
      <TouchableOpacity
        onPress={onRetry}
        style={[
          styles.retryBtn,
          { borderColor: colors.border, backgroundColor: colors.surfaceMuted },
        ]}
        accessibilityRole="button"
        accessibilityLabel="다시 시도"
      >
        <Ionicons name="refresh" size={16} color={colors.text} />
        <ThemedText style={{ marginLeft: 6, color: colors.text }}>다시 시도</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerWrap: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  iconBtn: {
    padding: 8,
    borderRadius: 12,
  },

  // 🔻 플랫한 검색 영역
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
  clearBtn: {
    paddingLeft: 6,
    paddingVertical: 6,
  },

  tabsWrap: {
    flexDirection: 'row',
    marginTop: 12,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },

  // 🔻 플랫 아이템: 카드 대신 행(Row)
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 76, // 아바타+간격 이후부터 라인이 시작되도록
  },

  itemTextContent: {
    flex: 1,
    marginLeft: 12,
  },

  roomIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  roomIconText: {
    fontWeight: '800',
    fontSize: 16,
  },
  roomImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  groupBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
    marginRight: 8,
  },
  time: {
    fontSize: 12,
  },
  preview: {
    fontSize: 13,
    marginTop: 4,
    flex: 1,
    marginRight: 8,
  },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: '800',
  },

  listContent: {
    paddingVertical: 6,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  // 플로팅 버튼은 라이트/다크 모두 대비가 확보되도록 컬러 토큰 사용
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },

  // ErrorState 재사용 버튼
  retryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
});


