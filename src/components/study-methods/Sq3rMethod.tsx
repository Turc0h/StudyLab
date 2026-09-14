import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Textarea, Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";

export interface Sq3rMethodProps {
  onSessionFinished?: () => void;
}

const STEPS = [
  { key: "survey", label: "1. Survey (Inspección)", desc: "Revisa títulos, subtítulos, gráficos y resúmenes del capítulo." },
  { key: "question", label: "2. Question (Preguntas)", desc: "Convierte cada subtítulo en una pregunta concreta antes de leer." },
  { key: "read", label: "3. Read (Lectura Activa)", desc: "Lee buscando responder específicamente a las preguntas planteadas." },
  { key: "recite", label: "4. Recite (Recitación)", desc: "Formula en voz alta o escribe las respuestas con tus propias palabras." },
  { key: "review", label: "5. Review (Repaso)", desc: "Verifica que puedas responder las preguntas sin mirar el texto." },
];

export const Sq3rMethod: React.FC<Sq3rMethodProps> = ({ onSessionFinished }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [chapterTitle, setChapterTitle] = useState<string>("");
  const [notes, setNotes] = useState<Record<string, string>>({
    survey: "",
    question: "",
    read: "",
    recite: "",
    review: "",
  });

  const activeStep = STEPS[currentStepIndex];

  const handleFinish = async () => {
    await saveStudySession({
      id: `sq3r_${Date.now()}`,
      methodId: "sq3r",
      subject: "Lectura Comprensiva",
      topic: chapterTitle || "Capítulo de Texto",
      durationMinutes: 45,
      notes: Object.entries(notes)
        .map(([k, v]) => `[${k.toUpperCase()}]: ${v}`)
        .join("\n\n"),
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Método SQ3R de Lectura Académica</CardTitle>
        <span className="text-xs text-text-secondary">
          Estructura de comprensión profunda desarrollada por Francis P. Robinson
        </span>
      </CardHeader>

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-xs font-medium text-text-primary">Capítulo o texto objeto:</label>
        <Input
          value={chapterTitle}
          onChange={(e) => setChapterTitle(e.target.value)}
          placeholder="Ej: Capítulo 4 — Cinética Química y Leyes de Velocidad..."
        />
      </div>

      {/* 5 Steps tabs */}
      <div className="grid grid-cols-5 gap-1 border-b border-border-subtle pb-3">
        {STEPS.map((s, idx) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setCurrentStepIndex(idx)}
            className={`p-2 rounded text-left text-xs font-sans transition-colors ${
              currentStepIndex === idx
                ? "bg-accent-primary/10 text-accent-primary font-medium border border-accent-primary/20"
                : "text-text-muted hover:bg-bg-secondary"
            }`}
          >
            <span className="block truncate">{s.label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3">
        <div>
          <h4 className="font-serif text-sm font-semibold text-text-primary">{activeStep.label}</h4>
          <p className="text-xs text-text-secondary mt-0.5">{activeStep.desc}</p>
        </div>

        <Textarea
          value={notes[activeStep.key] || ""}
          onChange={(e) => setNotes({ ...notes, [activeStep.key]: e.target.value })}
          rows={6}
          placeholder="Registra tus notas de esta etapa aquí..."
        />
      </div>

      <div className="border-t border-border-subtle pt-4 flex justify-between">
        <Button
          variant="outline"
          disabled={currentStepIndex === 0}
          onClick={() => setCurrentStepIndex((i) => i - 1)}
        >
          ← Anterior
        </Button>

        {currentStepIndex < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStepIndex((i) => i + 1)}>
            Siguiente etapa →
          </Button>
        ) : (
          <Button variant="secondary" onClick={handleFinish}>
            Concluir Protocolo SQ3R
          </Button>
        )}
      </div>
    </Card>
  );
};
