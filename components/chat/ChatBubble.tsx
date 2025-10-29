// components/chat/ChatBubble.tsx
import type { ChatMessage } from '@/api/chat/chatService';
import React from 'react';
import { Image, Linking, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';

const palette = (dark: boolean) => ({
  bgMine: dark ? '#4a4f5a' : '#e9e7ff',
  bgOther: dark ? '#373c43' : '#ffffff',
  text: dark ? '#e6eef6' : '#111827',
  dim: dark ? '#9fb0c0' : '#6b7280',
  link: '#2ea3ff',
  border: dark ? '#1f2530' : '#e5e7eb',
});

type Props = {
  message: ChatMessage;
  isMine: boolean;
};

export default function ChatBubble({ message, isMine }: Props) {
  const dark = useColorScheme() === 'dark';
  const c = palette(dark);

  const senderProfileColor = message.profileColor ?? '#CCCCCC';

  const renderContent = () => {
    switch (message.chatType) {
      case 'I': // 이미지
        return <Image source={{ uri: message.content }} style={styles.image} />;
      case 'F': // 파일
        return (
          <TouchableOpacity onPress={() => { /* TODO: 파일 열기 핸들러 */ }}>
            <Text style={[styles.file, { color: c.text }]} numberOfLines={2}>
              📎 {message.fileName ?? message.content}
            </Text>
            <Text style={[styles.hint, { color: c.dim }]}>탭하여 파일 열기</Text>
          </TouchableOpacity>
        );
      case 'L': // 링크
        return (
          <Text style={[styles.link, { color: c.link }]} onPress={() => Linking.openURL(message.content)}>
            {message.content}
          </Text>
        );
      default: // 'M' 일반 메시지 (HTML mention 은 다음 단계에서 처리)
        return <Text style={[styles.text, { color: c.text }]}>{stripHtmlMentions(message.content)}</Text>;
    }
  };

  return (
    <View style={[styles.wrap, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
      {!isMine && (
        <View style={styles.senderWrap}>
          <View style={[styles.senderProfileCircle, { backgroundColor: senderProfileColor }]}></View>
          <Text style={[styles.sender, { color: c.dim }]}>{message.memberName}</Text>
        </View>
      )}
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isMine ? c.bgMine : c.bgOther,
            borderColor: c.border,
            alignSelf: isMine ? 'flex-end' : 'flex-start',
          },
        ]}
      >
        {renderContent()}
      </View>
      <Text style={[styles.time, { color: c.dim }]}>
        {new Date(message.createDate).toLocaleTimeString().slice(0, 5)}
      </Text>
    </View>
  );
}

function stripHtmlMentions(html: string) {
  // chatService의 mention 태그: <m contenteditable="false" data-member-seq="123">@홍길동</m>
  return html
    .replace(/<m [^>]*>(.*?)<\/m>/g, '$1')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<[^>]+>/g, ''); // 아주 단순한 제거 (다음 단계에서 리치 텍스트로 개선 가능)
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 6, maxWidth: '90%' },
  senderWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  senderProfileCircle: { width: 14, height: 14, borderRadius: 10, marginBottom: 2 },
  sender: { fontSize: 14, marginBottom: 4, fontWeight: '600' },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  text: { fontSize: 15, lineHeight: 21 },
  link: { fontSize: 15, textDecorationLine: 'underline' },
  file: { fontSize: 14, fontWeight: '600' },
  hint: { fontSize: 12, marginTop: 2 },
  time: { fontSize: 10, marginTop: 4 },
  image: { width: 220, height: 160, borderRadius: 12 },
});
