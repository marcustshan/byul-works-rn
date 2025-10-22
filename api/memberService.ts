import api, { ApiErrorShape } from '@/api/api';
import { store } from '@/store';
import { Member } from '@/store/memberSlice';

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type MemberError = ApiErrorShape;

export class MemberService {
  /**
   * 모든 사용자 정보를 가져오는 메서드
   */
  static async getAllMembers(): Promise<Member[]> {
    const { data } = await api.get('/system/member/listAll');
    
    // API 응답 검증
    if (!Array.isArray(data)) {
      throw new Error('사용자 정보를 가져오는데 실패했습니다.');
    }

    return data;
  }

  /**
   * memberSeq로 사용자 정보를 찾는 메서드
   * @param memberSeq - 사용자 시퀀스
   * @returns 사용자 정보 또는 undefined
   */
  static getMemberBySeq(memberSeq: number): Member | undefined {
    const memberList = store.getState().member.memberList;
    return memberList?.find(member => member.memberSeq === memberSeq);
  }

  /**
   * memberSeq로 사용자 이름을 가져오는 메서드
   * @param memberSeq - 사용자 시퀀스
   * @returns 사용자 이름 또는 '알 수 없음'
   */
  static getMemberName(memberSeq: number): string {
    const member = this.getMemberBySeq(memberSeq);
    
    // 사용자 정보가 없을 때는 기본값 반환
    return member ? member.name : '알 수 없음';
  }

  /**
   * memberSeq로 사용자의 profileColor를 가져오는 메서드
   * @param memberSeq - 사용자 시퀀스
   * @returns profileColor 또는 기본값 '#ccc'
   */
  static getMemberProfileColor(memberSeq: number): string {
    const member = this.getMemberBySeq(memberSeq);
    return member?.profileColor || '#ccc';
  }

  /**
   * 사용자 목록을 검색하는 메서드
   * @param query - 검색어
   * @returns 검색된 사용자 목록
   */
  static searchMembers(query: string): Member[] {
    const memberList = store.getState().member.memberList;

    if (!query.trim()) return memberList || [];
    
    const lowerQuery = query.toLowerCase();
    return memberList?.filter(member => 
      member.name.toLowerCase().includes(lowerQuery) ||
      (member.id && member.id.toLowerCase().includes(lowerQuery)) ||
      (member.email && member.email.toLowerCase().includes(lowerQuery)) ||
      (member.department && member.department.toLowerCase().includes(lowerQuery))
    ) || [];
  }
}
