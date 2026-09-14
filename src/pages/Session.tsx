import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { ArrowLeft, Play } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { PageHeader } from "../components/PageHeader";
import { db } from "../db/db";
import { DocumentAnnotator } from "../features/document-viewer/DocumentAnnotator";
import { FilePickerInline } from "../features/session-engine/FilePickerInline";
import { getMethod } from "../features/session-engine/methods";
import { SessionRunner } from "../features/session-engine/SessionRunner";

export function Session() {
  const [searchParams, setSearchParams] = useSearchParams();
  const methodId = searchParams.get("method");
  const fileId = searchParams.get("file");
  const method = getMethod(methodId);
  const [documentHidden, setDocumentHidden] = useState(false);

  const file = useLiveQuery(() => (fileId ? db.files.get(fileId) : undefined), [fileId]);
  const subjectFolderId =
    useLiveQuery(async () => {
      if (!file) return null;
      const folder = await db.folders.get(file.folderId);
      return folder?.type === "subject" ? folder.id : null;
    }, [file]) ?? null;

  const [mobileTab, setMobileTab] = useState<"method" | "document">("method");

  function handlePickFile(id: string) {
    const next = new URLSearchParams(searchParams);
    next.set("file", id);
    setSearchParams(next);
    setMobileTab("document");
  }

  if (!method) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <PageHeader
          eyebrow="Sesión de estudio"
          title="Sesión"
          description="Documento a pantalla completa, el método en la barra lateral — sin salir de la página."
        />
        <EmptyState
          icon={Play}
          title="No hay ninguna sesión activa"
          description="Elegí un método en Métodos para arrancar una sesión de estudio."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Mobile view switcher */}
      <div className="flex rounded-md border border-border-subtle bg-bg-surface-2/60 p-1 md:hidden">
        <button
          type="button"
          onClick={() => setMobileTab("method")}
          className={clsx(
            "flex-1 rounded py-1.5 font-mono text-xs font-medium tracking-wide transition-all",
            mobileTab === "method"
              ? "bg-accent text-accent-contrast shadow-[var(--shadow-glow-sm)]"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          MÉTODO // TIMER
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("document")}
          className={clsx(
            "flex-1 rounded py-1.5 font-mono text-xs font-medium tracking-wide transition-all",
            mobileTab === "document"
              ? "bg-accent text-accent-contrast shadow-[var(--shadow-glow-sm)]"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          DOCUMENTO
        </button>
      </div>

      <div className="flex h-full min-h-0 flex-1 flex-col gap-4 md:flex-row">
        <aside
          className={clsx(
            "w-full shrink-0 flex-col gap-4 overflow-y-auto rounded-lg glass-panel p-5 md:w-80",
            mobileTab === "method" ? "flex" : "hidden md:flex",
          )}
        >
          <Link
            to="/methods"
            className="flex items-center gap-1.5 text-xs font-medium text-text-tertiary transition-colors duration-150 hover:text-text-primary"
          >
            <ArrowLeft size={14} strokeWidth={1.75} />
            Métodos
          </Link>

          <div>
            <span className="font-mono text-[10px] tracking-[0.25em] text-accent uppercase">
              // Sesión de estudio
            </span>
            <h1 className="font-display text-xl font-bold text-text-primary">{method.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">{method.shortDescription}</p>
          </div>

          <div className="border-t border-border-subtle/70 pt-4">
            <SessionRunner
              method={method}
              subjectFolderId={subjectFolderId}
              onHideDocument={setDocumentHidden}
            />
          </div>
        </aside>

        <div
          className={clsx(
            "min-w-0 flex-1 overflow-hidden rounded-lg glass-panel",
            mobileTab === "document" ? "flex flex-col" : "hidden md:flex md:flex-col",
          )}
        >
          {!fileId ? (
            <FilePickerInline onPick={handlePickFile} />
          ) : documentHidden ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-secondary font-mono">
              [ DOCUMENTO OCULTO DURANTE ESTE BLOQUE — TURNO DE RECUERDO ]
            </div>
          ) : (
            <DocumentAnnotator fileId={fileId} hideNotesPanel />
          )}
        </div>
      </div>
    </div>
  );
}
