import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { db } from "../../../db/db";
import { generateId } from "../../files/fileHelpers";

const DAY_MS = 24 * 60 * 60 * 1000;

interface SpacedRunnerProps {
  subjectFolderId: string | null;
}

export function SpacedRunner({ subjectFolderId }: SpacedRunnerProps) {
  const items = useLiveQuery(() => db.reviewSchedule.orderBy("dueDate").toArray(), []) ?? [];
  const now = Date.now();
  const due = items.filter((i) => i.dueDate <= now);
  const upcoming = items.filter((i) => i.dueDate > now);

  const [topic, setTopic] = useState("");

  async function handleReviewed(id: string, intervalDays: number) {
    const nextInterval = Math.min(60, intervalDays * 2);
    await db.reviewSchedule.update(id, {
      dueDate: Date.now() + nextInterval * DAY_MS,
      intervalDays: nextInterval,
    });
  }

  async function handleAdd() {
    if (!topic.trim()) return;
    await db.reviewSchedule.add({
      id: generateId(),
      fileId: null,
      subjectFolderId,
      topic: topic.trim(),
      dueDate: Date.now(),
      intervalDays: 1,
      createdAt: Date.now(),
    });
    setTopic("");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-text-tertiary uppercase">
          Repasos pendientes ({due.length})
        </h3>
        {due.length === 0 ? (
          <p className="text-sm text-text-secondary">No tenés repasos pendientes hoy.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {due.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-surface-2 p-3"
              >
                <span className="text-sm text-text-primary">{item.topic}</span>
                <Button size="sm" onClick={() => handleReviewed(item.id, item.intervalDays)}>
                  Marcar repasado
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {upcoming.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Próximos
          </h3>
          <div className="flex flex-col gap-1.5">
            {upcoming.slice(0, 6).map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm text-text-secondary">
                <span>{item.topic}</span>
                <span className="font-mono text-xs">
                  {new Date(item.dueDate).toLocaleDateString("es-AR")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2 border-t border-border-subtle pt-4">
        <div className="min-w-0 flex-1">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Nuevo tema a repasar" />
        </div>
        <Button onClick={handleAdd} disabled={!topic.trim()} className="shrink-0">
          Agregar
        </Button>
      </div>
    </div>
  );
}
