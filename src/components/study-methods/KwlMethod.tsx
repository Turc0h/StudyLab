import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  CheckCircle2, 
  Plus, 
  Trash2, 
  CheckSquare, 
  Square
} from "lucide-react";

export interface KwlMethodProps {
  onSessionFinished?: () => void;
}

interface KwlQuestion {
  id: string;
  question: string;
  isResolved: boolean;
}

export const KwlMethod: React.FC<KwlMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Genética Mendeliana y Expresión Génica");
  
  // Column K: Lo que sé (esquemas previos)
  const [knownNotes, setKnownNotes] = useState<string>(
    "• Los genes están ubicados en cromosomas dentro del núcleo.\n• Existen alelos dominantes y recesivos.\n• Mendel experimentó con guisantes en el siglo XIX."
  );

  // Column W: Lo que quiero saber (preguntas activas)
  const [questions, setQuestions] = useState<KwlQuestion[]>([
    { id: "q1", question: "¿Cuál es la base molecular de la codominancia?", isResolved: true },
    { id: "q2", question: "¿Cómo afecta la epigenética la ley de segregación independiente?", isResolved: false },
    { id: "q3", question: "¿Qué diferencia existe entre ligamiento génico y recombinación homóloga?", isResolved: false },
  ]);
  const [newQuestion, setNewQuestion] = useState<string>("");

  // Column L: Lo que aprendí (síntesis de asimilación)
  const [learnedNotes, setLearnedNotes] = useState<string>(
    "• En la codominancia ambos alelos se expresan simultáneamente sin mezclarse (ej. grupo sanguíneo AB).\n• El ligamiento génico ocurre cuando dos loci están tan cercanos en el mismo cromosoma que no segregan independientemente."
  );

  const handleAddQuestion = () => {
    if (!newQuestion.trim()) return;
    setQuestions((prev) => [
      ...prev,
      { id: `q_${Date.now()}`, question: newQuestion.trim(), isResolved: false },
    ]);
    setNewQuestion("");
  };

  const handleToggleResolved = (id: string) => {
    setQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, isResolved: !q.isResolved } : q))
    );
  };

  const handleRemoveQuestion = (id: string) => {
    setQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const resolvedCount = questions.filter((q) => q.isResolved).length;

  const handleFinish = async () => {
    await saveStudySession({
      id: `kwl_${Date.now()}`,
      methodId: "kwl-method",
      subject: "Metacognición KWL",
      topic: topic || "Tema Académico",
      durationMinutes: 35,
      notes: `TEMA: ${topic}\n\n[K - LO QUE SÉ]:\n${knownNotes}\n\n[W - LO QUE QUIERO SABER]:\n${questions
        .map((q) => `${q.isResolved ? "[X]" : "[ ]"} ${q.question}`)
        .join("\n")}\n\n[L - LO QUE APRENDÍ]:\n${learnedNotes}`,
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
            <CardTitle>Método KWL (Know, Want to know, Learned)</CardTitle>
            <Badge variant="accent">Metacognición Guiada</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Matriz reflexiva en 3 columnas: activa esquemas previos (K), formula preguntas directrices (W) y consolida los hallazgos aprendidos (L).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success">
            {resolvedCount}/{questions.length} Preguntas Resueltas
          </Badge>
          <Button variant="primary" size="sm" onClick={handleFinish} className="text-xs flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Guardar Sesión KWL</span>
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-primary font-sans">
          Materia o Unidad de Lectura:
        </label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Genética Mendeliana, Historia Económica..."
        />
      </div>

      {/* 3-Column KWL Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna K: Lo que Sé */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
              <span className="font-serif text-sm font-bold text-sky-400">
                K • Lo que Sé (Know)
              </span>
              <span className="text-[10px] text-text-muted">Antes de leer</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Escribe todo lo que ya sabes o recuerdas sobre este tema para activar tus redes previas.
            </p>
            <Textarea
              rows={12}
              value={knownNotes}
              onChange={(e) => setKnownNotes(e.target.value)}
              placeholder="Anota ideas previas, recuerdos de clases anteriores..."
              className="mt-3 bg-bg-secondary/70 text-xs"
            />
          </div>
        </div>

        {/* Columna W: Lo que Quiero Saber */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
              <span className="font-serif text-sm font-bold text-amber-400">
                W • Lo que Quiero Saber (Want)
              </span>
              <span className="text-[10px] text-text-muted">Preguntas activas</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Formula los interrogantes y dudas que guiarán selectivamente tu atención durante el estudio.
            </p>

            {/* List of Questions with resolution check */}
            <div className="space-y-2 mt-3 max-h-[260px] overflow-y-auto pr-1">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={`rounded-lg border p-2.5 flex items-start justify-between gap-2 text-xs transition-colors ${
                    q.isResolved
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-border-subtle bg-bg-secondary/80 text-text-primary"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleResolved(q.id)}
                    className="flex items-start gap-2 text-left cursor-pointer"
                  >
                    {q.isResolved ? (
                      <CheckSquare className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
                    ) : (
                      <Square className="h-4 w-4 shrink-0 text-text-muted mt-0.5" />
                    )}
                    <span className={q.isResolved ? "line-through opacity-80" : ""}>
                      {q.question}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="text-text-muted hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Question input */}
          <div className="pt-2 border-t border-amber-500/20 flex gap-1.5">
            <Input
              placeholder="Nueva pregunta directriz..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
              className="text-xs bg-bg-secondary"
            />
            <Button variant="secondary" size="sm" onClick={handleAddQuestion} className="shrink-0 text-xs">
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Columna L: Lo que Aprendí */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
              <span className="font-serif text-sm font-bold text-emerald-400">
                L • Lo que Aprendí (Learned)
              </span>
              <span className="text-[10px] text-text-muted">Tras la lectura</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Sintetiza los conceptos descubiertos que respondieron a tus preguntas de la columna W.
            </p>
            <Textarea
              rows={12}
              value={learnedNotes}
              onChange={(e) => setLearnedNotes(e.target.value)}
              placeholder="Resume hallazgos, respuestas a las preguntas de W y nuevas conclusiones..."
              className="mt-3 bg-bg-secondary/70 text-xs"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
