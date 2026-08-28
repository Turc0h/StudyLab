import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";

interface FeynmanRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

export function FeynmanRunner({ methodId, subjectFolderId }: FeynmanRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const [text, setText] = useState("");
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">
          Guardado. Donde te trabaste al explicar, es ahí donde tenés que volver a estudiar.
        </p>
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
  );
}
