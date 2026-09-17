import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateId } from "../features/files/fileHelpers";

export type NotificationLevel = "info" | "warning" | "important" | "urgent";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  level: NotificationLevel;
  timestamp: number;
  read: boolean;
  category?: "academic" | "system" | "study" | "general";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

interface NotificationPreferences {
  soundEnabled: boolean;
  desktopNotificationsEnabled: boolean;
  urgentOnlyInDeepWork: boolean;
}

interface NotificationState {
  notifications: AppNotification[];
  isOpen: boolean;
  preferences: NotificationPreferences;
  addNotification: (params: {
    title: string;
    message: string;
    level?: NotificationLevel;
    category?: "academic" | "system" | "study" | "general";
    actionUrl?: string;
    metadata?: Record<string, unknown>;
  }) => string;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  setIsOpen: (isOpen: boolean) => void;
  toggleOpen: () => void;
  updatePreferences: (partial: Partial<NotificationPreferences>) => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set) => ({
      notifications: [
        {
          id: "welcome-notif",
          title: "Bienvenido a StudyLab",
          message: "Tu entorno de estudio local-first está listo. Usá Ctrl+O para ver tu calendario.",
          level: "info",
          timestamp: Date.now(),
          read: false,
          category: "general",
        },
      ],
      isOpen: false,
      preferences: {
        soundEnabled: false,
        desktopNotificationsEnabled: true,
        urgentOnlyInDeepWork: true,
      },

      addNotification: (params) => {
        const id = generateId();
        const newNotif: AppNotification = {
          id,
          title: params.title,
          message: params.message,
          level: params.level ?? "info",
          timestamp: Date.now(),
          read: false,
          category: params.category ?? "general",
          actionUrl: params.actionUrl,
          metadata: params.metadata,
        };

        set((state) => ({
          // Máximo 100 notificaciones para evitar consumo de memoria
          notifications: [newNotif, ...state.notifications].slice(0, 100),
        }));

        return id;
      },

      markAsRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n,
          ),
        })),

      markAllAsRead: () =>
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        })),

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearAll: () => set({ notifications: [] }),

      setIsOpen: (isOpen) => set({ isOpen }),
      toggleOpen: () => set((state) => ({ isOpen: !state.isOpen })),

      updatePreferences: (partial) =>
        set((state) => ({
          preferences: { ...state.preferences, ...partial },
        })),
    }),
    {
      name: "studylab-notifications",
      partialize: (state) => ({
        notifications: state.notifications.slice(0, 50),
        preferences: state.preferences,
      }),
    },
  ),
);
