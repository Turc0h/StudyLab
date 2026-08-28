import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { BlockSessionRunner } from "../BlockSessionRunner";
import { logSession } from "../logSession";

interface RecallRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
  onHideDocument?: (hidden: boolean) => void;
}

export function RecallRunner({ methodId, subjectFolderId, onHideDocument }: RecallRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);
  const [entries, setEntries] = useState([{ question: "", answer: "" }]);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">
          Bloque de recuerdo terminado — ya podés revisar el material.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <BlockSessionRunner
        blocks={[{ label: "Recuerdo activo — documento oculto", durationSec: 20 * 60 }]}
        onBlockChange={() => onHideDocument?.(true)}
        onFinish={async (elapsedSec) => {
          onHideDocument?.(false);
          await logSession(methodId, subjectFolderId, startedAt, elapsedSec);
          setDone(true);
        }}
      />
      <div className="flex flex-col gap-3 border-t border-border-subtle pt-4">
        <p className="text-xs font-medium text-text-secondary">
          Escribí preguntas propias y respondelas de memoria, sin mirar el documento.
        </p>
        {entries.map((entry, i) => (
          <div
            key={i}
            className="flex flex-col gap-2 rounded-md border border-border-subtle bg-bg-surface-2 p-3"
          >
            <input
              value={entry.question}
              onChange={(e) =>
                setEntries((list) =>
                  list.map((it, idx) => (idx === i ? { ...it, question: e.target.value } : it)),
                )
              }
              placeholder={`Pregunta ${i + 1}`}
              className="bg-transparent text-sm font-medium text-text-primary outline-none placeholder:text-text-tertiary"
            />
            <textarea
              value={entry.answer}
              onChange={(e) =>
                setEntries((list) =>
                  list.map((it, idx) => (idx === i ? { ...it, answer: e.target.value } : it)),
                )
              }
              placeholder="Tu respuesta de memoria…"
              rows={2}
              className="resize-none bg-transparent text-sm text-text-secondary outline-none placeholder:text-text-tertiary"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setEntries((list) => [...list, { question: "", answer: "" }])}
          className="self-start text-xs font-medium text-accent hover:text-accent-hover"
        >
          + Agregar pregunta
        </button>
      </div>
    </div>
  );
}
