import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  ambientEnabled: boolean;
  sidebarCollapsed: boolean;
  animationsEnabled: boolean;
  reducedMotion: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAmbientEnabled: (enabled: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setAnimationsEnabled: (enabled: boolean) => void;
  setReducedMotion: (reduced: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      ambientEnabled: true,
      sidebarCollapsed: false,
      animationsEnabled: true,
      reducedMotion: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setAmbientEnabled: (ambientEnabled) => set({ ambientEnabled }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setAnimationsEnabled: (animationsEnabled) => set({ animationsEnabled }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    { name: "studylab-theme" },
  ),
);
