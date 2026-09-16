import React, { useState, useEffect } from "react";
import { db, type ExamPlanRecord, type ConceptRecord, type CardFsrsRecord } from "../../../db/db";
import { createReverseExamPlan, getActiveExamPlan } from "../examPlanner";
import { calculateRetrievability } from "../../fsrs/fsrsModel";
import { Modal } from "../../../components/ui/Modal";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import {
  GraduationCap,
  Clock,
  TrendingDown,
  Save,
  Trash2,
} from "lucide-react";

interface ExamPlannerModalProps {
  open: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
  defaultSubjectName?: string;
  onPlanUpdated?: (plan: ExamPlanRecord) => void;
}

export const ExamPlannerModal: React.FC<ExamPlannerModalProps> = ({
  open,
  onClose,
  defaultSubjectId = "matematica",
  defaultSubjectName = "Matemática",
  onPlanUpdated,
}) => {
  const [subjectName, setSubjectName] = useState(defaultSubjectName);
  const [subjectId, setSubjectId] = useState(defaultSubjectId);
  const [examDateStr, setExamDateStr] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [hoursPerDay, setHoursPerDay] = useState(1.5);
  const [blockedDays, setBlockedDays] = useState<number[]>([2]); // 2 = martes (laboratorio)
  const [existingPlan, setExistingPlan] = useState<ExamPlanRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [retentionAtRisk, setRetentionAtRisk] = useState<Array<{ name: string; projectedR: number }>>([]);

  const daysOfWeek = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const loadCurrent = async () => {
    try {
      const active = await getActiveExamPlan(subjectId);
      if (active) {
        setExistingPlan(active);
        setSubjectName(active.subjectName);
        setHoursPerDay(active.availableMinutesPerDay / 60);
        setExamDateStr(new Date(active.examDate).toISOString().slice(0, 10));
      } else {
        setExistingPlan(null);
      }

      // Proyección R(t) de retención hacia la fecha del examen (Sección 19-BIS)
      const targetTime = new Date(examDateStr).getTime();
      const now = Date.now();
      const daysUntilExam = Math.max(1, (targetTime - now) / (1000 * 60 * 60 * 24));

      const cards: CardFsrsRecord[] = await db.cardsFsrs.toArray();
      const concepts: ConceptRecord[] = await db.concepts.toArray();

      const atRisk: Array<{ name: string; projectedR: number }> = [];
      for (const c of concepts) {
        const conceptCards = cards.filter((cd) => cd.conceptId === c.id);
        if (conceptCards.length > 0) {
          const avgStability =
            conceptCards.reduce((acc, curr) => acc + (curr.stability || 1), 0) / conceptCards.length;
          const projected = calculateRetrievability(daysUntilExam, avgStability);
          if (projected < 0.85) {
            atRisk.push({
              name: c.name,
              projectedR: Math.round(projected * 100),
            });
          }
        }
      }
      setRetentionAtRisk(atRisk.slice(0, 4));
    } catch (err) {
      console.error("Error loading exam plan:", err);
    }
  };

  useEffect(() => {
    if (open) {
      void loadCurrent();
    }
  }, [open, subjectId, examDateStr]);

  const handleToggleBlockedDay = (dayIndex: number) => {
    setBlockedDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const handleSavePlan = async () => {
    setLoading(true);
    try {
      const examTimestamp = new Date(`${examDateStr}T18:00:00`).getTime();
      const plan = await createReverseExamPlan({
        subjectId,
        subjectName,
        examDate: examTimestamp,
        availableMinutesPerDay: Math.round(hoursPerDay * 60),
      });
      setExistingPlan(plan);
      if (onPlanUpdated) {
        onPlanUpdated(plan);
      }
      onClose();
    } catch (err) {
      console.error("Error saving exam plan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!existingPlan) return;
    try {
      await db.examPlans.delete(existingPlan.id);
      setExistingPlan(null);
      onClose();
    } catch (err) {
      console.error("Error deleting exam plan:", err);
    }
  };

  const daysUntilExam = Math.max(
    1,
    Math.ceil((new Date(examDateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Modal open={open} onClose={onClose} title="Planificador Inverso de Parciales">
      <div className="flex flex-col gap-4 text-xs font-sans max-w-xl">
        {/* Header Rationale */}
        <div className="p-3 rounded-xl bg-accent-primary/10 border border-accent-primary/20 flex items-start gap-2.5">
          <GraduationCap className="h-5 w-5 text-accent-primary shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-text-primary">
              Metodología Inversa R(t) (Sección 19-BIS)
            </span>
            <p className="text-[11px] text-text-secondary leading-relaxed">
              Programamos el estudio hacia atrás desde la fecha exacta de tu mesa de examen, proyectando la
              curva de decaimiento mnemónico para garantizar máxima estabilidad en los temas troncales.
            </p>
          </div>
        </div>

        {/* Inputs Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono text-text-muted">Materia / Cátedra:</label>
            <input
              type="text"
              value={subjectName}
              onChange={(e) => {
                setSubjectName(e.target.value);
                setSubjectId(e.target.value.toLowerCase().trim().replace(/\s+/g, "_"));
              }}
              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-2 text-text-primary text-xs"
              placeholder="Ej: Análisis Matemático II"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-mono text-text-muted">Fecha del Parcial:</label>
            <input
              type="date"
              value={examDateStr}
              onChange={(e) => setExamDateStr(e.target.value)}
              className="px-3 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-2 text-text-primary text-xs font-mono"
            />
          </div>
        </div>

        {/* Hours per Day and Blocked Days */}
        <div className="p-3 rounded-xl border border-border-subtle bg-bg-surface-2/60 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-text-primary flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-accent-secondary" />
              Dedicación: {hoursPerDay} hs / día ({Math.round(hoursPerDay * 60)} min)
            </span>
            <input
              type="range"
              min={0.5}
              max={5}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="w-32 cursor-pointer"
            />
          </div>

          <div>
            <span className="text-[10px] font-mono text-text-muted block mb-1.5">
              Días bloqueados (laboratorio, trabajo, cursada pesada):
            </span>
            <div className="flex items-center gap-1.5">
              {daysOfWeek.map((day, idx) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleToggleBlockedDay(idx)}
                  className={`px-2 py-1 rounded-md text-[10px] font-mono transition-colors cursor-pointer ${
                    blockedDays.includes(idx)
                      ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                      : "bg-bg-surface-1 border border-border-subtle text-text-muted hover:text-text-primary"
                  }`}
                  title={blockedDays.includes(idx) ? "Día sin carga de estudio" : "Día hábil"}
                >
                  {day}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projected Retention Alert at Exam Date */}
        {retentionAtRisk.length > 0 && (
          <div className="p-3 rounded-xl border border-warning/30 bg-warning/10 flex flex-col gap-1.5 text-[11px]">
            <span className="font-semibold text-warning flex items-center gap-1.5">
              <TrendingDown className="h-4 w-4" />
              {retentionAtRisk.length} conceptos caerán por debajo del 85% de retención para el examen:
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {retentionAtRisk.map((r) => (
                <Badge key={r.name} variant="warning" className="font-mono text-[9px]">
                  {r.name} (R proyectado: {r.projectedR}%)
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Reverse Schedule Preview (4 Phases) */}
        <div className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
            Cadencia Inversa ({daysUntilExam} días restantes):
          </span>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1">
              <span className="font-semibold text-text-primary block text-[11px]">
                Fase 1 · Ingesta & Teoremas (30%)
              </span>
              <p className="text-[10px] text-text-muted mt-0.5">
                Carga de fuentes y construcción del Grafo Causal.
              </p>
            </div>
            <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1">
              <span className="font-semibold text-text-primary block text-[11px]">
                Fase 2 · Desarme de Errores (40%)
              </span>
              <p className="text-[10px] text-text-muted mt-0.5">
                Trabajos prácticos, auditoría socrática y vaciado del Error Bank.
              </p>
            </div>
            <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1">
              <span className="font-semibold text-text-primary block text-[11px]">
                Fase 3 · Simulacros Reales (20%)
              </span>
              <p className="text-[10px] text-text-muted mt-0.5">
                Simulacros cronometrados sin pistas ni fórmulas a mano.
              </p>
            </div>
            <div className="p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1">
              <span className="font-semibold text-text-primary block text-[11px]">
                Fase 4 · Consolidación FSRS (10%)
              </span>
              <p className="text-[10px] text-text-muted mt-0.5">
                Repasos ligeros de alta estabilidad. Cero temas nuevos.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-subtle mt-1">
          {existingPlan ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void handleDeletePlan()}
              className="text-rose-400 border-rose-500/30 hover:bg-rose-500/10 text-xs"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Cancelar Plan
            </Button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={loading}
              onClick={() => void handleSavePlan()}
              className="flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{existingPlan ? "Actualizar Plan Inverso" : "Activar Planificación Inversa"}</span>
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
