import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Users, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  HelpCircle, 
  MessageSquareQuote,
  Sparkles
} from "lucide-react";

export interface ProtegeEffectMethodProps {
  onSessionFinished?: () => void;
}

interface LessonPoint {
  id: string;
  concept: string;
  analogy: string;
}

interface ProtegeQuestion {
  id: string;
  question: string;
  userAnswer: string;
  needsReview: boolean;
}

const DEFAULT_POINTS: LessonPoint[] = [
  {
    id: "p1",
    concept: "Diferencia de potencial y corriente eléctrica",
    analogy: "Imagina un tanque de agua elevado: la altura del tanque es el voltaje, y los litros por segundo que salen por el caño son los amperios.",
  },
  {
    id: "p2",
    concept: "Resistencia del conductor (Ley de Ohm)",
    analogy: "Es el grosor del caño: si es muy angosto o tiene arena adentro (resistencia), el agua fluirá con mayor dificultad.",
  },
];

const DEFAULT_QUESTIONS: ProtegeQuestion[] = [
  {
    id: "q1",
    question: "¿Por qué un pájaro apoyado en un cable de alta tensión no se electrocuta?",
    userAnswer: "Porque sus dos patas están al mismo potencial eléctrico; no hay diferencia de voltaje que fuerce corriente a través de su cuerpo.",
    needsReview: false,
  },
  {
    id: "q2",
    question: "Si el voltaje es cero pero hay cargas libres, ¿puede haber corriente continua?",
    userAnswer: "No en un circuito resistivo común, porque se requiere un campo eléctrico neto para inducir deriva de cargas (salvo superconductores).",
    needsReview: false,
  },
];

