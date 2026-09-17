import { create } from "zustand";
import { persist } from "zustand/middleware";

interface GuideModeState {
  isGuideMode: boolean;
  activePanelId: string | null;
  toggleGuideMode: () => void;
  setGuideMode: (active: boolean) => void;
  setActivePanelId: (id: string | null) => void;
}

export const useGuideModeStore = create<GuideModeState>()(
  persist(
    (set) => ({
      isGuideMode: false,
      activePanelId: null,

      toggleGuideMode: () =>
        set((state) => ({
          isGuideMode: !state.isGuideMode,
          activePanelId: null,
        })),

      setGuideMode: (active: boolean) =>
        set({
          isGuideMode: active,
          activePanelId: null,
        }),

      setActivePanelId: (id: string | null) => set({ activePanelId: id }),
    }),
    {
      name: "studylab-guide-mode-store",
    },
  ),
);
