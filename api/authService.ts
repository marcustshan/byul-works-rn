// src/services/auth.service.ts
import api, { ApiErrorShape } from '@/api/api';
import { isFirebaseEnabled } from '@/constants/environment';
import { UserInfo } from '@/store/authSlice';

// 인증 관련 타입 정의
export interface LoginRequest {
  id: string;
  password: string;
}

// AuthError를 ApiErrorShape로 통일
export type AuthError = ApiErrorShape;

// 인증 서비스 클래스
export class AuthService {
  /** 로그인 */
  static async login(credentials: LoginRequest): Promise<UserInfo> {
    const { data } = await api.post<UserInfo>('/auth/login', credentials);

    if (!data?.accessToken) {
      throw new Error('로그인 응답에 accessToken이 없습니다.');
    }

    return data;
  }

  /** 토큰 갱신 (미사용 - 향후 확장) */
  static async refreshToken(): Promise<UserInfo> {
    // 서버가 refresh API를 제공하면 아래 주석을 활성화
    // const { data } = await api.post<UserInfo>('/auth/refresh');
    // if (!data?.accessToken) throw new Error('토큰 갱신 실패: accessToken 없음');
    // return data;

    throw new Error('토큰 갱신 기능은 아직 구현되지 않았습니다.');
  }

  /** 현재 로그인한 사용자 정보 조회 */
  static async getMemberInfo(): Promise<UserInfo> {
    // ✅ Authorization 헤더는 인터셉터가 자동 주입
    const { data } = await api.get<UserInfo>('/auth/info');

    return data;
  }

  /**
   * 토큰 유효성 검증
   * - 인자로 받은 token을 강제로 헤더에 넣어 검증하고 싶다면 config 헤더로 override 가능
   * - 일반적으로는 인터셉터가 store의 토큰을 자동 주입하므로 인자 없이 호출하는 형태로도 사용 가능
   */
  static async validateToken(token: string): Promise<UserInfo> {
    try {
      const response = await api.post<UserInfo>(
        '/auth/validateToken',
        token,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
        }
      ).catch((error) => {
        console.error('[AuthService] 토큰 유효성 검증 실패:', error);
        throw error;
      });

      return response?.data;
    } catch (error) {
      console.error('[AuthService] 토큰 유효성 검증 실패:', error);
      throw error;
    }
  }

  /** Firebase 토큰 등록 */
  static async setFirebaseToken(token: string): Promise<void> {
    if (!isFirebaseEnabled()) {
      console.log('🔥 [AuthService] Firebase 비활성화 - 서버 등록 스킵:', token.substring(0, 20) + '...');
      return;
    }
    
    await api.post<void>(`/auth/firebaseToken/${encodeURIComponent(token)}`);
    console.log('✅ [AuthService] Firebase 토큰 서버 등록 완료');
  }

  /** Firebase 토큰 삭제 (로그아웃 시) */
  static async deleteFirebaseToken(): Promise<void> {
    if (!isFirebaseEnabled()) {
      console.log('🔥 [AuthService] Firebase 비활성화 - 서버 삭제 스킵');
      return;
    }
    
    await api.delete<void>('/auth/personalFirebaseToken/delete');
    console.log('✅ [AuthService] Firebase 토큰 서버 삭제 완료');
  }
}

// default export와 named export 모두 제공
export default AuthService;
