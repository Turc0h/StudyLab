use notify::{event::RenameMode, Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::mpsc::channel;
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

use crate::filesystem::{calculate_file_hash, resolve_library_path};
use crate::job_queue::{JobPriority, JobType, GLOBAL_JOB_SYSTEM};
use crate::reconciliation::{is_supported_extension, is_temporary_file};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LibraryFileEvent {
    pub event_type: String, // "created", "modified", "deleted", "renamed"
    pub path: String,
    pub old_path: Option<String>,
    pub name: String,
    pub size: Option<u64>,
    pub hash: Option<String>,
}

lazy_static::lazy_static! {
    pub static ref WATCHER_RUNNING: Arc<AtomicBool> = Arc::new(AtomicBool::new(false));
}

/// Comprueba si un archivo en disco terminó de escribirse y es accesible de forma estable.
/// Evita procesar archivos mientras Windows todavía los está copiando.
pub fn is_file_stable(path: &Path, max_wait_sec: u64) -> bool {
    let start = Instant::now();
    let max_wait = Duration::from_secs(max_wait_sec);
    let check_interval = Duration::from_millis(500);

    let mut last_size: Option<u64> = None;
    let mut stable_checks = 0;

    while start.elapsed() < max_wait {
        if !path.exists() {
            return false;
        }

        match (fs::metadata(path), File::open(path)) {
            (Ok(meta), Ok(_file)) => {
                let current_size = meta.len();
                if let Some(prev) = last_size {
                    if prev == current_size && current_size > 0 {
                        stable_checks += 1;
                        if stable_checks >= 2 {
                            return true;
                        }
                    } else {
                        stable_checks = 0;
                    }
                }
                last_size = Some(current_size);
            }
            _ => {
                stable_checks = 0;
            }
        }

        thread::sleep(check_interval);
    }

    stable_checks >= 1
}

/// Inicia el watcher recursivo en segundo plano con coalescing y debounce para la carpeta de biblioteca.
pub fn start_library_watcher(app_handle: AppHandle) -> Result<(), String> {
    let library_dir = resolve_library_path()?;

    if WATCHER_RUNNING.load(Ordering::SeqCst) {
        return Ok(()); // Ya está en ejecución
    }
    WATCHER_RUNNING.store(true, Ordering::SeqCst);

    let running_flag = Arc::clone(&WATCHER_RUNNING);

    thread::spawn(move || {
        let (tx, rx) = channel::<notify::Result<Event>>();
        let mut watcher = match RecommendedWatcher::new(tx, Config::default()) {
            Ok(w) => w,
            Err(err) => {
                eprintln!("[Watcher] Error inicializando RecommendedWatcher: {}", err);
                running_flag.store(false, Ordering::SeqCst);
                return;
            }
        };

        // Monitoreo RECURSIVO para detectar subcarpetas (Matemática/, Física/, etc.)
        if let Err(err) = watcher.watch(&library_dir, RecursiveMode::Recursive) {
            eprintln!("[Watcher] Error configurando watch recursivo sobre {:?}: {}", library_dir, err);
            running_flag.store(false, Ordering::SeqCst);
            return;
        }

        println!("[Watcher] Observando cambios recursivos en biblioteca: {:?}", library_dir);

        // Mapa de coalescing: Path -> (Última marca temporal, tipo de evento, ruta previa opcional)
        let pending_events: Arc<Mutex<HashMap<PathBuf, (Instant, String, Option<PathBuf>)>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let pending_clone = Arc::clone(&pending_events);
        let app_handle_clone = app_handle.clone();
        let running_processor = Arc::clone(&running_flag);

        // Hilo procesador con debounce
        thread::spawn(move || {
            while running_processor.load(Ordering::SeqCst) {
                thread::sleep(Duration::from_millis(500));

                let mut to_process = Vec::new();
                {
                    let mut map = pending_clone.lock().unwrap();
                    let now = Instant::now();
                    let mut resolved_paths = Vec::new();

                    for (path, (timestamp, event_type, old_path)) in map.iter() {
                        // Debounce de 1000 ms de inactividad
                        if now.duration_since(*timestamp) >= Duration::from_millis(1000) {
                            to_process.push((path.clone(), event_type.clone(), old_path.clone()));
                            resolved_paths.push(path.clone());
                        }
                    }

                    for p in resolved_paths {
                        map.remove(&p);
                    }
                }

                for (path, event_type, old_path) in to_process {
                    let file_name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();

                    // Filtrado de temporales y extensiones no soportadas
                    if is_temporary_file(&file_name) || !is_supported_extension(&path) {
                        continue;
                    }

                    if event_type == "deleted" {
                        let payload = LibraryFileEvent {
                            event_type,
                            path: path.to_string_lossy().to_string(),
                            old_path: None,
                            name: file_name,
                            size: None,
                            hash: None,
                        };
                        let _ = app_handle_clone.emit("library-file-event", &payload);
                    } else if event_type == "renamed" {
                        let old_str = old_path.map(|p| p.to_string_lossy().to_string());
                        let payload = LibraryFileEvent {
                            event_type,
                            path: path.to_string_lossy().to_string(),
                            old_path: old_str,
                            name: file_name.clone(),
                            size: fs::metadata(&path).map(|m| m.len()).ok(),
                            hash: None,
                        };
                        let _ = app_handle_clone.emit("library-file-event", &payload);
                    } else {
                        // Esperar estabilidad del archivo (evita leer mientras Windows copia)
                        if is_file_stable(&path, 20) {
                            let size = fs::metadata(&path).map(|m| m.len()).ok();
                            let hash = calculate_file_hash(path.to_string_lossy().to_string()).ok();

                            // Encolar trabajo en la Job Queue con coalescing
                            let job_type = if event_type == "created" {
                                JobType::ImportDocument
                            } else {
                                JobType::VerifyDocument
                            };

                            let doc_id = hash.clone().unwrap_or_else(|| file_name.clone());
                            GLOBAL_JOB_SYSTEM.enqueue_job(
                                doc_id,
                                path.to_string_lossy().to_string(),
                                file_name.clone(),
                                job_type,
                                JobPriority::Normal,
                            );

                            let payload = LibraryFileEvent {
                                event_type,
                                path: path.to_string_lossy().to_string(),
                                old_path: None,
                                name: file_name,
                                size,
                                hash,
                            };
                            let _ = app_handle_clone.emit("library-file-event", &payload);
                        }
                    }
                }
            }
        });

        // Bucle receptor de eventos del sistema de archivos
        while running_flag.load(Ordering::SeqCst) {
            if let Ok(event_result) = rx.recv_timeout(Duration::from_millis(500)) {
                if let Ok(event) = event_result {
                    match event.kind {
                        EventKind::Create(_) => {
                            let mut map = pending_events.lock().unwrap();
                            for path in event.paths {
                                map.insert(path, (Instant::now(), "created".to_string(), None));
                            }
                        }
                        EventKind::Modify(notify::event::ModifyKind::Name(mode)) => {
                            let mut map = pending_events.lock().unwrap();
                            if mode == RenameMode::Both && event.paths.len() >= 2 {
                                let old_p = event.paths[0].clone();
                                let new_p = event.paths[1].clone();
                                map.insert(new_p, (Instant::now(), "renamed".to_string(), Some(old_p)));
                            } else {
                                for path in event.paths {
                                    map.insert(path, (Instant::now(), "modified".to_string(), None));
                                }
                            }
                        }
                        EventKind::Modify(_) => {
                            let mut map = pending_events.lock().unwrap();
                            for path in event.paths {
                                map.insert(path, (Instant::now(), "modified".to_string(), None));
                            }
                        }
                        EventKind::Remove(_) => {
                            let mut map = pending_events.lock().unwrap();
                            for path in event.paths {
                                map.insert(path, (Instant::now(), "deleted".to_string(), None));
                            }
                        }
                        _ => {}
                    }
                }
            }
        }

        println!("[Watcher] Hilo de observación finalizado limpiamente.");
    });

    Ok(())
}

/// Detiene el watcher para el apagado limpio de la aplicación (Test 10)
#[tauri::command]
pub fn stop_library_watcher() {
    WATCHER_RUNNING.store(false, Ordering::SeqCst);
}
