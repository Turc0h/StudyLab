import { Music2, Pause, Play, SkipForward, Volume2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAmbientPlayerStore } from "../../stores/useAmbientPlayerStore";
import { ambientTracks } from "./tracks";

/** Reproductor discreto, flotante, colapsable. No hace nada si no hay pistas configuradas. */
export function AmbientPlayer() {
  const [collapsed, setCollapsed] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { trackIndex, playing, volume, setTrackIndex, togglePlaying, setPlaying, setVolume } =
    useAmbientPlayerStore();

  const track = ambientTracks[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [playing, trackIndex, setPlaying]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (ambientTracks.length === 0) return null;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed right-4 bottom-4 z-30 flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle bg-bg-surface text-text-secondary shadow-[var(--shadow-surface)] transition-colors duration-150 hover:text-text-primary"
      >
        <Music2 size={18} strokeWidth={1.75} />
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-30 flex w-64 flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-[var(--shadow-surface)]">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-text-primary">
          {track?.title ?? "Sonido ambiente"}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="text-text-tertiary hover:text-text-primary"
        >
          <X size={14} strokeWidth={1.75} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={togglePlaying}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent text-accent-contrast transition-colors duration-150 hover:bg-accent-hover"
        >
          {playing ? <Pause size={15} strokeWidth={1.75} /> : <Play size={15} strokeWidth={1.75} />}
        </button>
        <button
          type="button"
          onClick={() => setTrackIndex((trackIndex + 1) % ambientTracks.length)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary"
        >
          <SkipForward size={15} strokeWidth={1.75} />
        </button>
        <Volume2 size={14} strokeWidth={1.75} className="ml-1 shrink-0 text-text-tertiary" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="flex-1 accent-accent"
        />
      </div>
      <audio
        ref={audioRef}
        src={track?.src}
        onEnded={() => setTrackIndex((trackIndex + 1) % ambientTracks.length)}
      />
    </div>
  );
}
