import { useLiveQuery } from "dexie-react-hooks";
import { CalendarClock, Flame, History, Plus, Repeat, Trash2, Cpu, BrainCircuit, Activity, Network, ArrowUpRight, GraduationCap, BookOpen } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Surface } from "../components/ui/Surface";
import { db } from "../db/db";
import { calculateAverageHalfLife, calculateIllusionOfCompetenceIndex } from "../features/fsrs/scheduler";
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
  const fsrsCards = useLiveQuery(() => db.cardsFsrs.toArray(), []) ?? [];
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray(), []) ?? [];
  const concepts = useLiveQuery(() => db.concepts.toArray(), []) ?? [];
  const academicSources = useLiveQuery(() => db.academicSources.toArray(), []) ?? [];
  const calendarEvents = useGoogleCalendarEvents(true);

  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  const folderById = new Map(folders.map((f) => [f.id, f]));
  const streak = computeStreak(sessions);
  const avgHalfLife = calculateAverageHalfLife(fsrsCards);
  const iciData = calculateIllusionOfCompetenceIndex(reviewLogs);

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
        description="Tu racha, el avance por materia y la telemetría predictiva del Sistema Operativo Cognitivo."
      />

      {/* Cognitive OS Telemetry Hub */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Knowledge Half-Life */}
        <Surface padding="md" glass={true} className="flex flex-col gap-3 relative overflow-hidden border-accent-primary/20">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // VIDA_MEDIA_CONOCIMIENTO
            </span>
            <Cpu size={18} strokeWidth={1.75} className="text-accent-primary animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-3xl font-bold tabular-nums text-text-primary tracking-tight">
              {avgHalfLife > 0 ? avgHalfLife : "—"}
            </p>
            <span className="font-mono text-xs text-text-tertiary">DÍAS (t½)</span>
          </div>
          <p className="text-xs text-text-secondary">
            {avgHalfLife > 0
              ? `Tiempo medio para decaimiento al 50% de retención sobre ${fsrsCards.length} tarjetas FSRS.`
              : "Calculado a partir de las revisiones FSRS. Completá repasos para proyectar estabilidad."}
          </p>
        </Surface>

        {/* Illusion of Competence Index */}
        <Surface padding="md" glass={true} className="flex flex-col gap-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // ÍNDICE_ILUSIÓN_COMPETENCIA
            </span>
            <Activity size={18} strokeWidth={1.75} className={iciData.level === "high" ? "text-danger" : iciData.level === "moderate" ? "text-warning" : "text-success"} />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-3xl font-bold tabular-nums text-text-primary tracking-tight">
              {iciData.indexPct}%
            </p>
            <Badge variant={iciData.level === "high" ? "danger" : iciData.level === "moderate" ? "warning" : "success"}>
              {iciData.level === "high" ? "Riesgo Alto" : iciData.level === "moderate" ? "Moderado" : "Calibrado"}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary">
            {iciData.level === "high"
              ? "Divergencia crítica entre confianza subjetiva y fallas reales. Se sugiere entrelazado."
              : "Calibración metacognitiva óptima entre velocidad de respuesta y tasa de retención."}
          </p>
        </Surface>

        {/* Cognitive OS Quick Launcher */}
        <Surface padding="md" glass={true} className="flex flex-col justify-between gap-3 bg-linear-to-br from-bg-surface to-accent-primary/5 border-accent-primary/25">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="font-mono text-[10px] tracking-widest text-accent uppercase">
                // COGNITIVE_WORKSPACE_OS
              </span>
              <BrainCircuit size={18} strokeWidth={1.75} className="text-accent" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Centro de Control Cognitivo</p>
            <p className="text-xs text-text-tertiary mt-1">
              {concepts.length} conceptos activos en el Grafo Causal.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border-subtle/50">
            <Link
              to="/academic"
              className="flex-1 min-w-[120px] text-center py-1.5 px-2 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 border border-cyan-500/30 font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              Academic Hub <GraduationCap size={14} />
            </Link>
            <Link
              to="/workspace"
              className="flex-1 min-w-[100px] text-center py-1.5 px-2 rounded-lg bg-accent-primary/20 text-accent-primary hover:bg-accent-primary/30 font-mono text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
            >
              Workspace <ArrowUpRight size={14} />
            </Link>
            <Link
              to="/graph"
              className="flex-1 min-w-[80px] text-center py-1.5 px-2 rounded-lg bg-bg-surface-2 text-text-secondary hover:text-text-primary border border-border-subtle font-mono text-xs flex items-center justify-center gap-1 transition-colors"
            >
              Grafo <Network size={14} />
            </Link>
          </div>
          {academicSources.length > 0 && (
            <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <BookOpen size={12} className="text-cyan-400" />
              <span>{academicSources.length} textos universitarios indexados con Citation-First RAG</span>
            </div>
          )}
        </Surface>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Surface padding="md" glass={true} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // TELEMETRÍA_RACHA
            </span>
            <Flame
              size={18}
              strokeWidth={1.75}
              className={streak > 0 ? "text-warning drop-shadow-[0_0_8px_var(--color-warning)]" : "text-text-tertiary"}
            />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="font-mono text-4xl font-bold tabular-nums text-text-primary tracking-tight">
              {streak}
            </p>
            <span className="font-mono text-xs text-text-tertiary">DÍAS</span>
          </div>
          <p className="text-xs text-text-secondary">
            {streak > 0
              ? `${streak} día${streak === 1 ? "" : "s"} seguidos estudiando. Mantén el foco.`
              : "Todavía no arrancaste una racha. Completá una sesión para empezar a sumar días."}
          </p>
        </Surface>

        <Surface padding="md" glass={true} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // MÉTRICAS_MATERIAS
            </span>
            <Repeat size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {subjectRows.length === 0 ? (
            <p className="text-xs text-text-secondary">
              No hay materias con sesiones registradas todavía.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {subjectRows.map((row) => (
                <div key={row.name} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary font-medium">{row.name}</span>
                  <span className="font-mono text-xs rounded bg-bg-surface-2 px-1.5 py-0.5 text-accent">
                    {row.count} {row.count === 1 ? "sesión" : "sesiones"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        <Surface padding="md" glass={true} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // REGISTRO_RECIENTE
            </span>
            <History size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {recent.length === 0 ? (
            <p className="text-xs text-text-secondary">
              Tus últimas sesiones de estudio van a aparecer acá.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recent.map((s) => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <span className="text-text-primary font-medium">
                    {getMethod(s.methodId)?.name ?? s.methodId}
                  </span>
                  <span className="font-mono text-xs text-text-tertiary">
                    {formatRelativeDate(s.startedAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Surface>

        <Surface padding="md" glass={true} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-widest text-text-tertiary uppercase">
              // PRÓXIMOS_VENCIMIENTOS
            </span>
            <CalendarClock size={18} strokeWidth={1.75} className="text-accent" />
          </div>
          {upcoming.length === 0 ? (
            <p className="text-xs text-text-secondary">
              Cargá una fecha acá abajo, o conectá Google Calendar desde Configuración.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {upcoming.map((d) => (
                <div key={d.id} className="group flex items-center justify-between gap-2 text-sm">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {!d.fromCalendar && (
                      <button
                        type="button"
                        title="Eliminar vencimiento"
                        onClick={() => void db.deadlines.delete(d.id)}
                        className="opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:text-danger text-text-tertiary"
                      >
                        <Trash2 size={12} strokeWidth={1.75} />
                      </button>
                    )}
                    <span className="truncate text-text-primary">
                      {d.title}
                      {d.fromCalendar && (
                        <span className="ml-1.5 font-mono text-[10px] text-accent">· CALENDAR</span>
                      )}
                    </span>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-medium text-warning">
                    {formatDueDate(d.dueDate)}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-border-subtle/50 pt-3">
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
