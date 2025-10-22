import { ChatRoom, ChatService } from '@/api/chat/chatService';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, ListRenderItem, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                              */
/* -------------------------------------------------------------------------- */

const timeAgo = (iso?: string) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return '지금';
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  return `${d}일`;
};

/* -------------------------------------------------------------------------- */
/*                                   Screen                                    */
/* -------------------------------------------------------------------------- */

export default function ChatRoomListScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ✅ API 타입 그대로 사용
  const [myChatRooms, setMyChatRooms] = useState<ChatRoom[]>([]);

  const searchRef = useRef<TextInput>(null);

  const fetchMyChatRooms = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      const rooms = await ChatService.getMyChatRooms();
      setMyChatRooms(Array.isArray(rooms) ? rooms : []);
    } catch (e) {
      console.warn('[ChatList] 채팅방 목록 로드 실패:', e);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchMyChatRooms(false);
  }, [fetchMyChatRooms]);

  const onRefresh = useCallback(async () => {
    await fetchMyChatRooms(true);
  }, [fetchMyChatRooms]);

  // 검색 + 탭 필터 (API 필드 그대로)
  const visibleRooms = useMemo(() => {
    let list = myChatRooms;
    if (tab === 'unread') list = list.filter(r => (r.newCnt ?? 0) > 0);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(r =>
        (r.chatRoomName ?? '').toLowerCase().includes(q) ||
        (r.lastInsertMsg ?? '').toLowerCase().includes(q)
      );
    }
    // 고정(fixed) 우선 → 최근(lastInsertDate || createDate) 내림차순
    return [...list].sort((a, b) => {
      if (a.fixed !== b.fixed) return a.fixed ? -1 : 1;
      const at = new Date(a.lastInsertDate || a.createDate).getTime();
      const bt = new Date(b.lastInsertDate || b.createDate).getTime();
      return bt - at;
    });
  }, [myChatRooms, tab, query]);

  const renderItem: ListRenderItem<ChatRoom> = useCallback(({ item }) => (
    <ChatListItem room={item} />
  ), []);

  const keyExtractor = useCallback((item: ChatRoom) => String(item.chatRoomSeq), []);

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <ThemedView style={[styles.headerWrap]}>
        <ThemedText style={[styles.headerTitle, { color: colors.text }]}>채팅</ThemedText>
        <TouchableOpacity
          onPress={() => searchRef.current?.focus()}
          style={styles.iconBtn}
          accessibilityRole="button"
          accessibilityLabel="검색 포커스"
        >
          <Ionicons name="search" size={22} color={colors.tint} />
        </TouchableOpacity>
      </ThemedView>

      {/* Search / Filter Card */}
      <ThemedView style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={[styles.searchBar, { borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.muted} style={{ marginRight: 8 }} />
          <TextInput
            ref={searchRef}
            placeholder="채팅방 또는 메시지 검색"
            placeholderTextColor={colors.muted}
            value={query}
            onChangeText={setQuery}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </TouchableOpacity>
          )}
        </View>

        {/* ✅ 탭: all / unread만 */}
        <FilterTabs value={tab} onChange={setTab} />
      </ThemedView>

      {/* List */}
      {loading ? (
        <ThemedView style={styles.emptyWrap}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={{ marginTop: 12, color: colors.muted, fontSize: 16 }}>
            채팅방을 불러오는 중이에요...
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList<ChatRoom>
          data={visibleRooms}
          keyExtractor={(item) => String(item.chatRoomSeq)}
          renderItem={({ item }) => <ChatListItem room={item} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.tint} />}
          ListEmptyComponent={<EmptyState query={query} />}
        />
      )}

      {/* Floating Action Button (새 채팅) */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.tint }]}
        onPress={() => {/* router.push('/chat/new') */}}
        accessibilityRole="button"
        accessibilityLabel="새 채팅 만들기"
      >
        <Ionicons name="chatbubble-ellipses" size={22} color={colors.inverseText} />
      </TouchableOpacity>
    </ThemedView>
  );
}

/* -------------------------------------------------------------------------- */
/*                               Filter Tabs (Chips)                           */
/* -------------------------------------------------------------------------- */

type TabsValue = 'all' | 'unread';
type TabsProps = { value: TabsValue; onChange: (v: TabsValue) => void; };

