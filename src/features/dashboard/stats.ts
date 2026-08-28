import type { StudySessionRecord } from "../../db/db";

function dateKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Días consecutivos (hasta hoy) con al menos una sesión. Si hoy todavía no estudiaste, no rompe la racha de ayer. */
export function computeStreak(sessions: StudySessionRecord[]): number {
  const days = new Set(sessions.map((s) => dateKey(s.startedAt)));
  const cursor = new Date();
  if (!days.has(dateKey(cursor.getTime()))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  let streak = 0;
  while (days.has(dateKey(cursor.getTime()))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function countBySubject(sessions: StudySessionRecord[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const s of sessions) {
    if (!s.subjectFolderId) continue;
    counts.set(s.subjectFolderId, (counts.get(s.subjectFolderId) ?? 0) + 1);
  }
  return counts;
}

export function formatRelativeDate(ts: number): string {
  const diffDays = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function formatDueDate(ts: number): string {
  const diffDays = Math.ceil((ts - Date.now()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return "Vencido";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  return `En ${diffDays} días`;
}
