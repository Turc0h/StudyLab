import { GripVertical, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";
import type { PostItRecord } from "../../db/db";
import { db } from "../../db/db";

const COLOR_CLASSES: Record<PostItRecord["color"], string> = {
  accent: "bg-accent-muted border-accent/40",
  warning: "bg-warning-muted border-warning/40",
  success: "bg-success-muted border-success/40",
};

function PostItNote({
  postit,
  pageSize,
}: {
  postit: PostItRecord;
  pageSize: { width: number; height: number };
}) {
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ xPct: postit.xPct, yPct: postit.yPct });
  const noteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dragging) setPos({ xPct: postit.xPct, yPct: postit.yPct });
  }, [postit.xPct, postit.yPct, dragging]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return;
    const parent = noteRef.current?.parentElement;
    if (!parent) return;
    const rect = parent.getBoundingClientRect();
    setPos({
      xPct: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      yPct: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    });
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    void db.postits.update(postit.id, { xPct: pos.xPct, yPct: pos.yPct });
  }

  function handleDeletePointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    // Aislado del mango de arrastre a propósito: nunca tiene que iniciar un drag.
    e.stopPropagation();
  }

  function handleDelete(e: ReactMouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    void db.postits.delete(postit.id);
  }

  return (
    <div
      ref={noteRef}
      className={`absolute w-44 rounded-md border p-2 text-xs shadow-[var(--shadow-surface)] select-none ${COLOR_CLASSES[postit.color]}`}
      style={{
        left: pos.xPct * pageSize.width,
        top: pos.yPct * pageSize.height,
        touchAction: "none",
      }}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="mb-1 flex items-center justify-between gap-1">
        <div
          className="flex min-w-0 flex-1 items-center gap-1 rounded px-1 py-0.5 select-none"
          style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <GripVertical size={12} strokeWidth={2} className="shrink-0 text-text-tertiary" />
          <span className="truncate text-[10px] font-medium tracking-wide text-text-tertiary uppercase">
            Post-it
          </span>
        </div>
        <button
          type="button"
          onPointerDown={handleDeletePointerDown}
          onClick={handleDelete}
          className="shrink-0 rounded p-1 text-text-tertiary transition-colors duration-150 hover:bg-black/10 hover:text-danger"
        >
          <X size={13} strokeWidth={2} />
        </button>
      </div>
      <textarea
        defaultValue={postit.text}
        onBlur={(e) => void db.postits.update(postit.id, { text: e.target.value })}
        placeholder="Escribí algo…"
        rows={3}
        className="w-full resize-none bg-transparent text-text-primary outline-none placeholder:text-text-tertiary"
      />
    </div>
  );
}

interface PostItMarksProps {
  postits: PostItRecord[];
  pageSize: { width: number; height: number };
}

export function PostItMarks({ postits, pageSize }: PostItMarksProps) {
  return (
    <>
      {postits.map((p) => (
        <PostItNote key={p.id} postit={p} pageSize={pageSize} />
      ))}
    </>
  );
}
