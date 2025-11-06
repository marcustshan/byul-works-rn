import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useMemo } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
// (선택) 프로젝트에 Toast가 있다면 사용
import { Toast } from '@/components/common/Toast';

export type CodeBlockProps = {
  code: string;
  lang?: string | null;   // 없으면 자동감지(hljs) 시도
  dark?: boolean;         // 다크 테마 여부
  showLineNumbers?: boolean;
  wrapLongLines?: boolean; // 긴 줄 줄바꿈
  copyable?: boolean;      // 상단 우측 복사 아이콘
};

function _CodeBlock({
  code,
  lang = null,
  dark = false,
  showLineNumbers = false,
  wrapLongLines = true,
  copyable = true,
}: CodeBlockProps) {
  // 동적 require: Expo Go/웹 번들 이슈 회피 + 패키지 미설치 시 폴백
  const { SyntaxHighlighter, styleTheme, canHighlight } = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const SyntaxHighlighter = require('react-native-syntax-highlighter').default;
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const styles = require('react-syntax-highlighter/dist/esm/styles/hljs');
      const styleTheme = styles[dark ? 'atomOneDark' : 'atomOneLight'];
      return { SyntaxHighlighter, styleTheme, canHighlight: true };
    } catch {
      return { SyntaxHighlighter: null, styleTheme: null, canHighlight: false };
    }
  }, [dark]);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(code);
      Toast?.show?.({ message: '코드를 복사했어요.', type: 'success' });
    } catch {
      // no-op
    }
  };

  // 하이라이트 가능 → hljs 자동감지 (언어 없으면 language 생략)
  if (canHighlight && SyntaxHighlighter && styleTheme) {
    const props: Record<string, any> = {
      style: styleTheme,
      highlighter: 'hljs', // ✅ 자동감지는 hljs에서만
      showLineNumbers,
      wrapLongLines,
      PreTag: View, // RN 환경에서 불필요한 경고 방지
    };
    if (lang) props.language = lang;

    return (
      <View style={[stylesWrap.container, { backgroundColor: dark ? '#121212' : '#f7f7f7' }]}>
        {copyable && (
          <Pressable style={stylesWrap.copyBtn} onPress={handleCopy} hitSlop={8}>
            <Ionicons name="copy-outline" size={14} color={dark ? '#bbb' : '#555'} />
          </Pressable>
        )}
        <SyntaxHighlighter {...props}>{code}</SyntaxHighlighter>
      </View>
    );
  }

  // 폴백: 패키지 미설치/불가 시 모노스페이스 블록만
  return (
    <ScrollView
      horizontal={!wrapLongLines}
      contentContainerStyle={[
        stylesWrap.container,
        { backgroundColor: dark ? '#1e1e1e' : '#f2f2f2', paddingVertical: 10, paddingHorizontal: 12 },
      ]}
    >
      {copyable && (
        <Pressable style={stylesWrap.copyBtn} onPress={handleCopy} hitSlop={8}>
          <Ionicons name="copy-outline" size={14} color={dark ? '#d0d0d0' : '#555'} />
        </Pressable>
      )}
      <Text
        selectable
        style={{
          color: dark ? '#dcdcdc' : '#222',
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
          fontSize: 13,
          lineHeight: 19,
        }}
      >
        {code}
      </Text>
    </ScrollView>
  );
}

const stylesWrap = StyleSheet.create({
  container: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  copyBtn: {
    position: 'absolute',
    right: 8,
    top: 8,
    zIndex: 2,
    opacity: 0.7,
    padding: 4,
    borderRadius: 6,
  },
});

export default React.memo(_CodeBlock);
