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
import { PanelGuide } from "../../components/guide/PanelGuide";
import { getFileBlob } from "../storage/fileStorage";

interface DocumentAnnotatorProps {
  fileId: string;
  /** Página inicial a la que saltar al abrir el documento */
  initialPage?: number;
  /** Si se pasa, muestra el botón de cerrar (uso en panel a pantalla completa). */
  onClose?: () => void;
  /** Oculta el panel de notas lateral — útil cuando el método ya tiene su propio panel. */
  hideNotesPanel?: boolean;
}

/**
 * Documento + subrayado + post-its + OCR + notas en vivo. Es el núcleo compartido entre el
 * panel a pantalla completa de Archivos (`DocumentPanel`) y el panel embebido de Sesión.
 */
export function DocumentAnnotator({ fileId, initialPage, onClose, hideNotesPanel }: DocumentAnnotatorProps) {
  const file = useLiveQuery(() => db.files.get(fileId), [fileId]);
  const highlights = useLiveQuery(() => db.highlights.where({ fileId }).toArray(), [fileId]) ?? [];
  const postits = useLiveQuery(() => db.postits.where({ fileId }).toArray(), [fileId]) ?? [];
  const ocrPages = useLiveQuery(() => db.ocrPages.where({ fileId }).toArray(), [fileId]) ?? [];

  const [scale, setScale] = useState(1.1);
  const [hasTextLayer, setHasTextLayer] = useState<boolean | null>(null);
  const [highlightMode, setHighlightMode] = useState(false);
  const [postItArmed, setPostItArmed] = useState(false);
  const [jumpTo, setJumpTo] = useState<JumpTarget | null>(() =>
    initialPage ? { page: initialPage, token: Date.now() } : null
  );
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const [ocrError, setOcrError] = useState<string | null>(null);
  const [notesCollapsed, setNotesCollapsed] = useState(false);

  if (!file) return null;

  const ready = hasTextLayer === true || file.ocrStatus === "done";
  const showOcrPrompt = isPdf(file.mimeType) && hasTextLayer === false && !ready;

  async function handleRunOcr() {
    setOcrRunning(true);
    setOcrProgress(0);
    setOcrError(null);
    await db.files.update(fileId, { ocrStatus: "processing" });
    try {
      const blobToProcess = file?.blob || (await getFileBlob(fileId));
      if (!blobToProcess) {
        throw new Error("No se dispone del contenido del archivo para ejecutar OCR.");
      }
      const results = await runOcrOnFile(blobToProcess, setOcrProgress);
      await db.ocrPages.where({ fileId }).delete();
      const records = results.map((r) => ({
        id: generateId(),
        fileId,
        page: r.page,
        lines: r.lines,
      }));
      if (records.length > 0) {
        await db.ocrPages.bulkAdd(records);
      }
      await db.files.update(fileId, { ocrStatus: "done" });
    } catch (err) {
      console.error("Error al procesar OCR:", err);
      await db.files.update(fileId, { ocrStatus: "pending" });
      setOcrError("No se pudo completar el reconocimiento. Verificá tu conexión para descargar el modelo de lenguaje.");
    } finally {
      setOcrRunning(false);
    }
  }

  return (
    <div className="flex h-full flex-col bg-bg-primary text-text-primary">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle bg-bg-secondary/95 px-4 py-2.5 backdrop-blur-xs">
        <div className="flex min-w-0 items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}

              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated text-text-secondary transition-colors duration-150 hover:bg-bg-secondary hover:text-text-primary"
              title="Cerrar documento (Esc)"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          )}
          <h2 className="truncate font-serif text-sm font-semibold text-text-primary">
            {file.name}
          </h2>
          {isPdf(file.mimeType) && hasTextLayer !== null && (
            <Badge variant={ready ? "success" : "warning"}>
              {ready ? "Listo para subrayar" : "OCR pendiente"}
            </Badge>
          )}
          <PanelGuide
            id="pdf-annotator-guide"
            title="Herramientas del Lector de PDF"
            whatItDoes="Lector de alta fidelidad con anotaciones persistentes, reconocimiento OCR y notas en vivo."
            howToUse={[
              "Subrayar: Hacé clic en el botón 'Subrayar' (se pone azul) y arrastrá el mouse sobre el texto.",
              "Post-it: Hacé clic en 'Post-it' y luego un clic sobre cualquier parte de la hoja para pegar la nota.",
              "OCR: Si el PDF es escaneado, tocá 'Ejecutar OCR' para que el texto sea seleccionable.",
              "Navegación & Zoom: En la barra flotante del visor usá [← Pag / Total →] y los botones de lupa.",
              "Panel lateral: Tocá 'Ir a la página X' en cualquier nota para que el visor salte ahí.",
            ]}
            tip="Tus subrayados y post-its se guardan con coordenadas normalizadas para que nunca se desalineen al cambiar de zoom."
            align="left"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {showOcrPrompt && (
            <button
              type="button"
              onClick={handleRunOcr}
              disabled={ocrRunning}
              className="flex items-center gap-1.5 rounded-md bg-accent-primary px-3 py-1.5 text-xs font-medium text-bg-elevated transition-colors duration-150 hover:bg-accent-hover disabled:opacity-60"
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
                  ? "bg-accent-primary text-bg-elevated"
                  : "border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary",
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
                  ? "bg-accent-primary text-bg-elevated"
                  : "border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary",
              )}
            >
              <StickyNote size={14} strokeWidth={1.75} />
              {postItArmed ? "Hacé click en la página…" : "Post-it"}
            </button>
          )}
          {!hideNotesPanel && (
            <button
              type="button"
              onClick={() => setNotesCollapsed((v) => !v)}
              className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
              title={notesCollapsed ? "Mostrar panel lateral de notas" : "Ocultar panel lateral (Modo Lectura Limpia)"}
            >
              <span>{notesCollapsed ? "Mostrar Notas" : "Ocultar Notas"}</span>
            </button>
          )}
        </div>
      </header>

      {ocrError && (
        <div className="flex items-center justify-between border-b border-danger/30 bg-danger-muted/50 px-4 py-2 text-xs text-danger">
          <span>{ocrError}</span>
          <button type="button" onClick={() => setOcrError(null)} className="font-medium hover:underline">
            Descartar
          </button>
        </div>
      )}

      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          {isPdf(file.mimeType) ? (
            <PdfViewer
              blob={file.blob}
              filePath={file.diskPath}
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
        {!hideNotesPanel && !notesCollapsed && (
          <aside className="hidden w-80 shrink-0 md:block border-l border-border-subtle bg-bg-secondary/40">
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
