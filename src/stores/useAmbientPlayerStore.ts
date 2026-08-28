import { create } from "zustand";

interface AmbientPlayerState {
  trackIndex: number;
  playing: boolean;
  volume: number;
  setTrackIndex: (i: number) => void;
  togglePlaying: () => void;
  setPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useAmbientPlayerStore = create<AmbientPlayerState>((set) => ({
  trackIndex: 0,
  playing: false,
  volume: 0.6,
  setTrackIndex: (trackIndex) => set({ trackIndex }),
  togglePlaying: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setVolume: (volume) => set({ volume }),
}));
