# Presupuestos de Rendimiento y Matriz de Compatibilidad (CognitiveOS v5.0)

> **Regla de oro (Sección 28):** Medir antes de modificar. "Rápido" no es un criterio verificable; este documento fija las cotas cuantitativas y los mecanismos de degradación controlada.

---

## 1. Presupuestos de Rendimiento Mínimos

| Operación | Cota Objetivo | Cota Máxima Tolerable | Estrategia de Mitigación / Runtime |
|---|:---:|:---:|---|
| **Indexar PDF de 500 páginas** | $< 12\text{ s}$ | $25\text{ s}$ | Web Worker dedicado, chunking determinístico por encabezados y extracción síncrona sin bloquear el hilo de UI. |
| **Primera carga del modelo ONNX (`all-MiniLM-L6-v2`)** | $< 3.5\text{ s}$ (WiFi) | $8\text{ s}$ (3G) | Tamaño cuantizado (~23 MB). Almacenamiento en Cache API / IndexedDB; cargas subsiguientes son instantáneas ($< 150\text{ ms}$). |
| **Chunks en memoria simultáneos** | $\le 50\text{ chunks}$ | $100\text{ chunks}$ | Ventana deslizante en el lienzo PDF/Canvas y virtualización de listas en el RAG. |
| **Búsqueda híbrida (10k chunks)** | $< 35\text{ ms}$ | $75\text{ ms}$ | BM25 filtrado por tokens dispersos + Coseno denso + Reciprocal Rank Fusion ($k=60$). |
| **Umbral Coseno Lineal $\rightarrow$ HNSW** | $N < 2000$ | $N = 5000$ | Coseno lineal directo para bibliotecas personales ($< 2000$ vectores). Si supera 2000 vectores, particionado por materias. |
| **Render de página PDF (PDF.js)** | $< 60\text{ ms}$ | $120\text{ ms}$ | Canvas render con capa SVG liviana para anotaciones y máscaras de oclusión. |
| **Recálculo de Grafo 4D completo** | $< 15\text{ ms}$ | $40\text{ ms}$ | Algoritmo incremental: solo se revalúa el concepto tocado y sus adyacentes directos en el DAG. |
| **Verificación Dimensional SI** | $< 2\text{ ms}$ | $5\text{ ms}$ | Operaciones de vectores enteros de 7 dimensiones ($[L, M, T, I, \Theta, N, J]$). 100% en cliente, sin llamadas a LLM. |

---

## 2. Matriz de Compatibilidad y Degradación Elegante

StudyLab funciona en arquitecturas heterogéneas (laptops de gama de entrada, PC de laboratorio UTN, tablets y teléfonos celulares):

```text
┌──────────────┬───────────────────────────────┬──────────────────────────────────────────┐
│ API / Rasgo  │ Estado de Disponibilidad      │ Comportamiento y Degradación Elegante    │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ WebGPU       │ Chrome/Edge (Win/Mac), Linux  │ Si no está disponible (ej. Firefox),      │
│              │ experimental                  │ degrada a WebAssembly (WASM) multihilo   │
│              │                               │ mostrando honestamente el badge en UI.   │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ OPFS         │ Ampliamente soportado (2023+) │ Fallback automático y transparente a      │
│              │                               │ IndexedDB Blobs mediante fileStorage.ts  │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ persist()    │ Restrictivo en iOS Safari     │ Si navigator.storage.persist() retorna   │
│              │ (riesgo de desalojo tras 7d)  │ false, muestra advertencia en Ajustes y  │
│              │                               │ recomienda exportar .zip semanalmente.   │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ Web Workers  │ Universal en navegadores      │ Si falla la instanciación de Worker,     │
│              │ modernos                      │ ejecuta en micro-tareas diferidas        │
│              │                               │ (requestIdleCallback / setTimeout).      │
├──────────────┼───────────────────────────────┼──────────────────────────────────────────┤
│ PWA / SW     │ Estándar W3C Service Worker   │ Precacheo de shell estático y fallback    │
│              │                               │ a index.html offline sin errores de red. │
└──────────────┴───────────────────────────────┴──────────────────────────────────────────┘
```

---

## 3. Principio de Honestidad de Rendimiento (Sección 39)

1. Nunca simular que un modelo local está listo si se encuentra descargando pesos en segundo plano.
2. Cada llamada a evaluación o RAG reporta la latencia real en milisegundos (`reviewLogs.latencyMs`).
3. El usuario puede auditar en todo momento el uso en bytes en **Configuración $\rightarrow$ Almacenamiento Local**.
