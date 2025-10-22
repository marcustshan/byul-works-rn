import api, { ApiErrorShape } from '@/api/api';
import { MenuItem } from '@/store/menuSlice';

// 공통 에러 타입 (api.ts의 ApiErrorShape 사용)
export type MenuError = ApiErrorShape;

export class MenuService {
  /**
   * 사용자별 메뉴 목록을 조회합니다.
   */
  static async getMyMenuList(): Promise<MenuItem[]> {
    const { data } = await api.get('/system/menu/myList');

    // API 응답 검증
    if (!Array.isArray(data)) {
      throw new Error('메뉴 목록을 가져오는데 실패했습니다.');
    }

    return data;
  }
}

export default MenuService;
