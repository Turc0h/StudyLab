import { useLiveQuery } from "dexie-react-hooks";
import { FileText } from "lucide-react";
import { db } from "../../db/db";

interface FilePickerInlineProps {
  onPick: (fileId: string) => void;
}

export function FilePickerInline({ onPick }: FilePickerInlineProps) {
  const files = useLiveQuery(() => db.files.where("mimeType").equals("application/pdf").toArray(), []) ?? [];

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <FileText size={22} strokeWidth={1.75} className="text-accent" />
      <div>
        <p className="text-sm font-medium text-text-primary">Sin documento en esta sesión</p>
        <p className="mt-1 text-sm text-text-secondary">
          Podés estudiar igual, o elegir un PDF para tenerlo al lado.
        </p>
      </div>
      {files.length > 0 && (
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          {files.slice(0, 6).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onPick(f.id)}
              className="truncate rounded-md border border-border-subtle bg-bg-surface-2 px-3 py-2 text-left text-sm text-text-primary transition-colors duration-150 hover:bg-bg-surface-hover"
            >
              {f.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
