/**
 * StudyLab Robust Job System Abstraction
 * Conecta con el motor de trabajos en Rust (Tauri 2).
 * Gestiona trabajos pesados asíncronos (verificación, OCR, embeddings, FTS5)
 * fuera del hilo de UI con prioridades, cancelación cooperativa,
 * reintentos exponenciales y throttling de eventos UI.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform";

export type JobPriority = "LOW" | "NORMAL" | "HIGH";

export type JobType =
  | "IMPORT_DOCUMENT"
  | "VERIFY_DOCUMENT"
  | "EXTRACT_TEXT"
  | "OCR_DOCUMENT"
  | "GENERATE_CHUNKS"
  | "GENERATE_EMBEDDING"
  | "INDEX_FTS5"
  | "MAINTENANCE";

export type JobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface DocumentJob {
  id: string;
  document_id: string;
  file_path: string;
  file_name: string;
  job_type: JobType;
  status: JobStatus;
  priority: JobPriority;
  progress: number;
  error?: string | null;
  attempt: number;
  max_attempts: number;
  created_at: number;
  started_at?: number | null;
  completed_at?: number | null;
}

export interface JobProgressPayload {
  job_id: string;
  document_id: string;
  file_path: string;
  file_name: string;
  job_type: JobType;
  status: JobStatus;
  priority: JobPriority;
  progress: number;
  error?: string | null;
  attempt: number;
}

/**
 * Encola un nuevo trabajo o devuelve el existente si ya está en cola / ejecución (deduplicación).
 */
export async function enqueueDocumentJob(params: {
  documentId: string;
  filePath: string;
  fileName: string;
  jobType: JobType;
  priority?: JobPriority;
}): Promise<DocumentJob | null> {
  if (!isDesktop()) return null;
  try {
    return await invoke<DocumentJob>("enqueue_document_job", {
      documentId: params.documentId,
      filePath: params.filePath,
      fileName: params.fileName,
      jobType: params.jobType,
      priority: params.priority || "NORMAL",
    });
  } catch (err) {
    console.error("[JobSystem] Error al encolar trabajo:", err);
    return null;
  }
}

/**
 * Obtiene el listado de todos los trabajos registrados en el motor de escritorio.
 */
export async function getActiveJobs(): Promise<DocumentJob[]> {
  if (!isDesktop()) return [];
  try {
    return await invoke<DocumentJob[]>("get_active_jobs");
  } catch (err) {
    console.warn("[JobSystem] No se pudo consultar lista de trabajos:", err);
    return [];
  }
}

/**
 * Cancela cooperativamente un trabajo por su ID.
 */
export async function cancelActiveJob(jobId: string): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    return await invoke<boolean>("cancel_active_job", { jobId });
  } catch (err) {
    console.warn("[JobSystem] Error al cancelar trabajo:", err);
    return false;
  }
}

/**
 * Dispara la recuperación de trabajos que quedaron en estado incompleto tras un reinicio.
 */
export async function recoverJobsOnStartup(): Promise<number> {
  if (!isDesktop()) return 0;
  try {
    return await invoke<number>("recover_jobs_on_startup");
  } catch (err) {
    console.warn("[JobSystem] Error al recuperar trabajos interrumpidos:", err);
    return 0;
  }
}

/**
 * Notifica al motor nativo para un apagado limpio de hilos workers.
 */
export async function shutdownJobSystem(): Promise<void> {
  if (!isDesktop()) return;
  try {
    await invoke("shutdown_job_system");
  } catch (err) {
    console.warn("[JobSystem] Error en shutdown:", err);
  }
}
