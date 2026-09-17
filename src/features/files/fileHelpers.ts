import { File, FileImage, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function generateId(): string {
  return crypto.randomUUID();
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isPdf(mimeType: string, filename?: string): boolean {
  if (mimeType === "application/pdf" || mimeType === "application/x-pdf") return true;
  if (filename && filename.toLowerCase().endsWith(".pdf")) return true;
  return false;
}

export function iconForMime(mimeType: string, filename?: string): LucideIcon {
  if (isPdf(mimeType, filename)) return FileText;
  if (mimeType.startsWith("image/")) return FileImage;
  return File;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Elimina un archivo y en cascada todos sus subrayados, post-its, OCR y repasos asociados. */
export async function deleteFileCascade(fileId: string) {
  const { db } = await import("../../db/db");
  await db.highlights.where({ fileId }).delete();
  await db.postits.where({ fileId }).delete();
  await db.ocrPages.where({ fileId }).delete();
  await db.reviewSchedule.where({ fileId }).delete();
  await db.files.delete(fileId);

  try {
    const { removeDocumentPagesFts } = await import("../../platform");
    await removeDocumentPagesFts(fileId);
  } catch (err) {
    console.warn("Error limpiando índice FTS para documento:", err);
  }
}

/** Elimina una carpeta, sus subcarpetas y todos sus archivos asociados recursivamente. */
export async function deleteFolderCascade(folderId: string) {
  const { db } = await import("../../db/db");
  const allFolders = await db.folders.toArray();
  const folderIdsToDelete = new Set<string>([folderId]);

  let added = true;
  while (added) {
    added = false;
    for (const f of allFolders) {
      if (f.parentId && folderIdsToDelete.has(f.parentId) && !folderIdsToDelete.has(f.id)) {
        folderIdsToDelete.add(f.id);
        added = true;
      }
    }
  }

  const allFiles = await db.files.toArray();
  const filesToDelete = allFiles.filter((file) => folderIdsToDelete.has(file.folderId));
  for (const file of filesToDelete) {
    await deleteFileCascade(file.id);
  }

  for (const id of folderIdsToDelete) {
    await db.folders.delete(id);
  }
}
