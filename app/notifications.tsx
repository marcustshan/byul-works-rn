import dayjs from 'dayjs';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ListRenderItem,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import NotificationService, { Notification } from '@/api/notificationService';
import { RootState } from '@/store';
import { useAppDispatch, useAppSelector } from '@/store/hooks';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { setExistUnread } from '@/store/notificationSlice';
import { Ionicons } from '@expo/vector-icons';

/* -------------------------------------------------------------------------- */
/*                                    UI                                       */
/* -------------------------------------------------------------------------- */

export default function NotificationScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const dispatch = useAppDispatch();
  const user = useAppSelector((state: RootState) => state.auth.userInfo);

  const [items, setItems] = useState<Notification[]>([]);
  const [page, setPage] = useState(0);
  const [size] = useState(20);
  const [hasNext, setHasNext] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const memberSeq = user?.member?.memberSeq ?? 0; // 프로젝트마다 필드명이 다를 수 있어 둘 다 케어

  const loadPage = useCallback(
    async (nextPage: number, isRefresh = false) => {
      if (!memberSeq && memberSeq !== 0) return;

      try {
        setErrorText(null);
        if (isRefresh) setRefreshing(true);
        else if (nextPage === 0) setInitialLoading(true);
        else setLoadingMore(true);

        const res = await NotificationService.getNotifications(memberSeq, {
          page: nextPage,
          size,
          sort: 'createDate,DESC',
        });

        const newData = res.content ?? [];
        setHasNext(!res.last);

        setItems(prev =>
          nextPage === 0 ? newData : [...prev, ...newData.filter(n => !prev.find(p => p.notificationSeq === n.notificationSeq))],
        );
        setPage(nextPage);
      } catch (e: any) {
        setErrorText(e?.message ?? '알림을 불러오지 못했어요.');
      } finally {
        setInitialLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [memberSeq, size],
  );

  const refresh = useCallback(() => {
    loadPage(0, true);
  }, [loadPage]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasNext && !initialLoading) {
      loadPage(page + 1);
    }
  }, [loadingMore, hasNext, initialLoading, loadPage, page]);

  useEffect(() => {
    // 최초 로드
    loadPage(0);
  }, [loadPage]);

  /* --------------------------- actions: read / delete --------------------------- */

  const markAsRead = useCallback(async (notificationSeq: number) => {
    try {
      await NotificationService.readNotification(notificationSeq);
      setItems(prev =>
        prev.map(n => (n.notificationSeq === notificationSeq ? { ...n, read: true } : n)),
      );

      // ✅ 남은 미읽음이 없으면 false로 변경
      dispatch(setExistUnread(items.some(n => !n.read)));
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '읽음 처리에 실패했어요.');
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
      Alert.alert('전체 읽음 처리', '전체 알림을 읽음 처리할까요?', [
        { text: '취소', style: 'cancel' },
        { text: '확인', style: 'destructive', onPress: async () => {
          await NotificationService.readAllNotifications();
          setItems(prev => prev.map(n => ({ ...n, read: true })));
          // ✅ 남은 미읽음이 없으면 false로 변경
          dispatch(setExistUnread(false));
        } },
      ]);
  }, []);

  const deleteOne = useCallback(async (notificationSeq: number) => {
    try {
      await NotificationService.deleteNotification(notificationSeq);
      setItems(prev => prev.filter(n => n.notificationSeq !== notificationSeq));
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '삭제에 실패했어요.');
    }
  }, []);

  /* --------------------------------- UI bits ---------------------------------- */

  const HeaderBar = useMemo(
    () => (
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerTitleWrap}>
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          <ThemedText style={{ fontSize: 24, fontWeight: 'bold' }} type="title">알림</ThemedText>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.headerBtn} onPress={refresh}>
            <Ionicons name="refresh" size={20} color={colors.text} />
            <ThemedText style={styles.headerBtnText}>새로고침</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={20} color={colors.text} />
            <ThemedText style={styles.headerBtnText}>전체 읽음</ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [colors, markAllAsRead, refresh],
  );

  const EmptyState = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Ionicons name="notifications-off-outline" size={36} color={colors.textMuted} />
        <ThemedText style={{ color: colors.textMuted, marginTop: 8 }}>
          표시할 알림이 없어요.
        </ThemedText>
      </View>
    ),
    [colors],
  );

  const renderItem: ListRenderItem<Notification> = useCallback(
    ({ item }) => {
      const created = item.createDate ? dayjs(item.createDate).format('YYYY.MM.DD HH:mm') : '';
      return (
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => {
            if (!item.read) markAsRead(item.notificationSeq);
            // TODO: item.params / pathVariables 로 라우팅이 필요한 경우 여기서 처리
            // router.push( ... );
          }}
          onLongPress={() => {
            Alert.alert(
              '알림 삭제',
              '이 알림을 삭제할까요?',
              [
                { text: '취소', style: 'cancel' },
                { text: '삭제', style: 'destructive', onPress: () => deleteOne(item.notificationSeq) },
              ],
              { cancelable: true },
            );
          }}
          style={[
            styles.card,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              opacity: item.read ? 0.8 : 1,
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleRow}>
              {!item.read && (
                <View style={[styles.unreadDot, { backgroundColor: colors.tint }]} />
              )}
              <ThemedText numberOfLines={1} style={[styles.title, { color: colors.text }]}>
                {item.typeKorName || '(제목 없음)'}
              </ThemedText>
            </View>
            <ThemedText style={[styles.date, { color: colors.textMuted }]}>{created}</ThemedText>
          </View>

          {!!item.content && (
            <ThemedText numberOfLines={2} style={{ color: colors.textDim }}>
              {item.content}
            </ThemedText>
          )}

          {/* 태그/파라미터 표시가 필요하면 아래 사용 */}
          {/* <View style={styles.badges}>
            {item.notificationTypeSeq ? (
              <View style={[styles.badge, { borderColor: colors.borderMuted }]}>
                <ThemedText style={{ fontSize: 12, color: colors.textMuted }}>
                  type: {item.notificationTypeSeq}
                </ThemedText>
              </View>
            ) : null}
          </View> */}
        </TouchableOpacity>
      );
    },
    [colors, deleteOne, markAsRead],
  );

  const keyExtractor = useCallback((n: Notification) => String(n.notificationSeq), []);

  return (
    <ThemedView style={{ flex: 1 }}>
      {HeaderBar}

      {initialLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <ThemedText style={{ marginTop: 8 }}>불러오는 중…</ThemedText>
        </View>
      ) : errorText ? (
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={28} color={colors.text} />
          <ThemedText style={{ marginTop: 8 }}>{errorText}</ThemedText>
          <TouchableOpacity onPress={() => loadPage(0)} style={[styles.retryBtn, { borderColor: colors.border }]}>
            <ThemedText>다시 시도</ThemedText>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            items.length === 0 && { flex: 1, justifyContent: 'center' },
          ]}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} />
          }
          ListEmptyComponent={EmptyState}
          onEndReachedThreshold={0.5}
          onEndReached={loadMore}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
      )}
    </ThemedView>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Styles                                    */
/* -------------------------------------------------------------------------- */

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  headerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  headerBtnText: {
    fontSize: 14,
  },

  listContent: {
    padding: 12,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 8,
  },
  title: {
    fontWeight: '600',
    fontSize: 16,
  },
  date: {
    marginLeft: 8,
    fontSize: 12,
  },
  badges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryBtn: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  footerLoading: {
    paddingVertical: 16,
  },
});
