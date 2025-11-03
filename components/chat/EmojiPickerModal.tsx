// components/chat/EmojiPickerModal.tsx
import { Colors } from '@/constants/theme';
import { EmojiMapper } from '@/utils/emojiMapper';
import React, { useMemo, useState } from 'react';
import { FlatList, Image, Modal, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (emojiPath: string) => void;
};

// emojiMapper에서 카테고리별로 그룹핑
const getEmojiGroups = () => {
  const groups: Record<string, string[]> = {};

  Object.keys(EmojiMapper).forEach((path) => {
    // '/emoji/goblin/goblin_01.gif' -> 'goblin'
    const match = path.match(/^\/emoji\/([^\/]+)\//);
    if (match) {
      const category = match[1];
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(path);
    }
  });

  // 각 카테고리 내에서 정렬 (파일명 기준)
  Object.keys(groups).forEach((category) => {
    groups[category].sort();
  });

  return groups;
};

export default function EmojiPickerModal({ visible, onClose, onSelect }: Props) {
  const scheme = useColorScheme();
  const c = Colors[scheme ?? 'light'];

  // 카테고리별 그룹핑 데이터
  const emojiGroups = useMemo(() => getEmojiGroups(), []);
  const categories = useMemo(() => Object.keys(emojiGroups).sort(), []);

  // 선택된 카테고리
  const [selectedCategory, setSelectedCategory] = useState<string>(categories[0] || '');

  // 선택된 카테고리의 이모지 목록
  const currentEmojis = useMemo(() => {
    return selectedCategory ? emojiGroups[selectedCategory] || [] : [];
  }, [selectedCategory, emojiGroups]);

  const renderCategoryTab = ({ item }: { item: string }) => {
    const isSelected = item === selectedCategory;
    const firstEmojiPath = emojiGroups[item]?.[0];
    const imageSource = firstEmojiPath ? EmojiMapper[firstEmojiPath] : null;

    return (
      <Pressable
        onPress={() => setSelectedCategory(item)}
        style={[
          styles.categoryTab,
          {
            borderColor: isSelected ? c.link : c.border,
            borderWidth: isSelected ? 3 : 1,
          },
        ]}
      >
        {imageSource ? (
          <Image source={imageSource} style={styles.categoryTabImage} resizeMode="contain" />
        ) : (
          <View style={[styles.categoryTabPlaceholder, { backgroundColor: c.background }]}>
            <Text style={[styles.categoryTabPlaceholderText, { color: c.textDim }]}>?</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmojiItem = ({ item }: { item: string }) => {
    const imageSource = EmojiMapper[item];

    return (
      <Pressable
        style={styles.emojiItem}
        onPress={() => {
          onSelect(item);
          onClose();
        }}
      >
        <View style={styles.emojiContainer}>
          {imageSource ? (
            <Image source={imageSource} style={styles.emojiImage} resizeMode="contain" />
          ) : (
            <View style={[styles.emojiPlaceholder, { backgroundColor: c.background }]}>
              <Text style={[styles.emojiPlaceholderText, { color: c.textDim }]}>?</Text>
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { backgroundColor: c.overlay }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <SafeAreaView edges={['bottom']} style={styles.sheetWrap}>
          <View style={[styles.sheet, { backgroundColor: c.surface, borderColor: c.border }]}>
            {/* 헤더 */}
            <View style={styles.header}>
              <Text style={[styles.title, { color: c.text }]}>이모티콘 선택</Text>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={[styles.closeButtonText, { color: c.text }]}>✕</Text>
              </Pressable>
            </View>

            {/* 카테고리 탭 */}
            <View style={[styles.categoryContainer, { borderBottomColor: c.border }]}>
              <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item}
                renderItem={renderCategoryTab}
                contentContainerStyle={styles.categoryList}
              />
            </View>

            {/* 이모지 그리드 */}
            <FlatList
              data={currentEmojis}
              numColumns={4}
              keyExtractor={(item) => item}
              renderItem={renderEmojiItem}
              contentContainerStyle={styles.emojiGrid}
              showsVerticalScrollIndicator={false}
            />

            {/* 닫기 버튼 */}
            <Pressable onPress={onClose} style={[styles.cancel, { backgroundColor: c.background }]}>
              <Text style={[styles.cancelLabel, { color: c.text }]}>닫기</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetWrap: {
    padding: 12,
  },
  sheet: {
    borderRadius: 16,
    paddingTop: 12,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    maxHeight: '75%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '600',
  },
  categoryContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
    paddingBottom: 8,
  },
  categoryList: {
    paddingHorizontal: 8,
    gap: 8,
  },
  categoryTab: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  categoryTabImage: {
    width: '100%',
    height: '100%',
  },
  categoryTabPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  categoryTabPlaceholderText: {
    fontSize: 20,
  },
  emojiGrid: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  emojiItem: {
    width: '25%',
    aspectRatio: 1,
    padding: 8,
  },
  emojiContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
  },
  emojiImage: {
    width: '100%',
    height: '100%',
  },
  emojiPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  emojiPlaceholderText: {
    fontSize: 20,
  },
  cancel: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
});
