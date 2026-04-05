import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
}

let notifCounter = 0;

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,

      addNotification: (notification) => {
        const newNotif: Notification = {
          ...notification,
          id: `notif-${Date.now()}-${++notifCounter}`,
          read: false,
          createdAt: new Date().toISOString(),
        };

        const { notifications } = get();
        // Keep max 50 notifications
        const updated = [newNotif, ...notifications].slice(0, 50);
        set({
          notifications: updated,
          unreadCount: updated.filter(n => !n.read).length,
        });
      },

      markAsRead: (id) => {
        const { notifications } = get();
        const updated = notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        );
        set({
          notifications: updated,
          unreadCount: updated.filter(n => !n.read).length,
        });
      },

      markAllAsRead: () => {
        const { notifications } = get();
        set({
          notifications: notifications.map(n => ({ ...n, read: true })),
          unreadCount: 0,
        });
      },

      clearAll: () => {
        set({ notifications: [], unreadCount: 0 });
      },

      removeNotification: (id) => {
        const { notifications } = get();
        const updated = notifications.filter(n => n.id !== id);
        set({
          notifications: updated,
          unreadCount: updated.filter(n => !n.read).length,
        });
      },
    }),
    {
      name: 'humanwork-notifications',
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 20), // Persist only recent 20
        unreadCount: state.unreadCount,
      }),
    }
  )
);

export default useNotificationStore;
