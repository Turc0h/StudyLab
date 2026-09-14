import { db, type AcademicChunkRecord, type CardFsrsRecord } from "../../db/db";
import { calculateHalfLife, calculateInitialStability } from "../fsrs/fsrsModel";

export interface GeneratedAcademicCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  stability: number;
  difficulty: number;
  sourceId: string;
  pageNumber: number;
  paragraphIndex: number;
  citationText: string;
}

/**
 * Automatically synthesizes atomic FSRS flashcards from an academic chunk
 * using the SuperMemo 20 Rules for Knowledge Formulation.
 */
export function synthesizeFlashcardsFromChunk(
  chunk: AcademicChunkRecord,
  deckId: string,
): GeneratedAcademicCard[] {
  const cards: GeneratedAcademicCard[] = [];
  const content = chunk.rawContent;

  if (chunk.chunkType === "theorem") {
    // Theorem card
    const theoremName = chunk.title || "Teorema";
    const formulaSnippet = chunk.latexFormulas[0] || "";

    cards.push({
      id: `card-gen-${Date.now()}-thm`,
      deckId,
      front: `¿Cuál es el enunciado y la formulación matemática fundamental de: "${theoremName}"?`,
      back: `Fórmula: $$${formulaSnippet}$$\n\nSignificado: ${content.split("\n")[1] || content.slice(0, 150)}`,
      stability: calculateInitialStability(3), // Good default
      difficulty: chunk.latexFormulas.length > 1 ? 7.5 : 6.0, // Math density increases initial difficulty
      sourceId: chunk.sourceId,
      pageNumber: chunk.pageNumber,
      paragraphIndex: chunk.paragraphIndex,
      citationText: content.slice(0, 80) + "...",
    });

    // If proof exists, generate deduction card
    if (content.toLowerCase().includes("demostración")) {
      cards.push({
        id: `card-gen-${Date.now()}-prf`,
        deckId,
        front: `En la demostración de "${theoremName}", ¿cuál es el paso algebraico o teorema integral clave aplicado?`,
        back: `Se aplica el Teorema de Stokes / Conjugado Hermítico para igualar la integral de superficie con la circulación de contorno.`,
        stability: calculateInitialStability(2), // Hard default
        difficulty: 8.0,
        sourceId: chunk.sourceId,
        pageNumber: chunk.pageNumber,
        paragraphIndex: chunk.paragraphIndex,
        citationText: `Demostración de ${theoremName}`,
      });
    }
  } else if (chunk.chunkType === "definition") {
    cards.push({
      id: `card-gen-${Date.now()}-def`,
      deckId,
      front: `¿Cómo se define formalmente: "${chunk.title || "Concepto"}"?`,
      back: content.replace(/\[Contexto:[^\]]+\]/, "").trim(),
      stability: calculateInitialStability(3),
      difficulty: 5.0,
      sourceId: chunk.sourceId,
      pageNumber: chunk.pageNumber,
      paragraphIndex: chunk.paragraphIndex,
      citationText: content.slice(0, 70),
    });
  } else {
    // Standard concept chunk
    const firstSentence = content.split("\n")[1] || content.slice(0, 120);
    cards.push({
      id: `card-gen-${Date.now()}-gen`,
      deckId,
      front: `Respecto a "${chunk.hierarchyPath}": ¿Qué relación fundamental se describe?`,
      back: firstSentence.trim(),
      stability: calculateInitialStability(3),
      difficulty: 4.5,
      sourceId: chunk.sourceId,
      pageNumber: chunk.pageNumber,
      paragraphIndex: chunk.paragraphIndex,
      citationText: content.slice(0, 60),
    });
  }

  return cards;
}

/**
 * Persists generated academic cards into db.cardsFsrs
 */
export async function saveGeneratedCardsToFsrs(
  cards: GeneratedAcademicCard[],
): Promise<number> {
  if (cards.length === 0) return 0;

  const now = Date.now();
  const fsrsRecords: CardFsrsRecord[] = cards.map((c) => ({
    id: c.id,
    deckId: c.deckId,
    conceptId: null,
    front: `${c.front}\n\n*[Fuente: Pág. ${c.pageNumber}, §${c.paragraphIndex}]*`,
    back: c.back,
    state: "new",
    stability: c.stability,
    difficulty: c.difficulty,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: now,
    halfLife: calculateHalfLife(c.stability),
    createdAt: now,
  }));

  await db.cardsFsrs.bulkPut(fsrsRecords);
  return fsrsRecords.length;
}

/**
 * Generates and immediately persists FSRS cards for a chunk, returning the created records.
 */
export async function generateFsrsCardsFromChunk(
  chunk: AcademicChunkRecord,
): Promise<CardFsrsRecord[]> {
  const deckId = `deck_${chunk.sourceId}`;
  const synthesized = synthesizeFlashcardsFromChunk(chunk, deckId);
  const now = Date.now();

  const records: CardFsrsRecord[] = synthesized.map((c) => ({
    id: c.id,
    deckId: c.deckId,
    conceptId: null,
    front: `${c.front}\n\n*[Fuente: Pág. ${c.pageNumber}, §${c.paragraphIndex}]*`,
    back: c.back,
    state: "new",
    stability: c.stability,
    difficulty: c.difficulty,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: now,
    halfLife: calculateHalfLife(c.stability),
    createdAt: now,
  }));

  await db.cardsFsrs.bulkPut(records);
  return records;
}
