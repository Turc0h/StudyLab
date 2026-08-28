import "pdfjs-dist/web/pdf_viewer.css";

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { ZoomIn, ZoomOut } from "lucide-react";
import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import type { OcrLine } from "../../db/db";
import { pdfjsLib } from "../../lib/pdf";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface JumpTarget {
  page: number;
  token: number;
}

const ICON_BUTTON =
  "flex h-7 w-7 items-center justify-center rounded-md text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary disabled:pointer-events-none disabled:opacity-30";

interface PdfPageProps {
  pdfDoc: PDFDocumentProxy;
  pageNumber: number;
  scale: number;
  postItArmed: boolean;
  onPageClick?: (info: { page: number; xPct: number; yPct: number }) => void;
  renderOverlay?: (page: number, pageSize: { width: number; height: number }) => ReactNode;
  registerContainer: (page: number, el: HTMLDivElement | null) => void;
  /** Líneas de OCR para esta página — se usan cuando el PDF no trae texto embebido real. */
  ocrLines?: OcrLine[];
}

function PdfPage({
  pdfDoc,
  pageNumber,
  scale,
  postItArmed,
  onPageClick,
  renderOverlay,
  registerContainer,
  ocrLines,
}: PdfPageProps) {
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const pdfPage = await pdfDoc.getPage(pageNumber);
      if (cancelled) return;

      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;

      renderTaskRef.current?.cancel();
      const task = pdfPage.render({
        canvas,
        canvasContext: ctx,
        viewport,
        transform: outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined,
      });
      renderTaskRef.current = task;

      try {
        await task.promise;
      } catch (err) {
        if (err instanceof Error && err.name === "RenderingCancelledException") return;
        throw err;
      }
      if (cancelled) return;

      setPageSize({ width: viewport.width, height: viewport.height });

      const textLayerDiv = textLayerRef.current;
      if (textLayerDiv) {
        textLayerDiv.replaceChildren();
        textLayerDiv.style.setProperty("--total-scale-factor", `${scale}`);
        const textContent = await pdfPage.getTextContent();
        const hasRealText = textContent.items.some(
          (item) => "str" in item && item.str.trim().length > 0,
        );

        if (hasRealText) {
          const textLayer = new pdfjsLib.TextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
          });
          await textLayer.render();
        } else if (ocrLines && ocrLines.length > 0) {
          // Sin texto embebido (escaneado): armamos una capa sintética a partir del OCR,
          // una línea por span, para que se pueda seleccionar y subrayar igual que un PDF real.
          for (const line of ocrLines) {
            const span = document.createElement("span");
            span.textContent = line.text;
            span.style.left = `${line.x * viewport.width}px`;
            span.style.top = `${line.y * viewport.height}px`;
            span.style.height = `${line.height * viewport.height}px`;
            span.style.fontSize = `${line.height * viewport.height * 0.9}px`;
            span.style.fontFamily = "sans-serif";
            textLayerDiv.appendChild(span);

            const naturalWidth = span.getBoundingClientRect().width;
            const targetWidth = line.width * viewport.width;
            if (naturalWidth > 0) {
              span.style.transform = `scaleX(${targetWidth / naturalWidth})`;
            }
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNumber, scale, ocrLines]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!postItArmed || !onPageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPageClick({
      page: pageNumber,
      xPct: (e.clientX - rect.left) / rect.width,
      yPct: (e.clientY - rect.top) / rect.height,
    });
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        ref={(el) => registerContainer(pageNumber, el)}
        className={postItArmed ? "relative cursor-crosshair" : "relative"}
        style={{ boxShadow: "var(--shadow-surface)" }}
        onClick={handleClick}
      >
        <canvas ref={canvasRef} className="block" />
        <div ref={textLayerRef} className="textLayer" />
        {pageSize.width > 0 && renderOverlay?.(pageNumber, pageSize)}
      </div>
      <span className="font-mono text-[11px] tabular-nums text-text-tertiary">{pageNumber}</span>
    </div>
  );
}

