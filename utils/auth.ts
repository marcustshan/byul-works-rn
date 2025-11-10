import AsyncStorage from '@react-native-async-storage/async-storage';

interface AutoLoginInfo {
  id: string;
  password: string;
}

/**
 * 저장된 사용자 토큰을 가져옵니다.
 * @returns {Promise<string | null>} 저장된 토큰 문자열 또는 null
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    return token ?? null;
  } catch (e) {
    console.warn('토큰 조회 실패:', e);
    return null;
  }
};

/**
 * 자동로그인 정보 저장
 */
export const saveAutoLoginInfo = async (autoLoginInfo: AutoLoginInfo): Promise<void> => {
  try {
    await AsyncStorage.setItem('autoLoginInfo', JSON.stringify(autoLoginInfo));
  } catch (e) {
    console.warn('자동로그인 정보 저장 실패:', e);
  }
};

/**
 * 자동로그인 정보 조회
 * @returns 자동로그인 정보
 */
export const getAutoLoginInfo = async (): Promise<AutoLoginInfo | null> => {
  try {
    const autoLoginInfo = await AsyncStorage.getItem('autoLoginInfo');
    return autoLoginInfo ? JSON.parse(autoLoginInfo) : null;
  } catch (e) {
    console.warn('자동로그인 정보 조회 실패:', e);
    return null;
  }
};

/**
 * 자동로그인 정보 삭제
 */
export const clearAutoLoginInfo = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('autoLoginInfo');
  } catch (e) {
    console.warn('자동로그인 정보 삭제 실패:', e);
  }
};

/**
 * 사용자 토큰을 안전하게 저장합니다.
 * @param token 저장할 토큰 문자열
 */
export const saveToken = async (token: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('userToken', token);
  } catch (e) {
    console.warn('토큰 저장 실패:', e);
  }
};

/**
 * 저장된 사용자 토큰을 삭제합니다. (로그아웃 시 사용)
 */
export const clearToken = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem('userToken');
  } catch (e) {
    console.warn('토큰 삭제 실패:', e);
  }
};

/**
 * 로그아웃
 */
export const logout = async (): Promise<void> => {
  try {
    await clearAutoLoginInfo();
  } catch (e) {
    console.warn('로그아웃 실패:', e);
  }
};
