import React, { useState } from "react";
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
  Activity,
  FileSearch,
  Stethoscope,
  BookOpen,
} from "lucide-react";
import { StepperShell, type StepItem } from "../shells";

interface CaseStudyMethodProps {
  onSessionFinished?: () => void;
}

const CASE_STEPS: StepItem[] = [
  { 
    id: "presentation", 
    title: "1. Presentación", 
    subtitle: "Viñeta", 
    description: "Revisá el motivo de consulta, antecedentes y examen físico del caso clínico o técnico." 
  },
  { 
    id: "investigations", 
    title: "2. Pruebas y Estudios", 
    subtitle: "Mesa Ockham", 
    description: "Seleccioná únicamente los estudios pertinentes. Las pruebas innecesarias penalizan la eficiencia (Navaja de Ockham)." 
  },
  { 
    id: "diagnosis", 
    title: "3. Diagnóstico & Plan", 
    subtitle: "Dictamen", 
    description: "Sintetizá tu hipótesis principal y las medidas terapéuticas o legales que tomarías a continuación." 
  },
  { 
    id: "evaluation", 
    title: "4. Gold Standard", 
    subtitle: "Devolución", 
    description: "Confrontación con el criterio de cátedra, perlas para exámenes finales y nota ponderada." 
  },
];