export const ProtegeEffectMethod: React.FC<ProtegeEffectMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Fundamentos de Circuitos Eléctricos");
  const [protegeProfile, setProtegeProfile] = useState<string>("Estudiante de 1er año de universidad");
  const [lessonPoints, setLessonPoints] = useState<LessonPoint[]>(DEFAULT_POINTS);
  const [questions, setQuestions] = useState<ProtegeQuestion[]>(DEFAULT_QUESTIONS);

  // Nuevo punto
  const [newConcept, setNewConcept] = useState("");
  const [newAnalogy, setNewAnalogy] = useState("");

  // Nueva pregunta
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newAnswerText, setNewAnswerText] = useState("");

  const handleAddPoint = () => {
    if (!newConcept.trim() || !newAnalogy.trim()) return;
    setLessonPoints([
      ...lessonPoints,
      { id: `pt_${Date.now()}`, concept: newConcept.trim(), analogy: newAnalogy.trim() },
    ]);
    setNewConcept("");
    setNewAnalogy("");
  };

  const handleRemovePoint = (id: string) => {
    setLessonPoints(lessonPoints.filter((p) => p.id !== id));
  };

  const handleAddQuestion = () => {
    if (!newQuestionText.trim()) return;
    setQuestions([
      ...questions,
      {
        id: `q_${Date.now()}`,
        question: newQuestionText.trim(),
        userAnswer: newAnswerText.trim(),
        needsReview: false,
      },
    ]);
    setNewQuestionText("");
    setNewAnswerText("");
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id));
  };

  const toggleNeedsReview = (id: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, needsReview: !q.needsReview } : q))
    );
  };

  const handleUpdateAnswer = (id: string, text: string) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, userAnswer: text } : q))
    );
  };

  const reviewPendingCount = questions.filter((q) => q.needsReview).length;

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `protege_${Date.now()}`,
      methodId: "protege-effect",
      subject: "Enseñar a Otros (Efecto Protegido)",
      topic: topic || "Instrucción de Pares",
      durationMinutes: Math.max(20, (lessonPoints.length + questions.length) * 5),
      notes: `Tema: ${topic}\nPerfil del Protegido: ${protegeProfile}\n\nPuntos de Lección & Analogías (${lessonPoints.length}):\n${lessonPoints
        .map((p) => `• [Concepto]: ${p.concept}\n  [Analogía]: ${p.analogy}`)
        .join("\n\n")}\n\nPreguntas Inquisitivas del Aprendiz (${questions.length}):\n${questions
        .map((q) => `• [¿?]: ${q.question}\n  [Respuesta]: ${q.userAnswer || "Pendiente"}${q.needsReview ? " (Marcada para consulta de cátedra)" : ""}`)
        .join("\n\n")}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Enseñar a Otros (Efecto Protegido)</CardTitle>
            <Badge variant="accent">Metacognición Social (Stanford AAA)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Estructura explicaciones intuitivas y responde preguntas simuladas de un aprendiz para revelar lagunas en tu propio entendimiento (Chase et al., 2009).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={lessonPoints.length === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Sesión ({lessonPoints.length} Puntos)</span>
        </Button>
      </div>

      {/* Perfil del tema y protegido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Materia o Tema de la Lección</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Fisiología de la contracción muscular"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Perfil del Aprendiz / Protegido</label>
          <Input
            value={protegeProfile}
            onChange={(e) => setProtegeProfile(e.target.value)}
            placeholder="Ej: Alumno ingresante, no experto, compañero de estudio..."
          />
        </div>
      </div>

      {/* Sección 1: Puntos de Lección y Analogías */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
            <span>Puntos Clave y Analogías Intuitivas ({lessonPoints.length})</span>
          </span>
          <span className="text-[10px] text-text-muted">Sin jerga inaccesible</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lessonPoints.map((point) => (
            <div
              key={point.id}
              className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/50 space-y-2.5 relative group"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-text-primary leading-snug">
                  {point.concept}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemovePoint(point.id)}
                  className="text-text-muted hover:text-red-400 p-0.5 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="p-2.5 rounded-lg border border-accent-primary/20 bg-accent-primary/5 text-xs text-text-secondary leading-relaxed">
                <span className="text-[10px] font-mono text-accent-primary block mb-0.5 font-bold">
                  Analogía Cotidiana:
                </span>
                {point.analogy}
              </div>
            </div>
          ))}
        </div>

        {/* Form para agregar punto de lección */}
        <div className="p-4 rounded-xl border border-dashed border-border-hover bg-bg-secondary/30 space-y-3">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-accent-primary" />
            <span>Agregar Concepto con Analogía Explicativa</span>
          </span>

          <Input
            placeholder="Concepto a enseñar (Ej: Mitocondria y síntesis de ATP)"
            value={newConcept}
            onChange={(e) => setNewConcept(e.target.value)}
            className="text-xs"
          />
          <Textarea
            rows={2}
            placeholder="¿Cómo se lo explicarías con una metáfora del mundo real? (Ej: Es la central hidroeléctrica que convierte combustible en baterías recargables)"
            value={newAnalogy}
            onChange={(e) => setNewAnalogy(e.target.value)}
            className="text-xs"
          />

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddPoint}
              disabled={!newConcept.trim() || !newAnalogy.trim()}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir Punto de Lección</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Sección 2: Simulador de Preguntas del Protegido */}
      <div className="space-y-4 pt-3 border-t border-border-subtle">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-text-primary">
              Desafíos e Interrupciones del Protegido ({questions.length})
            </span>
          </div>

          {reviewPendingCount > 0 && (
            <Badge variant="warning" className="text-[10px]">
              {reviewPendingCount} dudas para consultar en cátedra
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`p-4 rounded-xl border transition-colors space-y-3 ${
                q.needsReview
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-border-subtle bg-bg-secondary/40"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <HelpCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-xs font-semibold text-text-primary">
                    "{q.question}"
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleNeedsReview(q.id)}
                    className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${
                      q.needsReview
                        ? "border-amber-500/50 bg-amber-500/20 text-amber-300"
                        : "border-border-subtle text-text-muted hover:text-text-primary"
                    }`}
                  >
                    {q.needsReview ? "Marcada para Cátedra" : "Marcar si dudaste"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-text-muted hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-text-muted">Tu Respuesta Oral o Escrita:</label>
                <Textarea
                  rows={2}
                  value={q.userAnswer}
                  onChange={(e) => handleUpdateAnswer(q.id, e.target.value)}
                  placeholder="Escribe la respuesta que le darías al aprendiz..."
                  className="text-xs"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Form nueva pregunta */}
        <div className="p-3.5 rounded-xl border border-dashed border-border-hover bg-bg-secondary/20 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs text-text-primary font-medium">
            <Users className="h-3.5 w-3.5 text-accent-primary" />
            <span>Simular Nueva Pregunta Inquisitiva</span>
          </div>

          <Input
            placeholder="Pregunta del alumno (Ej: ¿Y por qué no ocurre lo mismo a bajas temperaturas?)"
            value={newQuestionText}
            onChange={(e) => setNewQuestionText(e.target.value)}
            className="text-xs"
          />
          <Input
            placeholder="Tu explicación tentativa..."
            value={newAnswerText}
            onChange={(e) => setNewAnswerText(e.target.value)}
            className="text-xs"
          />

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddQuestion}
              disabled={!newQuestionText.trim()}
              className="text-xs flex items-center gap-1"
            >
              <Plus className="h-3 w-3" />
              <span>Añadir Pregunta</span>
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};
