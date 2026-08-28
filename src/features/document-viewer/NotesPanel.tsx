import { useLiveQuery } from "dexie-react-hooks";
import { Highlighter, StickyNote, Trash2 } from "lucide-react";
import { db } from "../../db/db";

interface NotesPanelProps {
  fileId: string;
  onJumpToPage: (page: number) => void;
}

export function NotesPanel({ fileId, onJumpToPage }: NotesPanelProps) {
  const highlights =
    useLiveQuery(() => db.highlights.where({ fileId }).sortBy("createdAt"), [fileId]) ?? [];
  const postits =
    useLiveQuery(() => db.postits.where({ fileId }).sortBy("createdAt"), [fileId]) ?? [];

  const items = [
    ...highlights.map((h) => ({ kind: "highlight" as const, ...h })),
    ...postits.map((p) => ({ kind: "postit" as const, ...p })),
  ].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto border-l border-border-subtle p-4">
      <h3 className="font-display text-sm font-semibold text-text-primary">
        Notas de esta sesión
      </h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-tertiary">
          Subrayá texto en el documento o agregá un post-it — van a aparecer acá, con un link de
          vuelta a la página original.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-1.5 rounded-md border border-border-subtle bg-bg-surface-2 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary">
                  {item.kind === "highlight" ? (
                    <Highlighter size={13} strokeWidth={1.75} />
                  ) : (
                    <StickyNote size={13} strokeWidth={1.75} />
                  )}
                  {item.kind === "highlight" ? "Subrayado" : "Post-it"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    item.kind === "highlight"
                      ? db.highlights.delete(item.id)
                      : db.postits.delete(item.id)
                  }
                  className="text-text-tertiary hover:text-danger"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
              <p className="text-sm text-text-primary">
                {item.text || <span className="text-text-tertiary italic">Sin texto</span>}
              </p>
              <button
                type="button"
                onClick={() => onJumpToPage(item.page)}
                className="self-start text-xs font-medium text-accent hover:text-accent-hover"
              >
                Ir a la página {item.page}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
