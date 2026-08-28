export interface AmbientTrack {
  id: string;
  title: string;
  src: string;
}

/**
 * Vacío a propósito: StudyLab nunca reproduce audio con copyright servido directo desde la app.
 * Para activar el reproductor, agregá tus propios archivos .mp3 libres de derechos (lo-fi,
 * ambient, ruido blanco, etc.) a `public/audio/` y sumalos acá — el reproductor
 * (`AmbientPlayer.tsx`) ya está construido y funciona apenas esta lista deja de estar vacía.
 *
 * Ejemplo:
 * { id: "lofi-1", title: "Lo-fi de estudio 1", src: "/audio/lofi-1.mp3" }
 */
export const ambientTracks: AmbientTrack[] = [];
