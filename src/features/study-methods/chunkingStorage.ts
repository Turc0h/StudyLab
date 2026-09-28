import { db, type ChunkGroup, type ChunkingSetRecord } from "../../db/db.ts";

export { type ChunkGroup, type ChunkingSetRecord };

export const DEFAULT_CHUNKING_TOPIC = "Los 12 Pares Craneales";

export const DEFAULT_CHUNKS: ChunkGroup[] = [
  {
    id: "chunk_1",
    name: "Pares Craneales Sensitivos",
    mnemonicTag: "1 - 2 - 8 (Sentidos especiales)",
    items: ["Nervio Olfatorio (I)", "Nervio Óptico (II)", "Nervio Vestibulococlear (VIII)"],
  },
  {
    id: "chunk_2",
    name: "Motores Oculares",
    mnemonicTag: "3 - 4 - 6 (Movimiento del ojo)",
    items: ["Nervio Oculomotor (III)", "Nervio Troclear (IV)", "Nervio Abducens (VI)"],
  },
  {
    id: "chunk_3",
    name: "Motores Puros Restantes",
    mnemonicTag: "11 - 12 (Cuello y Lengua)",
    items: ["Nervio Accesorio / Espinal (XI)", "Nervio Hipogloso (XII)"],
  },
  {
    id: "chunk_4",
    name: "Pares Craneales Mixtos",
    mnemonicTag: "5 - 7 - 9 - 10 (Cara y Vísceras)",
    items: ["Nervio Trigémino (V)", "Nervio Facial (VII)", "Nervio Glosofaríngeo (IX)", "Nervio Vago (X)"],
  },
];

export function buildChunkingSetId(subjectFolderId: string | null | undefined): string {
  const normalizedFolder = subjectFolderId?.trim() || "global";
  return `chunking_set_${normalizedFolder}`;
}

/**
 * Recupera el conjunto de fragmentación guardado para una carpeta/materia, o crea el fallback inicial.
 */
export async function getChunkingSet(
  subjectFolderId: string | null | undefined,
): Promise<ChunkingSetRecord | undefined> {
  const id = buildChunkingSetId(subjectFolderId);
  return db.chunkingSets.get(id);
}

/**
 * Guarda o actualiza de manera idempotente el conjunto de chunks para una carpeta/materia específica.
 */
export async function saveChunkingSet(
  record: Omit<ChunkingSetRecord, "id" | "createdAt" | "updatedAt"> & {
    id?: string;
    createdAt?: number;
    updatedAt?: number;
  },
): Promise<ChunkingSetRecord> {
  const id = record.id || buildChunkingSetId(record.subjectFolderId);
  const now = Date.now();
  const fullRecord: ChunkingSetRecord = {
    id,
    subjectFolderId: record.subjectFolderId || null,
    topic: record.topic.trim() || DEFAULT_CHUNKING_TOPIC,
    chunks: record.chunks,
    createdAt: record.createdAt || now,
    updatedAt: now,
  };

  await db.chunkingSets.put(fullRecord);
  return fullRecord;
}
