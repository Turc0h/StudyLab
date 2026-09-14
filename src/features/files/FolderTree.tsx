import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { ChevronRight, Folder, FolderOpen as FolderOpenIcon, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FolderRecord } from "../../db/db";
import { db } from "../../db/db";
import { deleteFolderCascade } from "./fileHelpers";

interface TreeNodeProps {
  folder: FolderRecord;
  childrenByParent: Map<string | null, FolderRecord[]>;
  depth: number;
  currentFolderId: string | null;
  onSelect: (id: string | null) => void;
}

function TreeNode({ folder, childrenByParent, depth, currentFolderId, onSelect }: TreeNodeProps) {
  const children = childrenByParent.get(folder.id) ?? [];
  const [expanded, setExpanded] = useState(true);
  const isActive = currentFolderId === folder.id;

  return (
    <div>
      <div
        className={clsx(
          "group flex w-full items-center justify-between rounded-md py-1 pr-1.5 transition-colors duration-150",
          isActive
            ? "bg-accent-muted/70 text-accent shadow-[0_0_10px_-4px_var(--color-accent)]"
            : "text-text-secondary hover:bg-bg-surface-2/80 hover:text-text-primary",
        )}
      >
        <button
          type="button"
          onClick={() => onSelect(folder.id)}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-sm"
        >
          {children.length > 0 ? (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((v) => !v);
              }}
              className="flex h-4 w-4 shrink-0 items-center justify-center text-text-tertiary hover:text-text-primary"
            >
              <ChevronRight
                size={13}
                strokeWidth={2}
                className={clsx("transition-transform duration-150", expanded && "rotate-90")}
              />
            </span>
          ) : (
            <span className="w-4 shrink-0" />
          )}
          {isActive ? (
            <FolderOpenIcon size={15} strokeWidth={1.75} className="shrink-0 text-accent" />
          ) : (
            <Folder size={15} strokeWidth={1.75} className="shrink-0 text-text-tertiary group-hover:text-text-primary" />
          )}
          <span className="truncate font-medium">{folder.name}</span>
        </button>

        <button
          type="button"
          title="Eliminar carpeta"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`¿Eliminar la carpeta "${folder.name}" y todo su contenido?`)) {
              void deleteFolderCascade(folder.id);
              if (currentFolderId === folder.id) onSelect(null);
            }
          }}
          className="rounded p-1 text-text-tertiary opacity-0 transition-opacity hover:bg-danger-muted hover:text-danger group-hover:opacity-100"
        >
          <Trash2 size={12} strokeWidth={1.75} />
        </button>
      </div>
      {expanded && children.length > 0 && (
        <div>
          {children.map((child) => (
            <TreeNode
              key={child.id}
              folder={child}
              childrenByParent={childrenByParent}
              depth={depth + 1}
              currentFolderId={currentFolderId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderTreeProps {
  currentFolderId: string | null;
  onSelect: (id: string | null) => void;
}

export function FolderTree({ currentFolderId, onSelect }: FolderTreeProps) {
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];

  const childrenByParent = new Map<string | null, FolderRecord[]>();
  for (const folder of folders) {
    const list = childrenByParent.get(folder.parentId) ?? [];
    list.push(folder);
    childrenByParent.set(folder.parentId, list);
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  const roots = childrenByParent.get(null) ?? [];

  return (
    <nav className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={clsx(
          "rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors duration-150",
          currentFolderId === null
            ? "bg-accent-muted text-accent"
            : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
        )}
      >
        Todos los archivos
      </button>
      {roots.length === 0 ? (
        <p className="px-3 py-2 text-xs text-text-tertiary">Sin carpetas todavía.</p>
      ) : (
        roots.map((folder) => (
          <TreeNode
            key={folder.id}
            folder={folder}
            childrenByParent={childrenByParent}
            depth={0}
            currentFolderId={currentFolderId}
            onSelect={onSelect}
          />
        ))
      )}
    </nav>
  );
}
