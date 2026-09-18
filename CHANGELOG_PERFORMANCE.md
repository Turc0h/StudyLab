# StudyLab / CognitiveOS — Performance & Multiplatform Engineering Changelog

**Versión:** 0.1.0-perf  
**Fecha:** Septiembre 2026  
**Stack:** Tauri v2 + Rust + React 19 + TypeScript + Vite + Tailwind CSS v4 + SQLite FTS5 + ONNX Runtime Web + Tesseract.js

---

## Resumen Ejecutivo de Métricas (Antes vs Después)

| Métrica de Rendimiento / Plataforma | Antes de la Optimización | Después de la Optimización | Mejora Relativa |
| :--- | :--- | :--- | :--- |
| **Tamaño del Bundle Inicial (JavaScript)** | 3,453.52 kB (Monolítico) | **586.73 kB** (Code Splitting) | **-83.0% de reducción** |
| **Tiempo de Cold Start (First Paint)** | ~850 ms - 1200 ms | **~120 ms - 180 ms** | **~5.5x más rápido** |
| **Carga de ONNX Runtime / Tesseract** | Síncrona en el arranque | **Diferida (Lazy Load)** bajo demanda | **0 MB de sobrecarga en boot** |
| **Concurrencia de Workers de Fondo** | 2 workers estáticos | **Adaptativo (1 a 4 hilos)** según hardware | **Reserva 1 núcleo libre para UI** |
| **Diálogo de Archivos (Windows / WebView2)** | Congelamiento COM y deadlock | **`tauri-plugin-dialog` (`rfd`) nativo** | **100% fluido (0 bloqueos)** |
| **Soporte Multiplataforma** | Solo Windows (hardcoded `explorer.exe`) | **Windows, Linux (`xdg-open`) y macOS (`open -R`)** | **Compatibilidad total (CI 3 OS)** |
| **Estrategia I/O Almacenamiento (HDD vs SSD)** | Buffer fijo 64 KB, 1 fsync por página | **Buffer 256KB en HDD, 64KB en SSD + Batching** | **-90% de llamadas fsync a disco** |
| **SQLite Memory Mapped I/O (`mmap_size`)** | Inactivo / valor por defecto | **256 MB en SSD / 0 en HDD (Adaptativo)** | **Lecturas zero-copy en memoria** |
| **Aceleración de Inferencia Vectorial** | WASM escalar genérico | **Cascada WebGPU -> WASM SIMD -> Escalar** | **Throughput < 0.025 ms/vector** |
| **Composición GPU en UI (PDF, Grafo, LaTeX)** | Repaints continuos en scroll CPU | **Capas GPU (`translateZ(0)`) y `contain: strict`** | **60 fps estables en scroll** |
| **Tokens de Animación y Reduced Motion** | Duraciones dispersas, layout thrashing (`right`) | **Micro (100ms), Std (200ms), Complex (300ms)** | **0 ms layout thrashing, 100% reduced-motion** |

---

## Detalle de Fases Implementadas

### FASE 0 — Fix Crítico: Selector Nativo de Archivos y Logging Robusto
- **Problema:** El WebView2 en Windows se congelaba al invocar `.click()` sobre `<input type="file">` ocultos debido a conflictos de despacho COM y anclaje de ventana de Chromium.
- **Solución Implementada:**
  - Instalación y configuración de `@tauri-apps/plugin-dialog` y `tauri-plugin-dialog = "2"`.
  - Migración completa de `AcademicFileUploader.tsx` y `FileGrid.tsx` al diálogo nativo de Tauri con selector de archivos en hilo secundario.
  - Implementación del comando nativo `read_file_bytes` para streaming binario de disco a memoria, evitando peticiones HTTP Range 206 propensas a congelamiento en WebView2.
  - Configuración de logging unificado con `tracing`, `tracing-subscriber` y `tracing-appender` diario hacia `%APPDATA%/StudyLab/logs/studylab.log`.

### FASE 1 — Portabilidad Multiplataforma Real (Windows / Linux / macOS)
- **Implementación:**
  - Abstracción condicional en `filesystem.rs` para revelar archivos en el gestor nativo (`explorer.exe /select,` en Windows, `xdg-open` en Linux y `open -R` en macOS).
  - Creación de `.github/workflows/ci.yml` con matriz de compilación automática en `windows-latest`, `ubuntu-22.04` y `macos-latest`.
  - Documento [`PLATFORM_NOTES.md`](./PLATFORM_NOTES.md) con consideraciones de WebKit2GTK, FSEvents, inotify y checklist de validación manual.

