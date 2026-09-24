pub mod filesystem;
pub mod watcher;
pub mod job_queue;
pub mod background_jobs;
pub mod reconciliation;
pub mod desktop_context;
pub mod window_manager;
pub mod domain;
pub mod dtos;
pub mod application;
pub mod commands;

use std::fs;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager,
};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  // Inicializar logger persistente en disco con tracing + tracing-appender
  let log_dir = dirs::data_local_dir()
    .or_else(dirs::document_dir)
    .unwrap_or_else(|| std::path::PathBuf::from("."))
    .join("StudyLab")
    .join("logs");

  if let Ok(_) = fs::create_dir_all(&log_dir) {
    let file_appender = tracing_appender::rolling::daily(log_dir, "studylab.log");
    let (non_blocking, guard) = tracing_appender::non_blocking(file_appender);
    std::mem::forget(guard);

    let subscriber = tracing_subscriber::registry()
      .with(tracing_subscriber::EnvFilter::new("info,app_lib=debug"))
      .with(tracing_subscriber::fmt::layer().with_writer(non_blocking))
      .with(tracing_subscriber::fmt::layer().with_writer(std::io::stdout));
    let _ = subscriber.try_init();
  }

  tracing::info!("[StudyLab] Inicializando backend nativo Tauri v2 con System Tray...");

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_sql::Builder::default().build())
    .setup(|app| {
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

      // Configurar Menú de la Bandeja del Sistema (System Tray / Iconos Ocultos de Windows)
      let show_item = MenuItem::with_id(app, "show_main", "Mostrar StudyLab", true, None::<&str>)?;
      let hide_item = MenuItem::with_id(app, "hide_main", "Ocultar en segundo plano", true, None::<&str>)?;
      let toggle_island = MenuItem::with_id(app, "toggle_island", "Mostrar / Ocultar Isla Flotante", true, None::<&str>)?;
      let quit_item = MenuItem::with_id(app, "quit", "Salir de StudyLab", true, None::<&str>)?;

      let tray_menu = Menu::with_items(app, &[
        &show_item,
        &hide_item,
        &toggle_island,
        &quit_item,
      ])?;

      if let Some(icon) = app.default_window_icon() {
        let _ = TrayIconBuilder::new()
          .icon(icon.clone())
          .tooltip("StudyLab - Entorno Estudiantil")
          .menu(&tray_menu)
          .show_menu_on_left_click(false)
          .on_menu_event(|app, event| {
            match event.id.as_ref() {
              "show_main" => {
                if let Some(window) = app.get_webview_window("main") {
                  let _ = window.show();
                  let _ = window.unminimize();
                  let _ = window.set_focus();
                }
              }
              "hide_main" => {
                if let Some(window) = app.get_webview_window("main") {
                  let _ = window.hide();
                }
              }
              "toggle_island" => {
                if let Some(window) = app.get_webview_window("island") {
                  if window.is_visible().unwrap_or(false) {
                    let _ = window.hide();
                  } else {
                    let _ = window.show();
                    let _ = window.set_focus();
                  }
                }
              }
              "quit" => {
                app.exit(0);
              }
              _ => {}
            }
          })
          .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
              button: MouseButton::Left,
              button_state: MouseButtonState::Up,
              ..
            } = event {
              let app = tray.app_handle();
              if let Some(window) = app.get_webview_window("main") {
                if window.is_visible().unwrap_or(false) {
                  let _ = window.hide();
                } else {
                  let _ = window.show();
                  let _ = window.unminimize();
                  let _ = window.set_focus();
                }
              }
            }
          })
          .build(app);
      }

      Ok(())
    })
    .on_window_event(|window, event| {
      if let tauri::WindowEvent::CloseRequested { api, .. } = event {
        if window.label() == "main" {
          // Prevenir cierre de la app: ocultar ventana principal hacia la bandeja (iconos ocultos)
          api.prevent_close();
          let _ = window.hide();
        }
      }
    })
    .invoke_handler(tauri::generate_handler![
      filesystem::get_library_dir,
      filesystem::get_storage_info,
      filesystem::calculate_file_hash,
      filesystem::import_file_to_library,
      filesystem::save_buffer_to_library,
      filesystem::file_exists,
      filesystem::read_file_bytes,
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
      desktop_context::detect_active_study_tools,
      window_manager::hide_main_window,
      window_manager::show_main_window,
      window_manager::toggle_main_window,
      window_manager::toggle_island_window,
      window_manager::start_island_drag,
      window_manager::snap_island_to,
      window_manager::get_island_dock_position,
      window_manager::set_island_state,
      commands::knowledge_graph_commands::check_knowledge_graph_cycle,
      commands::math_commands::validate_math_derivation_step,
      commands::telemetry_commands::evaluate_biometric_stress,
      commands::telemetry_commands::parse_gatt_heart_rate,
      commands::evaluation_commands::detect_oral_smoke,
      commands::learning_state_commands::compute_learning_state,
      commands::study_engine_commands::generate_study_agenda,
      commands::study_engine_commands::calculate_cognitive_triage,
      commands::study_engine_commands::plan_reverse_exam,
      commands::study_engine_commands::calculate_time_budget,
      commands::fsrs_commands::preview_fsrs_next_states,
      commands::fsrs_commands::execute_fsrs_review,
      commands::fsrs_commands::detect_fsrs_card_leech,
      commands::fsrs_commands::calculate_fsrs_model_rmse,
      commands::fsrs_commands::plan_fsrs_load_balance,
    ])
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}

