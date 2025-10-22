// store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import chatRoomReducer from './chatRoomSlice';
import memberReducer from './memberSlice';
import menuReducer from './menuSlice';
import notificationReducer from './notificationSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    member: memberReducer,
    menu: menuReducer,
    chatRoom: chatRoomReducer,
    notification: notificationReducer,
  },
  // middleware, devTools, preloadedState 등 필요시 추가
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
