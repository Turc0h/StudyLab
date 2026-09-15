import { create } from "zustand";

interface FocusModeState {
  isFocusMode: boolean;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  toggleFocusMode: () => void;
}

export const useFocusModeStore = create<FocusModeState>((set) => ({
  isFocusMode: false,
  enterFocusMode: () => set({ isFocusMode: true }),
  exitFocusMode: () => set({ isFocusMode: false }),
  toggleFocusMode: () => set((state) => ({ isFocusMode: !state.isFocusMode })),
}));
