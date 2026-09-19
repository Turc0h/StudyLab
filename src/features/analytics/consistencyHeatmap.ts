import type { StudySessionRecord, ReviewLogRecord } from "../../db/db";

export type ActivityIntensity = 0 | 1 | 2 | 3 | 4;

export interface DailyActivity {
  dateStr: string; // YYYY-MM-DD
  timestamp: number;
  dayOfWeek: number; // 0: Domingo, 1: Lunes, ..., 6: Sábado
  studyMinutes: number;
  sessionsCount: number;
  cardsReviewed: number;
  intensity: ActivityIntensity;
}

export interface ConsistencyStats {
  currentStreak: number;
  longestStreak: number;
  totalStudyDays: number;
  totalStudyMinutes: number;
  totalSessions: number;
  totalCardsReviewed: number;
  averageMinutesPerActiveDay: number;
  consistencyPercentage: number;
}

export interface HeatmapGridData {
  weeks: Array<{
    weekIndex: number;
    days: (DailyActivity | null)[];
  }>;
  stats: ConsistencyStats;
  startDate: string;
  endDate: string;
}

/**
 * Normalizes a timestamp or Date to YYYY-MM-DD local string
 */
export function formatDateKey(date: Date | number): string {
  const d = typeof date === "number" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Determines cognitive intensity level (0 to 4) based on total study minutes
 */
export function getIntensityLevel(minutes: number, cardsCount: number = 0): ActivityIntensity {
  if (minutes <= 0 && cardsCount <= 0) return 0;
  if (minutes < 15 && cardsCount < 10) return 1; // Ligero
  if (minutes < 45 && cardsCount < 30) return 2; // Moderado
  if (minutes < 90 && cardsCount < 70) return 3; // Profundo / Deep Work
  return 4; // Titán / Hiperfoco
}

/**
 * Generates the full 52-week activity grid and aggregates session and review data
 */
export function generateConsistencyHeatmap(
  sessions: StudySessionRecord[] = [],
  reviewLogs: ReviewLogRecord[] = [],
  endDateRef: Date = new Date(),
): HeatmapGridData {
  const end = new Date(endDateRef);
  end.setHours(23, 59, 59, 999);

  // 52 weeks = 364 days minimum
  // Start from Sunday of 52 weeks ago
  const start = new Date(end);
  start.setDate(end.getDate() - 364);
  start.setHours(0, 0, 0, 0);

  // Align start to the preceding Sunday
  const startDay = start.getDay(); // 0 = Sunday
  start.setDate(start.getDate() - startDay);

  // Map of dateKey -> aggregated metrics
  const activityMap = new Map<string, { minutes: number; sessions: number; cards: number }>();

  // Process study sessions
  for (const session of sessions) {
    if (!session.startedAt) continue;
    const dateKey = formatDateKey(session.startedAt);
    const existing = activityMap.get(dateKey) || { minutes: 0, sessions: 0, cards: 0 };
    const durationMin = Math.max(1, Math.round((session.durationSec || 0) / 60));
    existing.minutes += durationMin;
    existing.sessions += 1;
    activityMap.set(dateKey, existing);
  }

  // Process FSRS review logs
  for (const log of reviewLogs) {
    if (!log.reviewTimestamp) continue;
    const dateKey = formatDateKey(log.reviewTimestamp);
    const existing = activityMap.get(dateKey) || { minutes: 0, sessions: 0, cards: 0 };
    existing.cards += 1;
    // If no session duration was logged, estimate ~20 seconds per card
    if (existing.sessions === 0) {
      existing.minutes += Math.round(20 / 60);
    }
    activityMap.set(dateKey, existing);
  }

  // Build grid days
  const allDays: DailyActivity[] = [];
  const current = new Date(start);

  while (current <= end) {
    const dateKey = formatDateKey(current);
    const data = activityMap.get(dateKey) || { minutes: 0, sessions: 0, cards: 0 };
    const intensity = getIntensityLevel(data.minutes, data.cards);

    allDays.push({
      dateStr: dateKey,
      timestamp: current.getTime(),
      dayOfWeek: current.getDay(),
      studyMinutes: data.minutes,
      sessionsCount: data.sessions,
      cardsReviewed: data.cards,
      intensity,
    });

    current.setDate(current.getDate() + 1);
  }

  // Calculate streaks and stats
  const stats = calculateConsistencyStats(allDays);

  // Group into weeks of 7 days (Sunday to Saturday)
  const weeks: Array<{ weekIndex: number; days: (DailyActivity | null)[] }> = [];
  let currentWeekDays: (DailyActivity | null)[] = [];
  let weekIndex = 0;

  for (const day of allDays) {
    currentWeekDays.push(day);
    if (currentWeekDays.length === 7) {
      weeks.push({ weekIndex, days: currentWeekDays });
      weekIndex++;
      currentWeekDays = [];
    }
  }

  if (currentWeekDays.length > 0) {
    while (currentWeekDays.length < 7) {
      currentWeekDays.push(null);
    }
    weeks.push({ weekIndex, days: currentWeekDays });
  }

  return {
    weeks,
    stats,
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
  };
}

/**
 * Computes consecutive days streaks and aggregate performance indicators
 */
export function calculateConsistencyStats(days: DailyActivity[]): ConsistencyStats {
  let longestStreak = 0;
  let tempStreak = 0;
  let totalStudyDays = 0;
  let totalStudyMinutes = 0;
  let totalSessions = 0;
  let totalCardsReviewed = 0;

  for (const day of days) {
    totalStudyMinutes += day.studyMinutes;
    totalSessions += day.sessionsCount;
    totalCardsReviewed += day.cardsReviewed;

    const isActive = day.intensity > 0;
    if (isActive) {
      totalStudyDays++;
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  // Compute current streak from the end backwards
  let currentStreak = 0;
  const todayKey = formatDateKey(new Date());

  // Search backwards
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    const isActive = day.intensity > 0;

    // Check if the last day is today or yesterday
    if (i === days.length - 1 && !isActive) {
      if (day.dateStr === todayKey) {
        // Today has no activity yet, check yesterday
        continue;
      } else {
        // Inactive and past today
        break;
      }
    }

    if (isActive) {
      currentStreak++;
    } else {
      break;
    }
  }

  const averageMinutesPerActiveDay = totalStudyDays > 0 ? Math.round(totalStudyMinutes / totalStudyDays) : 0;
  const totalCalendarDays = days.length || 365;
  const consistencyPercentage = Math.round((totalStudyDays / totalCalendarDays) * 100);

  return {
    currentStreak,
    longestStreak,
    totalStudyDays,
    totalStudyMinutes,
    totalSessions,
    totalCardsReviewed,
    averageMinutesPerActiveDay,
    consistencyPercentage,
  };
}
