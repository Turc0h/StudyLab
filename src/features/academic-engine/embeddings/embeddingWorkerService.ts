/**
 * StudyLab Background Embedding Worker Service
 * Coordina la generación de embeddings semánticos fuera del flujo crítico de la UI.
 * Persiste vectores atómicamente en SQLite y Dexie, respetando el caché existente
 * y la cancelación cooperativa del Job System.
 */

import { db, type AcademicChunkRecord } from "../../../db/db";
import { getSqliteDb, isDesktop } from "../../../platform";
import { computeBatchEmbeddings } from "./embeddingManager";

export interface ProcessEmbeddingsOptions {
  batchSize?: number;
  onProgress?: (progressPct: number, processed: number, total: number) => void;
  isCancelled?: () => boolean;
}

export interface ProcessEmbeddingsResult {
  totalChunks: number;
  processedChunks: number;
  cachedChunks: number;
  cancelled: boolean;
}

/**
 * Procesa e indexa vectores densos para todos los fragmentos pendientes de una fuente académica.
 */
export async function processSourceEmbeddings(
  sourceId: string,
  options?: ProcessEmbeddingsOptions
): Promise<ProcessEmbeddingsResult> {
  const chunks = await db.academicChunks.where("sourceId").equals(sourceId).toArray();

  if (chunks.length === 0) {
    return { totalChunks: 0, processedChunks: 0, cachedChunks: 0, cancelled: false };
  }

  // Filtrar aquellos que ya posean vector en memoria o en SQLite (cache hit)
  const pendingChunks: AcademicChunkRecord[] = [];
  let cachedCount = 0;

  for (const c of chunks) {
    if (c.denseVector && c.denseVector.length > 0) {
      cachedCount++;
    } else {
      pendingChunks.push(c);
    }
  }

  if (pendingChunks.length === 0) {
    if (options?.onProgress) {
      options.onProgress(100, chunks.length, chunks.length);
    }
    return {
      totalChunks: chunks.length,
      processedChunks: 0,
      cachedChunks: cachedCount,
      cancelled: false,
    };
  }

  const textsToEmbed = pendingChunks.map(
    (c) => `${c.title || ""} ${c.rawContent}`.trim()
  );

  let cancelled = false;

  const vectors = await computeBatchEmbeddings(textsToEmbed, {
    batchSize: options?.batchSize || 2,
    isCancelled: () => {
      if (options?.isCancelled && options.isCancelled()) {
        cancelled = true;
        return true;
      }
      return false;
    },
    onProgress: (processed, _total) => {
      const overallProcessed = cachedCount + processed;
      const pct = Math.round((overallProcessed / chunks.length) * 100);
      options?.onProgress?.(pct, overallProcessed, chunks.length);
    },
  });

  // Persistir los vectores generados en Dexie y SQLite
  const sqliteDb = isDesktop() ? await getSqliteDb().catch(() => null) : null;

  for (let i = 0; i < vectors.length; i++) {
    const chunk = pendingChunks[i];
    const vector = vectors[i];

    if (!vector || vector.length === 0) continue;

    // 1. Guardar en Dexie
    await db.academicChunks.update(chunk.id, {
      denseVector: vector,
    });

    // 2. Guardar en SQLite si corre en desktop
    if (sqliteDb) {
      try {
        await sqliteDb.execute(
          "UPDATE academic_chunks SET dense_vector = ? WHERE id = ?;",
          [JSON.stringify(vector), chunk.id]
        );
      } catch (sqlErr) {
        console.warn("[EmbeddingService] Error persistiendo vector en SQLite:", sqlErr);
      }
    }
  }

  return {
    totalChunks: chunks.length,
    processedChunks: vectors.length,
    cachedChunks: cachedCount,
    cancelled,
  };
}
