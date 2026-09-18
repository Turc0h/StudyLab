/**
 * StudyLab Full-Text Search (FTS5) Engine
 * Búsqueda de texto completo de alto rendimiento y bajo consumo de RAM en SQLite.
 * Proporciona coincidencia difusa/diacrítica (unicode61), BM25 nativo y generación de snippets.
 */

import { getSqliteDb } from "./database";
import { isDesktop } from "./platform";

export interface FtsAcademicResult {
  chunk_id: string;
  source_id: string;
  subject_id: string;
  page_number: number;
  title: string;
  snippet: string;
  bm25_score: number;
}

export interface FtsDocumentResult {
  document_id: string;
  file_path: string;
  file_name: string;
  page_number: number;
  snippet: string;
  bm25_score: number;
}

/**
 * Sanitiza una consulta para la sintaxis de SQLite FTS5,
 * preservando frases entre comillas y prefijos con asterisco.
 */
export function sanitizeFtsQuery(raw: string): string {
  if (!raw) return "";

  const trimmed = raw.trim();
  if (!trimmed) return "";

  const tokens: string[] = [];
  const regex = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(trimmed)) !== null) {
    if (match[1] !== undefined) {
      // Frase exacta entre comillas
      const cleanPhrase = match[1].replace(/[^\w\sáéíóúüñÁÉÍÓÚÜÑ]/g, " ").trim();
      if (cleanPhrase.length > 0) {
        tokens.push(`"${cleanPhrase}"`);
      }
    } else if (match[2] !== undefined) {
      // Término individual o prefijo
      const w = match[2];
      const isPrefix = w.endsWith("*");
      const clean = w.replace(/[^\wáéíóúüñÁÉÍÓÚÜÑ]/g, "");
      if (clean.length > 0) {
        tokens.push(isPrefix ? `${clean}*` : clean);
      }
    }
  }

  return tokens.join(" ");
}

/**
 * Busca fragmentos académicos en FTS5 con ranking BM25 y snippets.
 */
export async function searchFtsAcademicChunks(options: {
  query: string;
  subjectId?: string;
  sourceId?: string;
  limit?: number;
}): Promise<FtsAcademicResult[]> {
  if (!isDesktop()) return [];

  const ftsQuery = sanitizeFtsQuery(options.query);
  if (!ftsQuery) return [];

  const limit = options.limit || 20;

  try {
    const db = await getSqliteDb();

    let sql = `
      SELECT 
        chunk_id,
        source_id,
        subject_id,
        page_number,
        title,
        snippet(fts_academic_chunks, 5, '<b>', '</b>', '...', 32) AS snippet,
        bm25(fts_academic_chunks, 5.0, 1.0, 2.0) AS bm25_score
      FROM fts_academic_chunks
      WHERE fts_academic_chunks MATCH ?
    `;

    const params: (string | number)[] = [ftsQuery];

    if (options.subjectId) {
      sql += " AND subject_id = ?";
      params.push(options.subjectId);
    }

    if (options.sourceId) {
      sql += " AND source_id = ?";
      params.push(options.sourceId);
    }

    sql += " ORDER BY bm25_score ASC LIMIT ?;";
    params.push(limit);

    const rows = await db.select<FtsAcademicResult[]>(sql, params);
    return rows;
  } catch (err) {
    console.warn("[FTS5] Error consultando fts_academic_chunks:", err);
    return [];
  }
}

/**
 * Busca en el contenido extraído de los documentos de la biblioteca.
 */
export async function searchFtsDocuments(options: {
  query: string;
  documentId?: string;
  limit?: number;
}): Promise<FtsDocumentResult[]> {
  if (!isDesktop()) return [];

  const ftsQuery = sanitizeFtsQuery(options.query);
  if (!ftsQuery) return [];

  const limit = options.limit || 25;

  try {
    const db = await getSqliteDb();

    let sql = `
      SELECT 
        document_id,
        file_path,
        file_name,
        page_number,
        snippet(fts_documents, 4, '<b>', '</b>', '...', 32) AS snippet,
        bm25(fts_documents, 5.0, 1.0) AS bm25_score
      FROM fts_documents
      WHERE fts_documents MATCH ?
    `;

    const params: (string | number)[] = [ftsQuery];

    if (options.documentId) {
      sql += " AND document_id = ?";
      params.push(options.documentId);
    }

    sql += " ORDER BY bm25_score ASC LIMIT ?;";
    params.push(limit);

    const rows = await db.select<FtsDocumentResult[]>(sql, params);
    return rows;
  } catch (err) {
    console.warn("[FTS5] Error consultando fts_documents:", err);
    return [];
  }
}

/**
 * Indexa una página de texto extraída de un archivo en la biblioteca.
 */
export async function indexDocumentPageFts(page: {
  documentId: string;
  filePath: string;
  fileName: string;
  pageNumber: number;
  content: string;
}): Promise<void> {
  return indexDocumentPagesBatchFts([page]);
}

/**
 * Indexa un lote de páginas agrupadas en una única transacción SQLite atómica.
 * Reduce drásticamente las operaciones I/O y llamadas fsync en disco (HDD y SSD).
 */
export async function indexDocumentPagesBatchFts(
  pages: Array<{
    documentId: string;
    filePath: string;
    fileName: string;
    pageNumber: number;
    content: string;
  }>,
): Promise<void> {
  if (!isDesktop() || pages.length === 0) return;

  try {
    const db = await getSqliteDb();
    await db.execute("BEGIN TRANSACTION;");
    for (const page of pages) {
      await db.execute(
        `INSERT INTO fts_documents (document_id, file_path, file_name, page_number, content)
         VALUES (?, ?, ?, ?, ?);`,
        [page.documentId, page.filePath, page.fileName, page.pageNumber, page.content],
      );
    }
    await db.execute("COMMIT;");
  } catch (err) {
    console.error("[FTS5] Error indexando lote de páginas en fts_documents:", err);
    try {
      const db = await getSqliteDb();
      await db.execute("ROLLBACK;");
    } catch {
      // Ignorar rollback secundario
    }
  }
}

/**
 * Elimina las páginas indexadas de un documento cuando se remueve de la biblioteca.
 */
export async function removeDocumentPagesFts(documentId: string): Promise<void> {
  if (!isDesktop()) return;

  try {
    const db = await getSqliteDb();
    await db.execute("DELETE FROM fts_documents WHERE document_id = ?;", [documentId]);
  } catch (err) {
    console.warn("[FTS5] Error eliminando páginas de fts_documents:", err);
  }
}
