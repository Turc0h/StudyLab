import { db } from "../../db/db";
import { calculateRetrievability } from "./fsrsModel";

export interface DayForecast {
  dateStr: string;
  dayName: string;
  cardCount: number;
  isPeak: boolean;
  dayOfWeek: number;
}

export interface DecayingConceptItem {
  conceptId: string;
  conceptName: string;
  currentRetention: number;
  lapseCount: number;
  urgency: "alta" | "media";
}

export interface RetentionOverview {
  trueRetention: number; // 0..100
  targetRetention: number; // 90
  divergence: number; // true - target
  matureReviewsCount: number;
  totalLogsCount: number;
  overdueCardsCount: number;
  fourteenDayForecast: DayForecast[];
  decayingConcepts: DecayingConceptItem[];
  weeklyHeatmap: Array<{ dateStr: string; count: number }>;
  optimizationStatus: {
    eligible: boolean;
    logsCount: number;
    threshold: number;
    description: string;
  };
}

const DAY_NAMES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Genera las métricas puras y honestas de retención FSRS a partir de reviewLogs y cardsFsrs.
 */
export async function getRetentionOverview(): Promise<RetentionOverview> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // 1. Logs de repaso
  const logs = await db.reviewLogs.toArray();
  const totalLogsCount = logs.length;

  // Filtrar repasos maduros (estabilidad previa > 3 o estado de repaso)
  const matureLogs = logs.filter(
    (l) => l.stateBefore === "review" || (l.stabilityBefore && l.stabilityBefore > 3.0),
  );

  let trueRetention = 90; // Default baseline si no hay logs aún
  if (matureLogs.length > 0) {
    const remembered = matureLogs.filter((l) => l.rating >= 2).length;
    trueRetention = Math.round((remembered / matureLogs.length) * 100);
  }

  const targetRetention = 90;
  const divergence = trueRetention - targetRetention;

  // 2. Tarjetas FSRS y Pronóstico a 14 Días
  const cards = await db.cardsFsrs.toArray();
  const overdueCardsCount = cards.filter((c) => c.dueDate <= now).length;

  const fourteenDayForecast: DayForecast[] = [];
  const targetThreshold = 35;

  for (let i = 0; i < 14; i++) {
    const dayStart = new Date(now + i * dayMs);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart.getTime() + dayMs);

    const count = cards.filter(
      (c) => c.dueDate >= dayStart.getTime() && c.dueDate < dayEnd.getTime(),
    ).length;

    const dayOfWeek = dayStart.getDay();
    const dateStr = `${dayStart.getDate()}/${dayStart.getMonth() + 1}`;

    fourteenDayForecast.push({
      dateStr,
      dayName: DAY_NAMES[dayOfWeek],
      cardCount: count,
      isPeak: count > targetThreshold,
      dayOfWeek,
    });
  }

  // 3. Conceptos en caída de retención
  const concepts = await db.concepts.toArray();
  const decayingConcepts: DecayingConceptItem[] = [];

  for (const concept of concepts) {
    const conceptCards = cards.filter((c) => c.conceptId === concept.id);
    if (conceptCards.length === 0) continue;

    let totalR = 0;
    let totalLapses = 0;
    for (const c of conceptCards) {
      totalLapses += c.lapses;
      const elapsed = c.lastReview ? (now - c.lastReview) / dayMs : 0;
      totalR += calculateRetrievability(elapsed, c.stability);
    }
    const avgR = totalR / conceptCards.length;

    if (avgR < 0.75 || totalLapses >= 3) {
      decayingConcepts.push({
        conceptId: concept.id,
        conceptName: concept.name,
        currentRetention: Math.round(avgR * 100),
        lapseCount: totalLapses,
        urgency: avgR < 0.6 || totalLapses >= 5 ? "alta" : "media",
      });
    }
  }

  // Ordenar los que cayeron más
  decayingConcepts.sort((a, b) => a.currentRetention - b.currentRetention);

  // 4. Mapa de actividad últimos 84 días (12 semanas)
  const eightyFourDaysAgo = now - 84 * dayMs;
  const recentLogs = logs.filter((l) => l.reviewTimestamp >= eightyFourDaysAgo);
  const dateCounts = new Map<string, number>();

  for (const log of recentLogs) {
    const d = new Date(log.reviewTimestamp);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    dateCounts.set(key, (dateCounts.get(key) || 0) + 1);
  }

  const weeklyHeatmap: Array<{ dateStr: string; count: number }> = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(now - i * dayMs);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weeklyHeatmap.push({
      dateStr: key,
      count: dateCounts.get(key) || 0,
    });
  }

  // 5. Estado de optimización de pesos FSRS (Sección 20-TER)
  const OPTIMIZATION_THRESHOLD = 400;
  const eligible = totalLogsCount >= OPTIMIZATION_THRESHOLD;
  let description = `Tenés ${totalLogsCount} de ${OPTIMIZATION_THRESHOLD} repasos registrados. Al alcanzar 400 repasos, los 19 pesos de FSRS se calibrarán con tu memoria real.`;
  if (eligible) {
    description = `Historial suficiente (${totalLogsCount} repasos). El calibrador personal puede optimizar los intervalos adaptándose a tu velocidad de retención.`;
  }

  return {
    trueRetention,
    targetRetention,
    divergence,
    matureReviewsCount: matureLogs.length,
    totalLogsCount,
    overdueCardsCount,
    fourteenDayForecast,
    decayingConcepts: decayingConcepts.slice(0, 6),
    weeklyHeatmap,
    optimizationStatus: {
      eligible,
      logsCount: totalLogsCount,
      threshold: OPTIMIZATION_THRESHOLD,
      description,
    },
  };
}
