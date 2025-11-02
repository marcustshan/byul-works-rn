// 환경 설정을 중앙에서 관리하는 파일
export type Environment = 'DEVELOPMENT' | 'PRODUCTION' | 'TEST';

export const CURRENT_ENV: Environment = "PRODUCTION";
// export const CURRENT_ENV: Environment = "DEVELOPMENT";

// 환경별 API 설정
export const API_CONFIG = {
  // 개발 환경
  DEVELOPMENT: {
    // BASE_HOST: 'http://192.168.211.71:9090',
    // BASE_URL: 'http://192.168.211.71:9090/api/works',
    BASE_HOST: 'http://192.168.1.28:9090',
    BASE_URL: 'http://192.168.1.28:9090/api/works',
  },
  
  // 프로덕션 환경
  PRODUCTION: {
    BASE_HOST: 'https://works.byulsoft.com',
    BASE_URL: 'https://works.byulsoft.com/api/works',
  },
  
  // 테스트 환경
  TEST: {
    BASE_HOST: 'https://works.byulsoft.com',
    BASE_URL: 'https://works.byulsoft.com/api/works',
  },
};

// 환경별 Socket 설정
export const SOCKET_CONFIG = {
  // 개발 환경
  DEVELOPMENT: {
    URL: `${API_CONFIG.DEVELOPMENT.BASE_HOST}/socket/works/endpoint`,
    SERVER_TYPE: 'stomp' as const,
    TIMEOUT: 20000,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
  },
  
  // 프로덕션 환경
  PRODUCTION: {
    URL: `${API_CONFIG.PRODUCTION.BASE_HOST}/socket/works/endpoint`, // 임시로 개발 서버 사용
    SERVER_TYPE: 'stomp' as const,
    TIMEOUT: 30000,
    MAX_RECONNECT_ATTEMPTS: 10,
    RECONNECT_DELAY: 2000,
  },
  
  // 테스트 환경
  TEST: {
    URL: `${API_CONFIG.TEST.BASE_HOST}/socket/works/endpoint`,
    SERVER_TYPE: 'stomp' as const,
    TIMEOUT: 15000,
    MAX_RECONNECT_ATTEMPTS: 3,
    RECONNECT_DELAY: 500,
  },
};

// Firebase 설정
export const FIREBASE_CONFIG = {
  // Firebase 기능 활성화 여부 (한 곳에서 관리)
  // ENABLED: true, // false로 설정하면 모든 Firebase 기능 비활성화
  ENABLED: true, // false로 설정하면 모든 Firebase 기능 비활성화
  
  // 환경별 Firebase 설정
  DEVELOPMENT: {
    ENABLED: true, // 개발 환경에서는 Firebase 비활성화 (Expo Go 호환성)
  },
  
  PRODUCTION: {
    ENABLED: true, // 프로덕션 환경에서는 Firebase 활성화
  },
  
  TEST: {
    ENABLED: false, // 테스트 환경에서는 Firebase 비활성화
  },
};

// 현재 환경의 API 설정 가져오기
export const getCurrentApiConfig = () => API_CONFIG[CURRENT_ENV];

// 현재 환경의 Socket 설정 가져오기
export const getCurrentSocketConfig = () => SOCKET_CONFIG[CURRENT_ENV];

// 현재 환경의 Firebase 설정 가져오기
export const getCurrentFirebaseConfig = () => FIREBASE_CONFIG[CURRENT_ENV];

// Firebase 활성화 여부 확인 (전역 설정과 환경별 설정 모두 확인)
export const isFirebaseEnabled = () => {
  return FIREBASE_CONFIG.ENABLED && FIREBASE_CONFIG[CURRENT_ENV].ENABLED;
};

// 환경 확인 유틸리티 함수들
export const isDevelopment = () => CURRENT_ENV === 'DEVELOPMENT';
export const isProduction = () => CURRENT_ENV === 'PRODUCTION';
export const isTest = () => CURRENT_ENV === 'TEST';

