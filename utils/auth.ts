import * as SecureStore from 'expo-secure-store';

/**
 * 저장된 사용자 토큰을 가져옵니다.
 * @returns {Promise<string | null>} 저장된 토큰 문자열 또는 null
 */
export const getStoredToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync('userToken');
    return token ?? null;
  } catch (e) {
    console.warn('토큰 조회 실패:', e);
    return null;
  }
};

/**
 * 사용자 토큰을 안전하게 저장합니다.
 * @param token 저장할 토큰 문자열
 */
export const saveToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync('userToken', token);
  } catch (e) {
    console.warn('토큰 저장 실패:', e);
  }
};

/**
 * 저장된 사용자 토큰을 삭제합니다. (로그아웃 시 사용)
 */
export const clearToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync('userToken');
  } catch (e) {
    console.warn('토큰 삭제 실패:', e);
  }
};