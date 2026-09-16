import { db, type CardFsrsRecord } from "../../db/db";
import type { OcclusionSheet, OcclusionMask } from "./types";

export interface SerializedOcclusionFront {
  type: "IMAGE_OCCLUSION";
  sheetId: string;
  sourceTitle: string;
  pageNumber?: number;
  imageUrl?: string;
  targetMaskIds: string[]; // IDs of masks that MUST BE HIDDEN on this card
  allMasks: OcclusionMask[];
  mode: "normal" | "grouped" | "combined";
}

/**
 * Image Occlusion Engine (Sección 9 & 9-BIS):
 * Convierte una lámina con máscaras SVG en un conjunto de tarjetas FSRS independientes.
 */
export async function createOcclusionCardsFromSheet(
  sheet: OcclusionSheet
): Promise<CardFsrsRecord[]> {
  const cards: CardFsrsRecord[] = [];
  const now = Date.now();
  const deckId = sheet.fileId ? 'deck_' + sheet.fileId : "deck_general";
  const conceptId = sheet.conceptId || "general";

  if (sheet.mode === "normal") {
    // Cloze normal: 1 tarjeta por máscara
    for (let i = 0; i < sheet.masks.length; i++) {
      const mask = sheet.masks[i];
      const cardId = 'card_occ_' + sheet.id + '_' + mask.id;

      const payload: SerializedOcclusionFront = {
        type: "IMAGE_OCCLUSION",
        sheetId: sheet.id,
        sourceTitle: sheet.sourceTitle,
        pageNumber: sheet.pageNumber,
        imageUrl: sheet.imageUrl,
        targetMaskIds: [mask.id],
        allMasks: sheet.masks,
        mode: "normal",
      };

      const card: CardFsrsRecord = {
        id: cardId,
        deckId,
        conceptId,
        front: JSON.stringify(payload),
        back: mask.label || 'Elemento ' + (i + 1),
        state: "new",
        stability: 1.5,
        difficulty: 5.0,
        reps: 0,
        lapses: 0,
        lastReview: null,
        dueDate: now,
        halfLife: 1.5,
        createdAt: now,
      };
      cards.push(card);
    }
  } else if (sheet.mode === "grouped") {
    // Cloze agrupado: agrupa máscaras por groupId
    const groups = new Map<string, OcclusionMask[]>();
    for (const mask of sheet.masks) {
      const gId = mask.groupId || "group_default";
      if (!groups.has(gId)) groups.set(gId, []);
      groups.get(gId)!.push(mask);
    }

    let gIndex = 1;
    for (const [gId, groupMasks] of groups.entries()) {
      const cardId = 'card_occ_grp_' + sheet.id + '_' + gId;
      const targetIds = groupMasks.map((m) => m.id);

      const payload: SerializedOcclusionFront = {
        type: "IMAGE_OCCLUSION",
        sheetId: sheet.id,
        sourceTitle: sheet.sourceTitle,
        pageNumber: sheet.pageNumber,
        imageUrl: sheet.imageUrl,
        targetMaskIds: targetIds,
        allMasks: sheet.masks,
        mode: "grouped",
      };

      const labels = groupMasks.map((m) => m.label).filter(Boolean).join(", ");

      const card: CardFsrsRecord = {
        id: cardId,
        deckId,
        conceptId,
        front: JSON.stringify(payload),
        back: labels || 'Grupo ' + gIndex,
        state: "new",
        stability: 1.5,
        difficulty: 5.0,
        reps: 0,
        lapses: 0,
        lastReview: null,
        dueDate: now,
        halfLife: 1.5,
        createdAt: now,
      };
      cards.push(card);
      gIndex++;
    }
  } else {
    // Cloze combinado: todas las máscaras ocultas a la vez
    const cardId = 'card_occ_comb_' + sheet.id;
    const targetIds = sheet.masks.map((m) => m.id);

    const payload: SerializedOcclusionFront = {
      type: "IMAGE_OCCLUSION",
      sheetId: sheet.id,
      sourceTitle: sheet.sourceTitle,
      pageNumber: sheet.pageNumber,
      imageUrl: sheet.imageUrl,
      targetMaskIds: targetIds,
      allMasks: sheet.masks,
      mode: "combined",
    };

    const labels = sheet.masks.map((m, idx) => (idx + 1) + '. ' + m.label).join('\n');

    const card: CardFsrsRecord = {
      id: cardId,
      deckId,
      conceptId,
      front: JSON.stringify(payload),
      back: labels,
      state: "new",
      stability: 1.5,
      difficulty: 5.0,
      reps: 0,
      lapses: 0,
      lastReview: null,
      dueDate: now,
      halfLife: 1.5,
      createdAt: now,
    };
    cards.push(card);
  }

  // Persistir en db.cardsFsrs
  await db.cardsFsrs.bulkPut(cards);
  return cards;
}

/**
 * Detecta si una tarjeta FSRS es de tipo Oclusión de Imagen
 */
export function isOcclusionCard(card: CardFsrsRecord): boolean {
  if (!card.front.startsWith("{")) return false;
  try {
    const parsed = JSON.parse(card.front);
    return parsed.type === "IMAGE_OCCLUSION";
  } catch {
    return false;
  }
}

/**
 * Parsea el payload de oclusión de imagen
 */
export function parseOcclusionCard(card: CardFsrsRecord): SerializedOcclusionFront | null {
  try {
    const parsed = JSON.parse(card.front);
    if (parsed.type === "IMAGE_OCCLUSION") {
      return parsed as SerializedOcclusionFront;
    }
  } catch {
    // Regular card
  }
  return null;
}
