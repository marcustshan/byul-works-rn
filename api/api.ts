// src/lib/api.ts
import { store } from '@/store';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { router } from 'expo-router';

import { getCurrentApiConfig } from '@/constants/environment';
import { Platform } from 'react-native';

const BASE_URL = getCurrentApiConfig().BASE_URL;

const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 15_000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// --- 공통 에러 타입(예시) ---
export interface ApiErrorShape {
  status: number;
  code?: string;
  message: string;
  details?: unknown;
}

function toApiError(e: unknown): ApiErrorShape {
  const err = e as AxiosError<any>;
  if (err.response) {
    return {
      status: err.response.status,
      code: err.response.data?.code,
      message:
        err.response.data?.message ||
        err.message ||
        '요청 처리 중 오류가 발생했습니다.',
      details: err.response.data,
    };
  }
  if (err.request) {
    return {
      status: 0,
      message: '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.',
    };
  }
  return {
    status: -1,
    message: (e as Error)?.message || '알 수 없는 오류가 발생했습니다.',
  };
}

// --- 요청 인터셉터: 토큰 자동 주입 ---
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = store.getState().auth.token;
    config.headers['X-Client'] = 'byulworksrn';
    config.headers['X-Device-Platform'] = Platform.OS === 'ios' ? 'iOS' : 'AOS';
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => Promise.reject(error)
);

// --- 응답 인터셉터: 401 처리 ---
let isHandling401 = false;

api.interceptors.response.use(
  (response: any) => {
    return response;
  },
  async (error: any) => {
    const err = error as AxiosError;
    const status = err.response?.status;

    // 액세스 토큰 만료 등
    if (status === 401) {
      // (선택) refresh token 로직을 여기에 구현할 수 있습니다.
      // 예) isHandling401 플래그로 동시 다중 401 처리 방지하고,
      // refresh 성공 시 원 요청 재시도. 실패 시 로그아웃.

      if (!isHandling401) {
        isHandling401 = true;
        try {
          // await SecureStore.deleteItemAsync('userToken').catch(() => {});
          // store.dispatch(clearAuth());
          // replace로 스택 비우기
          router.replace('/login');
        } finally {
          isHandling401 = false;
        }
      }
    }

    return Promise.reject(toApiError(error));
  }
);

export default api;
