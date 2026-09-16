import { db, type ReviewLogRecord } from "../../db/db";

export type SelfReportFatigueRating = "well" | "struggling" | "exhausted";

export interface FatigueState {
  fatigueScore: number; // 0 to 100
  level: "low" | "moderate" | "high" | "critical";
  sessionDurationMinutes: number;
  averageLatencyMs: number;
  latencyIncreaseRatio: number;
  accuracyDropPercentage: number;
  recommendation: string;
  requiresBreak: boolean;
}

/**
 * Monitor Ético de Fatiga Cognitiva (Sección 26-BIS):
 * Reemplaza la telemetría invasiva de tecleo por tres señales éticas:
 * 1. Duración del bloque continuo.
 * 2. Evolución de la latencia de respuesta (latencyMs de reviewLogs).
 * 3. Caída de acierto intra-sesión (últimos 10 vs primeros 10).
 */
export async function calculateSessionFatigue(
  sessionStartTime: number,
  providedLogs?: ReviewLogRecord[]
): Promise<FatigueState> {
  const now = Date.now();
  const sessionDurationMinutes = Math.max(0, Math.round((now - sessionStartTime) / (1000 * 60)));

  let logs: ReviewLogRecord[] = providedLogs ?? [];
  if (!providedLogs) {
    try {
      logs = await db.reviewLogs
        .where("reviewTimestamp")
        .aboveOrEqual(sessionStartTime)
        .toArray();
    } catch {
      logs = [];
    }
  }

  let averageLatencyMs = 0;
  let latencyIncreaseRatio = 1.0;

  if (logs.length > 0) {
    const latencies = logs.map((l) => l.latencyMs || 0).filter((ms) => ms > 0);
    if (latencies.length > 0) {
      averageLatencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    }

    if (latencies.length >= 8) {
      const firstChunk = latencies.slice(0, 4);
      const lastChunk = latencies.slice(-4);
      const avgFirst = firstChunk.reduce((a, b) => a + b, 0) / firstChunk.length;
      const avgLast = lastChunk.reduce((a, b) => a + b, 0) / lastChunk.length;
      if (avgFirst > 0) {
        latencyIncreaseRatio = Number((avgLast / avgFirst).toFixed(2));
      }
    }
  }

  let accuracyDropPercentage = 0;
  if (logs.length >= 12) {
    const firstItems = logs.slice(0, 8);
    const lastItems = logs.slice(-8);

    const firstSuccessCount = firstItems.filter((l) => l.rating >= 3).length;
    const lastSuccessCount = lastItems.filter((l) => l.rating >= 3).length;

    const firstRate = firstSuccessCount / firstItems.length;
    const lastRate = lastSuccessCount / lastItems.length;

    if (firstRate > 0 && lastRate < firstRate) {
      accuracyDropPercentage = Math.round((1 - lastRate / firstRate) * 100);
    }
  }

  let timeScore = Math.min(80, (sessionDurationMinutes / 90) * 80);
  if (sessionDurationMinutes < 20) timeScore = 15;

  let latencyScore = 0;
  if (latencyIncreaseRatio > 1.3) {
    latencyScore = Math.min(25, (latencyIncreaseRatio - 1) * 35);
  }

  const accuracyScore = Math.min(25, (accuracyDropPercentage / 40) * 25);
  const rawFatigue = Math.min(100, Math.round(timeScore + latencyScore + accuracyScore));

  let level: "low" | "moderate" | "high" | "critical" = "low";
  let recommendation = "Nivel óptimo de concentración y rendimiento neurocognitivo.";
  let requiresBreak = false;

  if (rawFatigue >= 75) {
    level = "critical";
    recommendation =
      "Fatiga cognitiva alta detectada. Se recomienda una pausa de 10-15 minutos o finalizar la jornada para consolidar la memoria a largo plazo.";
    requiresBreak = true;
  } else if (rawFatigue >= 55) {
    level = "high";
    recommendation =
      "Tu tiempo de respuesta o tasa de retención inmediata está descendiendo. Tomate un micro-corte de 5 minutos.";
    requiresBreak = true;
  } else if (rawFatigue >= 35) {
    level = "moderate";
    recommendation = "Sesión en ritmo normal. Podés continuar o cambiar a un ejercicio más ligero.";
  }

  return {
    fatigueScore: rawFatigue,
    level,
    sessionDurationMinutes,
    averageLatencyMs,
    latencyIncreaseRatio,
    accuracyDropPercentage,
    recommendation,
    requiresBreak,
  };
}

export function recordSessionSelfReport(
  rating: SelfReportFatigueRating,
  durationMinutes: number
): void {
  try {
    const history = JSON.parse(localStorage.getItem("studylab_fatigue_selfreports") || "[]");
    history.push({
      timestamp: Date.now(),
      rating,
      durationMinutes,
    });
    localStorage.setItem("studylab_fatigue_selfreports", JSON.stringify(history.slice(-50)));
  } catch {
    // LocalStorage fallback
  }
}

export async function purgeLegacyFatigueTelemetry(): Promise<number> {
  try {
    const count = await db.fatigueTelemetry.count();
    await db.fatigueTelemetry.clear();
    return count;
  } catch (err) {
    console.error("Error purging legacy fatigue telemetry:", err);
    return 0;
  }
}
