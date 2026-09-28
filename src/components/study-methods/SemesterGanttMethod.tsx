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
      <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface-2 text-text-primary border border-border-hairline">
              <CalendarDays size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2 font-serif">
                Cronograma de Cuatrimestre & Diagrama Gantt
                <Badge variant="neutral" className="text-xs font-mono py-0">
                  Balance de carga
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
        <div className="px-5 pb-4 flex flex-wrap gap-2 pt-1 border-t border-border-hairline">
          <span className="text-xs font-mono text-text-tertiary flex items-center mr-2">
            Planes modelo:
          </span>
          {PRESET_SEMESTER_PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => handleSelectPlan(plan.id)}
              className={`text-xs px-2.5 py-1 rounded transition-colors font-mono ${
                selectedPlanId === plan.id
                  ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                  : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
              }`}
            >
              {plan.title}
            </button>
          ))}
        </div>
      </Card>

      {/* Formulario Rápido para Agregar Hito */}
      {isAddingMilestone && (
        <Card className="p-4 border border-border-hairline bg-bg-surface-2 animate-in fade-in space-y-3">
          <form onSubmit={handleAddMilestoneSubmit} className="space-y-3">
            <h4 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 font-serif">
              <Plus size={14} className="text-accent-primary" /> Registrar nuevo examen o entrega
            </h4>
            <div className="grid gap-2.5 sm:grid-cols-3">
              <div>
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Materia / Cátedra
                </label>
                <input
                  type="text"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Ej: Fisiología Humana"
                  required
                  className="w-full rounded border border-border-hairline bg-bg-surface-1 px-2.5 py-1.5 text-xs text-text-primary focus:border-border-subtle focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Descripción del hito
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej: Parcial 1: Sistema Nervioso"
                  required
                  className="w-full rounded border border-border-hairline bg-bg-surface-1 px-2.5 py-1.5 text-xs text-text-primary focus:border-border-subtle focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Tipo de evaluación
                </label>
                <select
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AcademicMilestoneType)}
                  className="w-full rounded border border-border-hairline bg-bg-surface-1 px-2.5 py-1.5 text-xs text-text-primary focus:border-border-subtle focus:outline-none"
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
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Días hasta la fecha: {newDateDaysOffset} días
                </label>
                <input
                  type="range"
                  min="3"
                  max="110"
                  value={newDateDaysOffset}
                  onChange={(e) => setNewDateDaysOffset(Number(e.target.value))}
                  className="w-full accent-accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Horas de preparación estimadas: {newPrepHours}h
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={newPrepHours}
                  onChange={(e) => setNewPrepHours(Number(e.target.value))}
                  className="w-full accent-accent-primary"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-text-tertiary block mb-1">
                  Dificultad percibida
                </label>
                <select
                  value={newDifficulty}
                  onChange={(e) => setNewDifficulty(e.target.value as any)}
                  className="w-full rounded border border-border-hairline bg-bg-surface-1 px-2.5 py-1.5 text-xs text-text-primary focus:border-border-subtle focus:outline-none"
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
        <Card className="border border-rubric-red/30 bg-rubric-red/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rubric-red" />
              <h3 className="text-xs font-semibold text-text-primary font-serif">
                Alerta de Colapso Cognitivo Detectada ({criticalWeeks.length} semana(s) crítica(s))
              </h3>
            </div>
            <Badge variant="danger" className="text-[10px] font-mono">
              Concurrencia de parciales
            </Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {criticalWeeks.map((cw) => (
              <div
                key={cw.weekNumber}
                className="rounded-lg bg-bg-surface-1 border border-border-hairline p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary font-serif">
                    Semana {cw.weekNumber} del cuatrimestre
                  </span>
                  <span className="text-xs font-mono text-rubric-red font-semibold">
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
                      className="text-[10px] font-mono px-2 py-0.5 rounded bg-rubric-red/15 text-rubric-red border border-rubric-red/30"
                    >
                      {m.subjectName} ({m.type})
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-rubric-red/20">
            <span className="text-xs text-text-tertiary">
              ¿Tenés un examen en los próximos 7 días? Activá el protocolo de repaso relámpago.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/methods?run=cram")}
              className="text-xs border-rubric-red/40 text-rubric-red hover:bg-rubric-red/15 flex items-center gap-1.5"
            >
              <Flame size={13} className="text-rubric-red" />
              <span>Activar Cram Mode (Repaso 7 Días)</span>
              <ChevronRight size={13} />
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- DIAGRAMA GANTT VISUAL (16 Semanas) ----------------- */}
      <Card className="p-5 border border-border-hairline bg-bg-surface-1 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-hairline pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-serif">
              <TrendingUp size={16} className="text-accent-primary" />
              Diagrama de Gantt Semanal de Cátedras
            </h3>
            <span className="text-xs text-text-tertiary">
              Distribución de las 16 semanas del ciclo lectivo ({totalSemesterPrepHours} horas estimadas de preparación)
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-signal-ok inline-block" /> Parcial 1
            </span>
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-accent-primary inline-block" /> Parcial 2
            </span>
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <span className="h-2 w-2 rounded-full bg-rubric-red inline-block" /> Final / Colapso
            </span>
          </div>
        </div>

        {/* Matriz Visual Gantt */}
        <div className="overflow-x-auto pb-2">
          <div className="min-w-[700px] space-y-3">
            {/* Cabecera de Semanas 1 a 16 */}
            <div className="grid grid-cols-16 gap-1 text-center text-xs font-mono text-text-tertiary border-b border-border-hairline pb-2">
              {Array.from({ length: 16 }).map((_, idx) => {
                const weekNum = idx + 1;
                const isOverloaded = weeklyOverloads[idx]?.isOverloaded;
                return (
                  <div
                    key={weekNum}
                    className={`py-1 rounded font-mono ${
                      isOverloaded
                        ? "bg-rubric-red/15 text-rubric-red font-bold border border-rubric-red/30"
                        : "bg-bg-surface-2 text-text-tertiary"
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
                <div className="flex items-center justify-between text-xs font-semibold text-text-primary px-1 font-serif">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: subj.color }}
                    />
                    {subj.name}
                  </span>
                  <span className="text-xs font-mono text-text-tertiary font-normal">
                    {subj.milestones.length} hito(s)
                  </span>
                </div>

                {/* Grilla de 16 semanas para esta materia */}
                <div className="grid grid-cols-16 gap-1 h-9 bg-bg-surface-2/40 rounded border border-border-hairline p-1 items-center relative">
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
                        className={`h-7 rounded px-1.5 text-[10px] font-semibold truncate transition-colors cursor-pointer flex items-center justify-center font-mono border ${
                          m.type.includes("Final")
                            ? "bg-rubric-red/20 text-rubric-red border-rubric-red/40 hover:bg-rubric-red/30"
                            : m.type.includes("Recuperatorio")
                            ? "bg-highlighter/20 text-text-primary border-highlighter/40 hover:bg-highlighter/30"
                            : "bg-accent-primary/20 text-accent-primary border-accent-primary/40 hover:bg-accent-primary/30"
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
          <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-accent-primary font-semibold block">
                Detalle del hito académico:
              </span>
              <button
                onClick={() => setSelectedMilestone(null)}
                className="text-xs text-text-tertiary hover:text-text-primary"
              >
                Cerrar
              </button>
            </div>
            <h4 className="text-sm font-bold text-text-primary font-serif">
              [{selectedMilestone.subjectName}] {selectedMilestone.title}
            </h4>
            <div className="grid gap-2 sm:grid-cols-4 text-xs pt-1">
              <div>
                <span className="text-xs font-mono text-text-tertiary block">Tipo</span>
                <span className="font-semibold text-text-secondary">{selectedMilestone.type}</span>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary block">Horas estimadas</span>
                <span className="font-mono font-semibold text-accent-primary">
                  {selectedMilestone.estimatedPrepHours} horas
                </span>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary block">Dificultad</span>
                <span className="font-semibold text-text-primary">{selectedMilestone.difficultyLevel}</span>
              </div>
              <div>
                <span className="text-xs font-mono text-text-tertiary block">Fecha</span>
                <span className="font-mono text-text-secondary">
                  {new Date(selectedMilestone.dueDate).toLocaleDateString("es-AR")}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* ----------------- TABLA DE PROYECCIÓN DIARIA DE ESFUERZO ----------------- */}
      <Card className="p-5 border border-border-hairline bg-bg-surface-1 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-border-hairline pb-3">
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-serif">
              <Clock size={16} className="text-accent-primary" />
              Tasa de Estudio Diario Requerida por Examen
            </h3>
            <span className="text-xs text-text-tertiary">
              Proyección matemática de horas por día requeridas para no llegar asfixiado al día del examen
            </span>
          </div>
          <Badge variant="neutral" className="text-xs font-mono">
            Algoritmo de distribución
          </Badge>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {projections.map((proj) => (
            <div
              key={proj.milestoneId}
              className={`rounded-lg border p-3 flex flex-col justify-between gap-2 ${
                proj.urgencyStatus === "Alerta Cramming"
                  ? "bg-rubric-red/10 border-rubric-red/30"
                  : proj.urgencyStatus === "Moderado"
                  ? "bg-highlighter/10 border-highlighter/30"
                  : "bg-bg-surface-2 border-border-hairline"
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-mono text-text-tertiary mb-0.5">
                  <span className="font-semibold text-text-secondary">{proj.subjectName}</span>
                  <span
                    className={
                      proj.daysRemaining <= 7 ? "text-rubric-red font-semibold" : "text-text-tertiary"
                    }
                  >
                    {proj.daysRemaining} días restantes
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-text-primary line-clamp-1 font-serif">{proj.title}</h4>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border-hairline text-xs">
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
                  className="text-[10px] font-mono py-0"
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
