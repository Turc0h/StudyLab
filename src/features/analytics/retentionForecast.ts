import type { CardFsrsRecord } from "../../db/db";
import { calculateRetrievability } from "../fsrs/fsrsModel";

export interface ForecastPoint {
  dayOffset: number;
  dateStr: string;
  averageRetention: number; // 0 to 1
  safeCardsCount: number; // >= 0.85
  moderateCardsCount: number; // 0.70 to 0.84
  vulnerableCardsCount: number; // < 0.70
}

export interface DeckRetentionForecast {
  totalCards: number;
  cardsWithStability: number;
  averageStabilityDays: number;
  targetHorizonDays: number;
  projectedRetentionAtHorizon: number; // e.g. at 90 days
  daysUntil80Percent: number | null;
  daysUntil70Percent: number | null;
  daysUntilHalfLife: number | null;
  curve: ForecastPoint[];
  milestones: {
    today: number;
    at7Days: number;
    at30Days: number;
    at60Days: number;
    at90Days: number;
    at180Days: number;
    at365Days: number;
  };
  recommendation: {
    severity: "good" | "warning" | "critical";
    title: string;
    message: string;
    suggestedReviewDay: number;
  };
}

/**
 * Standard milestone horizons in days
 */
export const DEFAULT_FORECAST_HORIZONS = [0, 3, 7, 14, 21, 30, 45, 60, 90, 120, 180, 270, 365];

/**
 * Calculates long-term memory decay projection based on FSRS stability distribution
 */
