import api, { ApiErrorShape } from './api';

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type NotificationError = ApiErrorShape;

// 알림 타입 정의
export interface Notification {
  notificationSeq: number;
  memberSeq: number;
  notificationTypeSeq: number;
  title: string;
  content: string;
  isRead: boolean;
  createDate: string;
  updateDate: string;
  params?: Record<string, string>;
  pathVariables?: string[];
}

// 백엔드 API 응답 타입들
export interface NotificationApiResponse {
  content: Notification[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      empty: boolean;
      sorted: boolean;
      unsorted: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  last: boolean;
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}

export interface NotificationDeleteRequest {
  notificationSeqList: number[];
  memberSeq: number;
}

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string;
}

export class NotificationService {
  /**
   * 멤버의 알림을 검색조건으로 조회한다.
   * @param memberSeq 조회할 멤버 seq
   * @param pageRequest 페이징 정보
   * @param notificationTypeSeq 조회할 알림타입 (선택사항)
   */
  static async getNotifications(
    memberSeq: number,
    pageRequest: PageRequest = { page: 0, size: 10 },
    notificationTypeSeq?: number[]
  ): Promise<NotificationApiResponse> {
    const params = new URLSearchParams();
    
    // 페이징 파라미터 추가
    if (pageRequest.page !== undefined) {
      params.append('page', pageRequest.page.toString());
    }
    if (pageRequest.size !== undefined) {
      params.append('size', pageRequest.size.toString());
    }
    if (pageRequest.sort) {
      params.append('sort', pageRequest.sort);
    }
    
    // 알림 타입 필터 추가
    if (notificationTypeSeq && notificationTypeSeq.length > 0) {
      notificationTypeSeq.forEach(typeSeq => {
        params.append('notificationTypeSeq', typeSeq.toString());
      });
    }

    const queryString = params.toString();
    const endpoint = `/notification/${memberSeq}${queryString ? `?${queryString}` : ''}`;
    
    const { data } = await api.get<NotificationApiResponse>(endpoint);
    return data;
  }

  /**
   * 알림을 읽음 처리한다.
   * @param notificationSeq 읽은 알림 seq
   */
  static async readNotification(notificationSeq: number): Promise<void> {
    await api.put<void>(`/notification/read/${notificationSeq}`);
  }

  /**
   * 알림을 모두 읽음 처리한다.
   */
  static async readAllNotifications(): Promise<void> {
    await api.put<void>('/notification/read/all');
  }

  /**
   * 알림을 삭제한다.
   * @param notificationSeq 삭제할 알림 seq
   */
  static async deleteNotification(notificationSeq: number): Promise<void> {
    await api.patch<void>(`/notification/${notificationSeq}`);
  }

  /**
   * 알림 여러개를 삭제한다.
   * @param request 삭제할 알림 seq 리스트를 포함한 요청 객체
   */
  static async deleteNotifications(request: NotificationDeleteRequest): Promise<void> {
    await api.patch<void>('/notification/all', request);
  }

  /**
   * 멤버가 안읽은 알림이 있는지 조회한다.
   * @param memberSeq 조회할 멤버 seq
   * @return 안읽은 알림 존재 여부
   */
  static async checkUnreadNotifications(memberSeq: number): Promise<boolean> {
    const { data } = await api.get<boolean>(`/notification/unread/${memberSeq}`);
    return data;
  }

  /**
   * 알림을 보낸다. (관리자용)
   * @param notificationRequest 보낼 알림 정보
   */
  static async sendNotification(notificationRequest: {
    typeName: string;
    content: string;
    params?: Record<string, string>;
    pathVariables?: string[];
  }): Promise<Notification[]> {
    const { data } = await api.post<Notification[]>('/notification', notificationRequest);
    return data;
  }
}

export default NotificationService;
