import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Clock, AlertCircle, CheckCircle2, XCircle, ArrowRight, RotateCcw, Trophy } from "lucide-react";

export interface MockExamMethodProps {
  onSessionFinished?: () => void;
}

interface ExamQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const DEFAULT_QUESTIONS: ExamQuestion[] = [
  {
    id: "q1",
    question: "¿Cuál de los siguientes principios neurobiológicos explica por qué releer pasivamente genera una 'ilusión de competencia'?",
    options: [
      "La memoria de trabajo tiene capacidad infinita ante estímulos repetidos.",
      "El reconocimiento visual requiere menor esfuerzo sináptico que la evocación activa sin pistas.",
      "Los circuitos de la amígdala inhiben el hipocampo durante la lectura.",
      "La repetición masiva altera el potencial de reposo de las neuronas piramidales.",
    ],
    correctIndex: 1,
    explanation: "El reconocimiento visual activa vías de familiaridad que confunden el 'sé de qué se trata' con el 'puedo reproducir el conocimiento sin mirar' (Testing Effect, Roediger & Karpicke).",
  },
  {
    id: "q2",
    question: "En el algoritmo FSRS (Free Spaced Repetition Scheduler), ¿qué variable representa el tiempo que un recuerdo tarda en caer al 90% de probabilidad de retención?",
    options: [
      "La Dificultad (Difficulty)",
      "La Estabilidad (Stability)",
      "El Lapso (Lapse Rate)",
      "El Factor de Olvido Negativo",
    ],
    correctIndex: 1,
    explanation: "La Estabilidad (S) se define formalmente como el intervalo temporal necesario para que la retención baje del 100% al 90%.",
  },
  {
    id: "q3",
    question: "¿Qué técnica de estudio demostró mayor tamaño del efecto (d de Cohen) en el meta-análisis de Dunlosky et al. (2013)?",
    options: [
      "Subrayar con marcadores fluorescentes de varios colores.",
      "Práctica de recuperación y distribución temporal de la práctica.",
      "Relectura espaciada continua.",
      "Resumen narrativo libre.",
    ],
    correctIndex: 1,
    explanation: "Practice Testing (evaluación activa) y Distributed Practice obtuvieron la máxima calificación de utilidad académica por su robustez empírica transversal.",
  },
  {
    id: "q4",
    question: "La Práctica Intercalada (Interleaving) mejora el rendimiento en matemáticas principalmente porque:",
    options: [
      "Permite descansar la mente al hacer siempre el mismo tipo de cálculo.",
      "Entrena al estudiante en discriminar qué estrategia aplicar ante cada problema inédito.",
      "Reduce la cantidad total de problemas requeridos para aprobar.",
      "Elimina la necesidad de memorizar fórmulas básicas.",
    ],
    correctIndex: 1,
    explanation: "La práctica en bloque enseña 'cómo ejecutar'; la intercalada enseña a 'categorizar y seleccionar la fórmula correcta' ante un enunciado nuevo.",
  },
  {
    id: "q5",
    question: "Según la Teoría de la Carga Cognitiva de Sweller, ¿qué tipo de carga debe minimizarse en el diseño de un apunte o material?",
    options: [
      "Carga intrínseca",
      "Carga germana",
      "Carga extraña (extraneous)",
      "Carga mnemotécnica",
    ],
    correctIndex: 2,
    explanation: "La carga extraña proviene del diseño deficiente, desorden o distracciones y no aporta a la construcción de esquemas de conocimiento.",
  },
];

