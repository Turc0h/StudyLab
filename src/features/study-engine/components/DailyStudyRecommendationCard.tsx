import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Badge } from "../../../components/ui/Badge";
import { generateDailyStudyAgenda } from "../recommendationEngine";
import { ErrorBankModal } from "./ErrorBankModal";
import { TimeBudgetSelector } from "./TimeBudgetSelector";
import { ExamPlannerModal } from "./ExamPlannerModal";
import { RetentionForecastPanel } from "../../fsrs/components/RetentionForecastPanel";
import { Modal } from "../../../components/ui/Modal";
import type { DailyStudyAgenda } from "../types";
import {
  BrainCircuit,
  Clock,
  ArrowRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  GraduationCap,
  Network,
  Activity,
} from "lucide-react";

export const DailyStudyRecommendationCard: React.FC = () => {
  const [agenda, setAgenda] = useState<DailyStudyAgenda | null>(null);
  const [loading, setLoading] = useState(true);
  const [isErrorBankOpen, setIsErrorBankOpen] = useState(false);
  const [isExamPlannerOpen, setIsExamPlannerOpen] = useState(false);
  const [isRetentionOpen, setIsRetentionOpen] = useState(false);

  const loadAgenda = async () => {
    setLoading(true);
    try {
      const data = await generateDailyStudyAgenda();
      setAgenda(data);
    } catch (err) {
      console.error("Error loading daily study agenda:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAgenda();
  }, []);

  if (loading || !agenda) {
    return (
      <Card elevated className="p-5 border-l-4 border-l-accent-primary animate-pulse flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="h-5 w-5 text-accent-primary animate-spin" />
          <span className="font-mono text-xs text-text-secondary">
            Calculando mapa de dominio 4D y evaluando deuda cognitiva...
          </span>
        </div>
      </Card>
    );
  }

  return (
    <Card
      elevated
      className="p-5 md:p-6 border-l-4 border-l-accent-primary bg-gradient-to-r from-bg-surface-1 to-bg-surface-2/80 shadow-md flex flex-col gap-4 relative overflow-hidden"
    >
      {/* Background Decorative Neon Glow */}
      <div className="absolute -top-16 -right-16 w-48 h-48 bg-accent-primary/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header with Title and Study Debt Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle/70 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent-primary/15 text-accent-primary border border-accent-primary/30">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-accent-primary font-bold">
                CognitiveOS v5.0 · Motor de Recomendación
              </span>
              <Badge variant="accent" className="font-mono text-[10px]">
                Adaptive Engine
              </Badge>
            </div>
            <h3 className="font-serif text-lg md:text-xl font-semibold text-text-primary tracking-tight">
              ¿Qué debería estudiar hoy y por qué?
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-bg-surface-2 border border-border-subtle text-xs font-mono">
            <Clock className="h-3.5 w-3.5 text-warning" />
            <span className="text-text-muted">Deuda de estudio:</span>
            <span className="font-bold text-text-primary">
              {agenda.totalDebtMinutes > 0 ? `${agenda.totalDebtMinutes} min` : "0 min (Al día)"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => void loadAgenda()}
            className="p-1.5 rounded-lg border border-border-subtle text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors cursor-pointer"
            title="Recalcular recomendaciones"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Rationale & Recommendation Headline */}
      <div className="flex flex-col gap-1.5">
        <h4 className="font-sans font-semibold text-sm md:text-base text-text-primary flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-primary shrink-0" />
          <span>{agenda.headline}</span>
        </h4>
        <p className="font-sans text-xs md:text-sm text-text-secondary leading-relaxed">
          {agenda.rationale}
        </p>
      </div>

      {/* Actionable Pillars (Urgent FSRS Reviews, Conceptual Gaps, Prerequisites) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
        {/* Pillar 1: Repasos Urgentes */}
        <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface-1/90 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent-primary" />
                Repaso Espaciado
              </span>
              <Badge variant={agenda.urgentReviews.cardCount > 0 ? "warning" : "success"}>
                {agenda.urgentReviews.cardCount} tarjetas
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted leading-snug mt-1">
              {agenda.urgentReviews.cardCount > 0
                ? `${agenda.urgentReviews.estimatedMinutes} min estimados. Preserva la curva de retención antes del olvido.`
                : "Sin tarjetas pendientes en la fecha actual. Memoria consolidada."}
            </p>
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            {agenda.urgentReviews.cardCount > 0 ? (
              <Link to="/methods" className="w-full">
                <Button size="sm" variant="outline" className="w-full text-xs font-mono justify-between">
                  <span>Repasar con FSRS</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
            ) : null}

            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsRetentionOpen(true)}
              className="w-full text-xs font-mono justify-between text-accent-secondary border-border-subtle"
            >
              <span className="flex items-center gap-1.5">
                <Activity className="h-3 w-3" /> Pronóstico &amp; Retención FSRS
              </span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Pillar 2: Lagunas Conceptuales Críticas */}
        <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface-1/90 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                Lagunas del Error Bank
              </span>
              <Badge variant={agenda.conceptualGaps.length > 0 ? "danger" : "neutral"}>
                {agenda.conceptualGaps.length} críticas
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted leading-snug mt-1">
              {agenda.conceptualGaps.length > 0
                ? `Concepto prioritario: "${agenda.conceptualGaps[0].conceptName}". Explicación o auditoría requerida.`
                : "No se registran contradicciones ni errores conceptuales graves abiertos."}
            </p>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsErrorBankOpen(true)}
            className="w-full text-xs font-mono justify-between text-warning border-warning/40 hover:bg-warning/10"
          >
            <span>Ver Error Bank ({agenda.conceptualGaps.length})</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Pillar 3: Prerrequisitos y Grafo */}
        <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface-1/90 flex flex-col justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-bold text-text-primary flex items-center gap-1.5">
                <Network className="h-3.5 w-3.5 text-accent-secondary" />
                Cuellos de Botella DAG
              </span>
              <Badge variant={agenda.bottleneckPrerequisites.length > 0 ? "accent" : "neutral"}>
                {agenda.bottleneckPrerequisites.length} bloqueos
              </Badge>
            </div>
            <p className="text-[11px] text-text-muted leading-snug mt-1">
              {agenda.bottleneckPrerequisites.length > 0
                ? `"${agenda.bottleneckPrerequisites[0].conceptName}" frena el avance en ${agenda.bottleneckPrerequisites[0].blockedDownstreamCount} temas derivados.`
                : "Flujo de dependencias en el Grafo Causal sin bloqueos detectados."}
            </p>
          </div>

          <Link to="/knowledge-graph" className="w-full">
            <Button size="sm" variant="outline" className="w-full text-xs font-mono justify-between">
              <span>Explorar en Grafo</span>
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Time Budget Selector (Sección 18: "Tengo 20 / 45 / 90 min") */}
      <TimeBudgetSelector className="mt-1" />

      {/* Upcoming Exam Alert if configured */}
      {agenda.examAlerts.length > 0 ? (
        <div className="mt-1 p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 flex flex-wrap items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="h-4 w-4 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-rose-200">
                Mesa de Examen: {agenda.examAlerts[0].subjectName}
              </span>
              <span className="text-text-muted mx-1.5">•</span>
              <span className="text-text-secondary">
                Faltan {agenda.examAlerts[0].daysRemaining} días ({agenda.examAlerts[0].currentPhase})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden md:inline font-mono text-[11px] text-rose-300">
              Hito: {agenda.examAlerts[0].recommendedFocus}
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExamPlannerOpen(true)}
              className="text-[11px] font-mono text-rose-300 border-rose-500/40 hover:bg-rose-500/10"
            >
              Ajustar Plan R(t)
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-1 p-3 rounded-xl border border-border-subtle bg-bg-surface-2/40 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-text-muted">
            <GraduationCap className="h-4 w-4 text-accent-secondary" />
            <span>¿Tenés un parcial o final próximo? Calculá tu curva de retención óptima.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsExamPlannerOpen(true)}
            className="text-[11px] font-mono"
          >
            Planificar Parcial
          </Button>
        </div>
      )}

      {/* Error Bank Modal */}
      <ErrorBankModal
        open={isErrorBankOpen}
        onClose={() => {
          setIsErrorBankOpen(false);
          void loadAgenda();
        }}
      />

      {/* Exam Planner Modal (Sección 19-BIS) */}
      <ExamPlannerModal
        open={isExamPlannerOpen}
        onClose={() => {
          setIsExamPlannerOpen(false);
          void loadAgenda();
        }}
      />

      {/* Retention & Forecast Modal (Sección 20-BIS & 22-BIS) */}
      <Modal
        open={isRetentionOpen}
        onClose={() => {
          setIsRetentionOpen(false);
          void loadAgenda();
        }}
        title="Panel de Retención y Sostenibilidad FSRS"
        maxWidth="max-w-4xl"
      >
        <RetentionForecastPanel
          onStudyConcept={(_conceptId) => {
            setIsRetentionOpen(false);
            window.location.href = "/methods";
          }}
        />
      </Modal>
    </Card>
  );
};
