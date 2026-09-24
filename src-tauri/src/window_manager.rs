use tauri::{Emitter, Manager, PhysicalPosition, Position};

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct IslandPlacement {
  pub dock: String,
  #[serde(rename = "openDirection")]
  pub open_direction: String,
  pub x: i32,
  pub y: i32,
}

#[cfg(windows)]
fn get_work_area_windows() -> Option<(i32, i32, i32, i32)> {
  #[repr(C)]
  struct RECT {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
  }
  extern "system" {
    fn SystemParametersInfoW(uiAction: u32, uiParam: u32, pvParam: *mut std::ffi::c_void, fWinIni: u32) -> i32;
  }
  let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
  let res = unsafe {
    SystemParametersInfoW(
      0x0030, // SPI_GETWORKAREA: área de trabajo excluyendo barra de tareas de Windows
      0,
      &mut rect as *mut RECT as *mut std::ffi::c_void,
      0,
    )
  };
  if res != 0 && (rect.right > rect.left) && (rect.bottom > rect.top) {
    Some((rect.left, rect.top, rect.right - rect.left, rect.bottom - rect.top))
  } else {
    None
  }
}

async fn animate_window_to(
  window: &tauri::WebviewWindow,
  _start_x: i32,
  _start_y: i32,
  target_x: i32,
  target_y: i32,
) {
  // Posicionamiento atómico directo e instantáneo:
  // Elimina los 10 fps de lag causados por bucles de SetWindowPos con DWM en Windows.
  // La animación elástica fluida a 144fps se ejecuta vía Framer Motion en el frontend.
  let _ = window.set_position(Position::Physical(PhysicalPosition {
    x: target_x,
    y: target_y,
  }));
}


#[tauri::command]
pub fn hide_main_window(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
  }
  Ok(())
}

#[tauri::command]
pub fn show_main_window(app: tauri::AppHandle) -> Result<(), String> {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
  Ok(())
}

#[tauri::command]
pub fn toggle_main_window(app: tauri::AppHandle) -> Result<bool, String> {
  if let Some(window) = app.get_webview_window("main") {
    if window.is_visible().unwrap_or(false) {
      let _ = window.hide();
      return Ok(false);
    } else {
      let _ = window.show();
      let _ = window.unminimize();
      let _ = window.set_focus();
      return Ok(true);
    }
  }
  Ok(false)
}

#[tauri::command]
pub fn toggle_island_window(app: tauri::AppHandle) -> Result<bool, String> {
  if let Some(window) = app.get_webview_window("island") {
    if window.is_visible().unwrap_or(false) {
      let _ = window.hide();
      return Ok(false);
    } else {
      let _ = window.show();
      let _ = window.set_focus();
      return Ok(true);
    }
  }
  Ok(false)
}

