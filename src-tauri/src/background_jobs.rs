use serde::{Deserialize, Serialize};
use std::fs;
use tauri::async_runtime::spawn_blocking;

use crate::filesystem::{calculate_file_hash, resolve_library_path, NativeFileMetadata};

#[derive(Debug, Serialize, Deserialize)]
pub struct LibraryScanResult {
    pub total_files: usize,
    pub files: Vec<NativeFileMetadata>,
}

/// Comando Tauri: Escaneo masivo en hilo secundario de la biblioteca física
/// No bloquea la UI de WebView2
#[tauri::command]
pub async fn scan_library_background() -> Result<LibraryScanResult, String> {
    spawn_blocking(|| {
        let library_dir = resolve_library_path()?;
        let mut files = Vec::new();

        if let Ok(entries) = fs::read_dir(&library_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
                    if ext == "pdf" || ext == "bin" {
                        let path_str = path.to_string_lossy().to_string();
                        if let Ok(hash) = calculate_file_hash(path_str.clone()) {
                            let metadata = fs::metadata(&path).map_err(|e| e.to_string())?;
                            let created_at = metadata
                                .created()
                                .ok()
                                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_millis() as u64)
                                .unwrap_or(0);
                            let modified_at = metadata
                                .modified()
                                .ok()
                                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                                .map(|d| d.as_millis() as u64)
                                .unwrap_or(0);

                            files.push(NativeFileMetadata {
                                name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                                path: path_str,
                                size: metadata.len(),
                                hash,
                                created_at,
                                modified_at,
                            });
                        }
                    }
                }
            }
        }

        Ok(LibraryScanResult {
            total_files: files.len(),
            files,
        })
    })
    .await
    .map_err(|e| format!("Error en tarea en segundo plano: {}", e))?
}

/// Comando Tauri: Calcular hash SHA-256 de forma asíncrona fuera del hilo de UI
#[tauri::command]
pub async fn calculate_hash_background(file_path: String) -> Result<String, String> {
    spawn_blocking(move || calculate_file_hash(file_path))
        .await
        .map_err(|e| format!("Error ejecutando hash en segundo plano: {}", e))?
}

/// Comando Tauri: Obtener listado de trabajos en la cola de procesamiento
#[tauri::command]
pub fn get_active_jobs() -> Vec<crate::job_queue::DocumentJob> {
    crate::job_queue::GLOBAL_JOB_SYSTEM.list_jobs()
}

/// Comando Tauri: Cancelar un trabajo en cola o en ejecución de forma cooperativa
#[tauri::command]
pub fn cancel_active_job(job_id: String) -> bool {
    crate::job_queue::GLOBAL_JOB_SYSTEM.cancel_job(&job_id)
}

/// Comando Tauri: Recuperación de trabajos interrumpidos tras reinicio
#[tauri::command]
pub fn recover_jobs_on_startup() -> usize {
    crate::job_queue::GLOBAL_JOB_SYSTEM.recover_interrupted_jobs()
}

/// Comando Tauri: Apagado limpio del Job System
#[tauri::command]
pub fn shutdown_job_system() {
    crate::job_queue::GLOBAL_JOB_SYSTEM.shutdown();
}

/// Comando Tauri: Encolar un trabajo con prioridad y deduplicación
#[tauri::command]
pub fn enqueue_document_job(
    document_id: String,
    file_path: String,
    file_name: String,
    job_type: crate::job_queue::JobType,
    priority: crate::job_queue::JobPriority,
) -> crate::job_queue::DocumentJob {
    crate::job_queue::GLOBAL_JOB_SYSTEM.enqueue_job(document_id, file_path, file_name, job_type, priority)
}

