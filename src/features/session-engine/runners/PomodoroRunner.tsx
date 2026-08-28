import { CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { BlockSessionRunner } from "../BlockSessionRunner";
import { logSession } from "../logSession";

const FOCUS_SEC = 25 * 60;
const SHORT_BREAK_SEC = 5 * 60;
const LONG_BREAK_SEC = 20 * 60;

interface PomodoroRunnerProps {
  methodId: string;
  subjectFolderId: string | null;
}

export function PomodoroRunner({ methodId, subjectFolderId }: PomodoroRunnerProps) {
  const [startedAt] = useState(() => Date.now());
  const [done, setDone] = useState(false);

  const blocks = useMemo(() => {
    const list = [];
    for (let i = 0; i < 4; i++) {
      list.push({ label: `Foco ${i + 1}/4`, durationSec: FOCUS_SEC });
      list.push({
        label: i < 3 ? `Descanso ${i + 1}/4` : "Descanso largo",
        durationSec: i < 3 ? SHORT_BREAK_SEC : LONG_BREAK_SEC,
      });
    }
    return list;
  }, []);

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CheckCircle2 size={28} strokeWidth={1.75} className="text-success" />
        <p className="text-sm font-medium text-text-primary">Completaste los 4 ciclos.</p>
      </div>
    );
  }

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
