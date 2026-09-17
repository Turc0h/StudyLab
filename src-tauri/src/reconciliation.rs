use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;

use crate::filesystem::resolve_library_path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredFile {
    pub path: String,
    pub name: String,
    pub relative_path: String,
    pub size: u64,
    pub modified_at: u64,
    pub hash: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ReconciliationReport {
    pub total_scanned: usize,
    pub discovered_files: Vec<DiscoveredFile>,
}

/// Determina si una extensión de archivo está soportada para el estudio académico
pub fn is_supported_extension(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    matches!(ext.as_str(), "pdf" | "txt" | "md")
}

/// Determina si un archivo es temporal y debe ser ignorado
pub fn is_temporary_file(file_name: &str) -> bool {
    file_name.starts_with('.')
        || file_name.starts_with("~$")
        || file_name.ends_with(".tmp")
        || file_name.ends_with(".part")
        || file_name.ends_with(".crdownload")
}

/// Escaneo recursivo del árbol de carpetas de la biblioteca
fn scan_dir_recursive(dir: &Path, base_dir: &Path, results: &mut Vec<DiscoveredFile>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let file_name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();

            if is_temporary_file(&file_name) {
                continue;
            }

            if path.is_dir() {
                scan_dir_recursive(&path, base_dir, results);
            } else if path.is_file() && is_supported_extension(&path) {
                if let Ok(meta) = fs::metadata(&path) {
                    let relative_path = path
                        .strip_prefix(base_dir)
                        .map(|p| p.to_string_lossy().to_string())
                        .unwrap_or_else(|_| file_name.clone());

                    let modified_at = meta
                        .modified()
                        .ok()
                        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
                        .map(|d| d.as_millis() as u64)
                        .unwrap_or(0);

                    results.push(DiscoveredFile {
                        path: path.to_string_lossy().to_string(),
                        name: file_name,
                        relative_path,
                        size: meta.len(),
                        modified_at,
                        hash: None, // Se computa bajo demanda para no ralentizar el inicio
                    });
                }
            }
        }
    }
}

/// Comando Tauri: Reconcilia el estado físico del filesystem con SQLite
/// Ejecutado en hilo de fondo para no bloquear el inicio de la app
#[tauri::command]
pub async fn reconcile_library_state() -> Result<ReconciliationReport, String> {
    tauri::async_runtime::spawn_blocking(|| {
        let library_dir = resolve_library_path()?;
        let mut discovered = Vec::new();
        scan_dir_recursive(&library_dir, &library_dir, &mut discovered);

        Ok(ReconciliationReport {
            total_scanned: discovered.len(),
            discovered_files: discovered,
        })
    })
    .await
    .map_err(|e| format!("Error en reconciliación de biblioteca: {}", e))?
}
