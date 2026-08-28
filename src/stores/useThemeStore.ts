import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "dark" | "light";

interface ThemeState {
  theme: Theme;
  ambientEnabled: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setAmbientEnabled: (enabled: boolean) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "dark",
      ambientEnabled: true,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === "dark" ? "light" : "dark" })),
      setAmbientEnabled: (ambientEnabled) => set({ ambientEnabled }),
    }),
    { name: "studylab-theme" },
  ),
);
