// Lazy loader for @xenova/transformers so ONNX Runtime is not bundled or evaluated during cold start
let transformersModule: typeof import("@xenova/transformers") | null = null;

async function getTransformers() {
  if (!transformersModule) {
    transformersModule = await import("@xenova/transformers");
    transformersModule.env.allowLocalModels = false;
    transformersModule.env.useBrowserCache = true;
  }
  return transformersModule;
}

export type EmbeddingEngineStatus = "unloaded" | "loading" | "ready" | "fallback_keyword" | "error";

export interface EmbeddingEngineState {
  status: EmbeddingEngineStatus;
  progress: number;
  modelId: string;
  error?: string;
}

const STORAGE_KEY_MODEL = "studylab_embedding_model_id";
export const DEFAULT_EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

export const AVAILABLE_EMBEDDING_MODELS = [
  {
    id: "Xenova/all-MiniLM-L6-v2",
    name: "all-MiniLM-L6-v2 (Recomendado)",
    desc: "Modelo liviano (~23MB), 384 dimensiones, alta velocidad en CPU y WebGPU.",
  },
  {
    id: "Xenova/bge-small-en-v1.5",
    name: "BGE Small v1.5",
    desc: "384 dimensiones, optimizado para textos académicos densos.",
  },
  {
    id: "Xenova/multilingual-e5-small",
    name: "Multilingual E5 Small",
    desc: "384 dimensiones, soporte multilingüe profundo para español.",
  },
];

let extractorInstance: any = null;
let currentState: EmbeddingEngineState = {
  status: "unloaded",
  progress: 0,
  modelId: localStorage.getItem(STORAGE_KEY_MODEL) || DEFAULT_EMBEDDING_MODEL,
};

const listeners = new Set<(state: EmbeddingEngineState) => void>();

function updateState(partial: Partial<EmbeddingEngineState>) {
  currentState = { ...currentState, ...partial };
  listeners.forEach((l) => l(currentState));
}

export function subscribeEmbeddingState(fn: (state: EmbeddingEngineState) => void): () => void {
  listeners.add(fn);
  fn(currentState);
  return () => listeners.delete(fn);
}

export function getEmbeddingState(): EmbeddingEngineState {
  return currentState;
}

export function setEmbeddingModelId(modelId: string) {
  localStorage.setItem(STORAGE_KEY_MODEL, modelId);
  extractorInstance = null;
  updateState({ modelId, status: "unloaded", progress: 0, error: undefined });
}

/**
 * Initializes the Transformers.js feature-extraction pipeline with real progress tracking.
 */
export async function initEmbeddingModel(
  onProgress?: (pct: number) => void,
): Promise<any> {
  if (extractorInstance && currentState.status === "ready") {
    return extractorInstance;
  }

  const modelId = currentState.modelId;
  updateState({ status: "loading", progress: 0, error: undefined });

  try {
    const { pipeline } = await getTransformers();
    const pipe = await pipeline("feature-extraction", modelId, {
      progress_callback: (item: any) => {
        if (item.status === "progress" && item.progress !== undefined) {
          const pct = Math.round(item.progress);
          updateState({ progress: pct });
          onProgress?.(pct);
        }
      },
    });

    extractorInstance = pipe;
    updateState({ status: "ready", progress: 100 });
    return pipe;
  } catch (err: any) {
    console.warn("Failed to load on-device embedding model, degrading to keyword search fallback:", err);
    updateState({
      status: "fallback_keyword",
      error: err?.message || "No se pudo cargar el modelo ONNX. Degradando a búsqueda léxica BM25.",
    });
    return null;
  }
}

/**
 * Computes a semantic embedding vector for a given text string.
 * Returns unit-normalized float array.
 */
export async function computeEmbeddingVector(text: string): Promise<number[]> {
  if (!text || !text.trim()) return [];

  try {
    const pipe = extractorInstance || (await initEmbeddingModel());
    if (pipe) {
      const output = await pipe(text, { pooling: "mean", normalize: true });
      return Array.from(output.data as Float32Array);
    }
  } catch (err) {
    console.warn("Inference error in computeEmbeddingVector, using fallback projection:", err);
  }

  // Graceful fallback: 64-dimensional deterministic pseudo-projection if model fails
  return computeFallbackProjection(text, 64);
}

/**
 * Deterministic hash projection used only when WebGPU/WASM is unavailable.
 */
export function computeFallbackProjection(text: string, dimensions = 64): number[] {
  const vector = Array.from({ length: dimensions }, () => 0);
  const words = text.toLowerCase().split(/\s+/);
  for (const w of words) {
    let hash = 0;
    for (let i = 0; i < w.length; i++) {
      hash = (hash << 5) - hash + w.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimensions;
    vector[idx] += 1;
  }
  // Normalize
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return vector;
  return vector.map((v) => v / norm);
}

/**
 * Computes semantic embedding vectors for a list of texts in controlled micro-batches (size 2-4)
 * with cooperative yield intervals to keep the UI thread 100% responsive and memory low.
 */
export async function computeBatchEmbeddings(
  texts: string[],
  options?: {
    batchSize?: number;
    onProgress?: (processed: number, total: number) => void;
    isCancelled?: () => boolean;
  }
): Promise<number[][]> {
  if (!texts || texts.length === 0) return [];

  const batchSize = Math.max(1, Math.min(4, options?.batchSize || 2));
  const results: number[][] = [];
  const total = texts.length;

  for (let i = 0; i < total; i += batchSize) {
    // 1. Chequeo de cancelación cooperativa
    if (options?.isCancelled && options.isCancelled()) {
      break;
    }

    const batch = texts.slice(i, i + batchSize);
    const batchVectors: number[][] = [];

    for (const text of batch) {
      const vec = await computeEmbeddingVector(text);
      batchVectors.push(vec);
    }

    results.push(...batchVectors);

    if (options?.onProgress) {
      options.onProgress(results.length, total);
    }

    // 2. Yield cooperativo al loop de eventos (25ms) para evitar congelamiento de UI
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  return results;
}
