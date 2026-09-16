import { db, type FlashcardDeckRecord } from "../../db/db";

export interface AnkiCardExportItem {
  id: string;
  front: string;
  back: string;
  tags: string[];
  fsrs?: {
    stability: number;
    difficulty: number;
    state: string;
    reps: number;
    lapses: number;
    dueDate: number;
  };
}

export interface AnkiDeckExportPayload {
  deckName: string;
  version: "Anki21-FSRS-StudyLab";
  exportedAt: number;
  cards: AnkiCardExportItem[];
}

/**
 * Exporta un mazo de StudyLab con soporte de metadatos FSRS completo.
 * Formato TSV / JSON compatible con Anki y AnkiDroid.
 */
export async function exportDeckToAnkiJson(deckId: string): Promise<string> {
  const deck = await db.flashcardDecks.get(deckId);
  const deckName = deck ? deck.name : "StudyLab Deck";

  const fsrsCards = await db.cardsFsrs.where("deckId").equals(deckId).toArray();

  const exportItems: AnkiCardExportItem[] = fsrsCards.map((c) => ({
    id: c.id,
    front: c.front,
    back: c.back,
    tags: ["studylab", "fsrs"],
    fsrs: {
      stability: c.stability,
      difficulty: c.difficulty,
      state: c.state,
      reps: c.reps,
      lapses: c.lapses,
      dueDate: c.dueDate,
    },
  }));

  const payload: AnkiDeckExportPayload = {
    deckName,
    version: "Anki21-FSRS-StudyLab",
    exportedAt: Date.now(),
    cards: exportItems,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Exporta las tarjetas como texto delimitado por tabuladores (.tsv / .txt) estándar de Anki.
 * Primera columna: Front (con clozes {{c1::...}} intactos)
 * Segunda columna: Back
 * Tercera columna: Tags y FSRS meta
 */
export async function exportDeckToAnkiTsv(deckId: string): Promise<string> {
  const fsrsCards = await db.cardsFsrs.where("deckId").equals(deckId).toArray();
  const lines: string[] = [];

  // Anki headers
  lines.push("#separator:tab");
  lines.push("#html:true");
  lines.push("#tags column:3");

  for (const c of fsrsCards) {
    const cleanFront = c.front.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const cleanBack = c.back.replace(/\t/g, " ").replace(/\n/g, "<br>");
    const tagString = `StudyLab S:${c.stability.toFixed(1)} D:${c.difficulty.toFixed(1)} Reps:${c.reps}`;
    lines.push(`${cleanFront}\t${cleanBack}\t${tagString}`);
  }

  return lines.join("\n");
}

/**
 * Importa un mazo exportado de Anki (TSV o JSON) sin reiniciar las tarjetas a 'nuevo'
 * si traen historial o parámetros FSRS previos (Sección 32-BIS.A).
 */
export async function importCardsFromAnkiData(
  dataText: string,
  deckName: string,
): Promise<{ importedCount: number; deckId: string }> {
  let deck = await db.flashcardDecks.where("name").equals(deckName).first();
  const now = Date.now();

  if (!deck) {
    const newDeckId = crypto.randomUUID();
    const newDeck: FlashcardDeckRecord = {
      id: newDeckId,
      name: deckName,
      subjectFolderId: null,
      createdAt: now,
    };
    await db.flashcardDecks.add(newDeck);
    deck = newDeck;
  }

  const targetDeckId = deck.id;
  let importedCount = 0;

  // Intentar parsear como JSON estructurado con FSRS
  if (dataText.trim().startsWith("{")) {
    try {
      const payload: AnkiDeckExportPayload = JSON.parse(dataText);
      await db.transaction("rw", [db.cardsFsrs, db.flashcards], async () => {
        for (const item of payload.cards) {
          const cardId = crypto.randomUUID();
          const stability = item.fsrs?.stability || 2.0;
          const difficulty = item.fsrs?.difficulty || 5.0;
          const reps = item.fsrs?.reps || 0;
          const lapses = item.fsrs?.lapses || 0;
          const dueDate = item.fsrs?.dueDate || now;

          await db.cardsFsrs.add({
            id: cardId,
            deckId: targetDeckId,
            conceptId: null,
            front: item.front,
            back: item.back,
            state: reps > 0 ? "review" : "new",
            stability,
            difficulty,
            reps,
            lapses,
            lastReview: reps > 0 ? now : null,
            dueDate,
            halfLife: stability,
            createdAt: now,
          });

          await db.flashcards.add({
            id: cardId,
            deckId: targetDeckId,
            front: item.front,
            back: item.back,
            box: (Math.min(5, Math.max(1, Math.round(stability / 2))) as 1 | 2 | 3 | 4 | 5),
            dueDate,
            createdAt: now,
          });

          importedCount++;
        }
      });
      return { importedCount, deckId: targetDeckId };
    } catch {
      // Si falla, caer al parser de TSV
    }
  }

  // Parser de TSV / TXT estándar de Anki
  const lines = dataText.split(/\r?\n/);
  await db.transaction("rw", [db.cardsFsrs, db.flashcards], async () => {
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;

      const columns = line.split("\t");
      if (columns.length >= 2) {
        const front = columns[0].replace(/<br\s*\/?>/gi, "\n");
        const back = columns[1].replace(/<br\s*\/?>/gi, "\n");
        const cardId = crypto.randomUUID();

        await db.cardsFsrs.add({
          id: cardId,
          deckId: targetDeckId,
          conceptId: null,
          front,
          back,
          state: "new",
          stability: 2.0,
          difficulty: 5.0,
          reps: 0,
          lapses: 0,
          lastReview: null,
          dueDate: now,
          halfLife: 2.0,
          createdAt: now,
        });

        await db.flashcards.add({
          id: cardId,
          deckId: targetDeckId,
          front,
          back,
          box: 1,
          dueDate: now,
          createdAt: now,
        });

        importedCount++;
      }
    }
  });

  return { importedCount, deckId: targetDeckId };
}
