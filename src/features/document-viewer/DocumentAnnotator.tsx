import { clsx } from "clsx";
import { useLiveQuery } from "dexie-react-hooks";
import { Highlighter, Loader2, ScanText, StickyNote, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "../../components/ui/Badge";
import { db } from "../../db/db";
import { generateId, isPdf } from "../files/fileHelpers";
import { HighlightMarks } from "./HighlightMarks";
import { NotesPanel } from "./NotesPanel";
import { runOcrOnFile } from "./ocr";
import type { JumpTarget } from "./PdfViewer";
import { PdfViewer } from "./PdfViewer";
import { PostItMarks } from "./PostItMarks";

interface DocumentAnnotatorProps {
  fileId: string;
  /** Si se pasa, muestra el botón de cerrar (uso en panel a pantalla completa). */
  onClose?: () => void;
  /** Oculta el panel de notas lateral — útil cuando el método ya tiene su propio panel. */
  hideNotesPanel?: boolean;
}

/**
 * Documento + subrayado + post-its + OCR + notas en vivo. Es el núcleo compartido entre el
 * panel a pantalla completa de Archivos (`DocumentPanel`) y el panel embebido de Sesión.
 */
export function DocumentAnnotator({ fileId, onClose, hideNotesPanel }: DocumentAnnotatorProps) {
  const file = useLiveQuery(() => db.files.get(fileId), [fileId]);
  const highlights = useLiveQuery(() => db.highlights.where({ fileId }).toArray(), [fileId]) ?? [];
  const postits = useLiveQuery(() => db.postits.where({ fileId }).toArray(), [fileId]) ?? [];
  const ocrPages = useLiveQuery(() => db.ocrPages.where({ fileId }).toArray(), [fileId]) ?? [];

  const [scale, setScale] = useState(1.1);
  const [hasTextLayer, setHasTextLayer] = useState<boolean | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [postItArmed, setPostItArmed] = useState(false);
  const [jumpTo, setJumpTo] = useState<JumpTarget | null>(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  if (!file) return null;

  const ready = hasTextLayer === true || file.ocrStatus === "done";
  const showOcrPrompt = isPdf(file.mimeType) && hasTextLayer === false && !ready;

  async function handleRunOcr() {
    setOcrRunning(true);
    setOcrProgress(0);
    await db.files.update(fileId, { ocrStatus: "processing" });
    try {
      const results = await runOcrOnFile(file!.blob, setOcrProgress);
      await db.ocrPages.where({ fileId }).delete();
      for (const r of results) {
        await db.ocrPages.add({ id: generateId(), fileId, page: r.page, lines: r.lines });
      }
      await db.files.update(fileId, { ocrStatus: "done" });
    } finally {
      setOcrRunning(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary"
            >
              <X size={18} strokeWidth={1.75} />
            </button>
          )}
          <h2 className="truncate font-display text-sm font-semibold text-text-primary">
            {file.name}
          </h2>
          {isPdf(file.mimeType) && hasTextLayer !== null && (
            <Badge variant={ready ? "success" : "warning"}>
              {ready ? "Listo para subrayar" : "OCR pendiente"}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showOcrPrompt && (
            <button
              type="button"
              onClick={handleRunOcr}
              disabled={ocrRunning}
              className="flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-contrast transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
            >
              {ocrRunning ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <ScanText size={14} strokeWidth={1.75} />
              )}
              {ocrRunning ? `Reconociendo… ${ocrProgress}%` : "Ejecutar OCR"}
            </button>
          )}
          {isPdf(file.mimeType) && ready && (
            <button
              type="button"
              onClick={() => {
                setHighlightMode((v) => !v);
                setPostItArmed(false);
              }}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                highlightMode
                  ? "bg-accent text-accent-contrast"
                  : "bg-bg-surface-2 text-text-secondary hover:text-text-primary",
              )}
            >
              <Highlighter size={14} strokeWidth={1.75} />
              {highlightMode ? "Subrayando…" : "Subrayar"}
            </button>
          )}
          {isPdf(file.mimeType) && (
            <button
              type="button"
              onClick={() => {
                setPostItArmed((v) => !v);
                setHighlightMode(false);
              }}
              className={clsx(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150",
                postItArmed
                  ? "bg-accent text-accent-contrast"
                  : "bg-bg-surface-2 text-text-secondary hover:text-text-primary",
              )}
            >
              <StickyNote size={14} strokeWidth={1.75} />
              {postItArmed ? "Hacé click en la página…" : "Post-it"}
            </button>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {isPdf(file.mimeType) ? (
            <PdfViewer
              blob={file.blob}
              scale={scale}
              onScaleChange={setScale}
              onLoaded={({ hasTextLayer: h }) => {
                setHasTextLayer(h);
                if (h && file.ocrStatus === "pending") {
                  void db.files.update(fileId, { ocrStatus: "done" });
                }
              }}
              highlightMode={highlightMode}
              onTextSelected={async ({ page, text, rects }) => {
                await db.highlights.add({
                  id: generateId(),
                  fileId,
                  page,
                  text,
                  rects,
                  createdAt: Date.now(),
                });
              }}
              postItArmed={postItArmed}
              onPageClick={async ({ page, xPct, yPct }) => {
                await db.postits.add({
                  id: generateId(),
                  fileId,
                  page,
                  xPct,
                  yPct,
                  text: "",
                  color: "accent",
                  createdAt: Date.now(),
                });
                // Un post-it por click de botón — se desarma solo después de colocarlo.
                setPostItArmed(false);
              }}
              jumpTo={jumpTo}
              getOcrLines={(page) => ocrPages.find((o) => o.page === page)?.lines}
              renderOverlay={(page, pageSize) => (
                <>
                  <HighlightMarks
                    highlights={highlights.filter((h) => h.page === page)}
                    pageSize={pageSize}
                  />
                  <PostItMarks
                    postits={postits.filter((p) => p.page === page)}
                    pageSize={pageSize}
                  />
                </>
              )}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-text-secondary">
              Este formato todavía no tiene visor propio acá adentro — por ahora solo PDF.
            </div>
          )}
        </div>
        {!hideNotesPanel && (
          <aside className="hidden w-80 shrink-0 md:block">
            <NotesPanel
              fileId={fileId}
              onJumpToPage={(page) => setJumpTo({ page, token: Date.now() })}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
