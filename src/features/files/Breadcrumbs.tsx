import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight } from "lucide-react";
import type { FolderRecord } from "../../db/db";
import { db } from "../../db/db";

interface BreadcrumbsProps {
  folderId: string | null;
  onNavigate: (id: string | null) => void;
}

export function Breadcrumbs({ folderId, onNavigate }: BreadcrumbsProps) {
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const byId = new Map(folders.map((f) => [f.id, f]));

  const path: FolderRecord[] = [];
  let cursor = folderId ? byId.get(folderId) : undefined;
  while (cursor) {
    path.unshift(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }

  return (
    <div className="flex flex-wrap items-center gap-1 text-sm text-text-secondary">
      <button
        type="button"
        onClick={() => onNavigate(null)}
        className="rounded px-1.5 py-0.5 transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
      >
        Archivos
      </button>
      {path.map((folder) => (
        <span key={folder.id} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-text-tertiary" />
          <button
            type="button"
            onClick={() => onNavigate(folder.id)}
            className="rounded px-1.5 py-0.5 transition-colors hover:bg-bg-surface-2 hover:text-text-primary"
          >
            {folder.name}
          </button>
        </span>
      ))}
    </div>
  );
}
