use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering as AtomicOrdering};
use std::sync::{Arc, Condvar, Mutex};
use std::thread::{self, JoinHandle};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JobPriority {
    Low = 0,
    Normal = 1,
    High = 2,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JobType {
    ImportDocument,
    VerifyDocument,
    ExtractText,
    OcrDocument,
    GenerateChunks,
    GenerateEmbedding,
    IndexFts5,
    Maintenance,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum JobStatus {
    Queued,
    Running,
    Completed,
    Failed,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DocumentJob {
    pub id: String,
    pub document_id: String,
    pub file_path: String,
    pub file_name: String,
    pub job_type: JobType,
    pub status: JobStatus,
    pub priority: JobPriority,
    pub progress: u8,
    pub error: Option<String>,
    pub attempt: u32,
    pub max_attempts: u32,
    pub created_at: u64,
    pub started_at: Option<u64>,
    pub completed_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JobProgressPayload {
    pub job_id: String,
    pub document_id: String,
    pub file_path: String,
    pub file_name: String,
    pub job_type: JobType,
    pub status: JobStatus,
    pub priority: JobPriority,
    pub progress: u8,
    pub error: Option<String>,
    pub attempt: u32,
}

pub struct JobSystem {
    jobs: Arc<Mutex<HashMap<String, DocumentJob>>>,
    cancel_tokens: Arc<Mutex<HashMap<String, Arc<AtomicBool>>>>,
    last_emits: Arc<Mutex<HashMap<String, (Instant, u8)>>>,
    app_handle: Arc<Mutex<Option<AppHandle>>>,
    queue_notifier: Arc<(Mutex<bool>, Condvar)>,
    is_shutting_down: Arc<AtomicBool>,
    worker_handles: Arc<Mutex<Vec<JoinHandle<()>>>>,
}

impl JobSystem {
    pub fn new(num_workers: usize) -> Arc<Self> {
        let system = Arc::new(Self {
            jobs: Arc::new(Mutex::new(HashMap::new())),
            cancel_tokens: Arc::new(Mutex::new(HashMap::new())),
            last_emits: Arc::new(Mutex::new(HashMap::new())),
            app_handle: Arc::new(Mutex::new(None)),
            queue_notifier: Arc::new((Mutex::new(false), Condvar::new())),
            is_shutting_down: Arc::new(AtomicBool::new(false)),
            worker_handles: Arc::new(Mutex::new(Vec::new())),
        });

        // Iniciar pool de workers controlados (por defecto 2 workers para bajo uso de RAM)
        let mut handles = Vec::new();
        for worker_id in 0..num_workers {
            let sys_clone = Arc::clone(&system);
            let handle = thread::Builder::new()
                .name(format!("studylab-worker-{}", worker_id))
                .spawn(move || sys_clone.worker_loop(worker_id))
                .expect("No se pudo iniciar hilo worker de StudyLab");
            handles.push(handle);
        }
        *system.worker_handles.lock().unwrap() = handles;

        system
    }

    pub fn set_app_handle(&self, handle: AppHandle) {
        *self.app_handle.lock().unwrap() = Some(handle);
    }

    fn now_ms() -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0)
    }

    /// Encola un trabajo aplicando deduplicación por clave (document_id, job_type).
    /// Si ya existe un trabajo QUEUED o RUNNING para ese documento y tipo:
    /// - Eleva la prioridad si el nuevo pedido es más urgente.
    /// - Retorna el trabajo existente sin duplicar tareas innecesarias.
    pub fn enqueue_job(
        &self,
        document_id: String,
        file_path: String,
        file_name: String,
        job_type: JobType,
        priority: JobPriority,
    ) -> DocumentJob {
        if self.is_shutting_down.load(AtomicOrdering::SeqCst) {
            return DocumentJob {
                id: "shutdown".to_string(),
                document_id,
                file_path,
                file_name,
                job_type,
                status: JobStatus::Cancelled,
                priority,
                progress: 0,
                error: Some("El sistema se está apagando".to_string()),
                attempt: 0,
                max_attempts: 3,
                created_at: Self::now_ms(),
                started_at: None,
                completed_at: Some(Self::now_ms()),
            };
        }

        let mut map = self.jobs.lock().unwrap();

        // 1. Deduplicación lógica
        for job in map.values_mut() {
            if job.document_id == document_id
                && job.job_type == job_type
                && (job.status == JobStatus::Queued || job.status == JobStatus::Running)
            {
                // Elevar prioridad si el nuevo evento es de mayor urgencia
                if priority > job.priority {
                    job.priority = priority;
                }
                return job.clone();
            }
        }

        // 2. Creación del nuevo trabajo
        let id = format!("job_{}_{}", Self::now_ms(), map.len() + 1);
        let job = DocumentJob {
            id: id.clone(),
            document_id: document_id.clone(),
            file_path: file_path.clone(),
            file_name: file_name.clone(),
            job_type: job_type.clone(),
            status: JobStatus::Queued,
            priority,
            progress: 0,
            error: None,
            attempt: 1,
            max_attempts: 3,
            created_at: Self::now_ms(),
            started_at: None,
            completed_at: None,
        };

        map.insert(id.clone(), job.clone());

        // Token de cancelación cooperativa
        self.cancel_tokens
            .lock()
            .unwrap()
            .insert(id.clone(), Arc::new(AtomicBool::new(false)));

        self.emit_event("job_started", &job);

        // Despertar a los workers
        let (lock, cvar) = &*self.queue_notifier;
        let mut ready = lock.lock().unwrap();
        *ready = true;
        cvar.notify_one();

        job
    }

    /// Cancelación cooperativa de un trabajo
    pub fn cancel_job(&self, job_id: &str) -> bool {
        let mut map = self.jobs.lock().unwrap();
        if let Some(job) = map.get_mut(job_id) {
            match job.status {
                JobStatus::Queued => {
                    job.status = JobStatus::Cancelled;
                    job.completed_at = Some(Self::now_ms());
                    self.emit_event("job_cancelled", job);
                    return true;
                }
                JobStatus::Running => {
                    // Activar el token de cancelación para que el worker lo detecte cooperativamente
                    if let Some(token) = self.cancel_tokens.lock().unwrap().get(job_id) {
                        token.store(true, AtomicOrdering::SeqCst);
                    }
                    job.status = JobStatus::Cancelled;
                    job.completed_at = Some(Self::now_ms());
                    self.emit_event("job_cancelled", job);
                    return true;
                }
                _ => return false,
            }
        }
        false
    }

    /// Actualiza el progreso con limitación de frecuencia (throttling: min 250ms o delta >= 5%)
    pub fn update_progress(&self, job_id: &str, progress: u8) {
        let mut map = self.jobs.lock().unwrap();
        if let Some(job) = map.get_mut(job_id) {
            if job.status != JobStatus::Running {
                return;
            }
            job.progress = progress.min(100);

            let should_emit = {
                let mut emits = self.last_emits.lock().unwrap();
                match emits.get(job_id) {
                    Some((last_time, last_pct)) => {
                        let elapsed = last_time.elapsed();
                        let delta = if progress >= *last_pct {
                            progress - *last_pct
                        } else {
                            *last_pct - progress
                        };

                        if elapsed >= Duration::from_millis(250) || delta >= 5 || progress == 100 {
                            emits.insert(job_id.to_string(), (Instant::now(), progress));
                            true
                        } else {
                            false
                        }
                    }
                    None => {
                        emits.insert(job_id.to_string(), (Instant::now(), progress));
                        true
                    }
                }
            };

            if should_emit {
                self.emit_event("job_progress", job);
            }
        }
    }

    /// Marca un trabajo como completado
    pub fn complete_job(&self, job_id: &str) {
        let mut map = self.jobs.lock().unwrap();
        if let Some(job) = map.get_mut(job_id) {
            job.status = JobStatus::Completed;
            job.progress = 100;
            job.completed_at = Some(Self::now_ms());
            self.emit_event("job_completed", job);
        }
        self.cancel_tokens.lock().unwrap().remove(job_id);
    }

    /// Falla un trabajo o ejecuta reintento si el error es transitorio
    pub fn fail_or_retry(&self, job_id: &str, error: String, is_transient: bool) {
        let mut map = self.jobs.lock().unwrap();
        if let Some(job) = map.get_mut(job_id) {
            if is_transient && job.attempt < job.max_attempts {
                // Reintento: volver a encolar con intento incrementado
                job.attempt += 1;
                job.status = JobStatus::Queued;
                job.progress = 0;
                job.error = Some(format!("Reintentando ({}/{}): {}", job.attempt, job.max_attempts, error));
                self.emit_event("job_started", job);

                // Notificar workers
                let (lock, cvar) = &*self.queue_notifier;
                let mut ready = lock.lock().unwrap();
                *ready = true;
                cvar.notify_one();
            } else {
                // Falla definitiva
                job.status = JobStatus::Failed;
                job.error = Some(error);
                job.completed_at = Some(Self::now_ms());
                self.emit_event("job_failed", job);
                self.cancel_tokens.lock().unwrap().remove(job_id);
            }
        }
    }

    /// Recuperación en el arranque: reencola o falla trabajos que quedaron RUNNING tras crash/cierre
    pub fn recover_interrupted_jobs(&self) -> usize {
        let mut map = self.jobs.lock().unwrap();
        let mut recovered_count = 0;

        for job in map.values_mut() {
            if job.status == JobStatus::Running {
                if job.attempt < job.max_attempts {
                    job.status = JobStatus::Queued;
                    job.attempt += 1;
                    job.error = Some("Recuperado tras reinicio de la aplicación".to_string());
                } else {
                    job.status = JobStatus::Failed;
                    job.completed_at = Some(Self::now_ms());
                    job.error = Some("Interrumpido por cierre del sistema".to_string());
                }
                recovered_count += 1;
            }
        }

        if recovered_count > 0 {
            let (lock, cvar) = &*self.queue_notifier;
            let mut ready = lock.lock().unwrap();
            *ready = true;
            cvar.notify_all();
        }

        recovered_count
    }

    /// Bucle principal de cada worker controlado
    fn worker_loop(&self, worker_id: usize) {
        while !self.is_shutting_down.load(AtomicOrdering::SeqCst) {
            // 1. Obtener siguiente trabajo disponible respetando prioridades (High > Normal > Low)
            let next_job = {
                let mut map = self.jobs.lock().unwrap();
                let mut queued_candidates: Vec<DocumentJob> = map
                    .values()
                    .filter(|j| j.status == JobStatus::Queued)
                    .cloned()
                    .collect();

                // Ordenar por prioridad descendente y luego por tiempo de creación ascendente
                queued_candidates.sort_by(|a, b| match b.priority.cmp(&a.priority) {
                    Ordering::Equal => a.created_at.cmp(&b.created_at),
                    other => other,
                });

                if let Some(candidate) = queued_candidates.into_iter().next() {
                    if let Some(job) = map.get_mut(&candidate.id) {
                        job.status = JobStatus::Running;
                        job.started_at = Some(Self::now_ms());
                        Some(job.clone())
                    } else {
                        None
                    }
                } else {
                    None
                }
            };

            // 2. Si no hay trabajo disponible, esperar en condvar
            if next_job.is_none() {
                let (lock, cvar) = &*self.queue_notifier;
                let mut ready = lock.lock().unwrap();
                while !*ready && !self.is_shutting_down.load(AtomicOrdering::SeqCst) {
                    match cvar.wait_timeout(ready, Duration::from_millis(1000)) {
                        Ok((guard, _)) => ready = guard,
                        Err(poisoned) => {
                            ready = poisoned.into_inner().0;
                            break;
                        }
                    }
                }
                *ready = false;
                continue;
            }

            let job = next_job.unwrap();
            let cancel_token = self
                .cancel_tokens
                .lock()
                .unwrap()
                .get(&job.id)
                .cloned()
                .unwrap_or_else(|| Arc::new(AtomicBool::new(false)));

            // 3. Ejecutar simulación/pipeline de trabajo respetando token de cancelación
            self.execute_job_steps(&job, &cancel_token, worker_id);
        }
    }

    /// Ejecución secuencial por pasos de un trabajo con chequeo cooperativo de cancelación
    fn execute_job_steps(&self, job: &DocumentJob, cancel_token: &AtomicBool, _worker_id: usize) {
        self.emit_event("job_started", job);

        for step in 1..=10 {
            if cancel_token.load(AtomicOrdering::SeqCst) || self.is_shutting_down.load(AtomicOrdering::SeqCst) {
                // Cancelación cooperativa detectada
                let mut map = self.jobs.lock().unwrap();
                if let Some(j) = map.get_mut(&job.id) {
                    j.status = JobStatus::Cancelled;
                    j.completed_at = Some(Self::now_ms());
                    self.emit_event("job_cancelled", j);
                }
                return;
            }

            // Simulación de paso de trabajo (lectura por streaming o verificación)
            thread::sleep(Duration::from_millis(50));
            self.update_progress(&job.id, (step * 10) as u8);
        }

        self.complete_job(&job.id);
    }

    /// Emite eventos a Tauri si está configurado
    fn emit_event(&self, event_name: &str, job: &DocumentJob) {
        if let Some(ref handle) = *self.app_handle.lock().unwrap() {
            let payload = JobProgressPayload {
                job_id: job.id.clone(),
                document_id: job.document_id.clone(),
                file_path: job.file_path.clone(),
                file_name: job.file_name.clone(),
                job_type: job.job_type.clone(),
                status: job.status,
                priority: job.priority,
                progress: job.progress,
                error: job.error.clone(),
                attempt: job.attempt,
            };
            let _ = handle.emit(event_name, &payload);
        }
    }

    /// Devuelve el listado de todos los trabajos registrados
    pub fn list_jobs(&self) -> Vec<DocumentJob> {
        let map = self.jobs.lock().unwrap();
        let mut list: Vec<DocumentJob> = map.values().cloned().collect();
        list.sort_by(|a, b| b.created_at.cmp(&a.created_at));
        list
    }

    /// Apagado ordenado y seguro del Job System (Sin hilos zombies ni locks)
    pub fn shutdown(&self) {
        println!("[JobSystem] Iniciando apagado ordenado...");
        self.is_shutting_down.store(true, AtomicOrdering::SeqCst);

        // Señalizar cancelación cooperativa a todos los jobs en ejecución
        {
            let tokens = self.cancel_tokens.lock().unwrap();
            for token in tokens.values() {
                token.store(true, AtomicOrdering::SeqCst);
            }
        }

        // Despertar workers para que salgan de sus bucles
        let (lock, cvar) = &*self.queue_notifier;
        let mut ready = lock.lock().unwrap();
        *ready = true;
        cvar.notify_all();
        drop(ready);

        // Esperar a que los workers terminen limpiamente
        let mut handles = self.worker_handles.lock().unwrap();
        for handle in handles.drain(..) {
            let _ = handle.join();
        }

        println!("[JobSystem] Apagado completado exitosamente.");
    }
}

// Instancia global del Job System configurada con 2 workers (óptimo para 4GB-8GB RAM)
lazy_static::lazy_static! {
    pub static ref GLOBAL_JOB_SYSTEM: Arc<JobSystem> = JobSystem::new(2);
}
