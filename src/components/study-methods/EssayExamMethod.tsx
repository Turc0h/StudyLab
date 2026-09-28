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
    if (score >= 9.0) return "text-signal-ok font-semibold";
    if (score >= 7.0) return "text-accent-primary font-semibold";
    if (score >= 4.0) return "text-highlighter font-semibold";
    return "text-rubric-red font-semibold";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ----------------- FASE 1: SETUP ----------------- */}
      {examState === "setup" && (
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface-2 text-text-primary border border-border-hairline">
                <FileText size={20} />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2">
                  Simulador de Exámenes a Desarrollo y Ensayos
                  <Badge variant="neutral" className="text-[11px] font-mono py-0">
                    Rúbrica de Cátedra
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
            <div className="flex items-center gap-2 border-b border-border-hairline pb-3">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono transition-colors ${
                  !isCustomMode
                    ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
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
                    ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                + Mi Propia Pregunta de Parcial
              </button>
            </div>

            {!isCustomMode ? (
              /* Selector de Consignas Precargadas */
              <div className="space-y-3">
                <label className="text-xs font-mono text-text-secondary block font-medium">
                  Selecciona la consigna de examen:
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
                            ? "bg-bg-surface-2 border-text-primary shadow-sm"
                            : "bg-bg-surface-1 border-border-hairline hover:bg-bg-surface-2"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono text-text-secondary font-semibold">
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
                  <label className="text-xs font-mono text-text-secondary block mb-1 font-medium">
                    Título o materia del examen:
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ej. Final de Obligaciones Civiles - Responsabilidad Subjetiva"
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 font-medium">
                    Consigna o pregunta a desarrollar:
                  </label>
                  <textarea
                    rows={3}
                    value={customPromptText}
                    onChange={(e) => setCustomPromptText(e.target.value)}
                    placeholder="Ej. Desarrolle los factores de atribución subjetivos y objetivos. Compare culpa y dolo con el riesgo creado..."
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline resize-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-text-secondary block mb-1 font-medium">
                    Palabras clave de cátedra requeridas (separadas por comas):
                  </label>
                  <input
                    type="text"
                    value={customKeywords}
                    onChange={(e) => setCustomKeywords(e.target.value)}
                    placeholder="dolo, culpa, antijuridicidad, nexo causal, dano, imputabilidad"
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline"
                  />
                </div>
              </div>
            )}

            {/* Parámetros de Tiempo y Palabras */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 pt-2">
              <div>
                <label className="text-[11px] font-mono text-text-secondary block mb-1 font-medium">
                  Tiempo límite:
                </label>
                <select
                  value={timeLimitMinutes}
                  onChange={(e) => setTimeLimitMinutes(Number(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary"
                >
                  <option value={10}>10 minutos (Flash)</option>
                  <option value={20}>20 minutos (Estándar)</option>
                  <option value={30}>30 minutos (Parcial)</option>
                  <option value={45}>45 minutos (Final extenso)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-text-secondary block mb-1 font-medium">
                  Objetivo de palabras:
                </label>
                <select
                  value={targetWords}
                  onChange={(e) => setTargetWords(Number(e.target.value))}
                  className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary"
                >
                  <option value={200}>~200 palabras (Síntesis concisa)</option>
                  <option value={350}>~350 palabras (Pregunta estándar)</option>
                  <option value={500}>~500 palabras (Ensayo medio)</option>
                  <option value={800}>~800 palabras (Desarrollo exhaustivo)</option>
                </select>
              </div>

              {folders.length > 0 && (
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[11px] font-mono text-text-secondary block mb-1 font-medium">
                    Vincular a cátedra:
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full rounded-lg bg-bg-surface-2 px-3 py-2 text-xs border border-border-hairline text-text-primary"
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
            <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline text-xs">
              <p className="font-semibold text-text-primary">{activePrompt.title}</p>
              <p className="text-text-secondary mt-1 leading-relaxed">{activePrompt.promptText}</p>
              {activePrompt.keywords.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  <span className="text-[10px] font-mono text-text-tertiary mr-1">Términos requeridos:</span>
                  {activePrompt.keywords.map((kw) => (
                    <span key={kw} className="rounded bg-bg-surface-3 text-text-primary border border-border-hairline px-1.5 py-0.5 text-[10px] font-mono">
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
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-surface-1 p-3.5 border border-border-hairline shadow-sm">
            <div>
              <span className="text-[11px] font-mono text-text-secondary block font-medium">
                Examen en progreso
              </span>
              <h3 className="text-sm font-bold text-text-primary font-serif">{activePrompt.title}</h3>
            </div>

            <div className="flex items-center gap-3">
              {/* Temporizador Regresivo */}
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-mono text-sm font-bold border ${
                  secondsRemaining < 120
                    ? "bg-rubric-red/10 text-rubric-red border-rubric-red/30"
                    : "bg-bg-surface-2 text-text-primary border-border-hairline"
                }`}
              >
                <Clock size={15} className={secondsRemaining < 120 ? "text-rubric-red" : "text-text-tertiary"} />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Contador de Palabras */}
              <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-bg-surface-2 text-xs font-mono border border-border-hairline">
                <span className="text-text-primary font-bold">{currentWordCount}</span>
                <span className="text-text-tertiary">/ {activePrompt.targetWords} palabras</span>
              </div>

              <Button size="sm" variant="secondary" onClick={handleDeliverExam}>
                <CheckCircle2 size={14} /> Entregar Examen
              </Button>
            </div>
          </div>

          {/* Consigna Desplegable */}
          <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline text-xs">
            <p className="text-text-secondary leading-relaxed font-sans">{activePrompt.promptText}</p>
          </div>

          {/* Guía de Estructura Universitaria Colapsable */}
          <div className="rounded-lg bg-bg-surface-1 border border-border-hairline overflow-hidden shadow-sm">
            <button
              type="button"
              onClick={() => setIsStructureOpen(!isStructureOpen)}
              className="w-full flex items-center justify-between p-2.5 text-xs font-mono text-text-tertiary hover:text-text-primary transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <GraduationCap size={13} className="text-text-secondary" />
                Estructura de Ensayo Académico Sugerida
              </span>
              {isStructureOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
            {isStructureOpen && (
              <div className="p-3 pt-0 grid grid-cols-2 gap-2 sm:grid-cols-4 text-[11px] border-t border-border-hairline mt-1">
                <div className="p-2 rounded bg-bg-surface-2 border border-border-hairline">
                  <span className="font-mono text-[10px] text-text-primary block font-bold">1. Tesis / Inicio</span>
                  <span className="text-text-tertiary">Definición inicial y encuadre del problema.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2 border border-border-hairline">
                  <span className="font-mono text-[10px] text-accent-primary block font-bold">2. Fundamentación</span>
                  <span className="text-text-tertiary">Mecanismos, doctrina y conceptos de cátedra.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2 border border-border-hairline">
                  <span className="font-mono text-[10px] text-text-secondary block font-bold">3. Casos Límites</span>
                  <span className="text-text-tertiary">Excepciones, contraejemplos u objeciones.</span>
                </div>
                <div className="p-2 rounded bg-bg-surface-2 border border-border-hairline">
                  <span className="font-mono text-[10px] text-text-primary block font-bold">4. Conclusión</span>
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
              className="w-full rounded-xl bg-bg-surface-1 p-4 font-serif text-sm leading-relaxed border border-border-hairline text-text-primary focus:outline-none focus:border-border-hairline shadow-inner resize-y"
            />
          </div>

          {/* Barra de Progreso de Extensión */}
          <div className="flex items-center gap-3 text-[10px] font-mono text-text-tertiary">
            <span>0</span>
            <div className="flex-1 h-1.5 rounded-full bg-bg-surface-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  currentWordCount >= activePrompt.targetWords ? "bg-signal-ok" : "bg-accent-primary"
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
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
            <div>
              <span className="text-[11px] font-mono text-text-secondary block font-medium">
                Dictamen y evaluación de cátedra
              </span>
              <CardTitle className="text-base font-bold text-text-primary font-serif">{activePrompt.title}</CardTitle>
            </div>

            {/* Calificación Global */}
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <div className="text-right">
                <span className="text-[10px] font-mono text-text-tertiary block">Nota final</span>
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
              <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Dominio Conceptual (35%)</span>
                  <span className="font-mono font-bold text-text-primary">{evaluation.conceptualScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Densidad de conceptos técnicos específicos utilizados de la disciplina.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Estructura & Cohesión (25%)</span>
                  <span className="font-mono font-bold text-text-primary">{evaluation.structureScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Articulación de tesis inicial, desarrollo y conclusión formal de cierre.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Rigor Crítico & Casos Límites (20%)</span>
                  <span className="font-mono font-bold text-text-primary">{evaluation.criticalRigorScore.toFixed(1)}/10</span>
                </div>
                <p className="text-[11px] text-text-tertiary mt-1">
                  Presencia de conectores causales, excepciones o contrastes de doctrina.
                </p>
              </div>

              <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary">Claridad & Concisión (20%)</span>
                  <span className="font-mono font-bold text-text-primary">{evaluation.clarityScore.toFixed(1)}/10</span>
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
                  ? "bg-system-notice-bg border-system-notice-border text-text-primary"
                  : "bg-bg-surface-2 border-border-hairline text-text-primary"
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {evaluation.fillerCount > 0 ? (
                  <AlertTriangle size={16} className="text-highlighter" />
                ) : (
                  <ShieldCheck size={16} className="text-signal-ok" />
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
              <div className="rounded-lg bg-bg-surface-2 p-3 border border-border-hairline space-y-2">
                <span className="text-[11px] font-mono text-text-secondary block font-medium">
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
                            ? "bg-bg-surface-1 text-text-primary border-border-hairline font-medium"
                            : "bg-bg-surface-2 text-text-tertiary border-border-hairline line-through opacity-60"
                        }`}
                      >
                        <span className={included ? "text-signal-ok font-bold" : ""}>{included ? "✓" : "✗"}</span> {kw}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Devolución Pedagógica */}
            <div className="space-y-2">
              <span className="text-xs font-mono text-text-secondary block font-medium">
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
