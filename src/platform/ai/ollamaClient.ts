/**
 * Cliente HTTP local para el demonio de Ollama (http://localhost:11434).
 * 100% privado y offline: no se conecta a ningún endpoint externo en la nube.
 */

export const DEFAULT_OLLAMA_HOST = "http://localhost:11434";

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    parent_model?: string;
    format?: string;
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
  };
}

export interface OllamaStatus {
  isRunning: boolean;
  host: string;
  models: OllamaModel[];
  version?: string;
  error?: string;
}

/**
 * Consulta el endpoint /api/tags para comprobar si el demonio de Ollama está activo
 * y obtener el listado de modelos instalados localmente.
 */
export async function checkOllamaStatus(host: string = DEFAULT_OLLAMA_HOST): Promise<OllamaStatus> {
  const normalizedHost = host.trim().replace(/\/+$/, "") || DEFAULT_OLLAMA_HOST;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(`${normalizedHost}/api/tags`, {
      method: "GET",
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        isRunning: false,
        host: normalizedHost,
        models: [],
        error: `Respuesta HTTP no satisfactoria: ${response.status} ${response.statusText}`,
      };
    }

    const data = await response.json();
    const models: OllamaModel[] = Array.isArray(data.models) ? data.models : [];

    // Consulta de versión opcional
    let version: string | undefined;
    try {
      const vRes = await fetch(`${normalizedHost}/api/version`, { method: "GET" });
      if (vRes.ok) {
        const vData = await vRes.json();
        version = vData.version;
      }
    } catch {
      // Ignorar fallo secundario de versión
    }

    return {
      isRunning: true,
      host: normalizedHost,
      models,
      version,
    };
  } catch (err: any) {
    let msg = "No se pudo conectar con Ollama en localhost:11434.";
    if (err.name === "AbortError") {
      msg = "Tiempo de espera agotado al intentar contactar localhost:11434.";
    }
    return {
      isRunning: false,
      host: normalizedHost,
      models: [],
      error: msg,
    };
  }
}

/**
 * Genera texto localmente mediante /api/generate de Ollama sin streaming.
 */
export async function generateOllamaCompletion(
  prompt: string,
  options?: {
    model?: string;
    systemPrompt?: string;
    host?: string;
    temperature?: number;
  }
): Promise<string> {
  const host = (options?.host || DEFAULT_OLLAMA_HOST).trim().replace(/\/+$/, "");
  const model = options?.model || "llama3.2";

  const body: Record<string, any> = {
    model,
    prompt,
    stream: false,
    options: {
      temperature: options?.temperature ?? 0.7,
    },
  };

  if (options?.systemPrompt) {
    body.system = options.systemPrompt;
  }

  const response = await fetch(`${host}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Error en Ollama generate: HTTP ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.response || "";
}
