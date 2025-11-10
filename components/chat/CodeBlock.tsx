// components/chat/CodeBlock.tsx
import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import SyntaxHighlighter from 'react-native-syntax-highlighter';
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/src/styles/hljs';

export type CodeBlockProps = {
  code: string;
  lang?: string | null;
  dark?: boolean;
  mode?: 'preview' | 'full';
  maxPreviewLines?: number;
  onShowMore?: () => void;
};

function _CodeBlock({
  code,
  lang = null,
  dark = false,
  mode = 'full',
  maxPreviewLines = 4,
  onShowMore = () => {},
}: CodeBlockProps) {
  const isPreview = mode === 'preview';

  const trimmed = useMemo(() => {
    // 1) 앞뒤 공백/빈줄 제거
    let text = code.replace(/^\s*\n/, '').replace(/\s+$/, '');

    // 2) 외곽 <pre>, <code> 래퍼 제거
    text = text
      .replace(/^<pre[^>]*>/i, '')
      .replace(/<\/pre>\s*$/i, '')
      .replace(/^<code[^>]*>/i, '')
      .replace(/<\/code>\s*$/i, '');

    // 3) hljs가 뱉은 span 등 마크업이 섞인 경우 처리
    //    class="hljs-..." 패턴이 있으면 "이미 하이라이트된 HTML"이라고 보고 HTML 제거
    if (/hljs-/.test(text) || /class=["']hljs/.test(text)) {
      // 태그 제거 + <br> → 개행
      text = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '');

      // 엔티티 디코딩 (&lt; &gt; &amp; 등)
      text = text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
    }

    return text;
  }, [code]);

  // preview일 때는 N줄만 보여주기
  const { visibleCode, isClamped } = useMemo(() => {
    const lines = trimmed.split('\n');
    if (!isPreview) {
      return { visibleCode: trimmed, isClamped: false };
    }
    if (lines.length <= maxPreviewLines) {
      return { visibleCode: trimmed, isClamped: false };
    }
    return {
      visibleCode: lines.slice(0, maxPreviewLines).join('\n'),
      isClamped: true,
    };
  }, [trimmed, isPreview, maxPreviewLines]);

  const theme = dark ? atomOneDark : atomOneLight;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: dark ? '#121212' : '#f7f7f7',
        },
        isPreview && styles.previewContainer,
      ]}
    >
      <SyntaxHighlighter
        // 언어 지정 없으면 hljs 자동 감지
        language={lang ?? undefined}
        style={theme}
        highlighter="hljs"
        PreTag={View as any}
        CodeTag={Text as any}
        customStyle={{
          margin: 0,
          padding: 8,
          backgroundColor: 'transparent',
        }}
        codeTagProps={{
          style: {
            fontFamily: Platform.select({
              ios: 'Menlo',
              android: 'monospace',
              default: 'monospace',
            }),
            fontSize: 13,
            lineHeight: 18,
          },
        }}
      >
        {visibleCode}
      </SyntaxHighlighter>

      {isClamped && (
        <Pressable onPress={onShowMore}>
          <View style={styles.moreOverlay}>
            <Text style={styles.moreText}>... 더보기</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  previewContainer: {
    maxHeight: 110,
  },
  moreOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 4,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'flex-end',
  },
  moreText: {
    fontSize: 12,
    color: '#fff',
  },
});

export default React.memo(_CodeBlock);