export const CaseStudyMethod: React.FC<CaseStudyMethodProps> = ({ onSessionFinished }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(PRESET_CASE_STUDIES[0].id);
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [unlockedInvestigations, setUnlockedInvestigations] = useState<string[]>([]);
  const [studentDiagnosis, setStudentDiagnosis] = useState<string>("");
  const [studentPlan, setStudentPlan] = useState<string>("");
  const [evaluation, setEvaluation] = useState<CaseEvaluationResult | null>(null);

  const activeCase: CaseStudy =
    PRESET_CASE_STUDIES.find((c) => c.id === selectedCaseId) || PRESET_CASE_STUDIES[0];

  const handleSelectCase = (caseId: string) => {
    setSelectedCaseId(caseId);
    setStepIndex(0);
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
    setStepIndex(3);

    try {
      await saveCaseSessionRecord(activeCase.title, 600);
    } catch {
      // Ignorar error de persistencia
    }
  };

  const handleStepChange = (nextIndex: number) => {
    // Si avanza a la evaluación desde diagnóstico, evaluar
    if (nextIndex === 3 && stepIndex === 2 && !evaluation) {
      void handleEvaluate();
      return;
    }
    setStepIndex(nextIndex);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8.5) return "text-signal-ok font-semibold";
    if (score >= 6.5) return "text-accent-primary font-semibold";
    if (score >= 4.0) return "text-highlighter font-semibold";
    return "text-rubric-red font-semibold";
  };

  const canAdvanceStep = (idx: number) => {
    if (idx === 2) {
      return studentDiagnosis.trim().length > 0 && studentPlan.trim().length > 0;
    }
    return true;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Selector de Casos Superior */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border-hairline bg-bg-surface-1 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface-2 text-text-primary border border-border-hairline">
            <Briefcase size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-text-primary flex items-center gap-2 font-serif">
              Simulador de Casos Prácticos y Viñetas
              <Badge variant="neutral" className="text-[11px] font-mono py-0">
                Criterio Ockham
              </Badge>
            </h1>
            <p className="text-xs text-text-tertiary">
              Resolución de escenarios clínicos, legales y técnicos confrontados con el Gold Standard de cátedra.
            </p>
          </div>
        </div>

        {/* Botonera de Casos */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          {PRESET_CASE_STUDIES.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleSelectCase(c.id)}
              className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                selectedCaseId === c.id
                  ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                  : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
              }`}
            >
              {c.discipline.split("&")[0].trim()}
            </button>
          ))}
        </div>
      </div>

      {/* Stepper Shell con las 4 fases */}
      <StepperShell
        title={activeCase.title}
        badgeText={`${activeCase.discipline} · Dif: ${activeCase.difficulty}`}
        steps={CASE_STEPS}
        currentStepIndex={stepIndex}
        onStepChange={handleStepChange}
        canAdvance={canAdvanceStep}
        completeLabel="Finalizar Sesión de Casos"
        onComplete={() => onSessionFinished?.()}
        onReset={() => {
          setStepIndex(0);
          setUnlockedInvestigations([]);
          setStudentDiagnosis("");
          setStudentPlan("");
          setEvaluation(null);
        }}
      >
        <div className="space-y-4">
          {/* ----------------- PASO 1: PRESENTACIÓN INICIAL ----------------- */}
          {stepIndex === 0 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-text-primary font-serif">{activeCase.title}</h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">{activeCase.summary}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-1.5">
                  <span className="text-[11px] font-mono text-text-primary font-semibold flex items-center gap-1">
                    <AlertTriangle size={12} className="text-text-tertiary" /> Motivo de Consulta / Detonante
                  </span>
                  <p className="text-xs text-text-primary leading-relaxed">{activeCase.chiefComplaint}</p>
                </div>

                <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-1.5">
                  <span className="text-[11px] font-mono text-text-primary font-semibold flex items-center gap-1">
                    <Activity size={12} className="text-text-tertiary" /> Antecedentes & Hechos Probados
                  </span>
                  <p className="text-xs text-text-primary leading-relaxed">{activeCase.anamnesisOrFacts}</p>
                </div>
              </div>

              <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-1.5">
                <span className="text-[11px] font-mono text-text-primary font-semibold flex items-center gap-1">
                  <Stethoscope size={12} className="text-text-tertiary" /> Examen Físico / Inspección de Entorno
                </span>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">{activeCase.physicalExamOrContext}</p>
              </div>
            </div>
          )}

          {/* ----------------- PASO 2: MESA DE ESTUDIOS COMPLEMENTARIOS ----------------- */}
          {stepIndex === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-text-primary flex items-center gap-2 font-serif">
                    <FileSearch size={16} className="text-text-secondary" />
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
                          ? "bg-bg-surface-2 border-border-hairline shadow-xs"
                          : "bg-bg-surface-1 border-border-hairline hover:bg-bg-surface-2"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-text-tertiary">
                              {inv.category}
                            </span>
                            {inv.costPoints > 0 ? (
                              <span className="text-[10px] font-mono text-highlighter">
                                (Costo potencial: -{inv.costPoints} pts de eficiencia)
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono text-signal-ok">
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
                          <Badge variant="neutral" className="text-[10px] font-mono">
                            ✓ Revelado
                          </Badge>
                        )}
                      </div>

                      {isUnlocked && (
                        <div className="mt-2.5 pt-2 border-t border-border-hairline animate-in fade-in duration-200">
                          <span className="text-[10px] font-mono text-text-secondary block font-semibold mb-0.5">
                            Hallazgos reportados:
                          </span>
                          <p className="text-xs text-text-primary leading-relaxed font-sans">{inv.resultText}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ----------------- PASO 3: FORMULACIÓN DE DIAGNÓSTICO & PLAN ----------------- */}
          {stepIndex === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-text-primary font-serif">
                  Dictamen del Estudiante: Diagnóstico y Conducta
                </h3>
                <p className="text-xs text-text-tertiary mt-0.5">
                  Sintetizá tu hipótesis principal y las medidas terapéuticas o legales que tomarías a continuación.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 font-medium">
                    1. Diagnóstico Principal / Conclusión Jurídica o Técnica:
                  </label>
                  <textarea
                    rows={2}
                    value={studentDiagnosis}
                    onChange={(e) => setStudentDiagnosis(e.target.value)}
                    placeholder="Ej. Infarto agudo de miocardio con elevación del ST anteroseptal..."
                    className="w-full rounded-lg bg-bg-surface-2 p-3 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 font-medium">
                    2. Plan Terapéutico / Medidas Inmediatas / Resolución:
                  </label>
                  <textarea
                    rows={3}
                    value={studentPlan}
                    onChange={(e) => setStudentPlan(e.target.value)}
                    placeholder="Ej. Activar angioplastia primaria inmediata, administrar doble antiagregación y heparina..."
                    className="w-full rounded-lg bg-bg-surface-2 p-3 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline resize-none font-sans"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  onClick={handleEvaluate}
                  disabled={!studentDiagnosis.trim() || !studentPlan.trim()}
                >
                  <CheckCircle2 size={14} /> Emitir Dictamen & Evaluar
                </Button>
              </div>
            </div>
          )}

          {/* ----------------- PASO 4: EVALUACIÓN Y GOLD STANDARD ----------------- */}
          {stepIndex === 3 && evaluation && (
            <div className="space-y-5">
              {/* Cabecera del Veredicto */}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-border-hairline pb-3">
                <div>
                  <span className="text-xs font-mono text-signal-ok font-semibold block">
                    Dictamen de cátedra
                  </span>
                  <h3 className="text-base font-bold text-text-primary font-serif">{activeCase.title}</h3>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                  <div className="text-right">
                    <span className="text-xs font-mono text-text-tertiary block">Nota final</span>
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
                <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">Acierto diagnóstico (45%)</span>
                    <span className="font-mono font-bold text-signal-ok">{evaluation.diagnosticScore.toFixed(1)}/10</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1">Confrontación con el cuadro patognomónico.</p>
                </div>

                <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">Criterio Ockham (25%)</span>
                    <span className="font-mono font-bold text-accent-primary">{evaluation.efficiencyScore.toFixed(1)}/10</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1">Economía diagnóstica y ausencia de pruebas redundantes.</p>
                </div>

                <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-text-primary">Plan terapéutico (30%)</span>
                    <span className="font-mono font-bold text-text-primary">{evaluation.planScore.toFixed(1)}/10</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1">Pertinencia y oportunidad de la intervención.</p>
                </div>
              </div>

              {/* Confrontación Cara a Cara */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-2">
                  <span className="text-xs font-mono text-text-tertiary font-semibold block">
                    Tu diagnóstico y plan:
                  </span>
                  <p className="text-xs font-semibold text-text-primary font-sans">{studentDiagnosis}</p>
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">{studentPlan}</p>
                </div>

                <div className="rounded-lg bg-signal-ok/10 p-3.5 border border-signal-ok/30 space-y-2">
                  <span className="text-xs font-mono text-signal-ok font-semibold block flex items-center gap-1.5">
                    <ShieldCheck size={13} /> Gold Standard de cátedra:
                  </span>
                  <p className="text-xs font-semibold text-text-primary font-sans">{activeCase.goldStandard.primaryDiagnosis}</p>
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">{activeCase.goldStandard.criticalActionOrPlan}</p>
                </div>
              </div>

              {/* Perlas Clínicas / Doctrinales */}
              {activeCase.goldStandard.clinicalPearls.length > 0 && (
                <div className="rounded-lg bg-bg-surface-2 p-3.5 border border-border-hairline space-y-2">
                  <span className="text-xs font-mono text-text-primary font-semibold flex items-center gap-1.5">
                    <BookOpen size={14} className="text-accent-primary" /> Perlas de cátedra para exámenes finales
                  </span>
                  <ul className="space-y-1">
                    {activeCase.goldStandard.clinicalPearls.map((p, idx) => (
                      <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                        <span className="text-accent-primary font-mono">•</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Observaciones y Sugerencias */}
              <div className="space-y-1.5">
                <span className="text-xs font-mono text-text-tertiary block">
                  Observaciones del tribunal evaluador:
                </span>
                <ul className="space-y-1">
                  {evaluation.feedback.map((fb, idx) => (
                    <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                      <span className="text-signal-ok font-mono">•</span>
                      <span>{fb}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Botón Reintentar */}
              <div className="pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setStepIndex(0);
                    setUnlockedInvestigations([]);
                    setStudentDiagnosis("");
                    setStudentPlan("");
                    setEvaluation(null);
                  }}
                >
                  <RotateCcw size={14} /> Reintentar Este Caso
                </Button>
              </div>
            </div>
          )}
        </div>
      </StepperShell>
    </div>
  );
};

