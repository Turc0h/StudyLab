/**
 * StudyLab Filesystem Abstraction Layer
 * Seamlessly interfaces with Tauri native filesystem when running on Desktop,
 * and provides safe fallbacks when running in a browser.
 */

import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { isDesktop } from "./platform";

export { convertFileSrc };

export interface NativeFileMetadata {
  name: string;
  path: string;
  size: number;
  hash: string;
  created_at: number;
  modified_at: number;
}

/**
 * Obtiene la ruta física del directorio de la biblioteca en disco (solo en Desktop).
 * En la web retorna null.
 */
export async function getLibraryDirectory(): Promise<string | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<string>("get_library_dir");
  } catch (err) {
    console.error("Error al obtener ruta de biblioteca:", err);
    return null;
  }
}

/**
 * Calcula el hash SHA-256 de un archivo en disco mediante streaming en Rust (Desktop)
 * o mediante crypto.subtle en la Web.
 */
export async function calculateHash(input: string | ArrayBuffer): Promise<string> {
  if (typeof input === "string" && isDesktop()) {
    return await invoke<string>("calculate_file_hash", { filePath: input });
  }

  // Fallback web: calcular mediante SubtleCrypto
  let buffer: ArrayBuffer;
  if (typeof input === "string") {
    const encoder = new TextEncoder();
    buffer = encoder.encode(input).buffer;
  } else {
    buffer = input;
  }

  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Importa un archivo existente del sistema a la biblioteca física de StudyLab.
 */
export async function importFileToLibrary(
  sourcePath: string,
  customName?: string
): Promise<NativeFileMetadata | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<NativeFileMetadata>("import_file_to_library", {
      sourcePath,
      customName,
    });
  } catch (err) {
    console.error("Error importando archivo a la biblioteca:", err);
    throw err;
  }
}

/**
 * Guarda un buffer binario directamente en la carpeta de biblioteca física de StudyLab.
 */
export async function saveBufferToLibrary(
  filename: string,
  data: Uint8Array | ArrayBuffer
): Promise<NativeFileMetadata | null> {
  if (!isDesktop()) return null;
  try {
    const uint8 = data instanceof Uint8Array ? data : new Uint8Array(data);
    return await invoke<NativeFileMetadata>("save_buffer_to_library", {
      filename,
      data: Array.from(uint8),
    });
  } catch (err) {
    console.error("Error guardando buffer en biblioteca:", err);
    throw err;
  }
}

/**
 * Comprueba si un archivo existe físicamente en el disco.
 */
export async function checkFileExists(path: string): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    return await invoke<boolean>("file_exists", { path });
  } catch {
    return false;
  }
}

/**
 * Abre la ubicación del archivo en el Explorador de Windows.
 */
export async function revealInExplorer(path: string): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("show_in_folder", { path });
  } catch (err) {
    console.warn("No se pudo revelar archivo en explorador:", err);
  }
}
