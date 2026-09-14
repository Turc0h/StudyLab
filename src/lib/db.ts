import Dexie, { type EntityTable } from "dexie";
import type {
  StudySession,
  FlashcardItem,
  PdfDocumentRecord,
  PdfHighlightRecord,
  OcrRecord,
} from "../types";

class StudyLabDatabase extends Dexie {
  sessions!: EntityTable<StudySession, "id">;
  flashcards!: EntityTable<FlashcardItem, "id">;
  pdfDocuments!: EntityTable<PdfDocumentRecord, "id">;
  pdfHighlights!: EntityTable<PdfHighlightRecord, "id">;
  ocrRecords!: EntityTable<OcrRecord, "id">;

  constructor() {
    super("StudyLabAcademicDB");
    this.version(1).stores({
      sessions: "id, methodId, completedAt",
      flashcards: "id, deckId, nextReviewDate",
      pdfDocuments: "id, uploadedAt",
      pdfHighlights: "id, documentId, pageNumber",
      ocrRecords: "id, createdAt",
    });
  }
}

export const dbInstance = new StudyLabDatabase();

// --- Métodos Públicos de Servicio (Data Access Layer) ---

export async function getStudySessions(): Promise<StudySession[]> {
  return dbInstance.sessions.orderBy("completedAt").reverse().toArray();
}

export async function saveStudySession(session: StudySession): Promise<void> {
  await dbInstance.sessions.put(session);
}

export async function getPdfDocuments(): Promise<PdfDocumentRecord[]> {
  return dbInstance.pdfDocuments.orderBy("uploadedAt").reverse().toArray();
}

export async function getPdfDocument(id: string): Promise<PdfDocumentRecord | undefined> {
  return dbInstance.pdfDocuments.get(id);
}

export async function savePdfDocument(doc: PdfDocumentRecord): Promise<void> {
  await dbInstance.pdfDocuments.put(doc);
}

export async function getHighlights(documentId: string): Promise<PdfHighlightRecord[]> {
  return dbInstance.pdfHighlights.where("documentId").equals(documentId).toArray();
}

export async function saveHighlight(highlight: PdfHighlightRecord): Promise<void> {
  await dbInstance.pdfHighlights.put(highlight);
}

export async function deleteHighlight(id: string): Promise<void> {
  await dbInstance.pdfHighlights.delete(id);
}

export async function getFlashcards(): Promise<FlashcardItem[]> {
  return dbInstance.flashcards.toArray();
}

export async function saveFlashcard(card: FlashcardItem): Promise<void> {
  await dbInstance.flashcards.put(card);
}

export async function updateFlashcard(card: FlashcardItem): Promise<void> {
  await dbInstance.flashcards.put(card);
}

export async function getOcrRecords(): Promise<OcrRecord[]> {
  return dbInstance.ocrRecords.orderBy("createdAt").reverse().toArray();
}

export async function saveOcrRecord(rec: OcrRecord): Promise<void> {
  await dbInstance.ocrRecords.put(rec);
}
