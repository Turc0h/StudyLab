import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  PRESET_SEMESTER_PLANS,
  calculateDailyHoursRequired,
  detectSemesterOverloads,
  syncMilestoneWithDeadlines,
  saveSemesterGanttSessionRecord,
  type SemesterPlan,
  type AcademicMilestone,
  type AcademicMilestoneType,
} from "../../features/semester-planner/semesterGanttEngine";
import {
  CalendarDays,
  AlertTriangle,
  Flame,
  Plus,
  Clock,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SemesterGanttMethodProps {
  onSessionFinished?: () => void;
}

export const SemesterGanttMethod: React.FC<SemesterGanttMethodProps> = ({ onSessionFinished }) => {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(PRESET_SEMESTER_PLANS[0].id);
  const [activePlan, setActivePlan] = useState<SemesterPlan>(PRESET_SEMESTER_PLANS[0]);
  const [selectedMilestone, setSelectedMilestone] = useState<AcademicMilestone | null>(null);

  // Formulario para nuevo hito
  const [isAddingMilestone, setIsAddingMilestone] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<AcademicMilestoneType>("Primer Parcial");
  const [newDateDaysOffset, setNewDateDaysOffset] = useState<number>(20);
  const [newPrepHours, setNewPrepHours] = useState<number>(20);
  const [newDifficulty, setNewDifficulty] = useState<"Media" | "Alta" | "Crítica">("Alta");

  const handleSelectPlan = (planId: string) => {
    setSelectedPlanId(planId);
    const plan = PRESET_SEMESTER_PLANS.find((p) => p.id === planId) || PRESET_SEMESTER_PLANS[0];
    setActivePlan(plan);
    setSelectedMilestone(null);
  };

  // Semanas analizadas con sobrecarga
  const weeklyOverloads = useMemo(() => {
    return detectSemesterOverloads(
      activePlan.milestones,
      activePlan.startDate,
      activePlan.totalWeeks,
      24,
    );
  }, [activePlan]);

  // Proyecciones de horas diarias por hito
  const projections = useMemo(() => {
    return activePlan.milestones.map((m) => calculateDailyHoursRequired(m));
  }, [activePlan]);

  // Agrupación de hitos por materia
  const subjects = useMemo(() => {
    const map = new Map<string, { color: string; milestones: AcademicMilestone[] }>();
    activePlan.milestones.forEach((m) => {
      const existing = map.get(m.subjectName) || {
        color: m.subjectColor || "#3B82F6",
        milestones: [],
      };
      existing.milestones.push(m);
      map.set(m.subjectName, existing);
    });
    return Array.from(map.entries()).map(([name, data]) => ({
      name,
      color: data.color,
      milestones: data.milestones.sort((a, b) => a.dueDate - b.dueDate),
    }));
  }, [activePlan]);

  // Semanas de colapso activas
  const criticalWeeks = weeklyOverloads.filter((w) => w.isOverloaded);

  const handleAddMilestoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newTitle.trim()) return;

    const newMilestone: AcademicMilestone = {
      id: `m-custom-${Date.now()}`,
      subjectName: newSubject.trim(),
      subjectColor: "#8B5CF6",
      title: newTitle.trim(),
      type: newType,
      dueDate: Date.now() + newDateDaysOffset * 24 * 60 * 60 * 1000,
      estimatedPrepHours: Number(newPrepHours) || 15,
      difficultyLevel: newDifficulty,
      isCompleted: false,
    };

    setActivePlan((prev) => ({
      ...prev,
      milestones: [...prev.milestones, newMilestone],
    }));

    try {
      await syncMilestoneWithDeadlines(newMilestone);
    } catch {
      // Ignorar error de persistencia
    }

    setNewSubject("");
    setNewTitle("");
    setIsAddingMilestone(false);
  };

  const handleSaveAndFinish = async () => {
    try {
      await saveSemesterGanttSessionRecord(activePlan.title, 300);
    } catch {
      // Ignorar error
    }
    if (onSessionFinished) {
      onSessionFinished();
    }
  };

  const totalSemesterPrepHours = activePlan.milestones.reduce(
    (acc, m) => acc + m.estimatedPrepHours,
    0,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header del Método */}
      <Card className="border-border-subtle bg-bg-surface/90 backdrop-blur-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarDays size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
                Cronograma de Cuatrimestre & Diagrama Gantt
                <Badge variant="accent" className="text-[10px] font-mono py-0">
                  BALANCE DE CARGA
                </Badge>
              </CardTitle>
              <p className="text-xs text-text-tertiary">
                Visión panorámica de 16 semanas, alerta temprana de exámenes superpuestos y balance diario de horas.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddingMilestone(!isAddingMilestone)}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>{isAddingMilestone ? "Cerrar" : "Nuevo Hito / Parcial"}</span>
            </Button>
            {onSessionFinished && (
              <Button variant="ghost" size="sm" onClick={handleSaveAndFinish} className="text-xs">
                Guardar y Salir
              </Button>
            )}
          </div>
        </CardHeader>

        {/* Selector de Presets de Cuatrimestre */}
        <div className="px-5 pb-4 flex flex-wrap gap-2 pt-1 border-t border-border-subtle/50">
          <span className="text-[11px] font-mono uppercase text-text-tertiary flex items-center mr-2">
            Planes Modelo:
          </span>
          {PRESET_SEMESTER_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={`text-xs px-2.5 py-1 rounded transition-colors font-medium ${
                selectedPlanId === plan.id
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                  : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary hover:bg-bg-surface-2/80"
              }`}
            >
              {plan.title}
            </button>
          ))}
        </div>
      </Card>

      {/* Formulario Rápido para Agregar Hito */}
      {isAddingMilestone && (
        <Card className="p-4 border-indigo-500/30 bg-bg-surface/95 animate-in fade-in">
          <form onSubmit={handleAddMilestoneSubmit} className="space-y-3">
            <h4 className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Plus size={14} className="text-indigo-400" /> Registrar Nuevo Examen o Entrega
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Materia / Cátedra
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ej: Fisiología Humana"
                  required
                  className="w-full rounded border border-border-subtle bg-bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Descripción del Hito
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Parcial 1: Sistema Nervioso"
                  required
                  className="w-full rounded border border-border-subtle bg-bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Tipo de Evaluación
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AcademicMilestoneType)}
                  className="w-full rounded border border-border-subtle bg-bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary focus:border-indigo-400 focus:outline-none"
                >
                  <option value="Primer Parcial">Primer Parcial</option>
                  <option value="Segundo Parcial">Segundo Parcial</option>
                  <option value="Recuperatorio">Recuperatorio</option>
                  <option value="Entrega TP Obligatorio">Entrega TP Obligatorio</option>
                  <option value="Coloquio / Examen Final">Coloquio / Examen Final</option>
                </select>
              </div>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Días hasta la fecha: {newDateDaysOffset} días
                </label>
                <input
                  type="range"
                  min="3"
                  max="110"
                  value={newDateDaysOffset}
                  onChange={(e) => setNewDateDaysOffset(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Horas de Preparación Estimadas: {newPrepHours}h
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={newPrepHours}
                  onChange={(e) => setNewPrepHours(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Dificultad Percibida
                </label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as any)}
                  className="w-full rounded border border-border-subtle bg-bg-surface-2 px-2.5 py-1.5 text-xs text-text-primary focus:border-indigo-400 focus:outline-none"
                >
                  <option value="Media">Media</option>
                  <option value="Alta">Alta</option>
                  <option value="Crítica">Crítica (Colador de Cátedra)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setIsAddingMilestone(false)}>
                Cancelar
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Guardar en Cronograma
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Alerta Destacada de Semanas de Colapso */}
      {criticalWeeks.length > 0 && (
        <Card className="border-rose-500/40 bg-rose-500/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400" />
              <h3 className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wider">
                Alerta de Colapso Cognitivo Detectada ({criticalWeeks.length} semana(s) crítica(s))
              </h3>
            </div>
            <Badge variant="danger" className="text-[10px] font-mono">
              CONCURRENCIA DE PARCIALES
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {criticalWeeks.map((cw) => (
              <div
                key={cw.weekNumber}
                className="rounded-lg bg-bg-surface-2/90 border border-rose-500/30 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-200">
                    Semana {cw.weekNumber} del Cuatrimestre
                  </span>
                  <span className="text-[10px] font-mono text-rose-400 font-semibold">
                    {cw.totalRequiredHours}h de carga total
                  </span>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  {cw.recommendation}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cw.milestones.map((m) => (
                    <span
                      key={m.id}
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30"
                    >
                      {m.subjectName} ({m.type})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-rose-300/80">
              ¿Tenés un examen en los próximos 7 días? Activá el protocolo de repaso relámpago.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/methods?run=cram")}
              className="text-xs border-rose-500/50 text-rose-300 hover:bg-rose-500/20 flex items-center gap-1.5"
            >
              <Flame size={13} className="text-rose-400" />
              <span>Activar Cram Mode (Repaso 7 Días)</span>
              <ChevronRight size={13} />
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- DIAGRAMA GANTT VISUAL (16 Semanas) ----------------- */}
      <Card className="p-5 border-border-subtle bg-bg-surface/90 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-subtle/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-400" />
              Diagrama de Gantt Semanal de Cátedras
            </h3>
            <span className="text-xs text-text-tertiary">
              Distribución de las 16 semanas del ciclo lectivo ({totalSemesterPrepHours} horas estimadas de preparación)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" /> Parcial 1
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-indigo-400 inline-block" /> Parcial 2
            </span>
            <span className="flex items-center gap-1 text-[11px] text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-rose-400 inline-block" /> Final / Colapso
            </span>
          </div>
        </div>

        {/* Matriz Visual Gantt */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] space-y-3">
            {/* Cabecera de Semanas 1 a 16 */}
            <div className="grid grid-cols-16 gap-1 text-center text-[10px] font-mono text-text-tertiary border-b border-border-subtle/40 pb-2">
              {Array.from({ length: 16 }).map((_, idx) => {
                const weekNum = idx + 1;
                const isOverloaded = weeklyOverloads[idx]?.isOverloaded;
                return (
                  <div
                    key={weekNum}
                    className={`py-1 rounded ${
                      isOverloaded
                        ? "bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30"
                        : "bg-bg-surface-2/40"
                    }`}
                  >
                    S{weekNum}
                  </div>
                );
              })}
            </div>

            {/* Filas por Materia */}
            {subjects.map((subj) => (
              <div key={subj.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-semibold text-text-primary px-1">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: subj.color }}
                    />
                    {subj.name}
                  </span>
                  <span className="text-[10px] font-mono text-text-tertiary">
                    {subj.milestones.length} hito(s)
                  </span>
                </div>

                {/* Grilla de 16 semanas para esta materia */}
                <div className="grid grid-cols-16 gap-1 h-9 bg-bg-surface-2/20 rounded border border-border-subtle/30 p-1 items-center relative">
                  {subj.milestones.map((m) => {
                    const daysFromStart = Math.max(0, (m.dueDate - activePlan.startDate) / (24 * 60 * 60 * 1000));
                    const weekIdx = Math.min(15, Math.max(0, Math.floor(daysFromStart / 7)));

                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMilestone(m)}
                        style={{ gridColumnStart: weekIdx + 1 }}
                        title={`${m.title} (${m.type}) - ${m.estimatedPrepHours}h`}
                        className={`h-7 rounded px-1.5 text-[10px] font-semibold text-white truncate shadow-2xs transition-transform hover:scale-105 cursor-pointer flex items-center justify-center ${
                          m.type.includes("Final")
                            ? "bg-purple-600 border border-purple-400"
                            : m.type.includes("Recuperatorio")
                            ? "bg-amber-600 border border-amber-400"
                            : "bg-indigo-600 border border-indigo-400"
                        }`}
                      >
                        {m.type.includes("Primer")
                          ? "P1"
                          : m.type.includes("Segundo")
                          ? "P2"
                          : m.type.includes("Final")
                          ? "FIN"
                          : "TP"}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detalle del Hito Seleccionado */}
        {selectedMilestone && (
          <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-indigo-500/40 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold block">
                Detalle del Hito Académico:
              </span>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <h4 className="text-sm font-bold text-text-primary">
              [{selectedMilestone.subjectName}] {selectedMilestone.title}
            </h4>
            <div className="grid gap-2 sm:grid-cols-4 text-xs pt-1">
              <div>
                <span className="text-[10px] font-mono text-text-tertiary block">Tipo</span>
                <span className="font-semibold text-text-secondary">{selectedMilestone.type}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-tertiary block">Horas Estimadas</span>
                <span className="font-mono font-semibold text-indigo-300">
                  {selectedMilestone.estimatedPrepHours} horas
                </span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-tertiary block">Dificultad</span>
                <span className="font-semibold text-amber-400">{selectedMilestone.difficultyLevel}</span>
              </div>
              <div>
                <span className="text-[10px] font-mono text-text-tertiary block">Fecha</span>
                <span className="font-mono text-text-secondary">
                  {new Date(selectedMilestone.dueDate).toLocaleDateString("es-AR")}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ----------------- TABLA DE PROYECCIÓN DIARIA DE ESFUERZO ----------------- */}
      <Card className="p-5 border-border-subtle bg-bg-surface/90 space-y-4">
        <div className="flex items-center justify-between border-b border-border-subtle/60 pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Clock size={16} className="text-cyan-400" />
              Tasa de Estudio Diario Requerida por Examen
            </h3>
            <span className="text-xs text-text-tertiary">
              Proyección matemática de horas por día requeridas para no llegar asfixiado al día del examen
            </span>
          </div>
          <Badge variant="neutral" className="text-[10px] font-mono">
            ALGORITMO DE DISTRIBUCIÓN
          </Badge>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {projections.map((proj) => (
            <div
              key={proj.milestoneId}
              className={`rounded-lg border p-3 flex flex-col justify-between gap-2 ${
                proj.urgencyStatus === "Alerta Cramming"
                  ? "bg-rose-500/10 border-rose-500/30"
                  : proj.urgencyStatus === "Moderado"
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-bg-surface-2 border-border-subtle"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary mb-0.5">
                  <span className="font-bold text-text-secondary">{proj.subjectName}</span>
                  <span
                    className={
                      proj.daysRemaining <= 7 ? "text-rose-400 font-bold" : "text-text-tertiary"
                    }
                  >
                    {proj.daysRemaining} días restantes
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-text-primary line-clamp-1">{proj.title}</h4>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-subtle/40 text-xs">
                <span className="text-text-tertiary">Dedicación diaria:</span>
                <span className="font-mono font-bold text-text-primary">
                  {proj.hoursNeededPerDay} h/día
                </span>
                <Badge
                  variant={
                    proj.urgencyStatus === "Alerta Cramming"
                      ? "danger"
                      : proj.urgencyStatus === "Moderado"
                      ? "warning"
                      : "success"
                  }
                  className="text-[9px] font-mono py-0"
                >
                  {proj.urgencyStatus}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
