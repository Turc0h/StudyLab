export type StudyMethodId =
  | "pomodoro"
  | "active-recall"
  | "spaced-repetition"
  | "feynman"
  | "interleaving"
  | "mind-maps"
  | "sq3r"
  | "elaborative-interrogation"
  | "cornell"
  | "mock-tests"
  | "practice-testing"
  | "zettelkasten"
  | "blurting"
  | "leitner"
  | "method-of-loci"
  | "mnemonics"
  | "kwl-method"
  | "self-explanation"
  | "dual-coding"
  | "deep-work"
  | "concept-maps"
  | "chunking"
  | "problem-based-learning"
  | "protege-effect"
  | "story-method"
  | "pq4r"
  | "distributed-practice"
  | "desirable-difficulties"
  | "segmentation-principle"
  | "multisensory-learning"
  | "sleep-consolidation"
  | "cram"
  | "oral-defense"
  | "essay-exam"
  | "comparative-matrix";

export interface StudyMethodInfo {
  id: StudyMethodId;
  name: string;
  subtitle: string;
  scientificBasis: string;
  suggestedDurationMinutes: number;
  description: string;
}

export interface StudySession {
  id: string;
  methodId: StudyMethodId;
  subject: string;
  topic: string;
  durationMinutes: number;
  notes: string;
  completedAt: number;
  qualityScore?: number; // 1 - 5
}

export interface FlashcardItem {
  id: string;
  deckId: string;
  front: string;
  back: string;
  repetitions: number;
  intervalDays: number;
  easeFactor: number;
  nextReviewDate: number;
  createdAt: number;
}

export interface PdfDocumentRecord {
  id: string;
  title: string;
  fileName: string;
  fileSize: number;
  totalPages: number;
  blob: Blob;
  uploadedAt: number;
}

export interface PdfHighlightRecord {
  id: string;
  documentId: string;
  pageNumber: number;
  selectedText: string;
  note?: string;
  rects: Array<{ x: number; y: number; width: number; height: number }>;
  color: string;
  createdAt: number;
}

export interface OcrRecord {
  id: string;
  fileName: string;
  extractedText: string;
  confidence: number;
  createdAt: number;
}

export type AmbientSoundId = "rain" | "cafe" | "white-noise" | "waves";

export interface AmbientTrack {
  id: AmbientSoundId;
  name: string;
  description: string;
}
