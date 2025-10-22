import api, { ApiErrorShape } from '@/api/api';

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

// 연차 사용 내역 관련 타입
export interface PersonalScheduleList {
  endDate: string;
  halfOff: boolean;
  havingLunch: boolean;
  length: number;
  memberSeq: number;
  personalScheduleSeq: number;
  personalScheduleType: string;
  startDate: string;
  title: string;
}

// 연차 기록 관련 타입
export interface AnnualLeave {
  dayOffSeq: number;
  extraCount: number;
  fromDate: string;
  holidayCount: number;
  lastOverUsedCount: number;
  personalScheduleList: PersonalScheduleList[];
  remainCount: number;
  toDate: string;
  useCount: number;
}

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type WorkOnOffError = ApiErrorShape;

export class WorkOnOffService {
  // 주간 출퇴근 기록 조회
  static async getWeeklyWorkOnOff(startWeek: string, endWeek: string): Promise<WeeklyWorkOnOffResponse> {
    const { data } = await api.get('/work/workOnOff/weekly', {
      params: { startWeek, endWeek },
    });
    
    if (!data || !Array.isArray(data)) {
      throw new Error('서버에서 받은 데이터 형식이 올바르지 않습니다.');
    }
    
    return data;
  }

  // 연차 기록 조회
  static async getAnnualLeave(memberSeq: number, year: number): Promise<AnnualLeave> {
    const { data } = await api.get<AnnualLeave>('/schedule/personalSchedule/yearlyList', {
      params: { memberSeq, theYear: year },
    });
    
    if (!data) throw new Error('연차 기록을 찾을 수 없습니다.');
    return data;
  }

  // 자동 출근
  static async autoWorkOn(): Promise<void> {
    await api.get('/work/workOnOff/autoWorkOn');
  }

  // 수동 출근
  static async workOn(workType: WorkType = '본사'): Promise<void> {
    await api.post('/work/workOnOff/workOn', { workType });
  }

  // 근무형태 변경
  static async changeWorkStatus(workOnTimeSeq: number, workType: WorkType): Promise<void> {
    await api.post('/work/workOnOff/workStatus', { workOnTimeSeq, workType });
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
    await api.post('/work/workOnOff/workOff', { workOnTimeSeq });
  }
}

export default WorkOnOffService;
