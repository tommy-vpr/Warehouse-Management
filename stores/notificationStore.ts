// stores/notificationStore.ts
// FIXED VERSION - Removed persistence to prevent desync
import { create } from "zustand";

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count: number) => {
    set({ unreadCount: count });

    // Update browser tab title inline
    const baseTitle = "WMS - Warehouse Management System";
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  },
}));
