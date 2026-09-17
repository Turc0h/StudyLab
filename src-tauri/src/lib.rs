pub mod filesystem;
pub mod watcher;
pub mod job_queue;
pub mod background_jobs;
pub mod reconciliation;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_sql::Builder::default().build())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }

      // Conectar app_handle al Job System y recuperar jobs interrumpidos
      job_queue::GLOBAL_JOB_SYSTEM.set_app_handle(app.handle().clone());
      let recovered = job_queue::GLOBAL_JOB_SYSTEM.recover_interrupted_jobs();
      if recovered > 0 {
        println!("[JobSystem] Se recuperaron {} trabajos pendientes de sesión anterior.", recovered);
      }

      // Iniciar watcher de la biblioteca en segundo plano con coalescing
      if let Err(err) = watcher::start_library_watcher(app.handle().clone()) {
        eprintln!("[StudyLab] Advertencia al iniciar watcher de biblioteca: {}", err);
      }

      Ok(())
    })
    .invoke_handler(tauri::generate_handler![
      filesystem::get_library_dir,
      filesystem::calculate_file_hash,
      filesystem::import_file_to_library,
      filesystem::save_buffer_to_library,
      filesystem::file_exists,
      filesystem::show_in_folder,
      watcher::stop_library_watcher,
      background_jobs::scan_library_background,
      background_jobs::calculate_hash_background,
      background_jobs::get_active_jobs,
      background_jobs::cancel_active_job,
      background_jobs::recover_jobs_on_startup,
      background_jobs::shutdown_job_system,
      background_jobs::enqueue_document_job,
      reconciliation::reconcile_library_state,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