export function calculateDeckRetentionForecast(
  cards: CardFsrsRecord[],
  targetHorizonDays = 90,
  referenceDate = new Date(),
): DeckRetentionForecast {
  const validCards = cards.filter((c) => c && typeof c.stability === "number" && c.stability > 0);
  const totalCards = cards.length;
  const cardsWithStability = validCards.length;

  if (cardsWithStability === 0) {
    // Default fallback curve for empty or unreviewed decks
    const emptyCurve: ForecastPoint[] = DEFAULT_FORECAST_HORIZONS.map((d) => {
      const targetDate = new Date(referenceDate);
      targetDate.setDate(targetDate.getDate() + d);
      return {
        dayOffset: d,
        dateStr: targetDate.toISOString().split("T")[0],
        averageRetention: d === 0 ? 1.0 : Math.max(0.1, 1.0 - d * 0.005),
        safeCardsCount: 0,
        moderateCardsCount: 0,
        vulnerableCardsCount: 0,
      };
    });

    return {
      totalCards,
      cardsWithStability: 0,
      averageStabilityDays: 0,
      targetHorizonDays,
      projectedRetentionAtHorizon: 0.5,
      daysUntil80Percent: 40,
      daysUntil70Percent: 60,
      daysUntilHalfLife: 100,
      curve: emptyCurve,
      milestones: {
        today: 1.0,
        at7Days: 0.95,
        at30Days: 0.85,
        at60Days: 0.75,
        at90Days: 0.65,
        at180Days: 0.5,
        at365Days: 0.35,
      },
      recommendation: {
        severity: "warning",
        title: "Sin telemetría de memoria previa",
        message: "Repasá tus tarjetas con el algoritmo FSRS para activar predicciones de retención personalizadas.",
        suggestedReviewDay: 3,
      },
    };
  }

  const avgStability =
    validCards.reduce((acc, c) => acc + c.stability, 0) / cardsWithStability;

  // Generate continuous curve for milestone days
  const curve: ForecastPoint[] = DEFAULT_FORECAST_HORIZONS.map((dayOffset) => {
    const targetDate = new Date(referenceDate);
    targetDate.setDate(targetDate.getDate() + dayOffset);

    let sumR = 0;
    let safe = 0;
    let moderate = 0;
    let vulnerable = 0;

    for (const card of validCards) {
      // Days elapsed from last review plus future horizon
      const lastReview = card.lastReview || referenceDate.getTime();
      const pastDays = Math.max(0, (referenceDate.getTime() - lastReview) / (24 * 60 * 60 * 1000));
      const totalFutureDays = pastDays + dayOffset;
      const r = calculateRetrievability(totalFutureDays, card.stability);
      sumR += r;

      if (r >= 0.85) safe++;
      else if (r >= 0.70) moderate++;
      else vulnerable++;
    }

    const averageRetention = sumR / cardsWithStability;

    return {
      dayOffset,
      dateStr: targetDate.toISOString().split("T")[0],
      averageRetention,
      safeCardsCount: safe,
      moderateCardsCount: moderate,
      vulnerableCardsCount: vulnerable,
    };
  });

  // Helper to interpolate retention at arbitrary day
  const getRetentionAtDay = (day: number): number => {
    let sumR = 0;
    for (const card of validCards) {
      const lastReview = card.lastReview || referenceDate.getTime();
      const pastDays = Math.max(0, (referenceDate.getTime() - lastReview) / (24 * 60 * 60 * 1000));
      sumR += calculateRetrievability(pastDays + day, card.stability);
    }
    return sumR / cardsWithStability;
  };

  // Find threshold drop days via simulation (up to 365 days)
  let daysUntil80Percent: number | null = null;
  let daysUntil70Percent: number | null = null;
  let daysUntilHalfLife: number | null = null;

  for (let d = 1; d <= 365; d++) {
    const r = getRetentionAtDay(d);
    if (r < 0.80 && daysUntil80Percent === null) daysUntil80Percent = d;
    if (r < 0.70 && daysUntil70Percent === null) daysUntil70Percent = d;
    if (r < 0.50 && daysUntilHalfLife === null) daysUntilHalfLife = d;
    if (daysUntilHalfLife !== null) break;
  }

  const projectedRetentionAtHorizon = getRetentionAtDay(targetHorizonDays);

  const milestones = {
    today: getRetentionAtDay(0),
    at7Days: getRetentionAtDay(7),
    at30Days: getRetentionAtDay(30),
    at60Days: getRetentionAtDay(60),
    at90Days: getRetentionAtDay(90),
    at180Days: getRetentionAtDay(180),
    at365Days: getRetentionAtDay(365),
  };

  // Build recommendation
  let severity: "good" | "warning" | "critical" = "good";
  let title = "Retención Sólida de Largo Plazo";
  let message = `Tu estabilidad promedio es de ${Math.round(avgStability)} días. Tu curva se mantiene firme por encima del 80% para la fecha de examen.`;
  let suggestedReviewDay = Math.max(7, Math.floor((daysUntil80Percent || 60) * 0.7));

  if (projectedRetentionAtHorizon < 0.70) {
    severity = "critical";
    title = "Riesgo de Olvido Crítico Pre-Examen";
    message = `Si dejas de repasar hoy, tu retención caerá al ${Math.round(projectedRetentionAtHorizon * 100)}% en el horizonte de ${targetHorizonDays} días. Se recomienda una sesión de consolidación en los próximos días.`;
    suggestedReviewDay = Math.max(1, Math.floor((daysUntil80Percent || 14) * 0.5));
  } else if (projectedRetentionAtHorizon < 0.85) {
    severity = "warning";
    title = "Zona de Retención Moderada";
    message = `Tu retención al horizonte (${targetHorizonDays} días) se proyecta en ${Math.round(projectedRetentionAtHorizon * 100)}%. Un repaso breve antes del día ${suggestedReviewDay} blindará tu memoria.`;
  }

  return {
    totalCards,
    cardsWithStability,
    averageStabilityDays: Math.round(avgStability * 10) / 10,
    targetHorizonDays,
    projectedRetentionAtHorizon,
    daysUntil80Percent,
    daysUntil70Percent,
    daysUntilHalfLife,
    curve,
    milestones,
    recommendation: {
      severity,
      title,
      message,
      suggestedReviewDay,
    },
  };
}
