import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ContextTimeBlockRecord } from "../../db/db";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Check, Clock, Plus, Trash2, Sparkles, AlertCircle } from "lucide-react";

const DAYS = [
  { id: 1, name: "Lunes" },
  { id: 2, name: "Martes" },
  { id: 3, name: "Miércoles" },
  { id: 4, name: "Jueves" },
  { id: 5, name: "Viernes" },
  { id: 6, name: "Sábado" },
  { id: 0, name: "Domingo" },
];

const TIME_SLOTS = [
  { start: "08:00", end: "10:00", label: "Mañana Temprano (08:00 - 10:00)" },
  { start: "10:00", end: "12:00", label: "Media Mañana (10:00 - 12:00)" },
  { start: "14:00", end: "16:00", label: "Primera Tarde (14:00 - 16:00)" },
  { start: "16:00", end: "18:00", label: "Media Tarde (16:00 - 18:00)" },
  { start: "19:00", end: "21:00", label: "Noche (19:00 - 21:00)" },
];

export const WeeklyCalendarTimeBlocker: React.FC = () => {
  const projects = useLiveQuery(() => db.contextProjects.toArray(), []);
  const blocks = useLiveQuery(() => db.contextTimeBlocks.toArray(), []);

  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [selectedSlot, setSelectedSlot] = useState<string>("10:00 - 12:00");
  const [selectedProject, setSelectedProject] = useState<string>("");

  // Sugerencia pendiente que requiere confirmación explícita
  const [pendingSuggestion, setPendingSuggestion] = useState<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    projectId?: string;
    projectTitle?: string;
  } | null>(null);

  const handleSuggestBlock = () => {
    if (!projects || projects.length === 0) return;
    const proj = projects[0];
    const [start, end] = selectedSlot.split(" - ");

    setPendingSuggestion({
      dayOfWeek: selectedDay,
      startTime: start,
      endTime: end,
      projectId: proj.id,
      projectTitle: proj.name,
    });
  };

  const handleConfirmSuggestion = async () => {
    if (!pendingSuggestion) return;

    const newBlock: ContextTimeBlockRecord = {
      id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      projectId: pendingSuggestion.projectId,
      title: pendingSuggestion.projectTitle || "Bloque de Estudio Programado",
      dayOfWeek: pendingSuggestion.dayOfWeek,
      startTime: pendingSuggestion.startTime,
      endTime: pendingSuggestion.endTime,
      isFreeSlot: false,
      isConfirmed: true, // Confirmado explícitamente por el usuario
      createdAt: Date.now(),
    };

    await db.contextTimeBlocks.add(newBlock);
    setPendingSuggestion(null);
  };

  const handleDeleteBlock = async (id: string) => {
    await db.contextTimeBlocks.delete(id);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-base font-semibold text-text-primary">
            Bloqueo de Horarios en Calendario Local
          </h3>
          <p className="text-xs text-text-secondary">
            Marcá tus franjas disponibles y confirmá bloques de estudio sugeridos de forma local.
          </p>
        </div>
      </div>

      {/* Sugerencia Pendiente (Requiere Confirmación) */}
      {pendingSuggestion && (
        <div className="rounded border border-warning/40 bg-warning/5 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-xs text-text-primary">
                Sugerencia de Bloque Pendiente de Confirmación
              </h4>
              <p className="text-xs text-text-secondary mt-0.5">
                El sistema sugiere agendar <strong>{pendingSuggestion.startTime} a {pendingSuggestion.endTime}</strong> el día{" "}
                <strong>{DAYS.find((d) => d.id === pendingSuggestion.dayOfWeek)?.name}</strong> para el proyecto{" "}
                <strong>{pendingSuggestion.projectTitle}</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPendingSuggestion(null)}
              className="text-xs"
            >
              Descartar
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmSuggestion}
              className="text-xs flex items-center gap-1.5"
            >
              <Check className="h-3.5 w-3.5" />
              <span>Confirmar y Persistir Bloque</span>
            </Button>
          </div>
        </div>
      )}

      {/* Selector Rápido para Crear / Sugerir Bloque */}
      <Card className="p-4 bg-bg-secondary/20 border-border-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Día:</span>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(parseInt(e.target.value))}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary focus:outline-none"
            >
              {DAYS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-text-muted">Franja:</span>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary focus:outline-none"
            >
              {TIME_SLOTS.map((s, idx) => (
                <option key={idx} value={`${s.start} - ${s.end}`}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {projects && projects.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-text-muted">Proyecto:</span>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary focus:outline-none max-w-[180px]"
              >
                <option value="">(Seleccionar proyecto)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {projects && projects.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSuggestBlock}
              className="text-xs flex items-center gap-1.5 text-accent-primary"
            >
              <Sparkles className="h-3 w-3" />
              <span>Sugerir Bloque</span>
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              const [start, end] = selectedSlot.split(" - ");
              const proj = projects?.find((p) => p.id === selectedProject);
              await db.contextTimeBlocks.add({
                id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                projectId: selectedProject || undefined,
                title: proj ? proj.name : "Sesión de Estudio Libre",
                dayOfWeek: selectedDay,
                startTime: start,
                endTime: end,
                isFreeSlot: false,
                isConfirmed: true,
                createdAt: Date.now(),
              });
            }}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Guardar Horario</span>
          </Button>
        </div>
      </Card>

      {/* Grilla Semanal Visual */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
        {DAYS.map((day) => {
          const dayBlocks = blocks?.filter((b) => b.dayOfWeek === day.id) || [];

          return (
            <div
              key={day.id}
              className="rounded border border-border-subtle bg-bg-primary/40 p-2.5 flex flex-col gap-2 min-h-[160px]"
            >
              <div className="flex items-center justify-between border-b border-border-subtle/70 pb-1.5">
                <span className="font-serif text-xs font-semibold text-text-primary">{day.name}</span>
                <span className="text-[10px] text-text-muted">{dayBlocks.length}</span>
              </div>

              <div className="space-y-1.5 flex-1">
                {dayBlocks.length === 0 ? (
                  <p className="text-[11px] text-text-muted/60 text-center py-4">Sin horarios</p>
                ) : (
                  dayBlocks.map((blk) => (
                    <div
                      key={blk.id}
                      className="rounded border border-accent-primary/20 bg-accent-primary/10 p-1.5 text-[11px] flex flex-col justify-between group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-text-primary truncate">{blk.title}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(blk.id)}
                          className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {blk.startTime} - {blk.endTime}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