#[tauri::command]
pub async fn start_island_drag(app: tauri::AppHandle) -> Result<IslandPlacement, String> {
  let window = app.get_webview_window("island").ok_or("No island window found")?;
  
  // Registrar posición inicial antes de arrastrar
  let start_pos = window.outer_position().map_err(|e| e.to_string())?;

  // Iniciar bucle modal nativo de arrastre de Windows
  window.start_dragging().map_err(|e| e.to_string())?;

  // En Windows, window.start_dragging() despacha el mensaje de arrastre de forma asíncrona.
  // Esperar activamente a que el usuario termine el arrastre y SUELTE el botón izquierdo del mouse.
  #[cfg(windows)]
  {
    extern "system" {
      fn GetAsyncKeyState(vKey: i32) -> i16;
    }
    // Pequeño retardo de 50ms para asegurar que el mensaje de arrastre sea recibido
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;
    
    // Mientras el botón izquierdo del mouse siga presionado (bit 15 en 1), el usuario está arrastrando
    let mut poll_count = 0;
    while (unsafe { GetAsyncKeyState(0x01) } as u16 & 0x8000) != 0 && poll_count < 1200 {
      tokio::time::sleep(std::time::Duration::from_millis(25)).await;
      poll_count += 1;
    }
    // Breve pausa para asegurar que Windows actualice la posición final tras soltar
    tokio::time::sleep(std::time::Duration::from_millis(40)).await;
  }
  #[cfg(not(windows))]
  {
    tokio::time::sleep(std::time::Duration::from_millis(300)).await;
  }

  // Posición real donde el usuario soltó la ventana
  let end_pos = window.outer_position().map_err(|e| e.to_string())?;

  // 1. Detección de clic simple vs arrastre real:
  // Si se movió menos de 8 píxeles en total, fue solo un clic -> NO MOVER NI REUBICAR
  let dist_sq = (end_pos.x - start_pos.x).pow(2) + (end_pos.y - start_pos.y).pow(2);
  if dist_sq < 64 {
    let monitor = window.current_monitor().ok().flatten();
    let is_lower = if let Some(mon) = monitor {
      end_pos.y > (mon.position().y + (mon.size().height as i32 / 2))
    } else {
      false
    };
    return Ok(IslandPlacement {
      dock: "click".to_string(),
      open_direction: if is_lower { "up".to_string() } else { "down".to_string() },
      x: end_pos.x,
      y: end_pos.y,
    });
  }

  // 2. Obtener dimensiones del monitor y del área de trabajo (work area de Windows)
  let monitor = window.current_monitor().map_err(|e| e.to_string())?.ok_or("No monitor found")?;
  let cur_size = window.outer_size().map_err(|e| e.to_string())?;
  let win_w = cur_size.width as i32;
  let win_h = cur_size.height as i32;

  let mon_pos = monitor.position();
  let mon_size = monitor.size();
  let mon_x = mon_pos.x;
  let mon_y = mon_pos.y;
  let mon_w = mon_size.width as i32;
  let mon_h = mon_size.height as i32;

  let (work_x, work_y, work_w, work_h) = {
    #[cfg(windows)]
    {
      if let Some(wa) = get_work_area_windows() {
        wa
      } else {
        (mon_x, mon_y, mon_w, mon_h - 56)
      }
    }
    #[cfg(not(windows))]
    {
      (mon_x, mon_y, mon_w, mon_h - 48)
    }
  };

  // 3. HITBOX ESTRICTA DE PANTALLA:
  // Permite apoyar la isla exactamente sobre la barra de tareas (win_h - 4 compensa el padding inferior)
  let min_x = work_x + 8;
  let max_x = (work_x + work_w - win_w - 8).max(min_x);
  let min_y = work_y + 8;
  let max_y = (work_y + work_h - win_h + 4).max(min_y);

  // 4. Los 4 Puntos de Anclaje Magnético Requeridos:
  // 1. Esquina superior izquierda
  let target_tl = (work_x + 16, work_y + 10);
  // 2. Centro superior
  let target_tc = (work_x + (work_w - win_w) / 2, work_y + 10);
  // 3. Esquina superior derecha
  let target_tr = (work_x + work_w - win_w - 16, work_y + 10);
  // 4. Centro inferior: Apoyado directamente sobre la barra de tareas
  let target_bc = (work_x + (work_w - win_w) / 2, work_y + work_h - win_h + 4);

  let targets = [
    ("top-left", target_tl),
    ("top-center", target_tc),
    ("top-right", target_tr),
    ("bottom-center", target_bc),
  ];

  let snap_threshold = 160.0_f64; // Radio magnético de atracción
  let mut closest_dock = "free".to_string();
  let mut min_dist = f64::MAX;
  let mut best_coord = (end_pos.x.clamp(min_x, max_x), end_pos.y.clamp(min_y, max_y));

  for (name, target) in targets {
    let dx = (end_pos.x - target.0) as f64;
    let dy = (end_pos.y - target.1) as f64;
    let dist = (dx * dx + dy * dy).sqrt();
    if dist < min_dist {
      min_dist = dist;
      if dist <= snap_threshold {
        closest_dock = name.to_string();
        best_coord = target;
      }
    }
  }

  // Si se soltó cerca del fondo de la pantalla pero no en el centro horizontal,
  // apoyar suavemente sobre la barra de tareas respetando X
  if closest_dock == "free" && end_pos.y >= (work_y + work_h - win_h - 80) {
    best_coord.1 = work_y + work_h - win_h + 4;
    closest_dock = "bottom-free".to_string();
  }

  // Aplicar Hitbox a las coordenadas finales
  let final_x = best_coord.0.clamp(min_x, max_x);
  let final_y = best_coord.1.clamp(min_y, max_y);

  // 5. Cálculo dinámico de apertura: en la mitad inferior o apoyado en la barra, SIEMPRE se abre para arriba
  let is_at_bottom = closest_dock == "bottom-center"
    || closest_dock == "bottom-free"
    || final_y > (work_y + work_h / 2 - 20);

  let open_direction = if is_at_bottom {
    "up".to_string()
  } else {
    "down".to_string()
  };

  // 6. Animación suave de auto-acomodo (ease-out) en lugar de salto instantáneo
  animate_window_to(&window, end_pos.x, end_pos.y, final_x, final_y).await;

  let placement = IslandPlacement {
    dock: closest_dock,
    open_direction,
    x: final_x,
    y: final_y,
  };

  let _ = window.emit("island-dock-changed", &placement);
  Ok(placement)
}

