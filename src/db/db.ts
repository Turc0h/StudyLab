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
  /** Marcado de completitud / lectura del estudiante */
  isCompleted?: boolean;
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

export type FsrsState = "new" | "learning" | "review" | "relearning";

export interface CardFsrsRecord {
  id: string;
  deckId: string;
  conceptId: string | null;
  front: string;
  back: string;
  state: FsrsState;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  lastReview: number | null;
  dueDate: number;
  halfLife: number;
  createdAt: number;
}

export interface ReviewLogRecord {
  id: string;
  cardId: string;
  rating: 1 | 2 | 3 | 4;
  reviewTimestamp: number;
  latencyMs: number;
  stateBefore: FsrsState;
  stateAfter: FsrsState;
  stabilityBefore: number;
  stabilityAfter: number;
  difficultyBefore: number;
  difficultyAfter: number;
  scheduledDays: number;
}

export type ConceptStatus = "locked" | "available" | "in_progress" | "mastered";

export interface ConceptRecord {
  id: string;
  domainId: string;
  name: string;
  description: string;
  masteryScore: number;
  currentRetrievability: number;
  status: ConceptStatus;
  prerequisites: string[];
  tags: string[];
  createdAt: number;
}

export interface ConceptEdgeRecord {
  id: string;
  sourceConceptId: string;
  targetConceptId: string;
  type: "prerequisite" | "related" | "component";
  strength: number;
}

export interface WorkspaceConfigRecord {
  id: string;
  profileType: "deep-problem-solving" | "memory-fortress" | "research-synthesis" | "custom";
  activeWidgets: string[];
  automationEnabled: boolean;
  updatedAt: number;
}

export interface FatigueTelemetryRecord {
  id: string;
  timestamp: number;
  fatigueScore: number;
  keystrokeVariance: number;
  pauseRate: number;
  sessionDurationSec: number;
}

export interface AcademicBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AcademicChunkType =
  | "theorem"
  | "proof"
  | "definition"
  | "concept"
  | "formula"
  | "example"
  | "paragraph";

export interface AcademicSourceRecord {
  id: string;
  subjectId: string;
  professorId?: string;
  career?: string;
  year?: number;
  semester?: string;
  title: string;
  documentType: "textbook" | "lecture_notes" | "exam" | "paper" | "pasted_text" | "web_page" | "transcript";
  pageCount: number;
  fileId?: string;
  ocrProcessed: boolean;
  chunkCount: number;
  createdAt: number;
}

export interface AcademicChunkRecord {
  id: string;
  sourceId: string;
  subjectId: string;
  chunkType: AcademicChunkType;
  title?: string;
  hierarchyPath: string;
  pageNumber: number;
  paragraphIndex: number;
  rawContent: string;
  latexFormulas: string[];
  boundingBox: AcademicBoundingBox;
  denseVector?: number[];
  sparseTokens?: Record<string, number>;
  charOffset?: { start: number; end: number };
  webUrlFragment?: { url: string; textSnippet: string };
  transcriptTimestamp?: { startSeconds: number; endSeconds: number; formatted: string };
  createdAt: number;
}

export interface AcademicEvaluationRecord {
  id: string;
  conceptId: string;
  sourceId: string;
  studentExplanation: string;
  masteryScore: number;
  diagnosticCategory: "dominio_completo" | "comprension_solida" | "comprension_parcial" | "lagunas_criticas";
  entailedPoints: string[];
  omissions: Array<{ missingPoint: string; severity: "high" | "medium" | "low"; impact: string }>;
  contradictions: Array<{ claim: string; correction: string }>;
  citationProof?: {
    page: number;
    paragraph: number;
    exactSnippet: string;
  };
  socraticQuestion: string;
  evaluatedAt: number;
}

