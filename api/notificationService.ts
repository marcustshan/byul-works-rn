import api, { ApiErrorShape } from './api';

export type NotificationError = ApiErrorShape;

/** 백엔드 원본 아이템 (JSON 그대로) */
export interface Notification {
  notificationSeq: number;
  memberSeq: number;
  notificationTypeSeq: number;
  typeName: string;          // 예: "SCHEDULE"
  typeKorName: string;       // 예: "일정"
  typeElIcon: string;        // 예: "Calendar"
  redirectUri: string;       // 예: "/schedule/scheduleManagement"
  content: string;
  readDate: string | null;   // null or ISO
  read: boolean;             // 읽음 여부
  createDate: string;        // ISO
}

/** 페이지 응답 (JSON 그대로) */
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
  size: number;
  number: number;
  sort: {
    empty: boolean;
    sorted: boolean;
    unsorted: boolean;
  };
  numberOfElements: number;
  first: boolean;
  last?: boolean;
  totalElements?: number;
  totalPages?: number;
  empty: boolean;
}

export interface NotificationDeleteRequest {
  notificationSeqList: number[];
  memberSeq: number;
}

export interface PageRequest {
  page?: number;
  size?: number;
  sort?: string; // 예: "createDate,DESC"
}

export class NotificationService {
  static async getNotifications(
    memberSeq: number,
    pageRequest: PageRequest = { page: 0, size: 10 },
    notificationTypeSeq?: number[],
  ): Promise<NotificationApiResponse> {
    const params = new URLSearchParams();
    if (pageRequest.page !== undefined) params.append('page', String(pageRequest.page));
    if (pageRequest.size !== undefined) params.append('size', String(pageRequest.size));
    if (pageRequest.sort) params.append('sort', pageRequest.sort);
    if (notificationTypeSeq?.length) {
      notificationTypeSeq.forEach(seq => params.append('notificationTypeSeq', String(seq)));
    }
    const qs = params.toString();
    const endpoint = `/notification/${memberSeq}${qs ? `?${qs}` : ''}`;
    const { data } = await api.get<NotificationApiResponse>(endpoint);
    return data; // 그대로 반환
  }

  static async readNotification(notificationSeq: number): Promise<void> {
    await api.put<void>(`/notification/read/${notificationSeq}`);
  }

  static async readAllNotifications(): Promise<void> {
    await api.put<void>('/notification/read/all');
  }

  static async deleteNotification(notificationSeq: number): Promise<void> {
    await api.patch<void>(`/notification/${notificationSeq}`);
  }

  static async deleteNotifications(request: NotificationDeleteRequest): Promise<void> {
    await api.patch<void>('/notification/all', request);
  }

  static async checkUnreadNotifications(memberSeq: number): Promise<boolean> {
    const { data } = await api.get<boolean>(`/notification/unread/${memberSeq}`);
    return data;
  }

  static async sendNotification(notificationRequest: {
    typeName: string;
    content: string;
    params?: Record<string, string>;
    pathVariables?: string[];
  }): Promise<Notification[]> {
    const { data } = await api.post<Notification[]>('/notification', notificationRequest);
    return data; // 그대로 반환
  }
}

export default NotificationService;
