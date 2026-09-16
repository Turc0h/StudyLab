import { db } from "../../db/db";

/**
 * OPFS (Origin Private File System) abstraction with IndexedDB fallback.
 * Stores binary file blobs efficiently without large memory serialization overhead.
 */

export async function isOpfsSupported(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return false;
  }
  try {
    const root = await navigator.storage.getDirectory();
    return !!root;
  } catch {
    return false;
  }
}

async function getOpfsRoot(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.getDirectory) {
    return null;
  }
  try {
    return await navigator.storage.getDirectory();
  } catch {
    return null;
  }
}

/**
 * Stores a binary blob either in OPFS or in db.files.blob as fallback.
 */
export async function storeFileBlob(fileId: string, blob: Blob): Promise<{ storageType: "opfs" | "indexeddb" }> {
  const root = await getOpfsRoot();
  if (root) {
    try {
      const fileHandle = await root.getFileHandle(`blob_${fileId}.bin`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return { storageType: "opfs" };
    } catch (err) {
      console.warn("OPFS write failed, falling back to IndexedDB:", err);
    }
  }

  // Fallback to IndexedDB
  await db.files.update(fileId, { blob });
  return { storageType: "indexeddb" };
}

/**
 * Retrieves a file blob by fileId from OPFS or IndexedDB.
 */
export async function getFileBlob(fileId: string): Promise<Blob | null> {
  // 1. Try OPFS first
  const root = await getOpfsRoot();
  if (root) {
    try {
      const fileHandle = await root.getFileHandle(`blob_${fileId}.bin`);
      const file = await fileHandle.getFile();
      if (file && file.size > 0) {
        return file;
      }
    } catch {
      // Not in OPFS, check IndexedDB
    }
  }

  // 2. Fallback to IndexedDB
  const rec = await db.files.get(fileId);
  return rec?.blob || null;
}

/**
 * Deletes a file blob from OPFS and IndexedDB.
 */
export async function deleteFileBlob(fileId: string): Promise<void> {
  const root = await getOpfsRoot();
  if (root) {
    try {
      await root.removeEntry(`blob_${fileId}.bin`);
    } catch {
      // Ignored if file does not exist in OPFS
    }
  }
}
