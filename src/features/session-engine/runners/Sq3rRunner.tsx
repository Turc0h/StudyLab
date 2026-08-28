import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";

interface Sq3rRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

const STEPS = [
  {
    key: "survey",
    label: "Explorar (Survey)",
    instruction:
      "Mirá por encima títulos, subtítulos, imágenes y resumen — todavía no leas en detalle.",
  },
  {
    key: "question",
    label: "Preguntar (Question)",
    instruction: "Convertí los títulos en preguntas. ¿Qué esperás que responda cada sección?",
  },
  { key: "read", label: "Leer (Read)", instruction: "Leé buscando activamente responder tus preguntas." },
  {
    key: "recite",
    label: "Recitar (Recite)",
    instruction: "Sin mirar el material, contá con tus palabras qué respondiste a cada pregunta.",
  },
  { key: "review", label: "Repasar (Review)", instruction: "Volvé sobre tus notas y verificá qué falta." },
];

export function Sq3rRunner({ methodId, subjectFolderId }: Sq3rRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const [stepIndex, setStepIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">Completaste los 5 pasos de SQ3R.</p>
      </div>
    );
  }

  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <span
            key={s.key}
            className={
              i <= stepIndex
                ? "h-1.5 flex-1 rounded-full bg-accent"
                : "h-1.5 flex-1 rounded-full bg-bg-surface-2"
            }
          />
        ))}
      </div>
      <div>
        <span className="text-xs font-medium tracking-wide text-accent uppercase">
          Paso {stepIndex + 1} de 5
        </span>
        <h3 className="font-display text-base font-semibold text-text-primary">{step.label}</h3>
        <p className="mt-1 text-sm text-text-secondary">{step.instruction}</p>
      </div>
      <textarea
        value={notes[step.key] ?? ""}
        onChange={(e) => setNotes((n) => ({ ...n, [step.key]: e.target.value }))}
        placeholder="Notas de este paso…"
        rows={6}
        className="resize-none rounded-md border border-border bg-bg-surface-2 p-2.5 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="flex justify-between">
        <Button
          variant="secondary"
          size="sm"
          disabled={stepIndex === 0}
          onClick={() => setStepIndex((i) => i - 1)}
        >
          Atrás
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            if (isLast) {
              await logSession(
                methodId,
                subjectFolderId,
                startedAt,
                Math.round((Date.now() - startedAt) / 1000),
              );
              setDone(true);
            } else {
              setStepIndex((i) => i + 1);
            }
          }}
        >
          {isLast ? "Terminar" : "Siguiente paso"}
        </Button>
      </div>
    </div>
  );
}
