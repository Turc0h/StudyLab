import { db, type CardFsrsRecord } from "../../db/db";

export interface LoadBalanceStats {
  cardsModified: number;
  message: string;
}

/**
 * Pospone tarjetas vencidas o programadas agregando N días a su dueDate,
 * preservando la estabilidad y dificultad FSRS.
 */
export async function postponeReviews(
  days: number,
  maxCards?: number,
): Promise<LoadBalanceStats> {
  const now = Date.now();
  const shiftMs = days * 24 * 60 * 60 * 1000;

  // Tomamos tarjetas vencidas o que vencen hoy
  let query = db.cardsFsrs.where("dueDate").belowOrEqual(now);
  let cards = await query.toArray();

  if (maxCards && cards.length > maxCards) {
    cards = cards.slice(0, maxCards);
  }

  if (cards.length === 0) {
    return { cardsModified: 0, message: "No hay tarjetas vencidas para posponer." };
  }

  await db.transaction("rw", db.cardsFsrs, async () => {
    for (const card of cards) {
      await db.cardsFsrs.update(card.id, {
        dueDate: now + shiftMs + Math.floor(Math.random() * 3600000), // Con pequeño jitter de 1h
      });
    }
  });

  return {
    cardsModified: cards.length,
    message: `Se pospusieron ${cards.length} tarjeta(s) por ${days} día(s).`,
  };
}

/**
 * Adelanta tarjetas que vencen en los próximos N días para que el alumno pueda repasarlas hoy.
 */
export async function advanceReviews(
  daysAhead = 2,
  maxCards = 20,
): Promise<LoadBalanceStats> {
  const now = Date.now();
  const threshold = now + daysAhead * 24 * 60 * 60 * 1000;

  // Tarjetas que vencen en el futuro inmediato (entre ahora y threshold)
  const cards = await db.cardsFsrs
    .where("dueDate")
    .between(now, threshold, false, true)
    .limit(maxCards)
    .toArray();

  if (cards.length === 0) {
    return { cardsModified: 0, message: "No hay tarjetas futuras para adelantar en esa ventana." };
  }

  await db.transaction("rw", db.cardsFsrs, async () => {
    for (const card of cards) {
      await db.cardsFsrs.update(card.id, {
        dueDate: now - 60000, // Vence inmediatamente
      });
    }
  });

  return {
    cardsModified: cards.length,
    message: `Se adelantaron ${cards.length} tarjeta(s) para repasar hoy.`,
  };
}

/**
 * Balancea la carga de tarjetas entre días adyacentes para aplanar picos.
 * Si un día supera el límite `targetMaxPerDay`, redistribuye el exceso a los días anterior o posterior.
 */
export async function balanceLoad(
  windowDays = 14,
  targetMaxPerDay = 35,
): Promise<LoadBalanceStats> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const horizon = now + windowDays * dayMs;

  const cards = await db.cardsFsrs
    .where("dueDate")
    .between(now, horizon, true, true)
    .toArray();

  if (cards.length === 0) {
    return { cardsModified: 0, message: "No hay tarjetas en la ventana de balanceo." };
  }

  // Agrupar tarjetas por índice de día relativo (0..windowDays-1)
  const buckets: CardFsrsRecord[][] = Array.from({ length: windowDays }, () => []);

  for (const card of cards) {
    const dayIndex = Math.min(windowDays - 1, Math.max(0, Math.floor((card.dueDate - now) / dayMs)));
    buckets[dayIndex].push(card);
  }

  let modifiedCount = 0;

  await db.transaction("rw", db.cardsFsrs, async () => {
    for (let day = 0; day < windowDays; day++) {
      if (buckets[day].length > targetMaxPerDay) {
        const excess = buckets[day].splice(targetMaxPerDay);
        // Distribuir el exceso en días vecinos con menor carga
        for (const card of excess) {
          // Buscar el vecino más cercano con menor carga
          let targetDay = day + 1 < windowDays ? day + 1 : day - 1;
          if (day > 0 && buckets[day - 1].length < buckets[day + 1]?.length) {
            targetDay = day - 1;
          }

          if (targetDay >= 0 && targetDay < windowDays) {
            buckets[targetDay].push(card);
            const newDue = now + targetDay * dayMs + Math.floor(Math.random() * (12 * 3600000));
            await db.cardsFsrs.update(card.id, { dueDate: newDue });
            modifiedCount++;
          }
        }
      }
    }
  });

  return {
    cardsModified: modifiedCount,
    message: modifiedCount > 0
      ? `Se redistribuyeron ${modifiedCount} tarjeta(s) aplanando los picos de la semana.`
      : "La carga de estudio ya se encuentra perfectamente distribuida.",
  };
}

