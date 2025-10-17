import api from '@/api/api';
import { MenuItem } from '@/store/menuSlice';

export class MenuService {
  /**
   * 사용자별 메뉴 목록을 조회합니다.
   */
  static async getMyMenuList(): Promise<MenuItem[]> {
    try {      
      // 배열로 직접 응답
      const { data } = await api.get('/system/menu/myList');

      // API 응답 검증
      if (!Array.isArray(data)) {
        throw new Error('메뉴 목록을 가져오는데 실패했습니다.');
      }

      return data;
    } catch (error: any) {
      console.error(error.message || '메뉴 목록을 불러오는데 실패했습니다.');
      throw error;
    }
  }
}

export default MenuService;
