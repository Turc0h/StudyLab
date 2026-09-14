import { CheckCircle2, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
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
  const storageKey = `studylab_draft_cornell_${subjectFolderId ?? "default"}`;

  const [questions, setQuestions] = useState(() => {
    return localStorage.getItem(`${storageKey}_q`) || "";
  });
  const [notes, setNotes] = useState(() => {
    return localStorage.getItem(`${storageKey}_n`) || "";
  });
  const [summary, setSummary] = useState(() => {
    return localStorage.getItem(`${storageKey}_s`) || "";
  });
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(`${storageKey}_q`, questions);
    localStorage.setItem(`${storageKey}_n`, notes);
    localStorage.setItem(`${storageKey}_s`, summary);
  }, [questions, notes, summary, storageKey]);

  function getFullNotesText() {
    return `=== NOTAS CORNELL ===\nFecha: ${new Date().toLocaleDateString()}\n\n[PREGUNTAS / IDEAS CLAVE]\n${questions}\n\n[APUNTES / NOTAS]\n${notes}\n\n[RESUMEN FINAL]\n${summary}\n`;
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(getFullNotesText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([getFullNotesText()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cornell-notas-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.75} className="text-success" />
        <div>
          <p className="text-base font-semibold text-text-primary">Sesión de Cornell registrada</p>
          <p className="mt-1 text-xs text-text-secondary">Tus notas están guardadas localmente. Podés copiarlas o descargarlas:</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={handleCopy}>
            <Copy size={14} />
            {copied ? "¡Copiado!" : "Copiar texto"}
          </Button>
          <Button size="sm" variant="secondary" onClick={handleDownload}>
            <Download size={14} />
            Descargar .txt
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid flex-1 grid-cols-3 gap-3">
        <div className="col-span-1 flex flex-col gap-1.5">
          <span className="font-mono text-xs font-medium tracking-wide text-text-tertiary uppercase">
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
          <span className="font-mono text-xs font-medium tracking-wide text-text-tertiary uppercase">
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
        <span className="font-mono text-xs font-medium tracking-wide text-text-tertiary uppercase">
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
      <div className="flex items-center justify-between gap-2 pt-2">
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" onClick={handleCopy} title="Copiar notas actuales">
            <Copy size={14} />
            {copied ? "Copiado" : "Copiar"}
          </Button>
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
          Terminar sesión
        </Button>
      </div>
    </div>
  );
}
