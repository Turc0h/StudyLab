import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { Folder, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { FileRecord, FolderRecord } from "../../db/db";
import { db } from "../../db/db";
import { formatBytes, formatDate, generateId, iconForMime, isPdf } from "./fileHelpers";

function FolderCard({ folder, onClick }: { folder: FolderRecord; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-md border border-border-subtle bg-bg-surface-2 p-4 text-left transition-colors duration-150 hover:bg-bg-surface-hover"
    >
      <Folder size={20} strokeWidth={1.75} className="text-accent" />
      <span className="w-full truncate text-sm font-medium text-text-primary">{folder.name}</span>
      <span className="text-xs text-text-tertiary capitalize">{folder.type}</span>
    </button>
  );
}

function FileCard({ file, onClick }: { file: FileRecord; onClick: () => void }) {
  const Icon = iconForMime(file.mimeType);
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-md border border-border-subtle bg-bg-surface-2 p-4 text-left transition-colors duration-150 hover:bg-bg-surface-hover"
    >
      <Icon size={20} strokeWidth={1.75} className="text-text-secondary" />
      <span className="w-full truncate text-sm font-medium text-text-primary">{file.name}</span>
      <span className="text-xs text-text-tertiary">
        {formatBytes(file.size)} · {formatDate(file.createdAt)}
      </span>
      {isPdf(file.mimeType) && (
        <span
          className={clsx(
            "text-[10px] font-medium tracking-wide uppercase",
            file.ocrStatus === "done" ? "text-success" : "text-warning",
          )}
        >
          {file.ocrStatus === "done" ? "Listo para subrayar" : "OCR pendiente"}
        </span>
      )}
    </button>
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
      await db.files.add({
        id: generateId(),
        folderId,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        blob: file,
        ocrStatus: isPdf(file.type) ? "pending" : "not_applicable",
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
        dragOver ? "bg-accent-muted/30 border-accent" : "border-border-subtle",
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
            <FolderCard key={folder.id} folder={folder} onClick={() => onOpenFolder(folder.id)} />
          ))}
          {files.map((file) => (
            <FileCard key={file.id} file={file} onClick={() => onOpenFile(file.id)} />
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
