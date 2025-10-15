import { ThemedText } from '@/components/themed-text';
import React, { forwardRef, useMemo, useState } from 'react';
import {
    Pressable,
    StyleSheet,
    TextInput,
    TextInputProps,
    TextStyle,
    useColorScheme,
    View,
    ViewStyle,
} from 'react-native';

type Size = 'sm' | 'md' | 'lg';

export interface ThemedTextInputProps extends Omit<TextInputProps, 'style'> {
  /** 라벨 텍스트 */
  label?: string;
  /** 에러 메시지 (문자열 전달 시 에러 스타일 적용) */
  errorText?: string;
  /** 도움말(보조) 텍스트 */
  helperText?: string;
  /** 좌측 아이콘 (컴포넌트) */
  leftIcon?: React.ReactNode;
  /** 우측 아이콘 (컴포넌트) */
  rightIcon?: React.ReactNode;
  /** 비밀번호 토글 버튼 표시 여부 */
  secureToggle?: boolean;
  /** 컨테이너 스타일 */
  containerStyle?: ViewStyle;
  /** 인풋 자체 스타일 */
  inputStyle?: TextStyle;
  /** 크기 */
  size?: Size;
  /** 비활성화 */
  disabled?: boolean;
}

/** 라이트/다크 테마 팔레트 */
const palette = {
  light: {
    bg: '#FFFFFF',
    text: '#111111',
    placeholder: '#888888',
    border: '#DDDDDD',
    borderFocus: '#662D91',
    borderError: '#E74C3C',
    helper: '#777777',
    label: '#333333',
    disabledBg: '#F4F4F4',
    disabledText: '#A0A0A0',
  },
  dark: {
    bg: '#1C1C1E',
    text: '#F2F2F7',
    placeholder: '#8E8E93',
    border: '#3A3A3C',
    borderFocus: '#8A5DD1',
    borderError: '#FF6B6B',
    helper: '#9A9AA0',
    label: '#E5E5EA',
    disabledBg: '#2A2A2C',
    disabledText: '#7C7C80',
  },
};

export const ThemedTextInput = forwardRef<TextInput, ThemedTextInputProps>(
  (
    {
      label,
      errorText,
      helperText,
      leftIcon,
      rightIcon,
      secureTextEntry,
      secureToggle = false,
      containerStyle,
      inputStyle,
      size = 'md',
      editable = true,
      disabled,
      onFocus,
      onBlur,
      ...rest
    },
    ref
  ) => {
    const scheme = useColorScheme() ?? 'light';
    const isDark = scheme === 'dark';
    const c = isDark ? palette.dark : palette.light;

    const [focused, setFocused] = useState(false);
    const [secure, setSecure] = useState(!!secureTextEntry);

    const resolvedEditable = disabled ? false : editable;

    const dims = useMemo(() => {
      switch (size) {
        case 'sm':
          return { height: 40, radius: 10, font: 14, pad: 12, gap: 8 };
        case 'lg':
          return { height: 56, radius: 14, font: 16, pad: 16, gap: 10 };
        case 'md':
        default:
          return { height: 48, radius: 12, font: 15, pad: 14, gap: 8 };
      }
    }, [size]);

    const borderColor = errorText
      ? c.borderError
      : focused
      ? c.borderFocus
      : c.border;

    return (
      <View style={containerStyle}>
        {label ? (
          <ThemedText style={[styles.label, { color: c.label }]}>{label}</ThemedText>
        ) : null}

        <View
          style={[
            styles.inputWrap,
            {
              backgroundColor: resolvedEditable ? c.bg : c.disabledBg,
              borderColor,
              borderRadius: dims.radius,
              minHeight: dims.height,
              paddingHorizontal: dims.pad,
              gap: dims.gap,
              opacity: resolvedEditable ? 1 : 0.7,
            },
          ]}
        >
          {leftIcon ? <View style={styles.iconLeft}>{leftIcon}</View> : null}

          <TextInput
            ref={ref}
            style={[
              styles.input,
              {
                color: resolvedEditable ? c.text : c.disabledText,
                fontSize: dims.font,
                paddingVertical: 0, // 수직 가운데 정렬
                flex: 1,
              },
              inputStyle,
            ]}
            placeholderTextColor={c.placeholder}
            secureTextEntry={secure}
            editable={resolvedEditable}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />

          {/* 우측 아이콘 영역 - 비밀번호 토글 또는 사용자가 넘긴 아이콘 */}
          {secureToggle ? (
            <Pressable onPress={() => setSecure((v) => !v)} hitSlop={10}>
              <ThemedText style={{ color: c.helper }}>
                {secure ? '보기' : '숨기기'}
              </ThemedText>
            </Pressable>
          ) : rightIcon ? (
            <View style={styles.iconRight}>{rightIcon}</View>
          ) : null}
        </View>

        {/* 에러 > 헬퍼 순서로 노출 */}
        {errorText ? (
          <ThemedText style={[styles.feedback, { color: c.borderError }]}>
            {errorText}
          </ThemedText>
        ) : helperText ? (
          <ThemedText style={[styles.feedback, { color: c.helper }]}>
            {helperText}
          </ThemedText>
        ) : null}
      </View>
    );
  }
);

ThemedTextInput.displayName = 'ThemedTextInput';

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontWeight: '600',
  },
  inputWrap: {
    width: '100%',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    // 개별 스타일은 props로 덮어쓰기
  },
  iconLeft: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconRight: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  feedback: {
    marginTop: 6,
    fontSize: 12,
  },
});