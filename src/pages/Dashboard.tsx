import { useLiveQuery } from "dexie-react-hooks";
import {
  CalendarClock,
  Flame,
  History,
  Plus,
  Repeat,
  Trash2,
  Cpu,
  BrainCircuit,
  Activity,
  Network,
  ArrowUpRight,
  GraduationCap,
  BookOpen,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Surface } from "../components/ui/Surface";
import { db } from "../db/db";
import { calculateAverageHalfLife, calculateIllusionOfCompetenceIndex } from "../features/fsrs/scheduler";
import {
  computeStreak,
  formatDueDate,
  formatRelativeDate,
  getTopSubjectRows,
  buildUpcomingDeadlines,
} from "../features/dashboard/stats";
import { generateId } from "../features/files/fileHelpers";
import { useGoogleCalendarEvents } from "../features/google-calendar/useGoogleCalendar";
import { getMethod } from "../features/session-engine/methods";
import { ConsistencyHeatmapCard } from "../features/analytics/ConsistencyHeatmapCard";
import { RetentionForecastCard } from "../features/analytics/RetentionForecastCard";

export function Dashboard() {
  const sessions =
    useLiveQuery(() => db.sessions.orderBy("startedAt").reverse().toArray(), []) ?? [];
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const deadlines = useLiveQuery(() => db.deadlines.orderBy("dueDate").toArray(), []) ?? [];
  const fsrsCards = useLiveQuery(() => db.cardsFsrs.toArray(), []) ?? [];
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray(), []) ?? [];
  const concepts = useLiveQuery(() => db.concepts.toArray(), []) ?? [];
  const academicSources = useLiveQuery(() => db.academicSources.toArray(), []) ?? [];
  const calendarEvents = useGoogleCalendarEvents(true);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const streak = computeStreak(sessions);
  const avgHalfLife = calculateAverageHalfLife(fsrsCards);
  const iciData = calculateIllusionOfCompetenceIndex(reviewLogs);

  const subjectRows = getTopSubjectRows(sessions, folders, 4);
  const recent = sessions.slice(0, 4);
  const upcoming = buildUpcomingDeadlines(deadlines, calendarEvents, Date.now(), 4);

  async function handleAddDeadline() {
    if (!newTitle.trim() || !newDate) return;
    const [y, m, d] = newDate.split("-").map(Number);
    const dueDate = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

    await db.deadlines.add({
      id: generateId(),
      title: newTitle.trim(),
      dueDate,
      subjectFolderId: null,
      source: "manual",
    });
    setNewTitle("");
    setNewDate("");
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <PageHeader
        eyebrow="Panorama general"
        title="Dashboard"
        description="Atril de control diario: racha, avance por cátedra y telemetría de retención FSRS."
        action={
          <Link
            to="/methods?run=cram"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-border-hairline bg-bg-surface-2 text-text-primary hover:bg-bg-surface-3 font-mono text-xs font-medium transition-colors"
          >
            <Flame size={14} className="text-text-secondary" />
            <span>Repaso Blitz Pre-Examen</span>
          </Link>
        }
      />

      {/* Atril de Control Diario — Telemetría Honesta de Memoria */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Estabilidad de Memoria (Vida Media) */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 relative overflow-hidden border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Estabilidad de Memoria (t½)
            </span>
            <Cpu size={16} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-3xl font-bold tabular-nums text-text-primary">
              {avgHalfLife > 0 ? avgHalfLife : "—"}
            </p>
            <span className="font-mono text-xs text-text-secondary">días</span>
          </div>
          <p className="text-xs font-sans text-text-tertiary">
            {avgHalfLife > 0
              ? `Tiempo medio para decaimiento al 50% de retención sobre ${fsrsCards.length} conceptos FSRS.`
              : "Calculado a partir de las revisiones FSRS. Completa repasos para proyectar estabilidad."}
          </p>
        </Surface>

        {/* Calibración Metacognitiva */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 relative overflow-hidden border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Calibración Metacognitiva
            </span>
            <Activity size={16} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-3xl font-bold tabular-nums text-text-primary">
              {iciData.indexPct}%
            </p>
            <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary">
              {iciData.level === "high" ? "Riesgo Alto" : iciData.level === "moderate" ? "Moderado" : "Calibrado"}
            </span>
          </div>
          <p className="text-xs font-sans text-text-tertiary">
            {iciData.level === "high"
              ? "Divergencia entre confianza subjetiva y fallas reales. Se sugiere entrelazado."
              : "Calibración óptima entre velocidad de respuesta y tasa real de retención."}
          </p>
        </Surface>

        {/* Acceso Rápido al Ecosistema Académico */}
        <Surface padding="md" glass={false} className="flex flex-col justify-between gap-3 border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-xs text-text-secondary font-medium">
                Atril Académico
              </span>
              <BrainCircuit size={16} strokeWidth={1.5} className="text-text-tertiary" />
            </div>
            <p className="text-xs font-serif font-bold text-text-primary">Centro de Control Cognitivo</p>
            <p className="text-xs font-sans text-text-tertiary mt-0.5">
              {concepts.length} conceptos activos en el Grafo Causal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-hairline">
            <Link
              to="/academic"
              className="flex-1 min-w-[110px] text-center py-1.5 px-2 rounded-lg bg-bg-surface-2 hover:bg-bg-surface-3 border border-border-hairline text-text-primary font-mono text-xs flex items-center justify-center gap-1 transition-colors"
            >
              Academic Hub <GraduationCap size={13} />
            </Link>
            <Link
              to="/methods"
              className="flex-1 min-w-[90px] text-center py-1.5 px-2 rounded-lg bg-text-primary text-text-inverted font-mono text-xs font-medium flex items-center justify-center gap-1 transition-colors"
            >
              Estudiar <ArrowUpRight size={13} />
            </Link>
            <Link
              to="/graph"
              className="flex-1 min-w-[75px] text-center py-1.5 px-2 rounded-lg bg-bg-surface-2 text-text-secondary hover:text-text-primary border border-border-hairline font-mono text-xs flex items-center justify-center gap-1 transition-colors"
            >
              Grafo <Network size={13} />
            </Link>
          </div>
          {academicSources.length > 0 && (
            <div className="text-[10px] font-mono text-text-tertiary flex items-center gap-1">
              <BookOpen size={12} className="text-text-tertiary" />
              <span>{academicSources.length} textos universitarios indexados con Citation-First RAG</span>
            </div>
          )}
        </Surface>
      </div>

      {/* Matriz Anual de Consistencia y Pronóstico de Retención FSRS a 365 Días */}
      <div className="space-y-4">
        <ConsistencyHeatmapCard />
        <RetentionForecastCard />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Continuidad de Estudio */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Continuidad de Estudio
            </span>
            <Flame
              size={16}
              strokeWidth={1.5}
              className={streak > 0 ? "text-text-primary" : "text-text-tertiary"}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-serif text-3xl font-bold tabular-nums text-text-primary">
              {streak}
            </p>
            <span className="font-mono text-xs text-text-secondary">días</span>
          </div>
          <p className="text-xs font-sans text-text-tertiary">
            {streak > 0
              ? `${streak} día${streak === 1 ? "" : "s"} seguidos de estudio activo.`
              : "Completa una sesión hoy para iniciar tu registro de constancia."}
          </p>
        </Surface>

        {/* Dominio por Cátedra */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Dominio por Cátedra
            </span>
            <Repeat size={16} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          {subjectRows.length === 0 ? (
            <p className="text-xs font-sans text-text-tertiary">
              No hay materias con sesiones registradas todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {subjectRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-xs">
                  <span className="text-text-primary font-medium font-serif">{row.name}</span>
                  <span className="font-mono text-[11px] rounded border border-border-hairline bg-bg-surface-2 px-1.5 py-0.5 text-text-secondary">
                    {row.count} {row.count === 1 ? "sesión" : "sesiones"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        {/* Bitácora de Sesiones Recientes */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Bitácora de Sesiones Recientes
            </span>
            <History size={16} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          {recent.length === 0 ? (
            <p className="text-xs font-sans text-text-tertiary">
              Tus últimas sesiones de estudio van a aparecer acá.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-xs">
                  <span className="text-text-primary font-medium font-serif">
                    {getMethod(s.methodId)?.name ?? s.methodId}
                  </span>
                  <span className="font-mono text-[11px] text-text-tertiary">
                    {formatRelativeDate(s.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        {/* Mesas de Examen y Vencimientos */}
        <Surface padding="md" glass={false} className="flex flex-col gap-3 border border-border-hairline bg-bg-surface-1 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs text-text-secondary font-medium">
              Mesas de Examen y Vencimientos
            </span>
            <CalendarClock size={16} strokeWidth={1.5} className="text-text-tertiary" />
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs font-sans text-text-tertiary">
              Carga una fecha de examen o conecta Google Calendar en Configuración.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((d) => (
                <div key={d.id} className="group flex items-center justify-between gap-2 text-xs">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {!d.fromCalendar && (
                      <button
                        type="button"
                        title="Eliminar vencimiento"
                        onClick={() => void db.deadlines.delete(d.id)}
                        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-red-400 text-text-tertiary cursor-pointer"
                      >
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    )}
                    <span className="truncate text-text-primary font-serif">
                      {d.title}
                      {d.fromCalendar && (
                        <span className="ml-1.5 font-mono text-[10px] text-text-tertiary">· Calendar</span>
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-[11px] text-text-secondary">
                    {formatDueDate(d.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border-hairline pt-3">
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
              className="text-xs font-mono"
            >
              <Plus size={14} strokeWidth={1.5} />
              Agregar fecha de examen
            </Button>
          </div>
        </Surface>
      </div>
    </div>
  );
}
