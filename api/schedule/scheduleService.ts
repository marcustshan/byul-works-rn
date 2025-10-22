import api, { ApiErrorShape } from '@/api/api';

// 일정 반복 정보 타입 (기존 프론트엔드 구조에 맞춤)
export interface ScheduleRepeat {
  scheduleRepeatSeq: number;
  periodStartDate: string;
  periodEndDate: string | null;
  infinite: boolean;
  repeatType: string;
  repeatPeriod: number;
  repeatDayList: number[];
  repeatSelectedDate: string;
  weekOfMonth: number;
  selectedDayOfWeek: number;
  lastDate: boolean; // 기존 프론트엔드 구조에 맞춤
  selectedDate: number;
  selectedLastDate: boolean;
}

// 일정 데이터 타입 정의 (기존 프론트엔드 구조에 맞춤)
export interface Schedule {
  scheduleSeq: number;
  scheduleCodeSeq: number | null;
  title: string;
  startDate: string;
  endDate: string;
  isAllDay: boolean | null;
  memo: string | null;
  place: string | null;
  status: boolean;
  alarmList: string[] | null;
  participants: number[] | null;
  isPersonal: boolean; // 백엔드 필드명에 맞춤
  personal: boolean; // 백엔드에서 실제로 오는 필드명
  personalScheduleSeq: number | null; // 개인일정 관련 필드 추가
  personalScheduleType: string | null; // 개인일정 관련 필드 추가
  havingLunch: boolean; // 개인일정 관련 필드 추가
  alarm: boolean; // 기존 프론트엔드 구조에 맞춤
  scheduleRepeat: ScheduleRepeat;
  // UI 표시용 필드들
  codeColor?: string;
  codeName?: string;
  codeSubName?: string;
}

// 오늘 일정 응답 타입
export type TodayScheduleResponse = Schedule[];

// 월별 일정 조회 응답 타입
export type MonthlyScheduleResponse = Schedule[];

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type ScheduleError = ApiErrorShape;

export class ScheduleService {
  /**
   * 오늘의 회사 일정을 조회합니다.
   * @returns 오늘의 일정 목록
   */
  public static async getTodaySchedule(): Promise<TodayScheduleResponse> {
    const { data } = await api.get<TodayScheduleResponse>('/schedule/schedule/todaySchedule');
    
    // 응답 데이터 유효성 검사
    if (!data || !Array.isArray(data)) {
      console.log('📅 [ScheduleService] 일정 데이터가 없거나 형식이 올바르지 않음');
      return [];
    }
    
    return data;
  }

  /**
   * 월별 일정을 조회합니다.
   * @param startDate 조회 시작일 (YYYY-MM-DD)
   * @param endDate 조회 종료일 (YYYY-MM-DD)
   * @returns 월별 일정 목록
   */
  public static async getMonthlySchedule(startDate: string, endDate: string): Promise<MonthlyScheduleResponse> {
    const { data } = await api.get<MonthlyScheduleResponse>('/schedule/schedule/selectScheduleList', {
      params: { startDate, endDate },
    });
    
    // 응답 데이터 유효성 검사
    if (!data || !Array.isArray(data)) {
      console.log('📅 [ScheduleService] 월별 일정 데이터가 없거나 형식이 올바르지 않음');
      return [];
    }
    
    return data;
  }

  /**
   * 새로운 일정을 저장합니다.
   * @param scheduleData 저장할 일정 데이터
   * @param sendAlarm 알림 전송 여부
   * @returns 저장된 일정 정보
   */
  public static async saveSchedule(scheduleData: Partial<Schedule>, sendAlarm: boolean = true): Promise<any> {
    const { data } = await api.post(`/schedule/schedule/saveSchedule/${sendAlarm}`, {
      ...scheduleData
    });
    
    console.log('📅 [ScheduleService] 일정 저장 성공:', data);
    return data;
  }

  /**
   * 개인 일정을 저장합니다.
   * @param personalScheduleData 저장할 개인 일정 데이터
   * @returns 저장된 개인 일정 정보
   */
  public static async savePersonalSchedule(personalScheduleData: any): Promise<any> {
    const { data } = await api.post('/schedule/personalSchedule', personalScheduleData);
    
    console.log('📅 [ScheduleService] 개인 일정 저장 성공:', data);
    return data;
  }

  /**
   * 일반 일정을 삭제합니다.
   * @param scheduleSeq 삭제할 일정 시퀀스
   * @param selectedRepeatedScheduleRange 반복 일정 삭제 범위 ("this", "after", "all")
   * @param scheduleRepeatSeq 반복 일정 시퀀스
   * @param sendAlarm 알림 전송 여부
   */
  public static async deleteSchedule(
    scheduleSeq: number,
    selectedRepeatedScheduleRange: string = "this",
    scheduleRepeatSeq: number = 0,
    sendAlarm: boolean = true
  ): Promise<void> {
    await api.delete(`/schedule/schedule/deleteSchedule/${scheduleSeq}/${selectedRepeatedScheduleRange}/${scheduleRepeatSeq}/${sendAlarm}`);
    
    console.log('📅 [ScheduleService] 일반 일정 삭제 성공:', scheduleSeq);
  }

  /**
   * 개인 일정을 삭제합니다.
   * @param personalScheduleSeq 삭제할 개인 일정 시퀀스
   */
  public static async deletePersonalSchedule(personalScheduleSeq: number): Promise<any> {
    const { data } = await api.delete(`/schedule/personalSchedule/${personalScheduleSeq}`);
    
    console.log('📅 [ScheduleService] 개인 일정 삭제 성공:', personalScheduleSeq);
    return data;
  }
}

export default ScheduleService;
