import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, Flame, History, Plus, Repeat } from "lucide-react";
import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Surface } from "../components/ui/Surface";
import { db } from "../db/db";
import {
  computeStreak,
  countBySubject,
  formatDueDate,
  formatRelativeDate,
} from "../features/dashboard/stats";
import { generateId } from "../features/files/fileHelpers";
import { useGoogleCalendarEvents } from "../features/google-calendar/useGoogleCalendar";
import { getMethod } from "../features/session-engine/methods";

export function Dashboard() {
  const sessions =
    useLiveQuery(() => db.sessions.orderBy("startedAt").reverse().toArray(), []) ?? [];
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const deadlines = useLiveQuery(() => db.deadlines.orderBy("dueDate").toArray(), []) ?? [];
  const calendarEvents = useGoogleCalendarEvents(true);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const folderById = new Map(folders.map((f) => [f.id, f]));
  const streak = computeStreak(sessions);
  const subjectRows = Array.from(countBySubject(sessions).entries())
    .map(([id, count]) => ({ name: folderById.get(id)?.name ?? "Sin materia", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
  const recent = sessions.slice(0, 4);

  const upcoming = [
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
    .filter((d) => d.dueDate >= Date.now() - 24 * 60 * 60 * 1000)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 4);

  async function handleAddDeadline() {
    if (!newTitle.trim() || !newDate) return;
    await db.deadlines.add({
      id: generateId(),
      title: newTitle.trim(),
      dueDate: new Date(newDate).getTime(),
      subjectFolderId: null,
      source: "manual",
    });
    setNewTitle("");
    setNewDate("");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Panorama"
        title="Dashboard"
        description="Tu racha, el avance por materia y lo que se viene, todo en un mismo lugar."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Surface padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-text-primary">Racha</h3>
            <Flame
              size={18}
              strokeWidth={1.75}
              className={streak > 0 ? "text-warning" : "text-text-tertiary"}
            />
          </div>
          <p className="font-mono text-3xl tabular-nums text-text-primary">{streak}</p>
          <p className="text-sm text-text-secondary">
            {streak > 0
              ? `${streak} día${streak === 1 ? "" : "s"} seguidos estudiando.`
              : "Todavía no arrancaste una racha. Completá una sesión para empezar a sumar días."}
          </p>
        </Surface>

        <Surface padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              Vueltas por materia
            </h3>
            <Repeat size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {subjectRows.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No hay materias con sesiones registradas todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {subjectRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">{row.name}</span>
                  <span className="font-mono text-text-tertiary">{row.count}</span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        <Surface padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              Registro reciente
            </h3>
            <History size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Tus últimas sesiones de estudio van a aparecer acá.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary">
                    {getMethod(s.methodId)?.name ?? s.methodId}
                  </span>
                  <span className="text-xs text-text-tertiary">
                    {formatRelativeDate(s.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        <Surface padding="md" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-text-primary">
              Próximos vencimientos
            </h3>
            <CalendarClock size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-text-secondary">
              Cargá una fecha acá abajo, o conectá Google Calendar desde Configuración.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((d) => (
                <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-text-primary">
                    {d.title}
                    {d.fromCalendar && (
                      <span className="ml-1.5 text-xs text-text-tertiary">· Calendar</span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-warning">
                    {formatDueDate(d.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
            <div className="flex gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Parcial de Anatomía"
                />
              </div>
              <div className="w-36 shrink-0">
                <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} />
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleAddDeadline}
              disabled={!newTitle.trim() || !newDate}
            >
              <Plus size={14} strokeWidth={1.75} />
              Agregar vencimiento
            </Button>
          </div>
        </Surface>
      </div>
    </div>
  );
}
