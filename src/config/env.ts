/**
 * URL del backend opcional (Fase 9 — Google Calendar). No corre por defecto: si no está
 * levantado, todo lo que dependa de él falla en silencio y la app sigue funcionando local-first.
 */
export const BACKEND_URL: string = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3001";
