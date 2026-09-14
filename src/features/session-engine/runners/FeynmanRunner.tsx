import { CheckCircle2, Copy, Download } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";

interface FeynmanRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

export function FeynmanRunner({ methodId, subjectFolderId }: FeynmanRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const storageKey = `studylab_draft_feynman_${subjectFolderId ?? "default"}`;

  const [text, setText] = useState(() => {
    return localStorage.getItem(storageKey) || "";
  });
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    localStorage.setItem(storageKey, text);
  }, [text, storageKey]);

  async function handleCopy() {
    await navigator.clipboard.writeText(`=== TÉCNICA FEYNMAN ===\nFecha: ${new Date().toLocaleDateString()}\n\n${text}\n`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([`=== TÉCNICA FEYNMAN ===\nFecha: ${new Date().toLocaleDateString()}\n\n${text}\n`], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `feynman-explicacion-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <CheckCircle2 size={32} strokeWidth={1.75} className="text-success" />
        <div>
          <p className="text-base font-semibold text-text-primary">Sesión Feynman registrada</p>
          <p className="mt-1 text-xs text-text-secondary">
            Donde te trabaste al explicar, es ahí donde tenés que volver a estudiar.
          </p>
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
      <p className="text-sm text-text-primary">
        Explicá esto como si se lo enseñaras a alguien que no sabe nada del tema. Usá el
        vocabulario más simple que puedas — donde te trabes es exactamente lo que hay que repasar.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Bueno, resulta que…"
        className="min-h-48 flex-1 resize-none rounded-md border border-border bg-bg-surface-2 p-3 text-sm text-text-primary outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between gap-2 pt-2">
        <Button size="sm" variant="ghost" onClick={handleCopy} title="Copiar texto actual">
          <Copy size={14} />
          {copied ? "Copiado" : "Copiar"}
        </Button>
        <Button
          disabled={!text.trim()}
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
          Terminar bloque
        </Button>
      </div>
    </div>
  );
}
