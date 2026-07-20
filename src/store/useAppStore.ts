import { create } from "zustand";
import type { NotificationItem } from "./types";

/** Store UI léger — plus de données métier mock (tout passe par PostgreSQL). */
type State = {
  notifications: NotificationItem[];
  markAllNotificationsRead: () => void;
};

export const useAppStore = create<State>((set) => ({
  notifications: [],
  markAllNotificationsRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
    })),
}));
