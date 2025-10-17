import Checkbox from 'expo-checkbox';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';

import authService from '@/api/authService';
import { ThemedText } from '@/components/themed-text';
import { ThemedTextInput } from '@/components/themed-text-input';
import { ThemedView } from '@/components/themed-view';
import { setToken, UserInfo } from '@/store/authSlice';
import { useAppDispatch } from '@/store/hooks';
import { postLoginProcess } from '@/store/thunk/postLoginProcess';
import { clearToken, saveToken } from '@/utils/auth';

export default function LoginScreen() {
  const dispatch = useAppDispatch();

  const scheme = useColorScheme() ?? 'light';
  const isDark = scheme === 'dark';

  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [autoLogin, setAutoLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [idErr, setIdErr] = useState<string | undefined>();
  const [pwErr, setPwErr] = useState<string | undefined>();

  // refs for input fields
  const passwordInputRef = useRef<TextInput>(null);

  const validate = () => {
    let ok = true;
    setIdErr(undefined);
    setPwErr(undefined);

    if (!id || id.trim().length < 1) {
      setIdErr('아이디를 입력하세요.');
      ok = false;
    }
    if (!pw || pw.length < 1) {
      setPwErr('비밀번호를 입력하세요.');
      ok = false;
    }
    return ok;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      const res:UserInfo = await authService.login({ id: id, password: pw });
      if (!res.accessToken) {
        throw new Error('로그인 실패');
      };

      dispatch(setToken(res.accessToken));

      const token = res.accessToken;
      if (autoLogin) {
        await saveToken(token);
      } else {
        await clearToken();
      }

      await dispatch(postLoginProcess());

      router.replace('/main');
    } catch (e: any) {
      console.error('로그인 실패', e);
      Alert.alert('로그인 실패', e?.message ?? '문제가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <ThemedView style={styles.container}>
        {/* 상단 브랜드 영역 */}
        <View style={styles.brand}>
          <Image
            source={require('@/assets/images/icon.png')} // 경로는 프로젝트에 맞게 조정
            style={styles.logo}
            resizeMode="contain"
          />
          <ThemedText style={styles.brandText}>ByulWorks</ThemedText>
        </View>

        {/* 하단 폼 영역 */}
        <View style={styles.formArea}>
          <View style={{ gap: 14 }}>
            <ThemedTextInput
              label="아이디"
              placeholder="아이디를 입력하세요"
              autoCapitalize="none"
              value={id}
              onChangeText={setId}
              errorText={idErr}
              returnKeyType="next"
              onSubmitEditing={() => passwordInputRef.current?.focus()}
            />

            <ThemedTextInput
              ref={passwordInputRef}
              label="비밀번호"
              placeholder="비밀번호를 입력하세요"
              secureTextEntry
              value={pw}
              onChangeText={setPw}
              errorText={pwErr}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />

            {/* 자동로그인 체크박스 */}
            <Pressable
              onPress={() => setAutoLogin(v => !v)}
              style={styles.checkboxRow}
            >
              <Checkbox
                value={autoLogin}
                onValueChange={setAutoLogin}
                color={autoLogin ? (isDark ? '#8A5DD1' : '#662D91') : undefined}
                style={styles.checkbox}
              />
              <ThemedText>자동로그인</ThemedText>
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginBtn,
              { backgroundColor: isDark ? '#8A5DD1' : '#662D91', opacity: pressed ? 0.9 : 1 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.loginBtnText}>로그인</ThemedText>
            )}
          </Pressable>
        </View>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    display: 'flex',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
    marginTop: 24,
  },
  logo: {
    width: 140,
    height: 140,
    marginBottom: 12,
  },
  brandText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#662D91',
  },
  formArea: {
    marginTop: 50,
    gap: 16,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
  },
  loginBtn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
