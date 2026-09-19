use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::process::Command;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq, Eq)]
pub struct DetectedStudyApp {
    pub process_name: String,
    pub display_name: String,
    pub category: String,
    pub suggested_profile: String,
}

/// Mapeo de procesos canónicos de estudio a perfiles cognitivos sugeridos.
fn get_canonical_app_info(proc_clean: &str) -> Option<(&'static str, &'static str, &'static str)> {
    // Retorna (display_name, category, suggested_profile)
    let p = proc_clean.to_lowercase();
    match p.as_str() {
        // Editores de Código y Entornos Computacionales -> logical-depth
        "code" | "code.exe" => Some(("Visual Studio Code", "IDE / Programación", "logical-depth")),
        "cursor" | "cursor.exe" => Some(("Cursor AI", "IDE / Programación", "logical-depth")),
        "rstudio" | "rstudio.exe" => Some(("RStudio", "Cálculo y Estadística", "logical-depth")),
        "pycharm64" | "pycharm64.exe" | "pycharm" | "pycharm.exe" => Some(("PyCharm", "IDE Python", "logical-depth")),
        "matlab" | "matlab.exe" => Some(("MATLAB", "Computación Numérica", "logical-depth")),
        "texstudio" | "texstudio.exe" => Some(("TeXstudio", "LaTeX / Deducción", "logical-depth")),

        // Visores de Documentos y Literatura -> memory-fortress
        "sumatrapdf" | "sumatrapdf.exe" => Some(("SumatraPDF", "Visor de Documentos", "memory-fortress")),
        "acrord32" | "acrord32.exe" | "acrobat" | "acrobat.exe" => Some(("Adobe Acrobat Reader", "Visor PDF", "memory-fortress")),
        "calibre" | "calibre.exe" => Some(("Calibre", "Biblioteca de Libros", "memory-fortress")),
        "okular" | "okular.exe" => Some(("Okular", "Visor Documentos", "memory-fortress")),
        "zotero" | "zotero.exe" => Some(("Zotero", "Gestor de Referencias", "memory-fortress")),

        // Editores de Notas y Síntesis Estructurada -> divergent-synthesis
        "obsidian" | "obsidian.exe" => Some(("Obsidian", "Segundo Cerebro / Notas", "divergent-synthesis")),
        "notion" | "notion.exe" => Some(("Notion", "Espacio de Trabajo", "divergent-synthesis")),
        "winword" | "winword.exe" => Some(("Microsoft Word", "Procesador de Texto", "divergent-synthesis")),
        "onenote" | "onenote.exe" => Some(("Microsoft OneNote", "Apuntes y Cuadernos", "divergent-synthesis")),
        "logseq" | "logseq.exe" => Some(("Logseq", "Grafo de Notas", "divergent-synthesis")),
        "typora" | "typora.exe" => Some(("Typora", "Editor Markdown", "divergent-synthesis")),

        // Simuladores y Calculadoras -> exam-simulation
        "anki" | "anki.exe" => Some(("Anki", "Flashcards y Repaso", "memory-fortress")),
        "speedcrunch" | "speedcrunch.exe" => Some(("SpeedCrunch", "Calculadora Científica", "exam-simulation")),
        _ => None,
    }
}

/// Consulta nativa de procesos activos en la máquina local contrastados
/// única y estrictamente contra la lista blanca provista por el estudiante.
#[tauri::command]
pub fn detect_active_study_tools(custom_whitelist: Option<Vec<String>>) -> Result<Vec<DetectedStudyApp>, String> {
    let mut allowed_set: HashSet<String> = HashSet::new();

    // Lista canónica por defecto
    let default_apps = [
        "code.exe", "code", "cursor.exe", "cursor", "rstudio.exe", "rstudio",
        "pycharm64.exe", "pycharm.exe", "pycharm", "matlab.exe", "matlab",
        "texstudio.exe", "texstudio", "sumatrapdf.exe", "sumatrapdf",
        "acrord32.exe", "acrobat.exe", "calibre.exe", "okular", "zotero.exe", "zotero",
        "obsidian.exe", "obsidian", "notion.exe", "notion", "winword.exe",
        "onenote.exe", "logseq.exe", "logseq", "typora.exe", "anki.exe", "anki",
        "speedcrunch.exe",
    ];

    for app in default_apps {
        allowed_set.insert(app.to_lowercase());
    }

    if let Some(custom) = custom_whitelist {
        for app in custom {
            allowed_set.insert(app.trim().to_lowercase());
        }
    }

    let mut running_processes: HashSet<String> = HashSet::new();

    #[cfg(target_os = "windows")]
    {
        // En Windows usamos tasklist de manera ligera y sin elevación de privilegios
        if let Ok(output) = Command::new("tasklist")
            .args(["/FO", "CSV", "/NH"])
            .output()
        {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let trimmed = line.trim();
                    if trimmed.is_empty() {
                        continue;
                    }
                    // La primera columna entre comillas es el nombre de la imagen: "code.exe",...
                    if let Some(first_quote_end) = trimmed.strip_prefix('"').and_then(|s| s.find('"')) {
                        let proc_name = &trimmed[1..=first_quote_end];
                        running_processes.insert(proc_name.to_lowercase());
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        // En Linux / macOS usamos ps -A -o comm=
        if let Ok(output) = Command::new("ps")
            .args(["-A", "-o", "comm="])
            .output()
        {
            if let Ok(text) = String::from_utf8(output.stdout) {
                for line in text.lines() {
                    let proc_name = line.trim();
                    if !proc_name.is_empty() {
                        // Extraer el basename si viene con ruta completa
                        let name = std::path::Path::new(proc_name)
                            .file_name()
                            .and_then(|n| n.to_str())
                            .unwrap_or(proc_name);
                        running_processes.insert(name.to_lowercase());
                    }
                }
            }
        }
    }

    let mut detected: Vec<DetectedStudyApp> = Vec::new();
    let mut seen_canonical: HashSet<String> = HashSet::new();

    for proc in running_processes {
        if allowed_set.contains(&proc) {
            if let Some((disp, cat, prof)) = get_canonical_app_info(&proc) {
                if !seen_canonical.contains(disp) {
                    seen_canonical.insert(disp.to_string());
                    detected.push(DetectedStudyApp {
                        process_name: proc.clone(),
                        display_name: disp.to_string(),
                        category: cat.to_string(),
                        suggested_profile: prof.to_string(),
                    });
                }
            } else {
                // Entrada personalizada del usuario
                detected.push(DetectedStudyApp {
                    process_name: proc.clone(),
                    display_name: proc.clone(),
                    category: "Personalizado".to_string(),
                    suggested_profile: "logical-depth".to_string(),
                });
            }
        }
    }

    // Ordenar deterministamente por nombre visible
    detected.sort_by(|a, b| a.display_name.cmp(&b.display_name));

    Ok(detected)
}
