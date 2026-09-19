import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db.ts";
import {
  calculateOralRubricScore,
  generateJuryQuestions,
  saveOralSessionRecord,
  type OralRubricScores,
  type JuryQuestion,
  type RubricEvaluationResult,
} from "../../features/oral-defense/oralDefenseEngine.ts";
import {
  Mic,
  MicOff,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  UserCheck,
  Award,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface OralDefenseMethodProps {
  onSessionFinished?: () => void;
}

type Phase = "setup" | "exposition" | "questions" | "rubric";

export const OralDefenseMethod: React.FC<OralDefenseMethodProps> = ({ onSessionFinished }) => {
  const [phase, setPhase] = useState<Phase>("setup");

  // Configuración de la defensa
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [topic, setTopic] = useState<string>("");
  const [expoMinutes, setExpoMinutes] = useState<number>(5);
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [cheatSheetNotes, setCheatSheetNotes] = useState<string>("");

  // Estado en ejecución
  const [isCheatSheetVisible, setIsCheatSheetVisible] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(300);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  // Rondas de preguntas
  const [questions, setQuestions] = useState<JuryQuestion[]>([]);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState<number>(0);
  const [questionTimer, setQuestionTimer] = useState<number>(90);

  // Dictado por voz opcional
  const [isListening, setIsListening] = useState<boolean>(false);
  const [spokenWordCount, setSpokenWordCount] = useState<number>(0);

  // Rúbrica de autoevaluación (1 a 5)
  const [rubricScores, setRubricScores] = useState<OralRubricScores>({
    conceptualMastery: 4,
    terminologyRigor: 4,
    timeManagement: 4,
    objectionHandling: 3,
    calmPoise: 4,
  });
  const [evalResult, setEvalResult] = useState<RubricEvaluationResult | null>(null);

  // Carpetas y conceptos de Dexie
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const concepts = useLiveQuery(() => db.concepts.toArray(), []) ?? [];

  // Iniciar la exposición oral
  const handleStartExposition = () => {
    const finalTopic = topic.trim() || (selectedFolderId ? folders.find((f) => f.id === selectedFolderId)?.name : "Tema de Cátedra") || "Exposición de Cátedra";
    const relevantConceptNames = concepts.slice(0, 5).map((c) => c.name);

    const generated = generateJuryQuestions(finalTopic, relevantConceptNames, questionCount);
    setQuestions(generated);

    setTimeRemaining(expoMinutes * 60);
    setIsTimerRunning(true);
    setSessionStartTime(Date.now());
    setSpokenWordCount(0);
    setPhase("exposition");
  };

  // Manejo del temporizador de exposición
  useEffect(() => {
    if (phase !== "exposition" || !isTimerRunning) return;

    if (timeRemaining <= 0) {
      setIsTimerRunning(false);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, isTimerRunning, timeRemaining]);

  // Manejo del temporizador de preguntas del tribunal
  useEffect(() => {
    if (phase !== "questions") return;

    const interval = setInterval(() => {
      setQuestionTimer((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, currentQuestionIdx]);

  // Transición a la fase de preguntas
  const handleProceedToQuestions = () => {
    setIsTimerRunning(false);
    setIsListening(false);
    setCurrentQuestionIdx(0);
    setQuestionTimer(questions[0]?.recommendedTimeSec || 90);
    setPhase("questions");
  };

  // Siguiente pregunta o finalizar
  const handleNextQuestion = () => {
    if (currentQuestionIdx + 1 < questions.length) {
      const nextIdx = currentQuestionIdx + 1;
      setCurrentQuestionIdx(nextIdx);
      setQuestionTimer(questions[nextIdx]?.recommendedTimeSec || 90);
    } else {
      // Pasar a la rúbrica
      const result = calculateOralRubricScore(rubricScores);
      setEvalResult(result);
      setPhase("rubric");
    }
  };

  // Dictado opcional con Web Speech API
  const toggleSpeechRecognition = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("El reconocimiento de voz no está soportado en este navegador.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "es-ES";

      recognition.onresult = (event: any) => {
        let totalWords = 0;
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const words = transcript.trim().split(/\s+/).filter(Boolean);
          totalWords += words.length;
        }
        setSpokenWordCount(totalWords);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [isListening]);

  // Actualizar rúbrica y guardar
  const handleScoreChange = (key: keyof OralRubricScores, value: number) => {
    const updated = { ...rubricScores, [key]: value };
    setRubricScores(updated);
    setEvalResult(calculateOralRubricScore(updated));
  };

  const handleFinishAndSave = async () => {
    const totalDurationSec = Math.max(1, Math.round((Date.now() - sessionStartTime) / 1000));
    const finalTopic = topic.trim() || "Examen Oral";
    const grade = evalResult?.finalGrade || 7.0;

    await saveOralSessionRecord({
      topic: finalTopic,
      subjectFolderId: selectedFolderId || null,
      durationSec: totalDurationSec,
      rubric: rubricScores,
      finalGrade: grade,
      keyNotesCount: cheatSheetNotes.split("\n").filter(Boolean).length,
    });

    onSessionFinished?.();
  };

  // Formato mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      {/* 1. SETUP DE EXPOSICIÓN */}
      {phase === "setup" && (
        <Card className="border-indigo-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40">
                <Mic className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  Simulador de Coloquios y Exámenes Orales
                  <Badge variant="neutral" className="text-xs uppercase tracking-wider">
                    Defensa de Cátedra
                  </Badge>
                </CardTitle>
                <p className="text-xs text-slate-400 mt-1">
                  Entrena la elocuencia, estructura temporal y capacidad de respuesta ante objeciones docentes bajo condiciones reales de mesa examinadora.
                </p>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Materia y Tema */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Materia o Cátedra:</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Seleccionar materia (opcional)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-200">Tema o Tesis a Exponer:</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Principio de Bernoulli y sustentación aerodinámica..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-3.5 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Duración de la Exposición */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Tiempo de Exposición Formal:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { min: 3, label: "3 min (Flash)", desc: "Síntesis extrema de coloquio" },
                  { min: 5, label: "5 min (Estándar)", desc: "Examen final universitario" },
                  { min: 10, label: "10 min (Defensa)", desc: "Tesina o proyecto integrador" },
                ].map((item) => (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => setExpoMinutes(item.min)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-all ${
                      expoMinutes === item.min
                        ? "border-indigo-500 bg-indigo-500/10 text-indigo-300 ring-1 ring-indigo-500/50"
                        : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-sm font-bold">{item.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ficha de Ponencia / Tarjeta de Memoria */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-200">
                  Ficha de Ponencia (Notas permitidas en mesa):
                </label>
                <span className="text-[11px] text-slate-400">Máx 5 viñetas guía (palabras clave)</span>
              </div>
              <textarea
                rows={3}
                value={cheatSheetNotes}
                onChange={(e) => setCheatSheetNotes(e.target.value)}
                placeholder="• Definición y ecuación gobernante&#10;• Hipótesis de fluido incompresible&#10;• Analogía del tubo Venturi&#10;• Límites en flujo supersónico"
                className="w-full rounded-lg border border-slate-700 bg-slate-800/90 p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none font-mono"
              />
            </div>

            {/* Cantidad de Preguntas del Tribunal */}
            <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/40 p-4">
              <div>
                <div className="text-sm font-semibold text-slate-200">Preguntas del Tribunal Docente:</div>
                <div className="text-xs text-slate-400">Rondas de contra-preguntas de profesores tras la exposición</div>
              </div>
              <div className="flex items-center gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuestionCount(n)}
                    className={`h-8 w-10 rounded font-bold text-xs ${
                      questionCount === n
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de Inicio */}
            <div className="flex items-center justify-between pt-2">
              <Button variant="ghost" onClick={onSessionFinished} className="text-slate-400">
                Volver al catálogo
              </Button>
              <Button
                onClick={handleStartExposition}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-indigo-950/40 flex items-center gap-2"
              >
                <Mic className="h-4 w-4" />
                Comenzar Exposición Oral
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 2. EXPOSICIÓN ORAL EN VIVO */}
      {phase === "exposition" && (
        <div className="space-y-4">
          <Card className="border-indigo-500/40 bg-slate-900/95 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="accent" className="bg-indigo-600 text-white font-mono">
                    FASE 1: EXPOSICIÓN DEL TEMA
                  </Badge>
                  <span className="text-xs text-slate-400 font-semibold">{topic || "Exposición"}</span>
                </div>

                {/* Temporizador Regresivo */}
                <div
                  className={`flex items-center gap-2 font-mono text-xl font-black px-4 py-1.5 rounded-lg border ${
                    timeRemaining <= 60
                      ? "border-amber-500/60 bg-amber-950/40 text-amber-400 animate-pulse"
                      : "border-slate-700 bg-slate-800 text-indigo-400"
                  }`}
                >
                  <Clock className="h-5 w-5" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </CardHeader>

            <div className="p-8 space-y-6 text-center">
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-400 ring-4 ring-indigo-500/30">
                <Mic className="h-10 w-10 animate-pulse" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-white">Diserta con voz clara y proyección firme</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
                  Imagina al tribunal docente frente a ti. Estructura tu relato: introduce la tesis central, demuestra las deducciones de base y anticipa las limitaciones prácticas.
                </p>
              </div>

              {/* Dictado y telemetría de habla */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSpeechRecognition}
                  className={`text-xs flex items-center gap-1.5 ${
                    isListening
                      ? "border-red-500 text-red-400 bg-red-950/20"
                      : "border-slate-700 text-slate-300"
                  }`}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{isListening ? "Detener Transcripción" : "Medir Ritmo de Habla (Voz)"}</span>
                </Button>

                {spokenWordCount > 0 && (
                  <Badge variant="neutral" className="text-xs font-mono">
                    {spokenWordCount} palabras emitidas (~{Math.round((spokenWordCount / Math.max(1, (expoMinutes * 60 - timeRemaining) / 60)))} ppm)
                  </Badge>
                )}
              </div>

              {/* Ficha de Ponencia Desplegable */}
              {cheatSheetNotes && (
                <div className="pt-4 max-w-lg mx-auto text-left">
                  <button
                    type="button"
                    onClick={() => setIsCheatSheetVisible(!isCheatSheetVisible)}
                    className="flex items-center justify-between w-full p-2.5 rounded-lg border border-slate-800 bg-slate-800/40 text-xs text-slate-300 hover:text-white"
                  >
                    <span>Ficha de Ponencia (Tu tarjeta de apoyo)</span>
                    {isCheatSheetVisible ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>

                  {isCheatSheetVisible && (
                    <div className="rounded-b-lg border-x border-b border-slate-800 bg-slate-950/60 p-4 text-xs font-mono text-indigo-300 whitespace-pre-line">
                      {cheatSheetNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex items-center justify-between rounded-b-xl">
              <Button
                variant="ghost"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-xs text-slate-400"
              >
                {isTimerRunning ? "Pausar Cronómetro" : "Reanudar"}
              </Button>
              <Button
                onClick={handleProceedToQuestions}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 flex items-center gap-2"
              >
                <span>Concluir Exposición y Recibir Preguntas</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. PREGUNTAS DEL TRIBUNAL */}
      {phase === "questions" && questions[currentQuestionIdx] && (
        <Card className="border-amber-500/30 bg-slate-900/95 shadow-2xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="warning" className="font-mono text-xs">
                  FASE 2: MESA EXAMINADORA
                </Badge>
                <span className="text-xs text-slate-400">
                  Pregunta <span className="font-bold text-white">{currentQuestionIdx + 1}</span> de {questions.length}
                </span>
              </div>

              <div className="flex items-center gap-2 font-mono text-sm font-bold text-amber-400 bg-amber-950/30 border border-amber-500/30 px-3 py-1 rounded-lg">
                <Clock className="h-4 w-4" />
                <span>{questionTimer}s sugeridos</span>
              </div>
            </div>
          </CardHeader>

          <div className="p-8 space-y-6">
            {/* Personaje del Tribunal */}
            <div className="flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-800/40 p-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-200">
                  {questions[currentQuestionIdx].roleTitle}
                </div>
                <div className="text-xs text-slate-400">
                  Intención docente: {questions[currentQuestionIdx].intentLabel}
                </div>
              </div>
            </div>

            {/* Pregunta */}
            <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-6 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Intervención de la Mesa:
              </div>
              <div className="text-lg font-medium text-slate-100 leading-relaxed">
                "{questions[currentQuestionIdx].question}"
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center leading-relaxed max-w-md mx-auto">
              Responde en voz alta sin apresurarte. Si te plantean una hipótesis errónea o trampa, señala con cortesía y rigor por qué no aplica al caso.
            </div>
          </div>

          <div className="border-t border-slate-800 p-4 bg-slate-950/60 flex items-center justify-between rounded-b-xl">
            <span className="text-xs text-slate-500 font-mono">
              Objeción {currentQuestionIdx + 1} / {questions.length}
            </span>
            <Button
              onClick={handleNextQuestion}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 px-5 flex items-center gap-2"
            >
              <span>
                {currentQuestionIdx + 1 < questions.length
                  ? "Siguiente Pregunta del Tribunal"
                  : "Pasar a Rúbrica y Veredicto"}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* 4. RÚBRICA Y VEREDICTO FINAL */}
      {phase === "rubric" && evalResult && (
        <Card className="border-indigo-500/40 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/40">
                  <Award className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    Rúbrica de Evaluación Oral Universitaria
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    Califica con honestidad cada dimensión para computar tu veredicto de cátedra sobre 10 puntos.
                  </p>
                </div>
              </div>

              {/* Nota Final */}
              <div className="text-right">
                <div className="text-3xl font-black text-white font-mono">{evalResult.finalGrade.toFixed(1)}</div>
                <Badge
                  variant={
                    evalResult.status === "reprobado"
                      ? "danger"
                      : evalResult.status === "aprobado"
                      ? "warning"
                      : "success"
                  }
                  className="text-xs"
                >
                  {evalResult.statusLabel}
                </Badge>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Criterios de la Rúbrica */}
            <div className="space-y-4">
              {[
                {
                  key: "conceptualMastery" as const,
                  label: "1. Dominio Conceptual & Deducción Teórica",
                  desc: "Explicaste las leyes de base sin apoyarte en la memoria mecánica.",
                },
                {
                  key: "terminologyRigor" as const,
                  label: "2. Rigor Terminológico y Ausencia de Muletillas",
                  desc: "Vocabulario académico preciso, sin titubeos excesivos ('ehhh', 'este').",
                },
                {
                  key: "timeManagement" as const,
                  label: "3. Manejo del Tiempo y Estructura Discursiva",
                  desc: "Completaste el tema en el tiempo previsto con introducción, nudo y cierre.",
                },
                {
                  key: "objectionHandling" as const,
                  label: "4. Solvencia ante Objeciones y Repreguntas",
                  desc: "Respondiste a las condiciones de borde y contraejemplos con solidez.",
                },
                {
                  key: "calmPoise" as const,
                  label: "5. Serenidad, Convicción y Presencia Escénica",
                  desc: "Postura erguida, tono de voz asertivo y control de la ansiedad escénica.",
                },
              ].map((criterio) => (
                <div
                  key={criterio.key}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-800/30 p-3.5"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-200">{criterio.label}</div>
                    <div className="text-xs text-slate-400">{criterio.desc}</div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleScoreChange(criterio.key, val)}
                        className={`h-7 w-8 rounded text-xs font-bold transition-colors ${
                          rubricScores[criterio.key] === val
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-white"
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Devolución Pedagógica */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-xs text-slate-300 leading-relaxed space-y-1">
              <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" />
                Dictamen del Tribunal:
              </div>
              <p>{evalResult.feedbackSummary}</p>
            </div>

            {/* Acciones Finales */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setPhase("setup")}
                className="border-slate-700 text-slate-300 hover:text-white flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Nuevo Coloquio
              </Button>
              <Button
                onClick={handleFinishAndSave}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                Guardar Sesión y Salir
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