const FilterTabs = React.memo(function FilterTabs({ value, onChange }: TabsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const tabs: Array<{ key: TabsValue; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { key: 'all', label: '전체', icon: 'albums-outline' },
    { key: 'unread', label: '안읽음', icon: 'mail-unread-outline' },
  ];

  return (
    <View style={styles.tabsWrap}>
      {tabs.map(t => {
        const active = value === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[
              styles.chip,
              {
                backgroundColor: active ? colors.tint : colors.cardMuted,
                borderColor: active ? colors.tint : colors.border,
              },
            ]}
            onPress={() => onChange(t.key)}
            accessibilityRole="button"
            accessibilityLabel={`${t.label} 필터`}
          >
            <Ionicons name={t.icon} size={14} color={active ? colors.inverseText : colors.muted} style={{ marginRight: 6 }} />
            <ThemedText style={{ color: active ? colors.inverseText : colors.text, fontWeight: active ? '700' : '500' }}>
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

const ChatListItem = React.memo(function ChatListItem({ room }: { room: ChatRoom }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const title = room.chatRoomName ?? '';
  const initials = (title.slice(0, 2) || '채팅').toUpperCase();
  const isGroup = (room.joinCnt ?? 0) >= 3;
  const unreadCount = room.newCnt ?? 0;
  const lastMessage = room.lastInsertMsg ?? '';
  const lastTimestamp = room.lastInsertDate || room.createDate;

  return (
    <TouchableOpacity
      style={[styles.itemWrap, { backgroundColor: colors.cardBackground, borderColor: colors.cardBorder }]}
      onPress={() => {/* router.push(`/chat/${room.chatRoomSeq}`) */}}
      accessibilityRole="button"
      accessibilityLabel={`${title} 채팅방 열기`}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: isGroup ? colors.accent : colors.cardMuted }]}>
        {/* (필요시) chatRoomImgId로 이미지 렌더링 */}
        <ThemedText style={[styles.avatarText]}>{initials}</ThemedText>
        {isGroup && (
          <View style={[styles.groupBadge, { borderColor: colors.background }]}>
            <Ionicons name="people" size={10} color="#fff" />
          </View>
        )}
      </View>

      {/* Middle */}
      <View style={{ flex: 1, marginRight: 10 }}>
        <View style={styles.rowBetween}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
            {room.fixed && <Ionicons name="pin" size={14} color={colors.tint} style={{ marginRight: 6 }} />}
            <ThemedText numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
          </View>
          <ThemedText style={[styles.time, { color: colors.muted }]}>{timeAgo(lastTimestamp)}</ThemedText>
        </View>
        <View style={styles.rowBetween}>
          <ThemedText numberOfLines={1} style={[styles.preview, { color: colors.muted }]}>{lastMessage}</ThemedText>
          {unreadCount > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
              <ThemedText style={[styles.unreadText, { color: colors.inverseText }]}>
                {unreadCount > 99 ? '99+' : unreadCount}
              </ThemedText>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
});

/* -------------------------------------------------------------------------- */
/*                                  Empty State                                */
/* -------------------------------------------------------------------------- */

const EmptyState = React.memo(function EmptyState({ query }: { query: string }) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  return (
    <ThemedView style={styles.emptyWrap}>
      <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.muted} />
      <ThemedText style={{ marginTop: 12, color: colors.muted, fontSize: 16 }}>
        {query ? '검색 결과가 없어요.' : '아직 대화가 없어요. 새 채팅을 시작해보세요!'}
      </ThemedText>
    </ThemedView>
  );
});

/* -------------------------------------------------------------------------- */
/*                                    Styles                                   */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerWrap: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  iconBtn: { padding: 8, borderRadius: 12 },

  card: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },

  searchBar: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 10 },
  clearBtn: { paddingLeft: 6, paddingVertical: 6 },

  tabsWrap: { flexDirection: 'row', marginTop: 10 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },

  itemWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
  },
  avatarText: { color: '#fff', fontWeight: '800' },
  groupBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },

  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '700', flexShrink: 1, marginRight: 8 },
  time: { fontSize: 12 },
  preview: { fontSize: 13, marginTop: 4, flex: 1, marginRight: 8 },

  unreadBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadText: { fontSize: 12, fontWeight: '800' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
});