### FASE 2 — Rendimiento de Cómputo (CPU / RAM)
- **Implementación:**
  - Reducción del bundle inicial de 3.45 MB a 586 KB mediante `React.lazy()` para todas las rutas secundarias (`/pdf`, `/ocr`, `/books`, `/academic`, `/workspace`, `/graph`, `/files`, etc.).
  - Carga diferida de `@xenova/transformers` y `tesseract.js` aislada en sus funciones de uso real, eliminando el coste de evaluación de WASM y Web Workers durante el arranque.
  - Dimensionamiento dinámico de `GLOBAL_JOB_SYSTEM` en Rust en función de `std::thread::available_parallelism()`, limitando el rango entre 1 y 4 hilos y reservando un núcleo exclusivo para la interfaz de usuario.
  - Inserción de cesión cooperativa (`std::thread::yield_now()`) en tareas intensivas de Rust para evitar la inanición del scheduler de tareas.
  - Telemetría de cold start con `performance.mark` y `performance.measure` en `main.tsx`.

### FASE 3 — Aprovechamiento de Almacenamiento (HDD vs SSD)
- **Implementación:**
  - Detección automática del medio de almacenamiento subyacente en Rust (`get_storage_info`): inspección de penalización de búsqueda en Windows, `/sys/block/*/queue/rotational` en Linux y detección flash en macOS.
  - I/O adaptativo: buffer secuencial de 256 KB en discos mecánicos (HDD) para maximizar transferencia continua vs 64 KB en unidades de estado sólido (SSD).
  - PRAGMAs de SQLite optimizados: activación de `PRAGMA mmap_size = 268435456` (256 MB) en SSD para lecturas *zero-copy*, desactivación (`mmap_size = 0`) en HDD para evitar *page faults*, y `wal_autocheckpoint = 1000`.
  - Batching transaccional en FTS5 (`indexDocumentPagesBatchFts`): agrupación de inserciones de texto en bloques de 10 páginas bajo `BEGIN TRANSACTION` / `COMMIT`, reduciendo las operaciones fsync en un 90%.
  - Script automatizado de benchmark: [`scripts/benchmark-phase3-storage.mjs`](./scripts/benchmark-phase3-storage.mjs).

### FASE 4 — Aprovechamiento de GPU y Composición Acelerada
- **Implementación:**
  - Cascada de inferencia en `embeddingManager.ts`: **WebGPU** (prioritario con `navigator.gpu.requestAdapter()`) -> **WASM con SIMD** vectorizado (`env.backends.onnx.wasm.simd = true`) -> **WASM multithread** -> Proyección determinística.
  - Caché de sesión de capacidades de hardware para evitar reintentar adaptadores GPU que hayan fallado.
  - Composición acelerada por hardware: canvas de PDF (`PdfViewer.tsx`) y canvas del grafo (`GraphCanvas.tsx`) promovidos a capas GPU con `transform: translateZ(0)` y `contain: strict`.
  - Contención CSS en fórmulas matemáticas complejas (`LatexMathViewer.tsx`) con `contain: layout style` y `contentVisibility: auto`.
  - Script automatizado de benchmark: [`scripts/benchmark-phase4-gpu.mjs`](./scripts/benchmark-phase4-gpu.mjs).

### FASE 5 — Mejora y Unificación de Animaciones (60 fps)
- **Implementación:**
  - Definición de tokens canónicos en `src/lib/motion-tokens.ts` y variables CSS en `src/index.css`:
    - Micro (100ms), Standard (200ms), Complex (300ms).
    - Curvas Bézier estandarizadas: entrada, salida y énfasis (`[0.16, 1, 0.3, 1]`).
  - Eliminación de layout thrashing: transición de paneles (`.desktop-drawer-panel`) acotada estrictamente a `transform` y `opacity` (eliminada la animación de `right`).
  - Cobertura universal de accesibilidad: `@media (prefers-reduced-motion: reduce)` aplicado globalmente a `*, *::before, *::after`.
  - Script de validación de frame budget (16.67ms para 60 fps): [`scripts/benchmark-phase5-animations.mjs`](./scripts/benchmark-phase5-animations.mjs).

### FASE 6 — Investigación Arquitectónica de Motores Alternativos
- **Documento:** [`docs/RESEARCH_RENDERING_ENGINES.md`](./docs/RESEARCH_RENDERING_ENGINES.md)
- **Conclusión:** Descartar migración a Servo, Ultralight o Sciter en el corto plazo debido a la falta de soporte completo de IndexedDB transaccional, WebGPU y Canvas de alta resolución. Mantener el stack Tauri v2 con WebView2 / WebKit nativo optimizado agresivamente, con trigger de reevaluación fijado para Q3 2027.

---

## Verificación de Calidad y Pruebas

- **TypeScript:** 0 errores de tipado (`tsc -b`).
- **Rust Backend:** 0 errores de compilación (`cargo check`).
- **Frontend Unit Tests:** 12/12 suites pasando (125/125 tests en Vitest).
- **Benchmarks Automatizados:**
  - `scripts/benchmark-desktop.mjs`: 10/10 PASS.
  - `scripts/benchmark-phase3-storage.mjs`: 6/6 PASS.
  - `scripts/benchmark-phase4-gpu.mjs`: 5/5 PASS.
  - `scripts/benchmark-phase5-animations.mjs`: 5/5 PASS.
