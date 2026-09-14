import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { Folder, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { FileRecord, FolderRecord } from "../../db/db";
import { db } from "../../db/db";
import {
  deleteFileCascade,
  deleteFolderCascade,
  formatBytes,
  formatDate,
  generateId,
  iconForMime,
  isPdf,
} from "./fileHelpers";

function FolderCard({
  folder,
  onClick,
  onDelete,
}: {
  folder: FolderRecord;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex cursor-pointer flex-col items-start justify-between gap-3 rounded-lg glass-panel p-4 text-left transition-all duration-200 hover:border-accent/40 hover:shadow-[0_0_20px_-5px_color-mix(in_srgb,var(--color-accent)_25%,transparent)] hover:-translate-y-0.5"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-accent/30 bg-accent-muted/40 text-accent">
          <Folder size={18} strokeWidth={1.75} />
        </div>
        <button
          type="button"
          title="Eliminar carpeta"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-text-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-danger-muted hover:text-danger"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>
      <div className="w-full">
        <span className="block truncate font-display text-sm font-semibold text-text-primary">
          {folder.name}
        </span>
        <span className="font-mono text-[10px] tracking-wider text-text-tertiary uppercase">
          {folder.type}
        </span>
      </div>
    </div>
  );
}

function FileCard({
  file,
  onClick,
  onDelete,
}: {
  file: FileRecord;
  onClick: () => void;
  onDelete: () => void;
}) {
  const Icon = iconForMime(file.mimeType, file.name);
  const isDocPdf = isPdf(file.mimeType, file.name);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="group relative flex cursor-pointer flex-col items-start justify-between gap-3 rounded-lg glass-panel p-4 text-left transition-all duration-200 hover:border-accent/40 hover:shadow-[0_0_20px_-5px_color-mix(in_srgb,var(--color-accent)_25%,transparent)] hover:-translate-y-0.5"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-bg-surface-2 text-text-secondary group-hover:border-accent/40 group-hover:text-accent">
          <Icon size={18} strokeWidth={1.75} />
        </div>
        <button
          type="button"
          title="Eliminar archivo"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="rounded p-1 text-text-tertiary opacity-0 transition-opacity duration-150 group-hover:opacity-100 hover:bg-danger-muted hover:text-danger"
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      <div className="w-full">
        <span className="block truncate font-display text-sm font-semibold text-text-primary" title={file.name}>
          {file.name}
        </span>
        <span className="font-mono text-[11px] text-text-tertiary">
          {formatBytes(file.size)} · {formatDate(file.createdAt)}
        </span>
        {isDocPdf && (
          <div className="mt-2">
            <span
              className={clsx(
                "inline-flex items-center gap-1 font-mono text-[10px] font-medium tracking-wide uppercase",
                file.ocrStatus === "done" ? "text-success" : "text-warning",
              )}
            >
              <span
                className={clsx(
                  "h-1.5 w-1.5 rounded-full",
                  file.ocrStatus === "done" ? "bg-success" : "bg-warning",
                )}
              />
              {file.ocrStatus === "done" ? "Listo" : "OCR pend."}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

interface FileGridProps {
  folderId: string | null;
  searchQuery: string;
  onOpenFolder: (id: string) => void;
  onOpenFile: (id: string) => void;
}

export function FileGrid({ folderId, searchQuery, onOpenFolder, onOpenFile }: FileGridProps) {
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allFolders = useLiveQuery(() => db.folders.toArray(), []) ?? [];
  const allFiles = useLiveQuery(() => db.files.toArray(), []) ?? [];

  const query = searchQuery.trim().toLowerCase();
  const isSearching = query.length > 0;

  const childFolders = isSearching
    ? []
    : allFolders
        .filter((f) => f.parentId === folderId)
        .sort((a, b) => a.name.localeCompare(b.name));

  const files = isSearching
    ? allFiles.filter((f) => f.name.toLowerCase().includes(query))
    : allFiles.filter((f) => f.folderId === folderId);

  async function handleUpload(fileList: FileList | null) {
    if (!fileList || fileList.length === 0 || folderId === null) return;
    const now = Date.now();
    for (const file of Array.from(fileList)) {
      const mimeType =
        file.type || (file.name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      await db.files.add({
        id: generateId(),
        folderId,
        name: file.name,
        mimeType,
        size: file.size,
        blob: file,
        ocrStatus: isPdf(mimeType, file.name) ? "pending" : "not_applicable",
        createdAt: now,
      });
    }
  }

  const canUploadHere = folderId !== null && !isSearching;

  return (
    <div
      onDragOver={(e) => {
        if (!canUploadHere) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        if (!canUploadHere) return;
        e.preventDefault();
        setDragOver(false);
        void handleUpload(e.dataTransfer.files);
      }}
      className={clsx(
        "flex flex-col gap-6 rounded-lg border border-dashed p-6 transition-colors duration-150",
        dragOver ? "bg-accent-muted/30 border-accent shadow-[0_0_20px_-4px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]" : "border-border-subtle",
      )}
    >
      {childFolders.length === 0 && files.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Upload size={22} strokeWidth={1.75} className="text-accent" />
          <p className="text-sm font-medium text-text-primary">
            {isSearching
              ? "No encontramos archivos con ese nombre"
              : folderId === null
                ? "Elegí o creá una carpeta para subir archivos"
                : "Arrastrá un archivo acá o subilo manualmente"}
          </p>
          {canUploadHere && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-sm font-medium text-accent hover:text-accent-hover"
            >
              Elegir archivo del dispositivo
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {childFolders.map((folder) => (
            <FolderCard
              key={folder.id}
              folder={folder}
              onClick={() => onOpenFolder(folder.id)}
              onDelete={() => {
                if (window.confirm(`¿Eliminar la carpeta "${folder.name}" y todo su contenido?`)) {
                  void deleteFolderCascade(folder.id);
                }
              }}
            />
          ))}
          {files.map((file) => (
            <FileCard
              key={file.id}
              file={file}
              onClick={() => onOpenFile(file.id)}
              onDelete={() => {
                if (window.confirm(`¿Eliminar el archivo "${file.name}" y sus notas?`)) {
                  void deleteFileCascade(file.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {canUploadHere && (
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => void handleUpload(e.target.files)}
        />
      )}
    </div>
  );
}
