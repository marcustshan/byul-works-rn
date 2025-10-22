// store/uiSlice.ts
import { createSlice } from '@reduxjs/toolkit';

type UIState = {
  isMenuOpen: boolean;
  loading: boolean;
  error: string | null;
};

const initialState: UIState = { 
  isMenuOpen: false,
  loading: false,
  error: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    openMenu: (s) => { s.isMenuOpen = true; },
    closeMenu: (s) => { s.isMenuOpen = false; },
    toggleMenu: (s) => { s.isMenuOpen = !s.isMenuOpen; },
    setLoading: (s, action) => { s.loading = action.payload; },
    setError: (s, action) => { s.error = action.payload; },
    clearError: (s) => { s.error = null; },
  },
});

export const { openMenu, closeMenu, toggleMenu, setLoading, setError, clearError } = uiSlice.actions;
export default uiSlice.reducer;