/**
 * Aplica la política de 'Días Fáciles' (Easy Days).
 * Ejemplo: easyDaysMap = { 2: 0.3 } -> los Martes (día 2) se reduce la carga al 30% trasladando el 70% restante.
 */
export async function applyEasyDays(
  easyDaysMap: Record<number, number>, // dayOfWeek (0..6) -> factor (0..1)
  windowDays = 21,
): Promise<LoadBalanceStats> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const horizon = now + windowDays * dayMs;

  const cards = await db.cardsFsrs
    .where("dueDate")
    .between(now, horizon, true, true)
    .toArray();

  let shifted = 0;

  await db.transaction("rw", db.cardsFsrs, async () => {
    for (const card of cards) {
      const cardDate = new Date(card.dueDate);
      const dayOfWeek = cardDate.getDay();
      const factor = easyDaysMap[dayOfWeek];

      if (factor !== undefined && factor < 1.0) {
        // Con probabilidad (1 - factor), trasladamos la tarjeta al día siguiente
        if (Math.random() > factor) {
          const nextDayDue = card.dueDate + dayMs;
          await db.cardsFsrs.update(card.id, { dueDate: nextDayDue });
          shifted++;
        }
      }
    }
  });

  return {
    cardsModified: shifted,
    message: `Días fáciles aplicados: ${shifted} tarjeta(s) trasladadas desde tus días intensos de cursada.`,
  };
}

/**
 * Dispersa tarjetas hermanas (que pertenecen al mismo concepto o tema)
 * para evitar que aparezcan juntas en la misma tanda de repaso.
 */
export async function disperseSiblings(): Promise<LoadBalanceStats> {
  const cards = await db.cardsFsrs.toArray();
  const conceptGroups = new Map<string, CardFsrsRecord[]>();

  for (const c of cards) {
    if (c.conceptId) {
      const list = conceptGroups.get(c.conceptId) || [];
      list.push(c);
      conceptGroups.set(c.conceptId, list);
    }
  }

  const dayMs = 24 * 60 * 60 * 1000;
  let dispersed = 0;

  await db.transaction("rw", db.cardsFsrs, async () => {
    for (const [_conceptId, siblings] of conceptGroups.entries()) {
      if (siblings.length <= 1) continue;

      // Ordenar por dueDate
      siblings.sort((a, b) => a.dueDate - b.dueDate);

      for (let i = 1; i < siblings.length; i++) {
        const prev = siblings[i - 1];
        const curr = siblings[i];

        // Si vencen en el mismo lapso de 18 horas, desfasar la segunda 1 o 2 días
        if (Math.abs(curr.dueDate - prev.dueDate) < 18 * 3600000) {
          const offsetDays = (i % 2 === 0 ? 1 : 2) * dayMs;
          await db.cardsFsrs.update(curr.id, { dueDate: curr.dueDate + offsetDays });
          curr.dueDate += offsetDays;
          dispersed++;
        }
      }
    }
  });

  return {
    cardsModified: dispersed,
    message: `Se dispersaron ${dispersed} tarjetas hermanas para evitar interferencia asociativa.`,
  };
}
