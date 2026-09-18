# StudyLab — Multiplatform Technical Notes & Architecture Matrix

Este documento detalla las consideraciones específicas de plataforma, integraciones nativas del sistema operativo, rutas de almacenamiento, comportamiento del watcher de biblioteca, y lista de verificación manual para Windows, Linux y macOS.

---

## 1. Matriz de Integración por Plataforma

| Componente | Windows | Linux (Ubuntu / Debian / Fedora) | macOS |
| :--- | :--- | :--- | :--- |
| **Motor Web (WebView)** | Microsoft Edge WebView2 (Chromium Evergreen) | WebKit2GTK (WebKit 4.1+) | Apple WKWebView (WebKit nativo) |
| **Diálogos de Archivos** | `tauri-plugin-dialog` (`IFileOpenDialog` nativo vía `rfd`) | `tauri-plugin-dialog` (XDG Desktop Portal / GTK Dialog) | `tauri-plugin-dialog` (`NSOpenPanel` nativo) |
| **Explorador de Archivos (`show_in_folder`)** | `explorer.exe /select,<path>` | `xdg-open <parent_directory>` | `open -R <path>` |
| **Watcher de Sistema de Archivos** | `notify::RecommendedWatcher` (`ReadDirectoryChangesW`) | `notify::RecommendedWatcher` (`inotify`) | `notify::RecommendedWatcher` (`FSEvents`) |
| **Ruta de Biblioteca Principal** | `%USERPROFILE%\Documents\StudyLab\Library` | `~/Documents/StudyLab/Library` | `~/Documents/StudyLab/Library` |
| **Ruta de Logs y Cache** | `%APPDATA%\StudyLab\logs` | `~/.local/share/StudyLab/logs` (`$XDG_DATA_HOME`) | `~/Library/Application Support/StudyLab/logs` |
| **Formato de Paquete / Instalador** | NSIS (`.exe`), MSI (`.msi`) | Debian (`.deb`), AppImage (`.AppImage`) | DMG (`.dmg`), App Bundle (`.app`) |

---

## 2. Detalles Técnicos por Plataforma

### Windows (10 / 11)
- **WebView2**:
  - Se ejecuta sobre Chromium con aislamiento de procesos.
  - Evitar invocar `.click()` sobre `<input type="file">` ocultos dentro de callbacks asíncronos complejos, ya que WebView2 puede bloquear la cola de mensajes COM de la ventana principal. Se utiliza `@tauri-apps/plugin-dialog` con binding nativo directo.
- **Rutas y Normalización**:
  - Las rutas manejan backslashes (`\`). En el backend Rust se utiliza `std::path::PathBuf` para garantizar compatibilidad con prefijos UNC (`\\?\`).
- **Sistema de Archivos y Watcher**:
  - `ReadDirectoryChangesW` recibe eventos continuos. Se aplica un debounce de 1000ms y un ciclo de verificación de estabilidad (`is_file_stable`) con lectura de tamaño sucesiva para evitar procesar archivos bloqueados por el proceso de copia de Windows.

### Linux (Ubuntu 22.04+ / Debian 12+)
- **Dependencias del Sistema**:
  - Requiere paquetes de sistema instalados:
    ```bash
    sudo apt-get install -y libwebkit2gtk-4.1-dev build-essential curl wget libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
    ```
- **XDG Base Directory**:
  - Se respetan variables `$XDG_CONFIG_HOME`, `$XDG_DATA_HOME` y `$XDG_CACHE_HOME` mediante la crate `dirs`.
- **Revelación de Archivos**:
  - `show_in_folder` verifica si el path es un archivo; si lo es, abre el directorio contenedor mediante `xdg-open`, asegurando compatibilidad en GNOME (Nautilus), KDE (Dolphin), XFCE (Thunar) y entornos tiling (i3/sway).
- **Watcher (`inotify`)**:
  - `inotify` posee un límite de descriptores en kernels Linux (`fs.inotify.max_user_watches`). Para bibliotecas con más de 10,000 subcarpetas, documentar o sugerir incremento vía `sysctl`.

### macOS (macOS 12 Monterey+)
- **WKWebView**:
  - Cumplimiento de políticas de WebKit: autoplay, audio context y permisos de almacenamiento.
  - Para builds de distribución, se requiere código firmado (`codesign`) y notarización de Apple (`notarytool`).
- **Revelación de Archivos**:
  - `open -R <path>` selecciona exactamente el archivo solicitado dentro de Finder de forma nativa.
- **Watcher (`FSEvents`)**:
  - La API FSEvents monitorea árboles completos eficientemente a nivel de kernel de Darwin con bajo consumo de batería.

---

## 3. Checklist de Validación Manual (Linux / macOS)

Cuando se ejecute una build en un entorno Linux o macOS físico o virtual:

- [ ] **Lanzamiento y Renderizado Inicial**:
  - La ventana inicia en el tamaño mínimo (960x640) y centrado.
  - No hay parpadeos blancos (FOUC) en el WebView nativo (WebKit2GTK en Linux / WKWebView en macOS).
- [ ] **Selector Nativo de Archivos**:
  - Al presionar "Cargar documento" o "Seleccionar archivos", el diálogo del SO abre sin congelar la ventana principal.
  - Selección de múltiples PDFs / TXT / Markdown.
- [ ] **Apertura en Gestor de Archivos (`show_in_folder`)**:
  - Clic en el botón "Abrir en carpeta" de un documento.
  - En Linux: abre Nautilus/Dolphin en la carpeta de biblioteca.
  - En macOS: abre Finder con el documento seleccionado y resaltado.
- [ ] **Watcher de Archivos en Vivo**:
  - Copiar un PDF externamente a `~/Documents/StudyLab/Library`.
  - Confirmar que StudyLab emite el evento de reconciliación y el documento aparece en la biblioteca sin reiniciar la aplicación.
- [ ] **Cómputo Local y Workers**:
  - Ejecutar extracción OCR (Tesseract.js) y embeddings locales (ONNX Runtime Web).
  - Verificar que Web Workers y WASM SIMD se ejecutan sin errores de CSP en WebKit.