export const MockExamMethod: React.FC<MockExamMethodProps> = ({ onSessionFinished }) => {
  const [phase, setPhase] = useState<"setup" | "exam" | "results">("setup");
  const [topic, setTopic] = useState("Examen General de Conocimiento");
  const [subject, setSubject] = useState("Metodologías de Aprendizaje");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);

  // Respuestas del estudiante: Map questionId -> selectedOptionIndex
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);

  // Manejo del cronómetro estricto
  useEffect(() => {
    let interval: any = null;
    if (phase === "exam") {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleFinishExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [phase]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStartExam = () => {
    setRemainingSeconds(durationMinutes * 60);
    setSelectedAnswers({});
    setCurrentQuestionIdx(0);
    setPhase("exam");
  };

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionIdx,
    }));
  };

  const calculateScore = () => {
    let correct = 0;
    DEFAULT_QUESTIONS.forEach((q) => {
      if (selectedAnswers[q.id] === q.correctIndex) {
        correct++;
      }
    });
    return {
      correct,
      total: DEFAULT_QUESTIONS.length,
      percentage: Math.round((correct / DEFAULT_QUESTIONS.length) * 100),
    };
  };

  const handleFinishExam = async () => {
    setPhase("results");
    const score = calculateScore();
    const elapsedMinutes = Math.max(1, Math.round((durationMinutes * 60 - remainingSeconds) / 60));

    await saveStudySession({
      id: `mock_${Date.now()}`,
      methodId: "practice-testing",
      subject: subject.trim() || "Examen de Cátedra",
      topic: topic.trim() || "Simulacro de Prueba",
      durationMinutes: elapsedMinutes,
      notes: `Puntaje Obtenido: ${score.correct}/${score.total} (${score.percentage}%)\nDuración: ${elapsedMinutes} minutos`,
      completedAt: Date.now(),
    });
  };

  // Fase 1: Setup
  if (phase === "setup") {
    return (
      <Card elevated className="flex flex-col gap-5 p-6 max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="font-serif text-xl">Simulacro de Examen Formal</CardTitle>
            <Badge variant="accent">Evaluación Estricta</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Recreá las condiciones reales de evaluación: cronómetro implacable, cero pistas y corrección integral al entregar.
          </p>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-text-secondary font-medium block mb-1">Materia:</label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </div>

          <div>
            <label className="text-text-secondary font-medium block mb-1">Título del Examen:</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </div>

          <div>
            <label className="text-text-secondary font-medium block mb-1">
              Tiempo Límite Asignado:
            </label>
            <div className="flex gap-2">
              {[10, 15, 30, 45, 60].map((mins) => (
                <Button
                  key={mins}
                  variant={durationMinutes === mins ? "primary" : "outline"}
                  size="sm"
                  onClick={() => setDurationMinutes(mins)}
                  className="text-xs flex-1"
                >
                  {mins} min
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-bg-secondary/40 border border-border-subtle p-3 space-y-1.5 text-xs text-text-secondary">
            <div className="flex items-center gap-2 font-medium text-text-primary">
              <AlertCircle className="h-4 w-4 text-accent-primary" />
              <span>Reglas del Simulacro</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-text-muted">
              <li>No se revelará si una respuesta es correcta hasta entregar todo el examen.</li>
              <li>El tiempo corre de forma continua; al expirar los minutos, la prueba se entrega automáticamente.</li>
              <li>Al finalizar recibirás un reporte de fallos y recomendaciones para el algoritmo FSRS.</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
          <Button variant="primary" onClick={handleStartExam} className="text-xs flex items-center gap-1.5">
            <span>Comenzar Simulacro ({durationMinutes} min)</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </Card>
    );
  }

  // Fase 2: Examen en Curso
  if (phase === "exam") {
    const q = DEFAULT_QUESTIONS[currentQuestionIdx];
    const answeredCount = Object.keys(selectedAnswers).length;
    const isTimeCritical = remainingSeconds < 120;

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Barra superior de examen con reloj */}
        <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface-2 px-4 py-3 shadow-xs">
          <div>
            <h4 className="font-serif text-sm font-semibold text-text-primary">{topic}</h4>
            <span className="text-[11px] text-text-muted">
              Pregunta {currentQuestionIdx + 1} de {DEFAULT_QUESTIONS.length} ({answeredCount} respondidas)
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1 text-xs font-mono font-bold ${
                isTimeCritical
                  ? "border-red-500/30 bg-red-500/10 text-red-500 animate-pulse"
                  : "border-border-subtle bg-bg-primary text-text-primary"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>
            <Button variant="danger" size="sm" onClick={handleFinishExam} className="text-xs">
              Entregar Examen
            </Button>
          </div>
        </div>

        {/* Tarjeta de Pregunta Activa */}
        <Card elevated className="p-6 space-y-5">
          <div>
            <Badge variant="accent">Consigna #{currentQuestionIdx + 1}</Badge>
            <h3 className="font-serif text-base font-semibold text-text-primary mt-2 leading-relaxed">
              {q.question}
            </h3>
          </div>

          {/* Opciones */}
          <div className="space-y-2">
            {q.options.map((opt, optIdx) => {
              const isSelected = selectedAnswers[q.id] === optIdx;
              return (
                <div
                  key={optIdx}
                  onClick={() => handleSelectOption(q.id, optIdx)}
                  className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-all duration-150 text-xs ${
                    isSelected
                      ? "border-accent-primary bg-accent-primary/10 text-text-primary font-medium"
                      : "border-border-subtle bg-bg-primary hover:bg-bg-secondary text-text-secondary"
                  }`}
                >
                  <div
                    className={`h-5 w-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 font-bold ${
                      isSelected
                        ? "border-accent-primary bg-accent-primary text-white"
                        : "border-border text-text-muted"
                    }`}
                  >
                    {String.fromCharCode(65 + optIdx)}
                  </div>
                  <span className="flex-1 leading-normal">{opt}</span>
                </div>
              );
            })}
          </div>

          {/* Navegación entre preguntas */}
          <div className="flex items-center justify-between pt-4 border-t border-border-subtle text-xs">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentQuestionIdx === 0}
              onClick={() => setCurrentQuestionIdx((prev) => prev - 1)}
            >
              Pregunta Anterior
            </Button>

            <div className="flex gap-1">
              {DEFAULT_QUESTIONS.map((item, idx) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentQuestionIdx(idx)}
                  className={`h-6 w-6 rounded text-xs font-mono transition-colors ${
                    idx === currentQuestionIdx
                      ? "bg-accent-primary text-white"
                      : selectedAnswers[item.id] !== undefined
                      ? "bg-bg-secondary text-text-primary border border-border-subtle"
                      : "bg-bg-primary text-text-muted border border-border-subtle"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {currentQuestionIdx < DEFAULT_QUESTIONS.length - 1 ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentQuestionIdx((prev) => prev + 1)}
              >
                Siguiente Pregunta
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleFinishExam}>
                Revisar y Entregar
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Fase 3: Resultados y Desglose
  const score = calculateScore();

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Banner de Calificación */}
      <Card elevated className="p-6 text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center">
          <Trophy className="h-6 w-6" />
        </div>

        <div>
          <Badge variant={score.percentage >= 70 ? "success" : "warning"}>
            {score.percentage >= 70 ? "Aprobado con Solvencia" : "Requiere Refuerzo Cognitivo"}
          </Badge>
          <h2 className="font-serif text-2xl font-bold text-text-primary mt-2">
            Puntaje: {score.percentage}%
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Respondiste correctamente {score.correct} de {score.total} consignas evaluadas.
          </p>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={handleStartExam} className="text-xs flex items-center gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Repetir Simulacro</span>
          </Button>
          <Button variant="primary" size="sm" onClick={() => onSessionFinished?.()} className="text-xs">
            Volver al Catálogo de Métodos
          </Button>
        </div>
      </Card>

      {/* Desglose de Respuestas con Fundamentación */}
      <div className="space-y-3">
        <h4 className="font-serif text-sm font-semibold text-text-primary">
          Auditoría de Preguntas & Rúbrica Teórica
        </h4>

        {DEFAULT_QUESTIONS.map((q, idx) => {
          const userAnswer = selectedAnswers[q.id];
          const isCorrect = userAnswer === q.correctIndex;

          return (
            <Card key={q.id} className="p-4 border-border-subtle space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-[11px] font-mono text-text-muted">Pregunta #{idx + 1}</span>
                    <h5 className="font-sans text-xs font-semibold text-text-primary mt-0.5">
                      {q.question}
                    </h5>
                  </div>
                </div>
                <Badge variant={isCorrect ? "success" : "error"}>
                  {isCorrect ? "+1 Acierto" : "Fallo"}
                </Badge>
              </div>

              {/* Opciones seleccionadas vs correcta */}
              <div className="pl-6 text-xs space-y-1">
                <p className="text-text-secondary">
                  Tu respuesta:{" "}
                  <span className={isCorrect ? "text-emerald-500 font-medium" : "text-red-500 font-medium"}>
                    {userAnswer !== undefined ? q.options[userAnswer] : "No respondida"}
                  </span>
                </p>
                {!isCorrect && (
                  <p className="text-text-muted">
                    Respuesta correcta:{" "}
                    <span className="text-emerald-500 font-medium">{q.options[q.correctIndex]}</span>
                  </p>
                )}
              </div>

              {/* Explicación científica */}
              <div className="ml-6 rounded bg-bg-primary p-2.5 text-[11px] text-text-secondary border border-border-subtle">
                <span className="font-semibold text-text-primary block mb-0.5">Fundamentación Cognitiva:</span>
                {q.explanation}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
