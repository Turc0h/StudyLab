import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  CalendarDays, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  AlertTriangle,
  RotateCcw
} from "lucide-react";

export interface DistributedPracticeMethodProps {
  onSessionFinished?: () => void;
}

interface ScheduleDay {
  dayName: string;
  isStudyDay: boolean;
  minutes: number;
  focusArea: string;
}

const DEFAULT_SCHEDULE: ScheduleDay[] = [
  { dayName: "Lunes", isStudyDay: true, minutes: 90, focusArea: "Unidad 1 - Teoría nuclear & modelos" },
  { dayName: "Martes", isStudyDay: false, minutes: 0, focusArea: "Descanso / Consolidación sináptica" },
  { dayName: "Miércoles", isStudyDay: true, minutes: 90, focusArea: "Unidad 1 - Ejercicios prácticos de aplicación" },
  { dayName: "Jueves", isStudyDay: false, minutes: 0, focusArea: "Descanso / Amortiguación" },
  { dayName: "Viernes", isStudyDay: true, minutes: 90, focusArea: "Unidad 2 - Introducción & síntesis" },
  { dayName: "Sábado", isStudyDay: true, minutes: 60, focusArea: "Recapitulación semanal cruzada" },
  { dayName: "Domingo", isStudyDay: false, minutes: 0, focusArea: "Descanso absoluto" },
];

