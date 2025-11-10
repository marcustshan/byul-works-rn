import { Notification } from '@/api/notificationService';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface NotificationState {
  notificationList: Notification[] | null;
  existUnread: boolean;
  showNotificationIcon: boolean;
}

const initialState: NotificationState = {
  notificationList: null,
  existUnread: false,
  showNotificationIcon: true,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    setNotificationList(state, action: PayloadAction<Notification[] | null>) {
      state.notificationList = action.payload;
    },
    setExistUnread(state, action: PayloadAction<boolean>) {
      state.existUnread = action.payload;
    },
    setShowNotificationIcon(state, action: PayloadAction<boolean>) {
      state.showNotificationIcon = action.payload;
    },
  },
});

export const { setNotificationList, setExistUnread, setShowNotificationIcon } = notificationSlice.actions;
export default notificationSlice.reducer;