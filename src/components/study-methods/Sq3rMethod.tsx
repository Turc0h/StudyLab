import React, { useState } from "react";
import { Textarea, Input } from "../ui/Input";
import { StepperShell, type StepItem } from "../shells";
import { saveStudySession } from "../../lib/db";

export interface Sq3rMethodProps {
  onSessionFinished?: () => void;
}

const SQ3R_STEPS: StepItem[] = [
  { id: "survey", title: "Survey", subtitle: "Inspección", description: "Revisa títulos, subtítulos, gráficos y resúmenes del capítulo antes de la lectura detallada." },
  { id: "question", title: "Question", subtitle: "Preguntas", description: "Convierte cada subtítulo en una pregunta concreta que guiará tu atención durante la lectura." },
  { id: "read", title: "Read", subtitle: "Lectura Activa", description: "Lee el material buscando responder específicamente a las preguntas que planteaste." },
  { id: "recite", title: "Recite", subtitle: "Recitación", description: "Formula en voz alta o sintetiza con tus propias palabras la respuesta sin consultar el texto." },
  { id: "review", title: "Review", subtitle: "Repaso", description: "Revisa el conjunto de notas y verifica tu capacidad de evocar cada concepto de forma integral." },
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

  const activeStep = SQ3R_STEPS[currentStepIndex];

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
    <StepperShell
      title="Método SQ3R de Lectura Académica"
      badgeText="Comprensión Profunda (F. P. Robinson)"
      steps={SQ3R_STEPS}
      currentStepIndex={currentStepIndex}
      onStepChange={setCurrentStepIndex}
      onComplete={handleFinish}
      completeLabel="Concluir Protocolo SQ3R"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-xs font-medium text-text-primary">
            Capítulo o texto objeto de análisis:
          </label>
          <Input
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="Ej: Capítulo 4 — Cinética Química y Leyes de Velocidad..."
          />
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <div className="flex items-center justify-between">
            <span className="font-serif text-sm font-semibold text-text-primary">
              Etapa activa: {activeStep.title} ({activeStep.subtitle})
            </span>
            <span className="text-[11px] text-text-muted font-mono">
              {notes[activeStep.id]?.length || 0} caracteres
            </span>
          </div>

          <Textarea
            value={notes[activeStep.id] || ""}
            onChange={(e) => setNotes({ ...notes, [activeStep.id]: e.target.value })}
            rows={7}
            placeholder={`Registra tus notas para la fase de ${activeStep.title} (${activeStep.subtitle}) aquí...`}
          />
        </div>
      </div>
    </StepperShell>
  );
};
