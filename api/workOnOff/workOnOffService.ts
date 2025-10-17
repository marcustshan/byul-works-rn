import api from '@/api/api';

// 근무 형태 타입
export type WorkType = '본사' | '재택' | '외근' | '파견';
export const workTypes: Array<WorkType> = ['본사', '재택', '외근', '파견'];

// 출퇴근 기록 관련 타입
export interface WorkOnOffRecord {
  expectOffTime: string;
  isLate: boolean;
  isLeaveEarly: boolean;
  memberSeq: number;
  personalScheduleType: string | null;
  theDate: string;
  workOffTime: string | null;
  workOnTime: string;
  workOnTimeSeq: number;
  workType: WorkType;
}

export interface WeeklyWorkOnOffResponse extends Array<WorkOnOffRecord> {}

// 연차 기록 관련 타입
export interface AnnualLeaveHistory {
  dayOffSeq: number;
  extraCount: number;
  fromDate: string;
  holidayCount: number;
  lastOverUsedCount: number;
  personalScheduleList: any[];
  remainCount: number;
  toDate: string;
  useCount: number;
}

// 공통 에러 포맷(선택)
export interface ServiceError extends Error {
  status?: number;
  requiresLogin?: boolean;
  code?: string;
}

function wrapError(e: any): ServiceError {
  const err: ServiceError = new Error(e?.message || '요청 처리 중 오류가 발생했습니다.');
  // axios 인터셉터에서 가공된 형태라면 여기에 맵핑
  if (e?.status) err.status = e.status;
  if (e?.requiresLogin) err.requiresLogin = true;
  if (e?.code) err.code = e.code;
  return err;
}

export class WorkOnOffService {
  // 주간 출퇴근 기록 조회
  static async getWeeklyWorkOnOff(startWeek: string, endWeek: string): Promise<WeeklyWorkOnOffResponse> {
    try {
      const { data } = await api.get('/work/workOnOff/weekly', {
        params: { startWeek, endWeek },
      });
      if (!data || !Array.isArray(data)) {
        throw new Error('서버에서 받은 데이터 형식이 올바르지 않습니다.');
      }
      return data;
    } catch (e: any) {
      throw wrapError(e);
    }
  }

  // 연차 기록 조회
  static async getAnnualLeaveHistory(memberSeq: number, year: number): Promise<AnnualLeaveHistory> {
    try {
      const { data } = await api.get('/schedule/personalSchedule/yearlyList', {
        params: { memberSeq, theYear: year },
      });
      if (!data) throw new Error('연차 기록을 찾을 수 없습니다.');
      return data;
    } catch (e: any) {
      throw wrapError(e);
    }
  }

  // 자동 출근
  static async autoWorkOn(): Promise<void> {
    try {
      await api.get('/work/workOnOff/autoWorkOn');
    } catch (e: any) {
      throw wrapError(e);
    }
  }

  // 수동 출근
  static async workOn(workType: WorkType = '본사'): Promise<void> {
    try {
      await api.post('/work/workOnOff/workOn', { workType });
    } catch (e: any) {
      throw wrapError(e);
    }
  }

  // 근무형태 변경
  static async changeWorkStatus(workOnTimeSeq: number, workType: WorkType): Promise<void> {
    try {
      await api.post('/work/workOnOff/workStatus', { workOnTimeSeq, workType });
    } catch (e: any) {
      throw wrapError(e);
    }
  }

  // ✅ 조퇴 여부 확인
  static async checkEarlyLeave(workOnTimeSeq: number): Promise<boolean> {
    try {
      const { data } = await api.get(`/work/workOnOff/off/check/${workOnTimeSeq}`);
      if (typeof data === 'boolean') return data;
      if (data && typeof data === 'object') return !!data.isEarlyLeave;
      return false;
    } catch (e: any) {
      // 실패 시 조퇴 아님으로 판단(UX 관점)
      return false;
    }
  }

  // ✅ 퇴근 처리
  static async workOff(workOnTimeSeq: number): Promise<void> {
    try {
      await api.post('/work/workOnOff/workOff', { workOnTimeSeq });
    } catch (e: any) {
      throw wrapError(e);
    }
  }
}

export default WorkOnOffService;