interface PdfViewerProps {
  blob: Blob;
  scale: number;
  onScaleChange: (scale: number) => void;
  onLoaded?: (info: { numPages: number; hasTextLayer: boolean }) => void;
  /** Fase 4 — solo se crean subrayados mientras este modo está activo. */
  highlightMode: boolean;
  onTextSelected?: (selection: { page: number; text: string; rects: NormalizedRect[] }) => void;
  /** Fase 5 — armado por un solo uso: el próximo click ancla un post-it y se desarma solo. */
  postItArmed: boolean;
  onPageClick?: (info: { page: number; xPct: number; yPct: number }) => void;
  /** Cambiar este valor (con un token nuevo) hace scroll hasta esa página. */
  jumpTo?: JumpTarget | null;
  renderOverlay?: (page: number, pageSize: { width: number; height: number }) => ReactNode;
  /** Líneas de OCR por página, para PDFs escaneados sin texto embebido. */
  getOcrLines?: (page: number) => OcrLine[] | undefined;
}

export function PdfViewer({
  blob,
  scale,
  onScaleChange,
  onLoaded,
  highlightMode,
  onTextSelected,
  postItArmed,
  onPageClick,
  jumpTo,
  renderOverlay,
  getOcrLines,
}: PdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  useEffect(() => {
    let cancelled = false;
    setPdfDoc(null);
    (async () => {
      const arrayBuffer = await blob.arrayBuffer();
      const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      if (cancelled) return;
      setPdfDoc(doc);
      setNumPages(doc.numPages);
      const firstPage = await doc.getPage(1);
      const content = await firstPage.getTextContent();
      const hasTextLayer = content.items.some(
        (item) => "str" in item && item.str.trim().length > 0,
      );
      if (!cancelled) onLoaded?.({ numPages: doc.numPages, hasTextLayer });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  useEffect(() => {
    if (!jumpTo) return;
    pageRefs.current.get(jumpTo.page)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [jumpTo]);

  // Escuchamos el mouseup en toda la ventana (no en cada página) a propósito: si el arrastre de
  // selección termina unos píxeles fuera del borde de la página — algo muy común —, un listener
  // acotado a la página nunca se entera. Acá identificamos la página dueña de la selección por
  // su contenido en el DOM, no por dónde cayó el cursor.
  useEffect(() => {
    if (!highlightMode || !onTextSelected) return;

    function handleWindowMouseUp() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
      const text = selection.toString().trim();
      if (!text) return;

      const range = selection.getRangeAt(0);
      for (const [pageNumber, container] of pageRefs.current.entries()) {
        if (!container.contains(range.commonAncestorContainer)) continue;

        const containerRect = container.getBoundingClientRect();
        const rects: NormalizedRect[] = Array.from(range.getClientRects())
          .filter((r) => r.width > 0 && r.height > 0)
          .map((r) => ({
            x: (r.left - containerRect.left) / containerRect.width,
            y: (r.top - containerRect.top) / containerRect.height,
            width: r.width / containerRect.width,
            height: r.height / containerRect.height,
          }));

        if (rects.length === 0) return;
        onTextSelected?.({ page: pageNumber, text, rects });
        selection.removeAllRanges();
        return;
      }
    }

    window.addEventListener("mouseup", handleWindowMouseUp);
    return () => window.removeEventListener("mouseup", handleWindowMouseUp);
  }, [highlightMode, onTextSelected]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-3 py-2">
        <span className="font-mono text-xs tabular-nums text-text-secondary">
          {numPages > 0 ? `${numPages} página${numPages === 1 ? "" : "s"}` : "—"}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => onScaleChange(Math.max(0.6, Math.round((scale - 0.15) * 100) / 100))}
          >
            <ZoomOut size={16} strokeWidth={1.75} />
          </button>
          <span className="w-10 text-center font-mono text-xs tabular-nums text-text-secondary">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => onScaleChange(Math.min(2.5, Math.round((scale + 0.15) * 100) / 100))}
          >
            <ZoomIn size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-bg-base-alt px-4 py-6">
        <div className="mx-auto flex w-fit flex-col items-center gap-6">
          {pdfDoc &&
            Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
              <PdfPage
                key={pageNumber}
                pdfDoc={pdfDoc}
                pageNumber={pageNumber}
                scale={scale}
                postItArmed={postItArmed}
                onPageClick={onPageClick}
                renderOverlay={renderOverlay}
                ocrLines={getOcrLines?.(pageNumber)}
                registerContainer={(pageNum, el) => {
                  if (el) pageRefs.current.set(pageNum, el);
                  else pageRefs.current.delete(pageNum);
                }}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
