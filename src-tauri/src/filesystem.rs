use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs::{self, File};
use std::io::{BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct NativeFileMetadata {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub hash: String,
    pub created_at: u64,
    pub modified_at: u64,
}

/// Devuelve la ruta canónica del directorio de biblioteca de StudyLab en Documentos de Windows.
/// Crea el directorio si aún no existe.
pub fn resolve_library_path() -> Result<PathBuf, String> {
    let base_dir = dirs::document_dir()
        .or_else(|| dirs::data_dir())
        .ok_or_else(|| "No se pudo determinar el directorio de documentos del usuario".to_string())?;

    let library_dir = base_dir.join("StudyLab").join("Library");
    if !library_dir.exists() {
        fs::create_dir_all(&library_dir)
            .map_err(|e| format!("Error creando carpeta de biblioteca: {}", e))?;
    }
    Ok(library_dir)
}

/// Comando Tauri: Obtener ruta absoluta de la biblioteca
#[tauri::command]
pub fn get_library_dir() -> Result<String, String> {
    resolve_library_path().map(|p| p.to_string_lossy().to_string())
}

/// Comando Tauri: Calcular hash SHA-256 de un archivo en disco mediante streaming
/// Utiliza un buffer de 64 KB, asegurando consumo de RAM constante e ínfimo (independiente del tamaño del archivo)
#[tauri::command]
pub fn calculate_file_hash(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err(format!("El archivo no existe: {}", file_path));
    }

    let file = File::open(path).map_err(|e| format!("No se pudo abrir el archivo: {}", e))?;
    let mut reader = BufReader::with_capacity(64 * 1024, file);
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 64 * 1024];

    loop {
        let bytes_read = reader
            .read(&mut buffer)
            .map_err(|e| format!("Error leyendo buffer del archivo: {}", e))?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

/// Comando Tauri: Copiar un archivo existente a la biblioteca de StudyLab
#[tauri::command]
pub fn import_file_to_library(source_path: String, custom_name: Option<String>) -> Result<NativeFileMetadata, String> {
    let src = Path::new(&source_path);
    if !src.exists() {
        return Err(format!("El archivo origen no existe: {}", source_path));
    }

    let library_dir = resolve_library_path()?;
    let file_name = custom_name.unwrap_or_else(|| {
        src.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "document.pdf".to_string())
    });

    let target_path = library_dir.join(&file_name);

    // Si ya existe un archivo con ese nombre, evitar sobrescribir silenciosamente
    let final_path = if target_path.exists() {
        let stem = target_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = target_path.extension().and_then(|e| e.to_str()).unwrap_or("pdf");
        let timestamp = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        library_dir.join(format!("{}_{}.{}", stem, timestamp, ext))
    } else {
        target_path
    };

    // Copiar el archivo físicamente
    fs::copy(src, &final_path)
        .map_err(|e| format!("Error al copiar el archivo a la biblioteca: {}", e))?;

    // Obtener metadata del archivo destino
    let metadata = fs::metadata(&final_path)
        .map_err(|e| format!("Error al leer metadata del archivo: {}", e))?;

    let hash = calculate_file_hash(final_path.to_string_lossy().to_string())?;

    let created_at = metadata
        .created()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    let modified_at = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(NativeFileMetadata {
        name: final_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: final_path.to_string_lossy().to_string(),
        size: metadata.len(),
        hash,
        created_at,
        modified_at,
    })
}

/// Comando Tauri: Guardar buffer de bytes directamente en disco en la biblioteca
#[tauri::command]
pub fn save_buffer_to_library(filename: String, data: Vec<u8>) -> Result<NativeFileMetadata, String> {
    let library_dir = resolve_library_path()?;
    let target_path = library_dir.join(&filename);

    let final_path = if target_path.exists() {
        let stem = target_path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
        let ext = target_path.extension().and_then(|e| e.to_str()).unwrap_or("pdf");
        let timestamp = std::time::SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0);
        library_dir.join(format!("{}_{}.{}", stem, timestamp, ext))
    } else {
        target_path
    };

    let mut file = File::create(&final_path)
        .map_err(|e| format!("Error creando archivo en biblioteca: {}", e))?;
    file.write_all(&data)
        .map_err(|e| format!("Error escribiendo datos en archivo: {}", e))?;
    file.flush()
        .map_err(|e| format!("Error guardando archivo en disco: {}", e))?;

    let metadata = fs::metadata(&final_path)
        .map_err(|e| format!("Error al leer metadata: {}", e))?;

    let hash = calculate_file_hash(final_path.to_string_lossy().to_string())?;

    let now_ms = std::time::SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(NativeFileMetadata {
        name: final_path.file_name().unwrap_or_default().to_string_lossy().to_string(),
        path: final_path.to_string_lossy().to_string(),
        size: metadata.len(),
        hash,
        created_at: now_ms,
        modified_at: now_ms,
    })
}

/// Comando Tauri: Verificar si un archivo existe en disco
#[tauri::command]
pub fn file_exists(path: String) -> bool {
    Path::new(&path).exists()
}

/// Comando Tauri: Revelar archivo en el Explorador de archivos de Windows
#[tauri::command]
pub fn show_in_folder(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let mut cmd = Command::new("explorer.exe");
        cmd.arg("/select,").arg(&path);
        cmd.spawn().map_err(|e| format!("Error abriendo explorador: {}", e))?;
        Ok(())
    }
    #[cfg(not(target_os = "windows"))]
    {
        Err("show_in_folder solo está implementado para Windows".to_string())
    }
}