export interface WorkspaceStateRecord {
  id: string;
  activeSubjectId: string;
  activeSourceId: string | null;
  activePage: number;
  activeBoundingBoxFocus?: AcademicBoundingBox | null;
  panel1WidthPct: number;
  panel2WidthPct: number;
  panel3WidthPct: number;
  openTabs: Array<{ id: string; type: "markdown_note" | "pdf_viewer"; title: string; sourceId?: string; page?: number }>;
  syncedAt: number;
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
  cardsFsrs: EntityTable<CardFsrsRecord, "id">;
  reviewLogs: EntityTable<ReviewLogRecord, "id">;
  concepts: EntityTable<ConceptRecord, "id">;
  conceptEdges: EntityTable<ConceptEdgeRecord, "id">;
  workspaceConfigs: EntityTable<WorkspaceConfigRecord, "id">;
  fatigueTelemetry: EntityTable<FatigueTelemetryRecord, "id">;
  academicSources: EntityTable<AcademicSourceRecord, "id">;
  academicChunks: EntityTable<AcademicChunkRecord, "id">;
  academicEvaluations: EntityTable<AcademicEvaluationRecord, "id">;
  workspaceState: EntityTable<WorkspaceStateRecord, "id">;
  studentErrors: EntityTable<StudentErrorRecord, "id">;
  examPlans: EntityTable<ExamPlanRecord, "id">;
};

export type StudentErrorCategory =
  | "knowledge_gap"
  | "misconception"
  | "calculation_error"
  | "reading_error"
  | "procedure_error"
  | "prerequisite_gap"
  | "careless_error"
  | "overconfidence";

export interface StudentErrorRecord {
  id: string;
  conceptId: string;
  conceptName: string;
  subjectId?: string;
  category: StudentErrorCategory;
  originalExercise: string;
  studentAnswer: string;
  expectedAnswer: string;
  explanation: string;
  citationProof?: {
    sourceTitle: string;
    page: number;
    snippet: string;
  };
  timestamp: number;
  repetitionCount: number;
  resolved: boolean;
}

export interface ExamPhaseMilestone {
  name: string;
  description: string;
  startDayOffset: number;
  endDayOffset: number;
  targetMilestone: string;
  completed: boolean;
}

export interface ExamPlanRecord {
  id: string;
  subjectId: string;
  subjectName: string;
  examDate: number;
  availableMinutesPerDay: number;
  status: "active" | "completed" | "archived";
  createdAt: number;
  phases: ExamPhaseMilestone[];
}

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

// v3 — Cognitive OS: FSRS v4.5/v5, Knowledge Graph DAG, Workspace OS & Fatigue Telemetry
db.version(3).stores({
  cardsFsrs: "id, deckId, conceptId, state, dueDate, lastReview",
  reviewLogs: "id, cardId, rating, reviewTimestamp",
  concepts: "id, domainId, name, status, masteryScore",
  conceptEdges: "id, sourceConceptId, targetConceptId, type",
  workspaceConfigs: "id, profileType",
  fatigueTelemetry: "id, timestamp",
});

// v4 — Personal Academic Knowledge Engine: Ingesta jerárquica, GraphRAG y Citation-First
db.version(4).stores({
  academicSources: "id, subjectId, professorId, documentType, createdAt",
  academicChunks: "id, sourceId, subjectId, chunkType, pageNumber, hierarchyPath",
  academicEvaluations: "id, conceptId, sourceId, evaluatedAt",
  workspaceState: "id, activeSubjectId, activeSourceId",
});

// v5 — CognitiveOS v5.0: Error Bank, Misconceptions & Reverse Exam Planner
db.version(5).stores({
  studentErrors: "id, conceptId, subjectId, category, resolved, timestamp",
  examPlans: "id, subjectId, examDate, status",
});

/** Alterna el estado de completitud o lectura de un archivo de cátedra. */
export async function toggleFileCompleted(fileId: string, isCompleted: boolean) {
  await db.files.update(fileId, { isCompleted });
}

/** Borra todos los datos locales (IndexedDB + preferencias en localStorage) y recarga la app. */
export async function resetAllLocalData() {
  await db.delete();
  localStorage.clear();
  window.location.reload();
}

export { db };