#[tauri::command]
pub async fn snap_island_to(app: tauri::AppHandle, anchor: String) -> Result<IslandPlacement, String> {
  let window = app.get_webview_window("island").ok_or("No island window")?;
  let monitor = window.current_monitor().map_err(|e| e.to_string())?.ok_or("No monitor found")?;
  let cur_size = window.outer_size().map_err(|e| e.to_string())?;
  let cur_pos = window.outer_position().unwrap_or(PhysicalPosition { x: 0, y: 0 });
  let win_w = cur_size.width as i32;
  let win_h = cur_size.height as i32;

  let mon_pos = monitor.position();
  let mon_size = monitor.size();
  let mon_x = mon_pos.x;
  let mon_y = mon_pos.y;
  let mon_w = mon_size.width as i32;
  let mon_h = mon_size.height as i32;

  let (work_x, work_y, work_w, work_h) = {
    #[cfg(windows)]
    {
      if let Some(wa) = get_work_area_windows() {
        wa
      } else {
        (mon_x, mon_y, mon_w, mon_h - 56)
      }
    }
    #[cfg(not(windows))]
    {
      (mon_x, mon_y, mon_w, mon_h - 48)
    }
  };

  let (target_x, target_y, open_dir) = match anchor.as_str() {
    "top-left" => (work_x + 16, work_y + 10, "down"),
    "top-right" => (work_x + work_w - win_w - 16, work_y + 10, "down"),
    "bottom-center" => (work_x + (work_w - win_w) / 2, work_y + work_h - win_h + 4, "up"),
    _ => (work_x + (work_w - win_w) / 2, work_y + 10, "down"),
  };

  let min_x = work_x + 8;
  let max_x = (work_x + work_w - win_w - 8).max(min_x);
  let min_y = work_y + 8;
  let max_y = (work_y + work_h - win_h + 4).max(min_y);

  let final_x = target_x.clamp(min_x, max_x);
  let final_y = target_y.clamp(min_y, max_y);

  animate_window_to(&window, cur_pos.x, cur_pos.y, final_x, final_y).await;

  let placement = IslandPlacement {
    dock: anchor,
    open_direction: open_dir.to_string(),
    x: final_x,
    y: final_y,
  };

  let _ = window.emit("island-dock-changed", &placement);
  Ok(placement)
}

