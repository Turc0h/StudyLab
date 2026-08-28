import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { BlockSessionRunner } from "../BlockSessionRunner";
import { logSession } from "../logSession";

interface InterleavingRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

export function InterleavingRunner({ methodId, subjectFolderId }: InterleavingRunnerProps) {
  const [topics, setTopics] = useState(["", "", ""]);
  const [blockMin, setBlockMin] = useState(10);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [done, setDone] = useState(false);

  const validTopics = topics.map((t) => t.trim()).filter(Boolean);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">Terminaste la rotación de sub-temas.</p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-text-secondary">Sub-temas a rotar</p>
        {topics.map((t, i) => (
          <Input
            key={i}
            value={t}
            onChange={(e) =>
              setTopics((list) => list.map((v, idx) => (idx === i ? e.target.value : v)))
            }
            placeholder={`Sub-tema ${i + 1}`}
          />
        ))}
        <button
          type="button"
          onClick={() => setTopics((list) => [...list, ""])}
          className="self-start text-xs font-medium text-accent hover:text-accent-hover"
        >
          + Agregar sub-tema
        </button>
        <label className="flex items-center gap-2 text-xs font-medium text-text-secondary">
          Minutos por bloque
          <span className="w-20 shrink-0">
            <Input
              type="number"
              min={3}
              max={30}
              value={blockMin}
              onChange={(e) => setBlockMin(Number(e.target.value) || 10)}
            />
          </span>
        </label>
        <Button
          disabled={validTopics.length < 2}
          onClick={() => {
            setStartedAt(Date.now());
            setStarted(true);
          }}
        >
          Empezar rotación
        </Button>
      </div>
    );
  }

  const blocks = validTopics.map((t) => ({ label: t, durationSec: blockMin * 60 }));

  return (
    <BlockSessionRunner
      blocks={blocks}
      onFinish={async (elapsedSec) => {
        await logSession(methodId, subjectFolderId, startedAt, elapsedSec);
        setDone(true);
      }}
    />
  );
}
