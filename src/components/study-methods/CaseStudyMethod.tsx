import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  PRESET_CASE_STUDIES,
  evaluateCaseStudyAttempt,
  saveCaseSessionRecord,
  type CaseStudy,
  type CaseEvaluationResult,
} from "../../features/case-study/caseStudyEngine";
import {
  Briefcase,
  AlertTriangle,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  ChevronRight,
  Activity,
  FileSearch,
  Stethoscope,
  Sparkles,
} from "lucide-react";

interface CaseStudyMethodProps {
  onSessionFinished?: () => void;
}

type Step = "presentation" | "investigations" | "diagnosis" | "evaluation";

export const CaseStudyMethod: React.FC<CaseStudyMethodProps> = ({ onSessionFinished }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(PRESET_CASE_STUDIES[0].id);
  const [currentStep, setCurrentStep] = useState<Step>("presentation");
  const [unlockedInvestigations, setUnlockedInvestigations] = useState<string[]>([]);
  const [studentDiagnosis, setStudentDiagnosis] = useState<string>("");
  const [studentPlan, setStudentPlan] = useState<string>("");
  const [evaluation, setEvaluation] = useState<CaseEvaluationResult | null>(null);

  const activeCase: CaseStudy =
    PRESET_CASE_STUDIES.find((c) => c.id === selectedCaseId) || PRESET_CASE_STUDIES[0];

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setCurrentStep("presentation");
    setUnlockedInvestigations([]);
    setStudentDiagnosis("");
    setStudentPlan("");
    setEvaluation(null);
  };

  const handleUnlockInvestigation = (invId: string) => {
    if (!unlockedInvestigations.includes(invId)) {
      setUnlockedInvestigations((prev) => [...prev, invId]);
    }
  };

  const handleEvaluate = async () => {
    const result = evaluateCaseStudyAttempt(
      activeCase,
      unlockedInvestigations,
      studentDiagnosis,
      studentPlan,
    );
    setEvaluation(result);
    setCurrentStep("evaluation");

    try {
      await saveCaseSessionRecord(activeCase.title, 600);
    } catch {
      // Ignorar error de persistencia
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-emerald-400";
    if (score >= 6.5) return "text-cyan-400";
    if (score >= 4.0) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header General */}
      <Card className="border-border-subtle bg-bg-surface/90 backdrop-blur-md">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Briefcase size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
                Simulador de Casos Prácticos y Viñetas
                <Badge variant="success" className="text-[10px] font-mono py-0">
                  EFICIENCIA DE OCKHAM
                </Badge>
              </CardTitle>
              <p className="text-xs text-text-tertiary">
                Resolución de escenarios clínicos, legales y técnicos confrontados con el Gold Standard de cátedra.
              </p>
            </div>
          </div>

          {/* Selector de Casos */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {PRESET_CASE_STUDIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCase(c.id)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedCaseId === c.id
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold"
                    : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-subtle"
                }`}
              >
                {c.discipline.split("&")[0].trim()}
              </button>
            ))}
          </div>
        </CardHeader>

        {/* Stepper de Fases del Caso */}
        <div className="p-4 pt-0 border-t border-border-subtle/50 mt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            {[
              { id: "presentation", label: "1. Presentación" },
              { id: "investigations", label: "2. Pruebas y Estudios" },
              { id: "diagnosis", label: "3. Diagnóstico & Plan" },
              { id: "evaluation", label: "4. Gold Standard" },
            ].map((step, idx) => {
              const isCurrent = currentStep === step.id;
              const isPast =
                (currentStep === "investigations" && idx === 0) ||
                (currentStep === "diagnosis" && idx <= 1) ||
                (currentStep === "evaluation" && idx <= 2);

              return (
                <div key={step.id} className="flex items-center gap-2">
                  <span
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? "bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : isPast
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-bg-surface-2 text-text-tertiary"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span
                    className={`hidden sm:inline ${
                      isCurrent ? "text-emerald-400 font-bold" : isPast ? "text-text-secondary" : "text-text-tertiary"
                    }`}
                  >
                    {step.label.slice(3)}
                  </span>
                  {idx < 3 && <ChevronRight size={14} className="text-border-subtle ml-2" />}
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {/* ----------------- PASO 1: PRESENTACIÓN INICIAL ----------------- */}
      {currentStep === "presentation" && (
        <Card className="p-5 space-y-4 border-border-subtle bg-bg-surface/80">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                {activeCase.discipline} · Dificultad: {activeCase.difficulty}
              </span>
            </div>
            <h3 className="text-base font-bold text-text-primary mt-1">{activeCase.title}</h3>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">{activeCase.summary}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-bg-surface-2/60 p-3.5 border border-border-subtle/60 space-y-1.5">
              <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold flex items-center gap-1">
                <AlertTriangle size={12} /> Motivo de Consulta / Detonante
              </span>
              <p className="text-xs text-text-primary leading-relaxed">{activeCase.chiefComplaint}</p>
            </div>

            <div className="rounded-lg bg-bg-surface-2/60 p-3.5 border border-border-subtle/60 space-y-1.5">
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold flex items-center gap-1">
                <Activity size={12} /> Antecedentes & Hechos Probados
              </span>
              <p className="text-xs text-text-primary leading-relaxed">{activeCase.anamnesisOrFacts}</p>
            </div>
          </div>

          <div className="rounded-lg bg-bg-surface-2/40 p-3.5 border border-border-subtle space-y-1.5">
            <span className="text-[10px] font-mono text-purple-400 uppercase font-bold flex items-center gap-1">
              <Stethoscope size={12} /> Examen Físico / Inspección de Entorno
            </span>
            <p className="text-xs text-text-secondary leading-relaxed font-sans">{activeCase.physicalExamOrContext}</p>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setCurrentStep("investigations")}>
              Solicitar Estudios & Pruebas <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- PASO 2: MESA DE ESTUDIOS COMPLEMENTARIOS ----------------- */}
      {currentStep === "investigations" && (
        <Card className="p-5 space-y-4 border-border-subtle bg-bg-surface/80">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <FileSearch size={16} className="text-cyan-400" />
                Mesa de Pruebas & Estudios Complementarios
              </h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                Seleccioná únicamente los estudios pertinentes. Las pruebas innecesarias penalizan la eficiencia (Navaja de Ockham).
              </p>
            </div>
            <Badge variant="neutral" className="font-mono text-xs">
              {unlockedInvestigations.length} / {activeCase.availableInvestigations.length} solicitados
            </Badge>
          </div>

          <div className="grid gap-3">
            {activeCase.availableInvestigations.map((inv) => {
              const isUnlocked = unlockedInvestigations.includes(inv.id);
              return (
                <div
                  key={inv.id}
                  className={`rounded-lg border p-3.5 transition-all ${
                    isUnlocked
                      ? "bg-bg-surface-2/90 border-cyan-500/40 shadow-xs"
                      : "bg-bg-surface-2/30 border-border-subtle hover:border-border-subtle/80"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono uppercase text-text-tertiary">
                          {inv.category}
                        </span>
                        {inv.costPoints > 0 ? (
                          <span className="text-[9px] font-mono text-amber-400">
                            (Costo potencial: -{inv.costPoints} pts de eficiencia)
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono text-emerald-400">
                            (Estudio de 1ª línea)
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-text-primary">{inv.name}</h4>
                    </div>

                    {!isUnlocked ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleUnlockInvestigation(inv.id)}
                        className="text-xs"
                      >
                        Solicitar Estudio
                      </Button>
                    ) : (
                      <Badge variant="accent" className="text-[10px] font-mono">
                        ✓ Revelado
                      </Badge>
                    )}
                  </div>

                  {isUnlocked && (
                    <div className="mt-2.5 pt-2 border-t border-border-subtle/40 animate-in fade-in duration-200">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 block font-semibold mb-0.5">
                        Hallazgos Reportados:
                      </span>
                      <p className="text-xs text-text-primary leading-relaxed font-sans">{inv.resultText}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("presentation")}>
              Volver a la Presentación
            </Button>
            <Button variant="primary" onClick={() => setCurrentStep("diagnosis")}>
              Formular Diagnóstico & Plan <ChevronRight size={14} />
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- PASO 3: FORMULACIÓN DE DIAGNÓSTICO & PLAN ----------------- */}
      {currentStep === "diagnosis" && (
        <Card className="p-5 space-y-4 border-border-subtle bg-bg-surface/80">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Dictamen del Estudiante: Diagnóstico y Conducta
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Sintetizá tu hipótesis principal y las medidas terapéuticas o legales que tomarías a continuación.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-mono uppercase text-text-tertiary block mb-1">
                1. Diagnóstico Principal / Conclusión Jurídica o Técnica:
              </label>
              <textarea
                rows={2}
                value={studentDiagnosis}
                onChange={(e) => setStudentDiagnosis(e.target.value)}
                placeholder="Ej. Infarto agudo de miocardio con elevación del ST anteroseptal..."
                className="w-full rounded-lg bg-bg-surface-2 p-3 text-xs border border-border-subtle text-text-primary focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-text-tertiary block mb-1">
                2. Plan Terapéutico / Medidas Inmediatas / Resolución:
              </label>
              <textarea
                rows={3}
                value={studentPlan}
                onChange={(e) => setStudentPlan(e.target.value)}
                placeholder="Ej. Activar angioplastia primaria inmediata, administrar doble antiagregación y heparina..."
                className="w-full rounded-lg bg-bg-surface-2 p-3 text-xs border border-border-subtle text-text-primary focus:outline-none focus:border-emerald-500 resize-none font-sans"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle/50">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("investigations")}>
              Volver a los Estudios
            </Button>
            <Button
              variant="primary"
              onClick={handleEvaluate}
              disabled={!studentDiagnosis.trim() || !studentPlan.trim()}
            >
              <CheckCircle2 size={14} /> Emitir Dictamen & Evaluar
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- PASO 4: EVALUACIÓN Y GOLD STANDARD ----------------- */}
      {currentStep === "evaluation" && evaluation && (
        <Card className="p-5 space-y-5 border-border-subtle bg-bg-surface/90 backdrop-blur-md">
          {/* Cabecera del Veredicto */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-subtle/60 pb-3">
            <div>
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block">
                DICTAMEN DE CÁTEDRA
              </span>
              <h3 className="text-base font-bold text-text-primary">{activeCase.title}</h3>
            </div>

            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-mono text-text-tertiary uppercase block">Nota Final</span>
                <span className={`text-2xl font-mono font-bold ${getScoreColor(evaluation.totalScore)}`}>
                  {evaluation.totalScore.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-text-tertiary">/ 10</span>
                </span>
              </div>
              <Badge
                variant={
                  evaluation.totalScore >= 8.5
                    ? "success"
                    : evaluation.totalScore >= 6.5
                    ? "accent"
                    : evaluation.totalScore >= 4.0
                    ? "warning"
                    : "danger"
                }
                className="font-mono text-xs py-1"
              >
                {evaluation.efficiencyCategory}
              </Badge>
            </div>
          </div>

          {/* Puntuación por Dimensiones */}
          <div className="grid gap-2.5 sm:grid-cols-3">
            <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary">Acierto Diagnóstico (45%)</span>
                <span className="font-mono font-bold text-emerald-400">{evaluation.diagnosticScore.toFixed(1)}/10</span>
              </div>
              <p className="text-[11px] text-text-tertiary mt-1">Confrontación con el cuadro patognomónico.</p>
            </div>

            <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary">Criterio Ockham (25%)</span>
                <span className="font-mono font-bold text-cyan-400">{evaluation.efficiencyScore.toFixed(1)}/10</span>
              </div>
              <p className="text-[11px] text-text-tertiary mt-1">Economía diagnóstica y ausencia de pruebas redundantes.</p>
            </div>

            <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-primary">Plan Terapéutico (30%)</span>
                <span className="font-mono font-bold text-purple-400">{evaluation.planScore.toFixed(1)}/10</span>
              </div>
              <p className="text-[11px] text-text-tertiary mt-1">Pertinencia y oportunidad de la intervención.</p>
            </div>
          </div>

          {/* Confrontación Cara a Cara */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-bg-surface-2/40 p-3.5 border border-border-subtle/60 space-y-2">
              <span className="text-[10px] font-mono uppercase text-text-tertiary font-bold block">
                Tu Diagnóstico & Plan:
              </span>
              <p className="text-xs font-semibold text-text-primary font-sans">{studentDiagnosis}</p>
              <p className="text-xs text-text-secondary leading-relaxed font-sans">{studentPlan}</p>
            </div>

            <div className="rounded-lg bg-emerald-500/10 p-3.5 border border-emerald-500/25 space-y-2">
              <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold block flex items-center gap-1">
                <ShieldCheck size={13} /> Gold Standard de Cátedra:
              </span>
              <p className="text-xs font-semibold text-emerald-300 font-sans">{activeCase.goldStandard.primaryDiagnosis}</p>
              <p className="text-xs text-text-secondary leading-relaxed font-sans">{activeCase.goldStandard.criticalActionOrPlan}</p>
            </div>
          </div>

          {/* Perlas Clínicas / Doctrinales */}
          {activeCase.goldStandard.clinicalPearls.length > 0 && (
            <div className="rounded-lg bg-cyan-500/10 p-3.5 border border-cyan-500/25 space-y-2">
              <span className="text-xs font-mono uppercase text-cyan-300 font-bold flex items-center gap-1.5">
                <Sparkles size={14} className="text-cyan-400" /> Perlas de Cátedra para Finales
              </span>
              <ul className="space-y-1">
                {activeCase.goldStandard.clinicalPearls.map((p, idx) => (
                  <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="text-cyan-400 font-mono">•</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Observaciones y Sugerencias */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono uppercase text-text-tertiary block">
              Observaciones del Tribunal Evaluador:
            </span>
            <ul className="space-y-1">
              {evaluation.feedback.map((fb, idx) => (
                <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                  <span className="text-emerald-400 font-mono">•</span>
                  <span>{fb}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Botones de Navegación Final */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border-subtle/50">
            <Button
              variant="secondary"
              onClick={() => {
                setCurrentStep("presentation");
                setUnlockedInvestigations([]);
                setStudentDiagnosis("");
                setStudentPlan("");
                setEvaluation(null);
              }}
            >
              <RotateCcw size={14} /> Reintentar Este Caso
            </Button>

            {onSessionFinished && (
              <Button variant="ghost" onClick={onSessionFinished} className="ml-auto">
                Finalizar Sesión de Casos
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
