import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface IslandAlert {
  id: string;
  title: string;
  subtitle?: string;
  level: "info" | "warning" | "urgent";
  timestamp: number;
}

export type IslandReminderFrequency = 0 | 15 | 30 | 45 | 60; // 0 = desactivado

interface DynamicIslandState {
  // Configuración de visualización y preferencias
  enabled: boolean;
  gameMode: boolean; // Modo No Molestar / Juego (solo permite alertas urgentes)
  showClock: boolean;
  showTimer: boolean;
  showReminders: boolean;
  reminderFrequency: IslandReminderFrequency; // Minutos entre recordatorios periódicos
  desktopWidgetMode: boolean; // Modo ventana flotante independiente en escritorio
  
  // Estado de interacción en runtime
  isExpanded: boolean;
  activeAlert: IslandAlert | null;
  lastReminderTimestamp: number;

  // Temporizador Pomodoro integrado en la Isla
  timerSeconds: number;
  timerTotal: number;
  isTimerRunning: boolean;
  timerMode: "work" | "break";

  // Acciones
  setEnabled: (val: boolean) => void;
  toggleEnabled: () => void;
  setGameMode: (val: boolean) => void;
  toggleGameMode: () => void;
  setDesktopWidgetMode: (val: boolean) => void;
  toggleDesktopWidgetMode: () => void;
  setExpanded: (val: boolean) => void;
  toggleExpanded: () => void;
  setShowClock: (val: boolean) => void;
  setShowTimer: (val: boolean) => void;
  setShowReminders: (val: boolean) => void;
  setReminderFrequency: (mins: IslandReminderFrequency) => void;
  
  // Controles de temporizador
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: (minutes?: number) => void;
  tickTimer: () => void;
  setTimerMode: (mode: "work" | "break") => void;

  // Alertas
  triggerAlert: (alert: { title: string; subtitle?: string; level?: "info" | "warning" | "urgent" }) => void;
  dismissAlert: () => void;
}

export const useDynamicIslandStore = create<DynamicIslandState>()(
  persist(
    (set, get) => ({
      enabled: true,
      gameMode: false,
      showClock: true,
      showTimer: true,
      showReminders: true,
      reminderFrequency: 30,
      desktopWidgetMode: false,

      isExpanded: false,
      activeAlert: null,
      lastReminderTimestamp: Date.now(),

      timerSeconds: 25 * 60,
      timerTotal: 25 * 60,
      isTimerRunning: false,
      timerMode: "work",

      setEnabled: (enabled) => set({ enabled }),
      toggleEnabled: () => set((s) => ({ enabled: !s.enabled })),
      setGameMode: (gameMode) => set({ gameMode }),
      toggleGameMode: () => set((s) => ({ gameMode: !s.gameMode })),
      setDesktopWidgetMode: (desktopWidgetMode) => set({ desktopWidgetMode }),
      toggleDesktopWidgetMode: () => set((s) => ({ desktopWidgetMode: !s.desktopWidgetMode })),
      setExpanded: (isExpanded) => set({ isExpanded }),
      toggleExpanded: () => set((s) => ({ isExpanded: !s.isExpanded })),
      setShowClock: (showClock) => set({ showClock }),
      setShowTimer: (showTimer) => set({ showTimer }),
      setShowReminders: (showReminders) => set({ showReminders }),
      setReminderFrequency: (reminderFrequency) => set({ reminderFrequency }),

      startTimer: () => set({ isTimerRunning: true }),
      pauseTimer: () => set({ isTimerRunning: false }),
      resetTimer: (minutes) => {
        const mins = minutes ?? (get().timerMode === "work" ? 25 : 5);
        const secs = mins * 60;
        set({
          timerSeconds: secs,
          timerTotal: secs,
          isTimerRunning: false,
        });
      },
      tickTimer: () => {
        const { timerSeconds, isTimerRunning, timerMode } = get();
        if (!isTimerRunning) return;
        if (timerSeconds <= 1) {
          // Cambiar de modo automáticamente
          const nextMode = timerMode === "work" ? "break" : "work";
          const nextMins = nextMode === "work" ? 25 : 5;
          const nextSecs = nextMins * 60;
          set({
            isTimerRunning: false,
            timerMode: nextMode,
            timerSeconds: nextSecs,
            timerTotal: nextSecs,
          });
          get().triggerAlert({
            title: nextMode === "break" ? "¡Sesión Pomodoro completada!" : "¡Descanso terminado!",
            subtitle: nextMode === "break" ? "Tomate 5 minutos de pausa activa." : "Comenzá un nuevo bloque de estudio.",
            level: "urgent",
          });
        } else {
          set({ timerSeconds: timerSeconds - 1 });
        }
      },
      setTimerMode: (timerMode) => {
        const mins = timerMode === "work" ? 25 : 5;
        const secs = mins * 60;
        set({
          timerMode,
          timerSeconds: secs,
          timerTotal: secs,
          isTimerRunning: false,
        });
      },

      triggerAlert: (params) => {
        const alert: IslandAlert = {
          id: `island-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: params.title,
          subtitle: params.subtitle,
          level: params.level || "info",
          timestamp: Date.now(),
        };
        set({ activeAlert: alert });
      },
      dismissAlert: () => set({ activeAlert: null }),
    }),
    {
      name: "studylab-dynamic-island",
      partialize: (state) => ({
        enabled: state.enabled,
        gameMode: state.gameMode,
        showClock: state.showClock,
        showTimer: state.showTimer,
        showReminders: state.showReminders,
        reminderFrequency: state.reminderFrequency,
        desktopWidgetMode: state.desktopWidgetMode,
      }),
    }
  )
);
