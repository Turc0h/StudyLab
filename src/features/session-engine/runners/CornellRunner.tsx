import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";

interface CornellRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

const TEXTAREA_CLASS =
  "flex-1 resize-none rounded-md border border-border bg-bg-surface-2 p-2.5 text-sm text-text-primary outline-none focus:border-accent";

export function CornellRunner({ methodId, subjectFolderId }: CornellRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const [questions, setQuestions] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">Página de Cornell guardada.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid flex-1 grid-cols-3 gap-3">
        <div className="col-span-1 flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Preguntas
          </span>
          <textarea
            value={questions}
            onChange={(e) => setQuestions(e.target.value)}
            placeholder="¿Qué preguntaría un examen?"
            className={`min-h-40 ${TEXTAREA_CLASS}`}
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Notas
          </span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Apuntes de la lectura o clase"
            className={`min-h-40 ${TEXTAREA_CLASS}`}
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Resumen
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="En dos o tres líneas, ¿de qué trató todo esto?"
          rows={3}
          className={`resize-none rounded-md border border-border bg-bg-surface-2 p-2.5 text-sm text-text-primary outline-none focus:border-accent`}
        />
      </div>
      <Button
        disabled={!notes.trim()}
        onClick={async () => {
          await logSession(
            methodId,
            subjectFolderId,
            startedAt,
            Math.round((Date.now() - startedAt) / 1000),
          );
          setDone(true);
        }}
      >
        Terminar
      </Button>
    </div>
  );
}
