// store/uiSlice.ts
import { createSlice } from '@reduxjs/toolkit';

type UIState = {
  isMenuOpen: boolean;
};

const initialState: UIState = { isMenuOpen: false };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openMenu: (s) => { s.isMenuOpen = true; },
    closeMenu: (s) => { s.isMenuOpen = false; },
    toggleMenu: (s) => { s.isMenuOpen = !s.isMenuOpen; },
  },
});

export const { openMenu, closeMenu, toggleMenu } = uiSlice.actions;
export default uiSlice.reducer;
