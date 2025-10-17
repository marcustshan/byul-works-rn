import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface MenuState {
  menuList: MenuItem[] | null;
}

export interface MenuItem {
  children: MenuItem[];
  icon: string | null;
  isUse: boolean;
  menuSeq: number;
  name: string;
  parentMenuSeq: number | null;
  path: string | null;
  sortOrder: number;
}

const initialState: MenuState = {
  menuList: null,
};

const menuSlice = createSlice({
  name: 'menu',
  initialState,
  reducers: {
    setMenuList(state, action: PayloadAction<MenuItem[] | null>) {
      state.menuList = action.payload;
    },
    clearMenuList(state) {
      state.menuList = null;
    },
  },
});

export const { setMenuList, clearMenuList } = menuSlice.actions;
export default menuSlice.reducer;