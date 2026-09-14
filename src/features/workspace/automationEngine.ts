/**
 * Internal IFTTT Event-Driven Automation Engine for StudyLab Cognitive OS
 *
 * Listens to telemetry events and triggers autonomic cognitive interventions:
 * - Fatigue spikes (> 75%) -> Suggests 5m micro-break & switches binaural to Alpha (10 Hz).
 * - Consecutive card lapses -> Recommends prerequisite concept in Knowledge Graph.
 * - Circadian night mode -> Warns against sleep deprivation and optimizes memory consolidation.
 */

export type AutomationEventType =
  | "FATIGUE_SPIKE"
  | "CONSECUTIVE_LAPSES"
  | "CIRCADIAN_NIGHT"
  | "HIGH_ILLUSION_INDEX";

export interface AutomationEvent {
  type: AutomationEventType;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: AutomationEventType;
  enabled: boolean;
  actionSummary: string;
}

export const DEFAULT_AUTOMATION_RULES: AutomationRule[] = [
  {
    id: "rule-fatigue-protection",
    name: "Protección Neuro-Fatiga",
    description: "Si el índice de fatiga supera el 75%, sugiere pausa de 5 min y sintoniza ondas Alfa.",
    triggerEvent: "FATIGUE_SPIKE",
    enabled: true,
    actionSummary: "Micro-descanso de 5m + Onda Alfa (10 Hz)",
  },
  {
    id: "rule-prereq-fallback",
    name: "Aislamiento de Lapsos Repetidos",
    description: "Si se detectan 3 fallas seguidas en una tarjeta, recomienda revisar su prerrequisito.",
    triggerEvent: "CONSECUTIVE_LAPSES",
    enabled: true,
    actionSummary: "Focalizar prerrequisito en Grafo",
  },
  {
    id: "rule-circadian-consolidation",
    name: "Protocolo Circadiano de Consolidación",
    description: "Pasadas las 23:00 hs, reduce contraste HUD y recomienda fijación por sueño de ondas lentas.",
    triggerEvent: "CIRCADIAN_NIGHT",
    enabled: true,
    actionSummary: "Atenuación HUD + Alerta sueño",
  },
  {
    id: "rule-illusion-mitigation",
    name: "Mitigación de Ilusión de Competencia",
    description: "Si el índice ICI supera el 65%, sugiere alternar con entrelazado adaptativo.",
    triggerEvent: "HIGH_ILLUSION_INDEX",
    enabled: true,
    actionSummary: "Sugerir modo Entrelazado",
  },
];

type EventHandler = (event: AutomationEvent) => void;

class WorkspaceAutomationBus {
  private handlers = new Map<AutomationEventType, Set<EventHandler>>();
  private rules: AutomationRule[] = [...DEFAULT_AUTOMATION_RULES];
  private toastListeners = new Set<(message: string, type: "info" | "warning" | "alert") => void>();

  constructor() {
    // Check circadian automatically
    setInterval(() => {
      this.checkCircadian();
    }, 60000);
  }

  public subscribe(type: AutomationEventType, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  public onToast(callback: (message: string, type: "info" | "warning" | "alert") => void): () => void {
    this.toastListeners.add(callback);
    return () => {
      this.toastListeners.delete(callback);
    };
  }

  public emitToast(message: string, type: "info" | "warning" | "alert" = "info") {
    this.toastListeners.forEach((fn) => fn(message, type));
  }

  public emit(type: AutomationEventType, payload: Record<string, unknown> = {}) {
    const matchingRule = this.rules.find((r) => r.triggerEvent === type && r.enabled);
    if (!matchingRule) return;

    const event: AutomationEvent = {
      type,
      payload,
      timestamp: Date.now(),
    };

    const listeners = this.handlers.get(type);
    if (listeners) {
      listeners.forEach((fn) => fn(event));
    }

    // Default automated interventions
    if (type === "FATIGUE_SPIKE") {
      this.emitToast(
        "⚠️ Fatiga Cognitiva Crítica (>75%): Se recomienda micro-descanso de 5 minutos y sintonizar ondas Alfa (10 Hz).",
        "alert",
      );
    } else if (type === "CONSECUTIVE_LAPSES") {
      this.emitToast(
        "🧠 3 Lapsos Consecutivos Detectados: El concepto base requiere refuerzo en el Grafo de Conocimiento.",
        "warning",
      );
    } else if (type === "CIRCADIAN_NIGHT") {
      this.emitToast(
        "🌙 Ventana Circadiana Nocturna: La memoria a largo plazo consolida durante el sueño profundo. No sobreentrenes.",
        "info",
      );
    } else if (type === "HIGH_ILLUSION_INDEX") {
      this.emitToast(
        "⚡ Riesgo de Ilusión de Competencia detectado: Las respuestas rápidas no coinciden con la estabilidad retenida. Activá Entrelazado.",
        "warning",
      );
    }
  }

  public getRules(): AutomationRule[] {
    return [...this.rules];
  }

  public toggleRule(id: string): void {
    this.rules = this.rules.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  private checkCircadian() {
    const hour = new Date().getHours();
    if (hour >= 23 || hour < 6) {
      this.emit("CIRCADIAN_NIGHT", { hour });
    }
  }
}

export const automationBus = new WorkspaceAutomationBus();
