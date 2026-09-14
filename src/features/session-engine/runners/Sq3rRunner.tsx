import { CheckCircle2, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
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
  const storageKey = `studylab_draft_sq3r_${subjectFolderId ?? "default"}`;

  const [stepIndex, setStepIndex] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(notes));
  }, [notes, storageKey]);

  function getFullNotesText() {
    return `=== MÉTODO SQ3R ===\nFecha: ${new Date().toLocaleDateString()}\n\n` +
      STEPS.map((s, idx) => `[PASO ${idx + 1}: ${s.label}]\n${notes[s.key] || "(sin notas)"}\n`).join("\n");
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
    a.download = `sq3r-notas-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.75} className="text-success" />
        <div>
          <p className="text-base font-semibold text-text-primary">Completaste los 5 pasos de SQ3R</p>
          <p className="mt-1 text-xs text-text-secondary">Tus notas de cada paso quedaron registradas:</p>
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
                ? "h-1.5 flex-1 rounded-full bg-accent shadow-[0_0_6px_var(--color-accent)] transition-all duration-200"
                : "h-1.5 flex-1 rounded-full bg-bg-surface-2 border border-border-subtle transition-all duration-200"
            }
          />
        ))}
      </div>
      <div>
        <span className="font-mono text-xs font-medium tracking-wide text-accent uppercase">
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
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((i) => i - 1)}
          >
            Atrás
          </Button>
          <Button size="sm" variant="ghost" onClick={handleCopy} title="Copiar notas actuales">
            <Copy size={14} />
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
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
