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
  AlertCircle,
  RotateCcw,
  Sparkles,
  UserCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { RubricScorer, type RubricDimension } from "../shells";

export interface OralDefenseMethodProps {
  onSessionFinished?: () => void;
}

type Phase = "setup" | "exposition" | "questions" | "rubric";

const ORAL_RUBRIC_DIMENSIONS: RubricDimension[] = [
  {
    id: "conceptualMastery",
    name: "1. Dominio Conceptual & Deducción Teórica",
    description: "Explicación de leyes de base sin memoria mecánica.",
    min: 1,
    max: 5,
    levelLabels: { 1: "Insuficiente", 3: "Aceptable", 5: "Magistral" },
  },
  {
    id: "terminologyRigor",
    name: "2. Rigor Terminológico y Ausencia de Muletillas",
    description: "Precisión de vocabulario disciplinar y elocuencia técnica.",
    min: 1,
    max: 5,
    levelLabels: { 1: "Vago/Coloquial", 3: "Técnico", 5: "Preciso/Erudito" },
  },
  {
    id: "timeManagement",
    name: "3. Manejo del Tiempo y Estructura Discursiva",
    description: "Ajuste al límite temporal con inicio, desarrollo y cierre.",
    min: 1,
    max: 5,
    levelLabels: { 1: "Desbordado", 3: "Ajustado", 5: "Estructura Impecable" },
  },
  {
    id: "objectionHandling",
    name: "4. Solvencia ante Objeciones y Repreguntas",
    description: "Respuesta consistente ante casos de borde y contraejemplos.",
    min: 1,
    max: 5,
    levelLabels: { 1: "Titubeo severo", 3: "Defensa básica", 5: "Desmanteló objeción" },
  },
  {
    id: "calmPoise",
    name: "5. Serenidad, Convicción y Presencia Escénica",
    description: "Firmeza en la exposición y solvencia ante la mesa evaluadora.",
    min: 1,
    max: 5,
    levelLabels: { 1: "Ansiedad visible", 3: "Aplomo", 5: "Convicción absoluta" },
  },
];

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
    const finalTopic =
      topic.trim() ||
      (selectedFolderId ? folders.find((f) => f.id === selectedFolderId)?.name : "Tema de Cátedra") ||
      "Exposición de Cátedra";
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
      {/* 1. SETUP DE EXPOSICIÓN — ACTA DE MESA EXAMINADORA */}
      {phase === "setup" && (
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader className="border-b border-border-hairline pb-4 bg-bg-surface-2/40 px-6 py-4 rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-hairline bg-bg-surface-2 text-text-primary">
                <Mic className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-lg font-serif font-bold text-text-primary flex items-center gap-2.5">
                  Simulador de Coloquios y Exámenes Orales
                  <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary font-normal">
                    Acta de Coloquio
                  </span>
                </CardTitle>
                <p className="text-xs text-text-secondary mt-0.5 font-sans">
                  Protocolo de disertación académica, control de cadencia discursiva y resolución de objeciones docentes ante mesa examinadora.
                </p>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Materia y Tema */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary">Cátedra o Asignatura:</label>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3 py-2 text-xs text-text-primary focus:border-border-active focus:outline-hidden"
                >
                  <option value="">Seleccionar cátedra (opcional)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono font-medium text-text-secondary">Tesis Central o Tema a Defender:</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Principio de Bernoulli y sustentación aerodinámica..."
                  className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3 py-2 text-xs text-text-primary focus:border-border-active focus:outline-hidden"
                />
              </div>
            </div>

            {/* Duración de la Exposición */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-text-secondary">Pauta Temporal de Exposición:</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { min: 3, label: "3 min (Síntesis)", desc: "Coloquio rápido de regularidad" },
                  { min: 5, label: "5 min (Estándar)", desc: "Examen final universitario" },
                  { min: 10, label: "10 min (Defensa)", desc: "Proyecto integrador o tesina" },
                ].map((item) => (
                  <button
                    key={item.min}
                    type="button"
                    onClick={() => setExpoMinutes(item.min)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 transition-colors cursor-pointer text-left ${
                      expoMinutes === item.min
                        ? "border-border-active bg-bg-surface-3 text-text-primary font-medium"
                        : "border-border-hairline bg-bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3"
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{item.label}</span>
                    <span className="text-[10px] text-text-tertiary mt-0.5">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ficha de Ponencia / Tarjeta de Memoria */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-mono font-medium text-text-secondary">
                  Ficha de Ponencia (Tarjeta de memoria en atril):
                </label>
                <span className="text-[10px] font-mono text-text-tertiary">Guía de conceptos clave (máx. 5 ítems)</span>
              </div>
              <textarea
                rows={3}
                value={cheatSheetNotes}
                onChange={(e) => setCheatSheetNotes(e.target.value)}
                placeholder="• Definición formal y ecuación de estado&#10;• Hipótesis de validez física&#10;• Contraejemplo de borde&#10;• Aplicación en ingeniería"
                className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 p-3 text-xs text-text-primary placeholder:text-text-tertiary focus:border-border-active focus:outline-hidden font-mono"
              />
            </div>

            {/* Cantidad de Preguntas del Tribunal */}
            <div className="flex items-center justify-between rounded-lg border border-border-hairline bg-bg-surface-2/60 p-3.5">
              <div>
                <div className="text-xs font-semibold text-text-primary">Miembros de la Mesa Examinadora:</div>
                <div className="text-[11px] text-text-secondary">Intervenciones docentes planificadas tras la disertación</div>
              </div>
              <div className="flex items-center gap-1.5">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setQuestionCount(n)}
                    className={`h-7 w-8 rounded text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      questionCount === n
                        ? "bg-text-primary text-text-inverted"
                        : "bg-bg-surface-1 border border-border-hairline text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de Inicio */}
            <div className="flex items-center justify-between pt-2 border-t border-border-hairline">
              <Button variant="ghost" onClick={onSessionFinished} className="text-xs text-text-secondary hover:text-text-primary">
                Volver al catálogo
              </Button>
              <Button
                onClick={handleStartExposition}
                variant="primary"
                className="text-xs font-mono px-5 py-2 flex items-center gap-2"
              >
                <Mic className="h-3.5 w-3.5" />
                Iniciar Disertación de Cátedra
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 2. EXPOSICIÓN ORAL EN VIVO */}
      {phase === "exposition" && (
        <div className="space-y-4">
          <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
            <CardHeader className="border-b border-border-hairline pb-4 bg-bg-surface-2/40 px-6 py-4 rounded-t-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Badge variant="neutral" className="font-mono text-xs">
                    FASE 1: EXPOSICIÓN
                  </Badge>
                  <span className="text-xs text-text-secondary font-medium font-serif">{topic || "Exposición de Cátedra"}</span>
                </div>

                {/* Temporizador Regresivo Sobrio */}
                <div
                  className={`flex items-center gap-2 font-mono text-base font-bold px-3 py-1 rounded-lg border ${
                    timeRemaining <= 60
                      ? "border-red-800/40 bg-red-950/20 text-red-400"
                      : "border-border-hairline bg-bg-surface-2 text-text-primary"
                  }`}
                >
                  <Clock className="h-4 w-4 text-text-tertiary" />
                  <span>{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </CardHeader>

            <div className="p-8 space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border-hairline bg-bg-surface-2 text-text-primary">
                <Mic className="h-7 w-7 text-text-secondary" />
              </div>

              <div>
                <h3 className="text-lg font-serif font-bold text-text-primary">Disertación en Curso</h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto mt-1.5 leading-relaxed font-sans">
                  Dirígete a la mesa con claridad y precisión terminológica. Introduce la hipótesis de partida, desglosa el aparato analítico y cierra con las implicancias del caso.
                </p>
              </div>

              {/* Dictado y telemetría de habla */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSpeechRecognition}
                  className={`text-xs flex items-center gap-1.5 font-mono ${
                    isListening
                      ? "border-red-800 text-red-400 bg-red-950/20"
                      : "border-border-hairline text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                  <span>{isListening ? "Detener Transcripción" : "Medir Cadencia de Habla (Voz)"}</span>
                </Button>

                {spokenWordCount > 0 && (
                  <span className="text-xs font-mono px-2.5 py-1 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary">
                    {spokenWordCount} palabras (~{Math.round((spokenWordCount / Math.max(1, (expoMinutes * 60 - timeRemaining) / 60)))} ppm)
                  </span>
                )}
              </div>

              {/* Ficha de Ponencia Desplegable */}
              {cheatSheetNotes && (
                <div className="pt-3 max-w-lg mx-auto text-left">
                  <button
                    type="button"
                    onClick={() => setIsCheatSheetVisible(!isCheatSheetVisible)}
                    className="flex items-center justify-between w-full p-2.5 rounded-lg border border-border-hairline bg-bg-surface-2 text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                  >
                    <span className="font-mono text-[11px]">Ficha de Ponencia (Notas de atril)</span>
                    {isCheatSheetVisible ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </button>

                  {isCheatSheetVisible && (
                    <div className="rounded-b-lg border-x border-b border-border-hairline bg-bg-surface-1 p-3.5 text-xs font-mono text-text-primary whitespace-pre-line leading-relaxed">
                      {cheatSheetNotes}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-border-hairline p-4 bg-bg-surface-2/40 flex items-center justify-between rounded-b-xl">
              <Button
                variant="ghost"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-xs font-mono text-text-secondary hover:text-text-primary"
              >
                {isTimerRunning ? "Pausar Cronómetro" : "Reanudar"}
              </Button>
              <Button
                onClick={handleProceedToQuestions}
                variant="primary"
                className="text-xs font-mono py-2 px-4 flex items-center gap-1.5"
              >
                <span>Concluir Exposición y Abrir Debate</span>
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* 3. PREGUNTAS DEL TRIBUNAL — DEBATE CON LA MESA */}
      {phase === "questions" && questions[currentQuestionIdx] && (
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader className="border-b border-border-hairline pb-4 bg-bg-surface-2/40 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="neutral" className="font-mono text-xs">
                  FASE 2: MESA EXAMINADORA
                </Badge>
                <span className="text-xs font-mono text-text-secondary">
                  Intervención {currentQuestionIdx + 1} de {questions.length}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs font-medium text-text-secondary border border-border-hairline bg-bg-surface-2 px-2.5 py-1 rounded">
                <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                <span>{questionTimer}s sugeridos</span>
              </div>
            </div>
          </CardHeader>

          <div className="p-8 space-y-6">
            {/* Jurado Docente */}
            <div className="flex items-center gap-3 rounded-lg border border-border-hairline bg-bg-surface-2/50 p-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border-hairline bg-bg-surface-1 text-text-primary">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <div className="text-xs font-bold font-serif text-text-primary">
                  {questions[currentQuestionIdx].roleTitle}
                </div>
                <div className="text-[11px] font-sans text-text-secondary">
                  Enfoque: {questions[currentQuestionIdx].intentLabel}
                </div>
              </div>
            </div>

            {/* Intervención del Docente */}
            <div className="rounded-lg border border-border-hairline bg-bg-surface-2 p-5 space-y-2">
              <div className="text-[11px] font-mono font-medium text-text-secondary flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-text-tertiary" />
                Intervención de la Cátedra:
              </div>
              <div className="text-base font-serif text-text-primary leading-relaxed">
                "{questions[currentQuestionIdx].question}"
              </div>
            </div>

            {/* Pauta Pedagógica Formal */}
            <div className="text-[11px] font-sans text-text-tertiary text-center leading-relaxed max-w-md mx-auto border-t border-border-hairline pt-3">
              Responde con serenidad y rigor formal. Si la cátedra introduce una hipótesis contradictoria, desmantélala fundamentando en los principios axiomáticos de la disciplina.
            </div>
          </div>

          <div className="border-t border-border-hairline p-4 bg-bg-surface-2/40 flex items-center justify-between rounded-b-xl">
            <span className="text-xs font-mono text-text-tertiary">
              Intervención {currentQuestionIdx + 1} de {questions.length}
            </span>
            <Button
              onClick={handleNextQuestion}
              variant="primary"
              className="text-xs font-mono py-2 px-4 flex items-center gap-1.5"
            >
              <span>
                {currentQuestionIdx + 1 < questions.length
                  ? "Siguiente Miembro del Tribunal"
                  : "Cerrar Coloquio y Dictamen"}
              </span>
            </Button>
          </div>
        </Card>
      )}
      {/* 4. RÚBRICA Y VEREDICTO FINAL — ACTA DE CALIFICACIÓN */}
      {phase === "rubric" && evalResult && (
        <RubricScorer
          title="Acta de Evaluación del Coloquio"
          subtitle="Cómputo formal de rúbrica en las cinco dimensiones canónicas de la disertación oral."
          badgeText="Simulación de Mesa Examinadora"
          scaleType="ten_point"
          dimensions={ORAL_RUBRIC_DIMENSIONS}
          scores={rubricScores as unknown as Record<string, number>}
          onChangeScores={(newScores) => {
            for (const [k, v] of Object.entries(newScores)) {
              if (v !== rubricScores[k as keyof OralRubricScores]) {
                handleScoreChange(k as keyof OralRubricScores, v);
              }
            }
          }}
          onSave={handleFinishAndSave}
          saveLabel="Homologar en Expediente"
          actionsSlot={() => (
            <Button
              variant="outline"
              onClick={() => setPhase("setup")}
              className="text-xs font-mono border-border-hairline text-text-secondary hover:text-text-primary flex items-center gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Nuevo Coloquio
            </Button>
          )}
        >
          {/* Dictamen Pedagógico */}
          <div className="rounded-lg border border-border-hairline bg-bg-surface-2 p-4 text-xs text-text-secondary leading-relaxed space-y-1">
            <div className="font-semibold font-mono text-[11px] text-text-primary flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-text-tertiary" />
              Dictamen Razonado de la Mesa:
            </div>
            <p className="font-serif italic text-text-primary">{evalResult.feedbackSummary}</p>
          </div>
        </RubricScorer>
      )}
    </div>
  );
};
