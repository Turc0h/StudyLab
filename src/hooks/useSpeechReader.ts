import { useState, useEffect, useRef, useCallback } from "react";

export interface SpeechReaderState {
  isPlaying: boolean;
  isPaused: boolean;
  voices: SpeechSynthesisVoice[];
  selectedVoice: SpeechSynthesisVoice | null;
  rate: number;
  currentChunkIndex: number;
  totalChunks: number;
}

/**
 * Divide un texto largo en trozos/oraciones para evitar que SpeechSynthesis
 * se congele o corte en textos extensos (problema común en Chromium/Firefox).
 */
function splitIntoReadableChunks(text: string): string[] {
  if (!text) return [];
  const rawSentences = text
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.?!;:\n])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const chunks: string[] = [];
  let current = "";

  for (const sentence of rawSentences) {
    if (current.length + sentence.length < 180) {
      current = current ? `${current} ${sentence}` : sentence;
    } else {
      if (current) chunks.push(current);
      current = sentence;
    }
  }
  if (current) chunks.push(current);

  return chunks.length > 0 ? chunks : [text];
}

export function useSpeechReader() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [rate, setRate] = useState<number>(1);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [totalChunks, setTotalChunks] = useState(0);

  const chunksRef = useRef<string[]>([]);
  const chunkIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const isPausedRef = useRef(false);
  const rateRef = useRef(1);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);

  rateRef.current = rate;
  selectedVoiceRef.current = selectedVoice;

  // Cargar voces disponibles del navegador
  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }

    const synth = window.speechSynthesis;

    const updateVoices = () => {
      const available = synth.getVoices();
      if (available.length > 0) {
        setVoices(available);
        if (!selectedVoiceRef.current) {
          const spanish = available.find((v) => v.lang.startsWith("es"));
          const defaultVoice = spanish || available[0] || null;
          setSelectedVoice(defaultVoice);
          selectedVoiceRef.current = defaultVoice;
        }
      }
    };

    updateVoices();
    synth.addEventListener("voiceschanged", updateVoices);

    return () => {
      synth.removeEventListener("voiceschanged", updateVoices);
      synth.cancel();
    };
  }, []);

  const speakChunk = useCallback((index: number) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;

    if (index >= chunksRef.current.length || !isPlayingRef.current) {
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
      isPausedRef.current = false;
      return;
    }

    chunkIndexRef.current = index;
    setCurrentChunkIndex(index);

    const chunkText = chunksRef.current[index];
    const utterance = new SpeechSynthesisUtterance(chunkText);

    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    }
    utterance.rate = rateRef.current;
    utterance.pitch = 1;

    utterance.onend = () => {
      if (isPlayingRef.current && !isPausedRef.current) {
        speakChunk(index + 1);
      }
    };

    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.warn("Error en SpeechSynthesis:", e);
      }
      setIsPlaying(false);
      setIsPaused(false);
      isPlayingRef.current = false;
    };

    synth.speak(utterance);
  }, []);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        console.warn("SpeechSynthesis no está soportado en este navegador.");
        return;
      }

      const synth = window.speechSynthesis;
      synth.cancel();

      const chunks = splitIntoReadableChunks(text);
      if (chunks.length === 0) return;

      chunksRef.current = chunks;
      chunkIndexRef.current = 0;
      setTotalChunks(chunks.length);
      setCurrentChunkIndex(0);

      isPlayingRef.current = true;
      isPausedRef.current = false;
      setIsPlaying(true);
      setIsPaused(false);

      speakChunk(0);
    },
    [speakChunk],
  );

  const pause = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.pause();
    isPausedRef.current = true;
    setIsPaused(true);
  }, []);

  const resume = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      isPausedRef.current = false;
      setIsPaused(false);
    } else if (isPlayingRef.current && isPausedRef.current) {
      isPausedRef.current = false;
      setIsPaused(false);
      speakChunk(chunkIndexRef.current);
    }
  }, [speakChunk]);

  const stop = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    isPlayingRef.current = false;
    isPausedRef.current = false;
    setIsPlaying(false);
    setIsPaused(false);
    setCurrentChunkIndex(0);
  }, []);

  const changeRate = useCallback(
    (newRate: number) => {
      setRate(newRate);
      rateRef.current = newRate;
      if (isPlayingRef.current && !isPausedRef.current) {
        window.speechSynthesis.cancel();
        speakChunk(chunkIndexRef.current);
      }
    },
    [speakChunk],
  );

  const changeVoice = useCallback(
    (voice: SpeechSynthesisVoice) => {
      setSelectedVoice(voice);
      selectedVoiceRef.current = voice;
      if (isPlayingRef.current && !isPausedRef.current) {
        window.speechSynthesis.cancel();
        speakChunk(chunkIndexRef.current);
      }
    },
    [speakChunk],
  );

  return {
    isPlaying,
    isPaused,
    voices,
    selectedVoice,
    rate,
    currentChunkIndex,
    totalChunks,
    speak,
    pause,
    resume,
    stop,
    setRate: changeRate,
    setVoice: changeVoice,
    isSupported: typeof window !== "undefined" && "speechSynthesis" in window,
  };
}
