import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

type Props = {
  title: string;
  showSearch: boolean;
  query: string;
  onChangeQuery: (v: string) => void;
  onBack: () => void;
  onToggleSearch: () => void;
  onClearQuery: () => void;
  onSubmitSearch?: () => void;
};

export default function ChatRoomHeader({
  title, showSearch, query, onChangeQuery, onBack, onToggleSearch, onClearQuery,
  onSubmitSearch,
}: Props) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <ThemedView style={[styles.headerWrap]}>
      {/* Left: Back */}
      <TouchableOpacity
        onPress={onBack}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="뒤로가기"
      >
        <Ionicons name="chevron-back" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* Center: title or search */}
      {showSearch ? (
        <View style={[styles.searchBar, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
          <Ionicons name="search" size={18} color={colors.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="이 채팅방에서 검색"
            placeholderTextColor={colors.textMuted}
            value={query}
            onChangeText={onChangeQuery}
            style={[styles.input, { color: colors.text }]}
            autoFocus
            returnKeyType="search"
            onSubmitEditing={onSubmitSearch ?? undefined}
          />
          {!!query && (
            <TouchableOpacity onPress={onClearQuery} style={styles.clearBtn}>
              <Ionicons name="close-circle" size={18} color={colors.textDim} />
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ThemedText numberOfLines={1} style={[styles.title, { color: colors.text }]}>{title}</ThemedText>
      )}

      {/* Right: search toggle */}
      <TouchableOpacity
        onPress={onToggleSearch}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel="검색"
      >
        <Ionicons name={showSearch ? 'close' : 'search'} size={22} color={colors.primary} />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  headerWrap: {
    paddingTop: 8,
    paddingHorizontal: 8,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 18, fontWeight: '800', flex: 1, marginHorizontal: 6 },
  iconBtn: { padding: 8, borderRadius: 12 },
  searchBar: {
    height: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 6,
  },
  input: { flex: 1, fontSize: 16, paddingVertical: 8 },
  clearBtn: { paddingLeft: 6, paddingVertical: 6 },
});
