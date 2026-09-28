import type { StudySessionRecord } from "../../db/db.ts";

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

export interface SubjectDominanceRow {
  name: string;
  count: number;
}

/**
 * Calcula el orden de materias por cantidad de sesiones completadas, resolviendo
 * nombres de carpetas y limitando a los principales resultados.
 */
export function getTopSubjectRows(
  sessions: StudySessionRecord[],
  folders: Array<{ id: string; name: string }>,
  limit = 4
): SubjectDominanceRow[] {
  const folderById = new Map(folders.map((f) => [f.id, f]));
  return Array.from(countBySubject(sessions).entries())
    .map(([id, count]) => ({ name: folderById.get(id)?.name ?? "Sin materia", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function formatRelativeDate(ts: number): string {
  const diffDays = Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000));
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return new Date(ts).toLocaleDateString("es-AR", { day: "2-digit", month: "short" });
}

export function formatDueDate(ts: number): string {
  const target = new Date(ts);
  const now = new Date();

  const targetMidnight = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const diffDays = Math.round((targetMidnight - todayMidnight) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return "Vencido";
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Mañana";
  return `En ${diffDays} días`;
}

export interface UpcomingDeadlineItem {
  id: string;
  title: string;
  dueDate: number;
  fromCalendar: boolean;
}

/**
 * Combina fechas de examen cargadas manualmente con eventos de Google Calendar,
 * descartando eventos vencidos hace más de 24 horas y ordenando cronológicamente.
 */
export function buildUpcomingDeadlines(
  deadlines: Array<{ id: string; title: string; dueDate: number }>,
  calendarEvents: Array<{ id: string; title: string; start: string | null }>,
  nowMs = Date.now(),
  limit = 4
): UpcomingDeadlineItem[] {
  return [
    ...deadlines.map((d) => ({
      id: d.id,
      title: d.title,
      dueDate: d.dueDate,
      fromCalendar: false,
    })),
    ...calendarEvents
      .filter((e) => e.start)
      .map((e) => ({
        id: e.id,
        title: e.title,
        dueDate: new Date(e.start as string).getTime(),
        fromCalendar: true,
      })),
  ]
    .filter((d) => d.dueDate >= nowMs - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, limit);
}
