// components/chat/sheets/ReactionDetailsSheet.tsx
import type { ChatReaction } from '@/api/chat/chatService';
import { MemberService } from '@/api/memberService';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;

  // 메시지 식별
  chatSeq: number;

  // 현 메시지 리액션들(상위에서 로컬 상태로 관리)
  reactions: ChatReaction[];

  // 로그인 사용자 seq
  myMemberSeq: number;

  // 액션
  onDeleteMyReaction: (chatSeq: number) => Promise<void>;

  // 초깃값(선택)
  initialActiveKey?: string | null;
};

type AggItem = {
  key: string;            // 리액션 그룹 키
  label: string;          // 렌더 텍스트 (이모지)
  members: number[];      // 누른 사람 seq
  hasMe: boolean;         // 내가 포함됐는지
};

export default function ReactionDetailsSheet({
  visible,
  onClose,
  chatSeq,
  reactions,
  myMemberSeq,
  onDeleteMyReaction,
  initialActiveKey = null,
}: Props) {
  const insets = useSafeAreaInsets();
  const dark = useColorScheme() === 'dark';
  const c = Colors[dark ? 'dark' : 'light'];

  const agg = useMemo(() => {
    const map = new Map<string, AggItem>();
    reactions.forEach((r) => {
      // 그룹 키: 같은 이모지(reaction)끼리 묶기
      const key = String(r.reaction); // 서버 스키마상 reaction: "👍"
      if (!map.has(key)) {
        map.set(key, { key, label: r.reaction, members: [], hasMe: false });
      }
      const bucket = map.get(key)!;
      bucket.members.push(r.memberSeq);
      if (r.memberSeq === myMemberSeq) bucket.hasMe = true;
    });
    const list = Array.from(map.values()).sort((a, b) => b.members.length - a.members.length);
    return {
      list,
      hasAny: list.length > 0,
      defaultKey: list[0]?.key ?? null,
    };
  }, [reactions, myMemberSeq]);

  const [activeKey, setActiveKey] = useState<string | null>(initialActiveKey);
  useEffect(() => {
    if (!visible) return;
    setActiveKey((prev) => prev ?? agg.defaultKey);
  }, [visible, agg.defaultKey]);

  const current = agg.list.find((r) => r.key === activeKey) ?? (agg.defaultKey ? agg.list[0] : undefined);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      hardwareAccelerated
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.overlayTouch} onPress={onClose} />
        <View
          style={[
            styles.sheet,
            { backgroundColor: c.chat.sheetBg, borderColor: c.border, paddingBottom: Math.max(12, insets.bottom + 12) },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: c.chat.sheetHandle }]} />
          <Text style={[styles.title, { color: c.text }]}>리액션</Text>

          {/* 탭: 리액션 그룹 */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 8 }}
            contentContainerStyle={{ paddingHorizontal: 2 }}
          >
            {agg.list.map((rx) => {
              const isActive = rx.key === activeKey;
              return (
                <Pressable
                  key={rx.key}
                  onPress={() => setActiveKey(rx.key)}
                  style={[
                    styles.tab,
                    {
                      backgroundColor: isActive ? c.surface : c.chat.chipBg,
                      borderColor: isActive ? c.tint : c.border,
                    },
                  ]}
                >
                  <Text style={[styles.tabLabel, { color: isActive ? c.tint : c.text }]}>{rx.label}</Text>
                  <Text style={[styles.tabCount, { color: isActive ? c.tint : c.textDim }]}>{rx.members.length}</Text>
                  {rx.hasMe && <Text style={[styles.meDot, { color: c.tint }]}>•</Text>}
                </Pressable>
              );
            })}
          </ScrollView>

          {/* 선택 탭의 사용자 목록 */}
          {!current || current.members.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textDim }]}>아직 아무도 누르지 않았어요.</Text>
          ) : (
            <ScrollView style={{ maxHeight: 260 }}>
              <View style={styles.chips}>
                {current.members.map((seq) => {
                  const isMe = seq === myMemberSeq;
                  return (
                    <View key={seq} style={[styles.chip, { backgroundColor: c.chat.chipBg }]}>
                      <View style={[styles.dot, { backgroundColor: MemberService.getMemberProfileColor(seq) }]} />
                      <Text style={[styles.chipText, { color: c.text }]} numberOfLines={1}>
                        {MemberService.getMemberName(seq)}
                      </Text>
                      {isMe && (
                        <Pressable
                          onPress={() => onDeleteMyReaction(chatSeq)}
                          hitSlop={8}
                          style={styles.deleteX}
                        >
                          <Ionicons name="close-circle" size={14} color={c.textDim} />
                        </Pressable>
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          )}

          <Pressable onPress={onClose} style={[styles.closeBtn, { borderColor: c.border }]}>
            <Text style={[styles.closeBtnText, { color: c.text }]}>닫기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17, 24, 39, 0.45)' },
  overlayTouch: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingHorizontal: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 999, marginBottom: 8 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 8 },

  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: 8,
  },
  tabLabel: { fontSize: 18, fontWeight: '600' },
  tabCount: { fontSize: 14, marginLeft: 6 },
  meDot: { marginLeft: 6, fontSize: 16 },

  emptyText: { fontSize: 12 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  dot: { width: 12, height: 12, borderRadius: 999, marginRight: 6 },
  chipText: { fontSize: 13, maxWidth: 180 },
  deleteX: { marginLeft: 4, justifyContent: 'center', alignItems: 'center' },

  closeBtn: {
    marginTop: 12,
    alignSelf: 'stretch',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  closeBtnText: { fontSize: 14, fontWeight: '600' },
});