#[tauri::command]
pub fn get_island_dock_position(app: tauri::AppHandle) -> Result<IslandPlacement, String> {
  let window = app.get_webview_window("island").ok_or("No island window")?;
  let cur_pos = window.outer_position().map_err(|e| e.to_string())?;
  let cur_size = window.outer_size().map_err(|e| e.to_string())?;
  let win_w = cur_size.width as i32;
  let win_h = cur_size.height as i32;

  let monitor = window.current_monitor().map_err(|e| e.to_string())?.ok_or("No monitor found")?;
  let mon_pos = monitor.position();
  let mon_size = monitor.size();
  let mon_x = mon_pos.x;
  let mon_y = mon_pos.y;
  let mon_w = mon_size.width as i32;
  let mon_h = mon_size.height as i32;

  let (work_x, work_y, work_w, work_h) = {
    #[cfg(windows)]
    {
      if let Some(wa) = get_work_area_windows() {
        wa
      } else {
        (mon_x, mon_y, mon_w, mon_h - 56)
      }
    }
    #[cfg(not(windows))]
    {
      (mon_x, mon_y, mon_w, mon_h - 48)
    }
  };

  let is_lower = cur_pos.y > (work_y + work_h / 2 - 30);
  let open_dir = if is_lower { "up" } else { "down" };

  let targets = [
    ("top-left", (work_x + 16, work_y + 10)),
    ("top-center", (work_x + (work_w - win_w) / 2, work_y + 10)),
    ("top-right", (work_x + work_w - win_w - 16, work_y + 10)),
    ("bottom-center", (work_x + (work_w - win_w) / 2, work_y + work_h - win_h + 4)),
  ];

  let snap_threshold = 160.0_f64;
  let mut dock = if is_lower { "bottom-free" } else { "free" }.to_string();

  for (name, target) in targets {
    let dx = (cur_pos.x - target.0) as f64;
    let dy = (cur_pos.y - target.1) as f64;
    if (dx * dx + dy * dy).sqrt() <= snap_threshold {
      dock = name.to_string();
      break;
    }
  }

  Ok(IslandPlacement {
    dock,
    open_direction: open_dir.to_string(),
    x: cur_pos.x,
    y: cur_pos.y,
  })
}

#[tauri::command]
pub fn set_island_state(
  app: tauri::AppHandle,
  state: String,
  direction: String,
) -> Result<(), String> {
  let window = app.get_webview_window("island").ok_or("No island window")?;
  let scale = window.scale_factor().unwrap_or(1.0);
  let cur_pos = window.outer_position().map_err(|e| e.to_string())?;
  let cur_size = window.outer_size().map_err(|e| e.to_string())?;

  let (target_w_log, target_h_log) = match state.as_str() {
    "expanded" => (400.0, 185.0),
    "alert" => (380.0, 56.0),
    _ => (300.0, 48.0),
  };

  let target_w = (target_w_log * scale).round() as i32;
  let target_h = (target_h_log * scale).round() as i32;

  let dw = target_w - cur_size.width as i32;
  let dh = target_h - cur_size.height as i32;

  if dw == 0 && dh == 0 {
    return Ok(());
  }

  let new_x = cur_pos.x - dw / 2;
  let new_y = if direction == "up" {
    cur_pos.y - dh
  } else {
    cur_pos.y
  };

  #[cfg(windows)]
  {
    extern "system" {
      fn SetWindowPos(
        hWnd: *mut std::ffi::c_void,
        hWndInsertAfter: *mut std::ffi::c_void,
        X: i32,
        Y: i32,
        cx: i32,
        cy: i32,
        uFlags: u32,
      ) -> i32;
    }
    if let Ok(hwnd) = window.hwnd() {
      unsafe {
        SetWindowPos(
          hwnd.0 as *mut std::ffi::c_void,
          std::ptr::null_mut(),
          new_x,
          new_y,
          target_w,
          target_h,
          0x0004 | 0x0010, // SWP_NOZORDER (0x0004) | SWP_NOACTIVATE (0x0010)
        );
      }
      return Ok(());
    }
  }

  let _ = window.set_position(Position::Physical(PhysicalPosition { x: new_x, y: new_y }));
  let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize {
    width: target_w as u32,
    height: target_h as u32,
  }));
  Ok(())
}

