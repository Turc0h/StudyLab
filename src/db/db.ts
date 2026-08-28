import Dexie, { type EntityTable } from "dexie";

export type FolderType = "year" | "career" | "subject" | "custom";

export interface FolderRecord {
  id: string;
  parentId: string | null;
  name: string;
  type: FolderType;
  createdAt: number;
}

export interface FileRecord {
  id: string;
  folderId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  /** Estado de OCR — solo relevante para PDFs escaneados (Fase 5). */
  ocrStatus: "not_applicable" | "pending" | "processing" | "done";
  createdAt: number;
}

export interface HighlightRecord {
  id: string;
  fileId: string;
  page: number;
  text: string;
  /** Rects normalizados (0–1) relativos a la página, para poder redibujar en cualquier zoom. */
  rects: { x: number; y: number; width: number; height: number }[];
  createdAt: number;
}

export interface OcrLine {
  text: string;
  /** Rects normalizados (0–1) relativos a la página, igual que en HighlightRecord. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrPageRecord {
  id: string;
  fileId: string;
  page: number;
  /** Líneas reconocidas por Tesseract con su caja — arman una capa de texto sintética
   * y seleccionable sobre la imagen escaneada, igual que la capa real de un PDF con texto. */
  lines: OcrLine[];
}

export interface PostItRecord {
  id: string;
  fileId: string;
  page: number;
  xPct: number;
  yPct: number;
  text: string;
  color: "accent" | "warning" | "success";
  createdAt: number;
}

export interface StudySessionRecord {
  id: string;
  methodId: string;
  subjectFolderId: string | null;
  startedAt: number;
  endedAt: number;
  durationSec: number;
}

export interface DeadlineRecord {
  id: string;
  title: string;
  dueDate: number;
  subjectFolderId: string | null;
  source: "manual" | "google_calendar";
}

export interface ReviewScheduleRecord {
  id: string;
  fileId: string | null;
  subjectFolderId: string | null;
  topic: string;
  dueDate: number;
  intervalDays: number;
  createdAt: number;
}

export interface FlashcardRecord {
  id: string;
  deckId: string;
  front: string;
  back: string;
  /** Sistema Leitner: caja 1 (repaso frecuente) a 5 (repaso espaciado). */
  box: 1 | 2 | 3 | 4 | 5;
  dueDate: number;
  createdAt: number;
}

export interface FlashcardDeckRecord {
  id: string;
  name: string;
  subjectFolderId: string | null;
  createdAt: number;
}

const db = new Dexie("studylab") as Dexie & {
  folders: EntityTable<FolderRecord, "id">;
  files: EntityTable<FileRecord, "id">;
  highlights: EntityTable<HighlightRecord, "id">;
  ocrPages: EntityTable<OcrPageRecord, "id">;
  postits: EntityTable<PostItRecord, "id">;
  sessions: EntityTable<StudySessionRecord, "id">;
  deadlines: EntityTable<DeadlineRecord, "id">;
  reviewSchedule: EntityTable<ReviewScheduleRecord, "id">;
  flashcards: EntityTable<FlashcardRecord, "id">;
  flashcardDecks: EntityTable<FlashcardDeckRecord, "id">;
};

db.version(1).stores({
  folders: "id, parentId, type",
  files: "id, folderId, name, ocrStatus, mimeType",
  highlights: "id, fileId, page",
  postits: "id, fileId, page",
  sessions: "id, methodId, subjectFolderId, startedAt",
  deadlines: "id, dueDate, subjectFolderId",
  reviewSchedule: "id, dueDate, subjectFolderId, fileId",
  flashcards: "id, deckId, box, dueDate",
  flashcardDecks: "id, subjectFolderId",
});

// v2 — agrega ocrPages: la capa de texto sintética que hace seleccionable un PDF escaneado.
db.version(2).stores({
  ocrPages: "id, fileId, page",
});

/** Borra todos los datos locales (IndexedDB + preferencias en localStorage) y recarga la app. */
export async function resetAllLocalData() {
  await db.delete();
  localStorage.clear();
  window.location.reload();
}

export { db };
