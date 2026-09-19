/**
 * Servicio de detección ética de entorno y contexto de escritorio para StudyLab.
 * Fase 5 del Motor de Contexto (Context Engine).
 * 
 * Principios:
 * - 100% Local: Cero keylogging, cero telemetría externa.
 * - Lista blanca estricta: Solo se consultan procesos explícitamente autorizados por el estudiante.
 * - Fallback seguro para entorno Web / Demostración.
 */

export interface DetectedStudyApp {
  process_name: string;
  display_name: string;
  category: string;
  suggested_profile: "logical-depth" | "memory-fortress" | "divergent-synthesis" | "exam-simulation";
}

export interface StudyEnvironmentReport {
  detectedApps: DetectedStudyApp[];
  suggestedProfile: "logical-depth" | "memory-fortress" | "divergent-synthesis" | "exam-simulation";
  profileName: string;
  confidence: number;
  reason: string;
  isDesktopNative: boolean;
  recommendedMethods: Array<{
    id: string;
    name: string;
    description: string;
  }>;
}

export const CANONICAL_STUDY_WHITELIST = [
  // Programación & Lógica
  "code.exe", "cursor.exe", "rstudio.exe", "pycharm64.exe", "matlab.exe", "texstudio.exe",
  // Documentos & Lectura
  "sumatrapdf.exe", "acrord32.exe", "acrobat.exe", "calibre.exe", "okular.exe", "zotero.exe",
  // Notas & Síntesis
  "obsidian.exe", "notion.exe", "winword.exe", "onenote.exe", "logseq.exe", "typora.exe",
  // Evaluación & Tarjetas
  "anki.exe", "speedcrunch.exe"
];

export const PROFILE_METADATA = {
  "logical-depth": {
    name: "Profundidad Lógica & Deducción",
    badge: "Razonamiento Profundo",
    color: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    methods: [
      { id: "feynman", name: "Técnica Feynman", description: "Explicación en lenguaje simple para detectar lagunas lógicas." },
      { id: "problem-based-learning", name: "Aprendizaje Basado en Problemas", description: "Dilemas de cátedra con hechos vs incógnitas." },
      { id: "concept-maps", name: "Mapas Conceptuales Novakianos", description: "Proposiciones semánticas y jerarquías causales." },
      { id: "elaborative-interrogation", name: "Interrogación Elaborativa", description: "Formulación sistemática del '¿Por qué?' causal." }
    ]
  },
  "memory-fortress": {
    name: "Fortaleza Mnemotécnica & Evocación",
    badge: "Fijación a Largo Plazo",
    color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    methods: [
      { id: "leitner", name: "Cajas de Leitner", description: "Graduación en 5 compartimentos de repaso espaciado." },
      { id: "spaced-repetition", name: "Repaso Espaciado (FSRS)", description: "Algoritmo adaptativo con optimización de intervalos." },
      { id: "method-of-loci", name: "Palacio de la Memoria", description: "Anclaje espacial en locaciones familiares." },
      { id: "story-method", name: "Método del Relato", description: "Encadenamiento visual hiperbólico y drill de evocación." }
    ]
  },
  "divergent-synthesis": {
    name: "Síntesis Divergente & Estructura",
    badge: "Segundo Cerebro",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    methods: [
      { id: "zettelkasten", name: "Zettelkasten Académico", description: "Notas atómicas interconectadas bidireccionalmente." },
      { id: "cornell", name: "Método Cornell", description: "Notas estructuradas con señales, apuntes y síntesis." },
      { id: "dual-coding", name: "Codificación Dual", description: "Fusión sinérgica de texto analítico y diagramas espaciales." },
      { id: "mind-maps", name: "Mapas Mentales", description: "Esquemas radiales jerárquicos centrados en un nodo núcleo." }
    ]
  },
  "exam-simulation": {
    name: "Presión de Examen & Evaluación",
    badge: "Condiciones de Cátedra",
    color: "border-rose-500/30 bg-rose-500/10 text-rose-400",
    methods: [
      { id: "practice-testing", name: "Simulacros de Examen", description: "Pruebas cronometradas bajo presión con rúbrica." },
      { id: "pq4r", name: "Método PQ4R", description: "Protocolo analítico con fase nuclear de contraejemplos." },
      { id: "desirable-difficulties", name: "Dificultades Deseables", description: "Palancas de fricción deliberada contra la ilusión de saber." },
      { id: "blurting", name: "Blurting (Vaciado Mental)", description: "Escritura libre a ciegas y contraste de vacíos con FSRS." }
    ]
  }
};

/**
 * Comprueba si la aplicación está ejecutándose dentro del entorno nativo de escritorio Tauri v2.
 */
export function isTauriEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).__TAURI_INTERNALS__ ||
    (window as any).__TAURI__
  );
}

/**
 * Consulta de herramientas de estudio activas mediante el comando Tauri en Rust,
 * con fallback seguro en modo Web si se corre desde navegador.
 */
export async function detectActiveStudyTools(customWhitelist?: string[]): Promise<DetectedStudyApp[]> {
  if (isTauriEnvironment()) {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const apps = await invoke<DetectedStudyApp[]>("detect_active_study_tools", {
        customWhitelist: customWhitelist || null
      });
      return apps || [];
    } catch (err) {
      console.warn("[DesktopContext] Error al invocar detect_active_study_tools en Tauri:", err);
      return [];
    }
  }

  // Fallback simulado para entorno web / navegador
  return [];
}

/**
 * Genera el informe del entorno con cálculo de pesos y sugerencia de postura mental.
 */
export function analyzeEnvironmentReport(apps: DetectedStudyApp[]): StudyEnvironmentReport {
  const isDesktop = isTauriEnvironment();

  if (!apps || apps.length === 0) {
    // Si no se detectan herramientas abiertas, postura neutral de partida
    return {
      detectedApps: [],
      suggestedProfile: "logical-depth",
      profileName: PROFILE_METADATA["logical-depth"].name,
      confidence: 0.5,
      reason: isDesktop
        ? "No se detectaron herramientas de la lista blanca en ejecución. Modo predeterminado: Profundidad Lógica."
        : "Ejecutando en entorno Web. Las sugerencias de procesos del sistema requieren la aplicación de escritorio.",
      isDesktopNative: isDesktop,
      recommendedMethods: PROFILE_METADATA["logical-depth"].methods
    };
  }

  // Ponderación de perfiles según procesos detectados
  const counts: Record<string, number> = {
    "logical-depth": 0,
    "memory-fortress": 0,
    "divergent-synthesis": 0,
    "exam-simulation": 0
  };

  for (const app of apps) {
    if (counts[app.suggested_profile] !== undefined) {
      counts[app.suggested_profile]++;
    }
  }

  let topProfile: "logical-depth" | "memory-fortress" | "divergent-synthesis" | "exam-simulation" = "logical-depth";
  let maxCount = -1;

  for (const [prof, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      topProfile = prof as any;
    }
  }

  const confidence = Math.min(0.95, 0.6 + maxCount * 0.15);
  const appNames = apps.map((a) => a.display_name).join(", ");
  const reason = `Detectada(s) ${apps.length} herramienta(s) académica(s) activa(s): ${appNames}. Recomendamos activar ${PROFILE_METADATA[topProfile].name}.`;

  return {
    detectedApps: apps,
    suggestedProfile: topProfile,
    profileName: PROFILE_METADATA[topProfile].name,
    confidence,
    reason,
    isDesktopNative: isDesktop,
    recommendedMethods: PROFILE_METADATA[topProfile].methods
  };
}
