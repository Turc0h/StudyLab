import React, { useState, useEffect, useMemo, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { db } from "../../db/db";
import {
  PRESET_ESSAY_PROMPTS,
  evaluateEssay,
  saveEssaySessionRecord,
  type EssayPrompt,
  type EssayRubricEvaluation,
} from "../../features/essay-grader/essayGraderEngine";
import {
  FileText,
  Clock,
  Send,
  RotateCcw,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  BookOpen,
} from "lucide-react";

interface EssayExamMethodProps {
  onFinish?: () => void;
}

type ExamState = "setup" | "writing" | "evaluated";

export const EssayExamMethod: React.FC<EssayExamMethodProps> = ({ onFinish }) => {
  const folders = useLiveQuery(() => db.folders.where("type").equals("subject").toArray(), []) || [];

  // Setup state
  const [selectedPrompt, setSelectedPrompt] = useState<EssayPrompt>(PRESET_ESSAY_PROMPTS[0]);
  const [customTitle, setCustomTitle] = useState("");
  const [customPromptText, setCustomPromptText] = useState("");
  const [customKeywords, setCustomKeywords] = useState("");
  const [targetWords, setTargetWords] = useState<number>(350);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number>(20);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);

  // Runner state
  const [examState, setExamState] = useState<ExamState>("setup");
  const [essayText, setEssayText] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20 * 60);
  const [startTime, setStartTime] = useState<number>(0);
  const [isStructureOpen, setIsStructureOpen] = useState<boolean>(false);
  const [evaluation, setEvaluation] = useState<EssayRubricEvaluation | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Active prompt reference
  const activePrompt: EssayPrompt = useMemo(() => {
    if (!isCustomMode) return selectedPrompt;
    return {
      id: "custom",
      title: customTitle.trim() || "Consigna Personalizada de Cátedra",
      discipline: "General",
      promptText: customPromptText.trim() || "Desarrolle el tema propuesto fundamentando teóricamente.",
      targetWords,
      timeLimitMinutes,
      keywords: customKeywords.split(",").map((k) => k.trim()).filter(Boolean),
      rubricHint: "Evaluar coherencia, rigor conceptual y ausencia de relleno.",
    };
  }, [isCustomMode, selectedPrompt, customTitle, customPromptText, targetWords, timeLimitMinutes, customKeywords]);

  // Live word counter
  const currentWordCount = useMemo(() => {
    if (!essayText.trim()) return 0;
    return essayText.trim().split(/\s+/).filter(Boolean).length;
  }, [essayText]);

  // Timer effect
  useEffect(() => {
    if (examState !== "writing") return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleDeliverExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examState]);

  const handleStartExam = () => {
    setSecondsRemaining(activePrompt.timeLimitMinutes * 60);
    setStartTime(Date.now());
    setEssayText("");
    setEvaluation(null);
    setExamState("writing");
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const handleDeliverExam = async () => {
    const elapsedSec = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    const result = evaluateEssay(essayText, activePrompt.targetWords, activePrompt.keywords);
    setEvaluation(result);
    setExamState("evaluated");

    try {
      await saveEssaySessionRecord(activePrompt.title, elapsedSec, selectedFolderId || null);
    } catch {
      // Non-critical session logging
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getScoreColorClass = (score: number) => {
    if (score >= 9.0) return "text-emerald-400";
    if (score >= 7.0) return "text-cyan-400";
    if (score >= 4.0) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ----------------- FASE 1: SETUP ----------------- */}
      {examState === "setup" && (
        <Card className="border-border-subtle bg-bg-surface/90 backdrop-blur-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
                <FileText size={20} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
                  Simulador de Exámenes a Desarrollo y Ensayos
                  <Badge variant="accent" className="text-[10px] font-mono py-0">
                    RÚBRICA DE CÁTEDRA
                  </Badge>
                </CardTitle>
                <p className="text-xs text-text-tertiary">
                  Entrena la redacción de respuestas extensas, detección de "humo" y densidad conceptual bajo tiempo.
                </p>
              </div>
            </div>
          </CardHeader>

          <div className="p-5 pt-0 space-y-5">
            {/* Modalidad: Presets vs Personalizada */}
            <div className="flex items-center gap-2 border-b border-border-subtle/60 pb-3">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
                  !isCustomMode
                    ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                Consignas Universitarias Precargadas
              </button>
              <button
                type="button"
                onClick={() => setIsCustomMode(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
                  isCustomMode
                    ? "bg-accent-primary/20 text-accent-primary border border-accent-primary/30"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                + Mi Propia Pregunta de Parcial
              </button>
            </div>

            {!isCustomMode ? (
              /* Selector de Consignas Precargadas */
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase text-text-tertiary block">
                  Selecciona la Consigna de Examen:
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {PRESET_ESSAY_PROMPTS.map((p) => {
                    const isSel = selectedPrompt.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSelectedPrompt(p);
                          setTargetWords(p.targetWords);
                          setTimeLimitMinutes(p.timeLimitMinutes);
                        }}
                        className={`text-left p-3 rounded-lg border transition-all ${
                          isSel
                            ? "bg-accent-primary/10 border-accent-primary/40 shadow-sm"
                            : "bg-bg-surface-2/60 border-border-subtle/60 hover:border-border-subtle"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase text-cyan-400 font-semibold">
                            {p.discipline}
                          </span>
                          <span className="text-[10px] font-mono text-text-tertiary flex items-center gap-1">
                            <Clock size={10} /> {p.timeLimitMinutes}m · {p.targetWords}p
                          </span>
                        </div>
                        <h4 className="text-xs font-semibold text-text-primary mt-1.5 line-clamp-1">{p.title}</h4>
                        <p className="text-[11px] text-text-secondary mt-1 line-clamp-2 leading-relaxed">
                          {p.promptText}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Formulario de Consigna Personalizada */
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono uppercase text-text-tertiary block mb-1">
                    Título o Materia del Examen:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej. Final de Obligaciones Civiles - Responsabilidad Subjetiva"
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-text-tertiary block mb-1">
                    Consigna o Pregunta a Desarrollar:
                  </label>
                  <textarea
                    rows={3}
                    value={customPromptText}
                    onChange={(e) => setCustomPromptText(e.target.value)}
                    placeholder="Ej. Desarrolle los factores de atribución subjetivos y objetivos. Compare culpa y dolo con el riesgo creado..."
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary focus:outline-none focus:border-accent-primary resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-text-tertiary block mb-1">
                    Palabras Clave de Cátedra Requeridas (separadas por comas):
                  </label>
                  <input
                    type="text"
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    placeholder="dolo, culpa, antijuridicidad, nexo causal, dano, imputabilidad"
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary focus:outline-none focus:border-accent-primary"
                  />
                </div>
              </div>
            )}

            {/* Parámetros de Tiempo y Palabras */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-2">
              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Tiempo Límite:
                </label>
                <select
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary"
                >
                  <option value={10}>10 minutos (Flash)</option>
                  <option value={20}>20 minutos (Estándar)</option>
                  <option value={30}>30 minutos (Parcial)</option>
                  <option value={45}>45 minutos (Final extenso)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                  Objetivo de Palabras:
                </label>
                <select
                  value={targetWords}
                  onChange={(e) => setTargetWords(Number(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary"
                >
                  <option value={200}>~200 palabras (Síntesis concisa)</option>
                  <option value={350}>~350 palabras (Pregunta estándar)</option>
                  <option value={500}>~500 palabras (Ensayo medio)</option>
                  <option value={800}>~800 palabras (Desarrollo exhaustivo)</option>
                </select>
              </div>

              {folders.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-mono uppercase text-text-tertiary block mb-1">
                    Vincular a Cátedra:
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-subtle text-text-primary"
                  >
                    <option value="">(Sin cátedra asignada)</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Preview de la Consigna Activa */}
            <div className="rounded-lg bg-bg-surface-2/40 p-3 border border-border-subtle text-xs">
              <p className="font-semibold text-text-primary">{activePrompt.title}</p>
              <p className="text-text-secondary mt-1 leading-relaxed">{activePrompt.promptText}</p>
              {activePrompt.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  <span className="text-[10px] font-mono text-text-tertiary uppercase mr-1">Términos requeridos:</span>
                  {activePrompt.keywords.map((kw) => (
                    <span key={kw} className="rounded bg-accent-primary/10 text-accent-primary px-1.5 py-0.5 text-[10px] font-mono">
                      {kw}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleStartExam} variant="primary" className="w-full justify-center py-2.5">
              <Send size={15} /> Iniciar Redacción de Examen
            </Button>
          </div>
        </Card>
      )}

      {/* ----------------- FASE 2: REDACCIÓN EN VIVO ----------------- */}
      {examState === "writing" && (
        <div className="space-y-4">
          {/* Header de Examen en Vivo */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-surface/90 p-3.5 border border-border-subtle">
            <div>
              <span className="text-[10px] font-mono text-accent uppercase tracking-wider block">
                EXAMEN EN PROGRESO
              </span>
              <h3 className="text-sm font-bold text-text-primary">{activePrompt.title}</h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Temporizador Regresivo */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-sm font-bold border ${
                  secondsRemaining < 120
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse"
                    : "bg-bg-surface-2 text-text-primary border-border-subtle"
                }`}
              >
                <Clock size={15} className={secondsRemaining < 120 ? "text-rose-400" : "text-cyan-400"} />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Contador de Palabras */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-bg-surface-2 text-xs font-mono border border-border-subtle">
                <span className="text-text-primary font-bold">{currentWordCount}</span>
                <span className="text-text-tertiary">/ {activePrompt.targetWords} palabras</span>
              </div>

              <Button size="sm" variant="secondary" onClick={handleDeliverExam}>
                <CheckCircle2 size={14} /> Entregar Examen
              </Button>
            </div>
          </div>

          {/* Consigna Desplegable */}
          <div className="rounded-lg bg-bg-surface-2/40 p-3 border border-border-subtle text-xs">
            <p className="text-text-secondary leading-relaxed font-sans">{activePrompt.promptText}</p>
          </div>

          {/* Guía de Estructura Universitaria Colapsable */}
          <div className="rounded-lg bg-bg-surface-2/30 border border-border-subtle overflow-hidden">
            <button
              type="button"
              onClick={() => setIsStructureOpen(!isStructureOpen)}
              className="w-full flex items-center justify-between p-2.5 text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-accent" />
                Estructura de Ensayo Académico Sugerida
              </span>
              {isStructureOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isStructureOpen && (
              <div className="p-3 pt-0 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px] border-t border-border-subtle/40 mt-1">
                <div className="p-2 rounded bg-bg-surface-2/60">
                  <span className="font-mono text-[10px] text-cyan-400 block font-bold">1. Tesis / Inicio</span>
                  <span className="text-text-tertiary">Definición inicial y encuadre del problema.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2/60">
                  <span className="font-mono text-[10px] text-emerald-400 block font-bold">2. Fundamentación</span>
                  <span className="text-text-tertiary">Mecanismos, doctrina y conceptos de cátedra.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2/60">
                  <span className="font-mono text-[10px] text-amber-400 block font-bold">3. Casos Límites</span>
                  <span className="text-text-tertiary">Excepciones, contraejemplos u objeciones.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2/60">
                  <span className="font-mono text-[10px] text-purple-400 block font-bold">4. Conclusión</span>
                  <span className="text-text-tertiary">Síntesis integradora y juicio crítico final.</span>
                </div>
              </div>
            )}
          </div>

          {/* Área de Redacción Principal */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={14}
              value={essayText}
              onChange={(e) => setEssayText(e.target.value)}
              placeholder="Comience aquí la redacción de su examen a desarrollo. Organice sus párrafos de forma lógica y use los términos teóricos pertinentes..."
              className="w-full rounded-xl bg-bg-surface/95 p-4 font-serif text-sm leading-relaxed border border-border-subtle text-text-primary focus:outline-none focus:border-accent-primary shadow-inner resize-y"
            />
          </div>

          {/* Barra de Progreso de Extensión */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-text-tertiary">
            <span>0</span>
            <div className="flex-1 h-1.5 rounded-full bg-bg-surface-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  currentWordCount >= activePrompt.targetWords ? "bg-emerald-400" : "bg-cyan-500"
                }`}
                style={{ width: `${Math.min(100, (currentWordCount / activePrompt.targetWords) * 100)}%` }}
              />
            </div>
            <span>{activePrompt.targetWords} palabras</span>
          </div>
        </div>
      )}

      {/* ----------------- FASE 3: EVALUACIÓN Y RÚBRICA ----------------- */}
      {examState === "evaluated" && evaluation && (
        <Card className="border-border-subtle bg-bg-surface/90 backdrop-blur-md">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div>
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
                DICTAMEN Y EVALUACIÓN DE CÁTEDRA
              </span>
              <CardTitle className="text-base font-bold text-text-primary">{activePrompt.title}</CardTitle>
            </div>

            {/* Calificación Global */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-mono uppercase text-text-tertiary block">Nota Final</span>
                <span className={`text-2xl font-mono font-bold ${getScoreColorClass(evaluation.totalScore)}`}>
                  {evaluation.totalScore.toFixed(1)}{" "}
                  <span className="text-xs font-normal text-text-tertiary">/ 10</span>
                </span>
              </div>
              <Badge
                variant={
                  evaluation.totalScore >= 9.0
                    ? "success"
                    : evaluation.totalScore >= 7.0
                    ? "accent"
                    : evaluation.totalScore >= 4.0
                    ? "warning"
                    : "danger"
                }
                className="text-xs font-mono py-1"
              >
                {evaluation.verdictCategory}
              </Badge>
            </div>
          </CardHeader>

          <div className="p-5 pt-0 space-y-5">
            {/* Rúbrica en 4 Dimensiones */}
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Dominio Conceptual (35%)</span>
                  <span className="font-mono font-bold text-cyan-400">{evaluation.conceptualScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Densidad de conceptos técnicos específicos utilizados de la disciplina.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Estructura & Cohesión (25%)</span>
                  <span className="font-mono font-bold text-emerald-400">{evaluation.structureScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Articulación de tesis inicial, desarrollo y conclusión formal de cierre.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Rigor Crítico & Casos Límites (20%)</span>
                  <span className="font-mono font-bold text-purple-400">{evaluation.criticalRigorScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Presencia de conectores causales, excepciones o contrastes de doctrina.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2/60 p-3 border border-border-subtle/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Claridad & Concisión (20%)</span>
                  <span className="font-mono font-bold text-amber-400">{evaluation.clarityScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Penalización por verborragia vacía y frases cliché sin peso conceptual.
                </p>
              </div>
            </div>

            {/* Detector de Humo / Verborragia */}
            <div
              className={`rounded-lg p-3 border text-xs flex items-start gap-3 ${
                evaluation.fillerCount > 0
                  ? "bg-amber-500/10 border-amber-500/25 text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {evaluation.fillerCount > 0 ? (
                  <AlertTriangle size={16} className="text-amber-400" />
                ) : (
                  <ShieldCheck size={16} className="text-emerald-400" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  Detector de Verborragia y Frases de Relleno:{" "}
                  <span className="font-mono">
                    {evaluation.fillerCount} detectadas ({evaluation.verbiageRatioPct}% del texto)
                  </span>
                </p>
                <p className="text-text-secondary mt-0.5">
                  {evaluation.fillerCount === 0
                    ? "Excelente economía del lenguaje: redacción limpia, sin frases vacías ni rellenos retóricos."
                    : "Se identificaron expresiones que no agregan valor de cátedra. Procura reemplazarlas por terminología técnica directa."}
                </p>
              </div>
            </div>

            {/* Cobertura de Conceptos Clave */}
            {activePrompt.keywords.length > 0 && (
              <div className="rounded-lg bg-bg-surface-2/40 p-3 border border-border-subtle space-y-2">
                <span className="text-[10px] font-mono uppercase text-text-tertiary block">
                  Cobertura de Conceptos Clave de Cátedra:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {activePrompt.keywords.map((kw) => {
                    const included = evaluation.detectedKeywords.includes(kw);
                    return (
                      <span
                        key={kw}
                        className={`rounded px-2 py-0.5 text-xs font-mono border flex items-center gap-1 ${
                          included
                            ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                            : "bg-bg-surface-2 text-text-tertiary border-border-subtle line-through opacity-60"
                        }`}
                      >
                        {included ? "✓" : "✗"} {kw}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Devolución Pedagógica */}
            <div className="space-y-2">
              <span className="text-xs font-mono uppercase text-text-tertiary block">
                Observaciones y Sugerencias de Mejora:
              </span>
              <ul className="space-y-1.5">
                {evaluation.feedback.map((fb, idx) => (
                  <li key={idx} className="text-xs text-text-secondary flex items-start gap-2">
                    <span className="text-accent font-mono">•</span>
                    <span>{fb}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Botones de Acción */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border-subtle/60">
              <Button
                variant="secondary"
                onClick={() => {
                  setExamState("writing");
                }}
              >
                <RotateCcw size={14} /> Reintentar / Pulir Redacción
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setExamState("setup");
                }}
              >
                <BookOpen size={14} /> Nueva Consigna de Examen
              </Button>

              {onFinish && (
                <Button variant="ghost" onClick={onFinish} className="ml-auto">
                  Finalizar Sesión
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