export const DistributedPracticeMethod: React.FC<DistributedPracticeMethodProps> = ({ onSessionFinished }) => {
  const [subject, setSubject] = useState<string>("Farmacología General");
  const [totalHours, setTotalHours] = useState<number>(45);
  const [weeksRemaining, setWeeksRemaining] = useState<number>(6);
  const [blockSizeMinutes, setBlockSizeMinutes] = useState<number>(90);
  const [schedule, setSchedule] = useState<ScheduleDay[]>(DEFAULT_SCHEDULE);

  // Cálculos matemáticos de distribución
  const hoursPerWeek = weeksRemaining > 0 ? (totalHours / weeksRemaining) : 0;
  const blocksPerWeek = blockSizeMinutes > 0 ? Math.ceil((hoursPerWeek * 60) / blockSizeMinutes) : 0;
  const isCrammingRisk = hoursPerWeek > 20;

  const toggleStudyDay = (index: number) => {
    setSchedule(
      schedule.map((d, idx) =>
        idx === index
          ? {
              ...d,
              isStudyDay: !d.isStudyDay,
              minutes: !d.isStudyDay ? blockSizeMinutes : 0,
              focusArea: !d.isStudyDay ? "Bloque de estudio regular" : "Descanso / Consolidación",
            }
          : d
      )
    );
  };

  const handleUpdateFocus = (index: number, text: string) => {
    setSchedule(
      schedule.map((d, idx) => (idx === index ? { ...d, focusArea: text } : d))
    );
  };

  const activeDaysCount = schedule.filter((d) => d.isStudyDay).length;
  const weeklyPlannedMinutes = schedule.reduce((acc, d) => acc + d.minutes, 0);

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `dist_practice_${Date.now()}`,
      methodId: "distributed-practice",
      subject: "Práctica Distribuida (Anti-Cramming)",
      topic: subject || "Cronograma de Estudio Espaciado",
      durationMinutes: blockSizeMinutes,
      notes: `Asignatura: ${subject}\nMasa total estimada: ${totalHours}h en ${weeksRemaining} semanas.\nMeta semanal: ${hoursPerWeek.toFixed(1)}h/semana (${blocksPerWeek} bloques de ${blockSizeMinutes} min).\n\nDistribución Semanal:\n${schedule
        .map(
          (d) =>
            `• ${d.dayName}: ${d.isStudyDay ? `${d.minutes} min (${d.focusArea})` : "Descanso"}`
        )
        .join("\n")}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Práctica Distribuida (Anti-Cramming)</CardTitle>
            <Badge variant="accent">Planificación Espaciada (Cepeda et al., 2006)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Distribuye intencionalmente una masa fija de horas a lo largo de semanas para maximizar la retención duradera y evitar maratones ineficientes.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={!subject.trim()}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Planificación ({activeDaysCount} Días Activos)</span>
        </Button>
      </div>

      {/* Inputs de Masa de Estudio */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 p-4 rounded-xl border border-border-subtle bg-bg-secondary/40">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-semibold text-text-primary">Materia / Examen a Preparar</label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ej: Anatomía Patológica o Derecho Procesal"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Horas Totales</label>
          <Input
            type="number"
            min={5}
            max={300}
            value={totalHours}
            onChange={(e) => setTotalHours(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Semanas</label>
          <Input
            type="number"
            min={1}
            max={52}
            value={weeksRemaining}
            onChange={(e) => setWeeksRemaining(Number(e.target.value))}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Bloque Óptimo</label>
          <select
            value={blockSizeMinutes}
            onChange={(e) => setBlockSizeMinutes(Number(e.target.value))}
            aria-label="Tamaño del bloque de estudio"
            className="w-full bg-bg-secondary border border-border-subtle rounded-md p-2 text-xs text-text-primary"
          >
            <option value={60}>60 minutos</option>
            <option value={90}>90 minutos (Estándar)</option>
            <option value={120}>120 minutos</option>
          </select>
        </div>
      </div>

      {/* Métricas de Distribución */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-accent-primary" />
            <span className="text-xs text-text-secondary">Carga Semanal Óptima</span>
          </div>
          <span className="text-sm font-mono font-bold text-accent-primary">
            {hoursPerWeek.toFixed(1)} h/sem
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-text-secondary">Bloques de {blockSizeMinutes} min</span>
          </div>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {blocksPerWeek} bloques/sem
          </span>
        </div>

        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-text-secondary">Minutos Programados</span>
          </div>
          <span className="text-sm font-mono font-bold text-text-primary">
            {(weeklyPlannedMinutes / 60).toFixed(1)} h planificadas
          </span>
        </div>
      </div>

      {/* Alerta de Sobrecarga / Cramming */}
      {isCrammingRisk && (
        <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <p>
            <strong>Alerta de Saturación:</strong> Más de 20 horas semanales concentradas aumentan drásticamente el residuo atencional y el riesgo de abandono. Considera ampliar el horizonte de semanas o priorizar contenidos nucleares.
          </p>
        </div>
      )}

      {/* Cronograma Semanal Intercalado */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-accent-primary" />
            <span>Matriz Semanal de Distribución (Alternancia Obligatoria)</span>
          </span>
          <span className="text-[10px] text-text-muted">Clic en día para activar o marcar descanso</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {schedule.map((day, idx) => (
            <div
              key={day.dayName}
              className={`p-3 rounded-xl border transition-all space-y-2 ${
                day.isStudyDay
                  ? "border-accent-primary/40 bg-accent-primary/5"
                  : "border-border-subtle bg-bg-secondary/30 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleStudyDay(idx)}
                  className="flex items-center gap-2 text-xs font-bold text-text-primary hover:text-accent-primary transition-colors text-left"
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${day.isStudyDay ? "bg-accent-primary" : "bg-text-muted"}`} />
                  <span>{day.dayName}</span>
                </button>

                <Badge variant={day.isStudyDay ? "accent" : "neutral"} className="text-[10px]">
                  {day.isStudyDay ? `${day.minutes} min` : "Descanso"}
                </Badge>
              </div>

              {day.isStudyDay ? (
                <Input
                  value={day.focusArea}
                  onChange={(e) => handleUpdateFocus(idx, e.target.value)}
                  placeholder="Tema o unidad a abordar..."
                  className="text-xs"
                />
              ) : (
                <p className="text-[11px] text-text-muted italic">
                  Día reservado para consolidación sináptica y recuperación cognitiva.
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Regla de los 5 Minutos de Recapitulación */}
      <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-xs text-text-secondary flex items-start gap-2.5">
        <RotateCcw className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-emerald-400 block mb-0.5">
            Protocolo de Entrada: 5 Minutos de Recapitulación
          </span>
          <p className="leading-relaxed">
            Inicia cada bloque nuevo dedicando los primeros 5 minutos a reconstruir mentalmente o por escrito lo visto en la sesión previa del mismo tema. Esto reactiva el circuito neuronal y prepara la asimilación del contenido nuevo.
          </p>
        </div>
      </div>
    </Card>
  );
};
