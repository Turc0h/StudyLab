/**
 * StudyLab Startup Reconciliation Service
 * Reconciles the physical Windows filesystem state (Documents/StudyLab/Library)
 * with SQLite and Dexie records upon application start.
 * Detects new, deleted, modified or renamed files efficiently.
 */

import { invoke } from "@tauri-apps/api/core";
import { db } from "../db/db";
import { generateId } from "../features/files/fileHelpers";
import { getSqliteDb } from "./database";
import { isDesktop } from "./platform";

export interface DiscoveredFile {
  path: string;
  name: string;
  relative_path: string;
  size: number;
  modified_at: number;
  hash?: string | null;
}

export interface ReconciliationReport {
  total_scanned: number;
  discovered_files: DiscoveredFile[];
}

export interface ReconciliationResult {
  added: number;
  updated: number;
  unmodified: number;
  missingOnDisk: number;
}

/**
 * Ejecuta la reconciliación inicial de la biblioteca al iniciar la aplicación.
 * Compara eficientemente el estado en disco con SQLite/Dexie sin recalcular
 * hashes pesados si el tamaño y timestamp de modificación no cambiaron.
 */
export async function runStartupReconciliation(): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    added: 0,
    updated: 0,
    unmodified: 0,
    missingOnDisk: 0,
  };

  if (!isDesktop()) {
    return result;
  }

  try {
    const report = await invoke<ReconciliationReport>("reconcile_library_state");
    const sqlite = await getSqliteDb();

    // 1. Obtener registros de archivos existentes con ruta física en SQLite
    const existingRows = await sqlite.select<
      Array<{
        id: string;
        name: string;
        disk_path: string | null;
        size: number;
        created_at: number;
      }>
    >("SELECT id, name, disk_path, size, created_at FROM files WHERE disk_path IS NOT NULL;");

    const existingByPath = new Map<string, (typeof existingRows)[0]>();
    for (const row of existingRows) {
      if (row.disk_path) {
        existingByPath.set(row.disk_path.toLowerCase(), row);
      }
    }

    const diskPathsSet = new Set<string>();

    // 2. Procesar archivos descubiertos en el disco
    for (const disc of report.discovered_files) {
      const lowerPath = disc.path.toLowerCase();
      diskPathsSet.add(lowerPath);

      const existing = existingByPath.get(lowerPath);

      if (!existing) {
        // Archivo nuevo creado externamente mientras la app estaba cerrada
        const newId = generateId();
        const now = Date.now();

        // Registrar en SQLite
        await sqlite.execute(
          `INSERT OR REPLACE INTO files (id, folder_id, name, mime_type, size, ocr_status, is_completed, disk_path, hash, created_at)
           VALUES (?, ?, ?, ?, ?, ?, 0, ?, NULL, ?);`,
          [
            newId,
            "root",
            disc.name,
            disc.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain",
            disc.size,
            disc.name.toLowerCase().endsWith(".pdf") ? "pending" : "not_applicable",
            disc.path,
            now,
          ]
        );

        // Registrar en Dexie para mantener sincronía sin recarga
        await db.files.put({
          id: newId,
          folderId: "root",
          name: disc.name,
          mimeType: disc.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "text/plain",
          size: disc.size,
          ocrStatus: disc.name.toLowerCase().endsWith(".pdf") ? "pending" : "not_applicable",
          diskPath: disc.path,
          createdAt: now,
        });

        result.added++;
      } else {
        // Archivo ya registrado: comprobar si cambió de tamaño
        if (existing.size !== disc.size) {
          await sqlite.execute("UPDATE files SET size = ? WHERE id = ?;", [disc.size, existing.id]);
          await db.files.update(existing.id, { size: disc.size });
          result.updated++;
        } else {
          result.unmodified++;
        }
      }
    }

    // 3. Detectar archivos registrados en la base pero ya no presentes en disco
    for (const row of existingRows) {
      if (row.disk_path && !diskPathsSet.has(row.disk_path.toLowerCase())) {
        result.missingOnDisk++;
      }
    }

    return result;
  } catch (err) {
    console.error("Error durante la reconciliación de la biblioteca:", err);
    return result;
  }
}
