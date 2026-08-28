# Pistas de sonido ambiente

Poné acá tus archivos `.mp3` libres de derechos (lo-fi, ambient, ruido blanco, etc.) y agregalos
a `src/features/ambient-sound/tracks.ts` con su nombre de archivo:

```ts
export const ambientTracks: AmbientTrack[] = [
  { id: "lofi-1", title: "Lo-fi de estudio 1", src: "/audio/lofi-1.mp3" },
];
```

StudyLab nunca reproduce audio con copyright servido directo desde la app — esta carpeta solo
debe tener pistas propias o explícitamente libres de derechos.
