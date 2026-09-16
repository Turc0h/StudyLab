import "pdfjs-dist/web/pdf_viewer.css";

import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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
  defaultPageSize: { width: number; height: number };
  postItArmed: boolean;
  isWithinWindow: boolean;
  priority: boolean;
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
  defaultPageSize,
  postItArmed,
  isWithinWindow,
  priority,
  onPageClick,
  renderOverlay,
  registerContainer,
  ocrLines,
}: PdfPageProps) {
  const [pageSize, setPageSize] = useState({ width: 0, height: 0 });
  const [rendered, setRendered] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  // Renderizado en ventana deslizante (sliding window) con prioridad de carga
  useEffect(() => {
    if (!isWithinWindow) {
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancel
        }
        renderTaskRef.current = null;
      }
      setRendered(false);
      return;
    }

    let cancelled = false;

    // La página en pantalla renderiza al instante; las adyacentes precargan con leve offset para no competir por CPU
    const timer = setTimeout(() => {
      (async () => {
        try {
          const pdfPage = await pdfDoc.getPage(pageNumber);
          if (cancelled) {
            pdfPage.cleanup();
            return;
          }

          const viewport = pdfPage.getViewport({ scale });
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext("2d", { alpha: false });
          if (!canvas || !ctx) {
            pdfPage.cleanup();
            return;
          }

          const outputScale = Math.min(window.devicePixelRatio || 1, 2);
          const newW = Math.floor(viewport.width * outputScale);
          const newH = Math.floor(viewport.height * outputScale);

          if (canvas.width !== newW || canvas.height !== newH) {
            canvas.width = newW;
            canvas.height = newH;
          }
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          if (renderTaskRef.current) {
            try {
              renderTaskRef.current.cancel();
            } catch {
              // ignore
            }
          }

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

          if (cancelled) {
            pdfPage.cleanup();
            return;
          }

          setPageSize({ width: viewport.width, height: viewport.height });
          setRendered(true);

          const textLayerDiv = textLayerRef.current;
          if (textLayerDiv) {
            textLayerDiv.replaceChildren();
            textLayerDiv.style.setProperty("--total-scale-factor", `${scale}`);
            const textContent = await pdfPage.getTextContent();
            if (cancelled) {
              pdfPage.cleanup();
              return;
            }

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

          pdfPage.cleanup();
        } catch (err) {
          if (err instanceof Error && err.name === "RenderingCancelledException") return;
          console.warn(`Error al renderizar página ${pageNumber}:`, err);
        }
      })();
    }, priority ? 0 : 50);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore
        }
        renderTaskRef.current = null;
      }
    };
  }, [pdfDoc, pageNumber, scale, isWithinWindow, priority, ocrLines]);

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if (!postItArmed || !onPageClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    onPageClick({
      page: pageNumber,
      xPct: (e.clientX - rect.left) / rect.width,
      yPct: (e.clientY - rect.top) / rect.height,
    });
  }

  const currentWidth = pageSize.width > 0 ? pageSize.width : Math.round(defaultPageSize.width * scale);
  const currentHeight = pageSize.height > 0 ? pageSize.height : Math.round(defaultPageSize.height * scale);

  return (
    <div
      ref={wrapperRef}
      className="flex flex-col items-center gap-1.5"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: `${currentWidth}px ${currentHeight + 24}px`,
      }}
    >
      <div
        ref={(el) => registerContainer(pageNumber, el)}
        style={{
          width: `${currentWidth}px`,
          height: `${currentHeight}px`,
        }}
        className={`relative bg-white dark:bg-zinc-900 rounded border border-border-subtle shadow-xs overflow-hidden ${
          postItArmed ? "cursor-crosshair" : ""
        }`}
        onClick={handleClick}
      >
        {isWithinWindow && (
          <>
            <canvas
              ref={canvasRef}
              className={`block transition-opacity duration-150 ${rendered ? "opacity-100" : "opacity-0"}`}
            />
            <div ref={textLayerRef} className="textLayer" />
            {pageSize.width > 0 && renderOverlay?.(pageNumber, pageSize)}
          </>
        )}
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
  const [activePage, setActivePage] = useState(1);
  const [inputPage, setInputPage] = useState("1");
  const [defaultPageSize, setDefaultPageSize] = useState({ width: 595, height: 842 });

  const pageRefs = useRef(new Map<number, HTMLDivElement>());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    let loadingTask: ReturnType<typeof pdfjsLib.getDocument> | null = null;
    let currentDoc: PDFDocumentProxy | null = null;
    setPdfDoc(null);

    (async () => {
      const arrayBuffer = await blob.arrayBuffer();
      loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const doc = await loadingTask.promise;
      if (cancelled) {
        void doc.cleanup();
        void loadingTask.destroy();
        return;
      }
      currentDoc = doc;
      setPdfDoc(doc);
      setNumPages(doc.numPages);

      try {
        const firstPage = await doc.getPage(1);
        const baseViewport = firstPage.getViewport({ scale: 1 });
        if (!cancelled) {
          setDefaultPageSize({ width: baseViewport.width, height: baseViewport.height });
        }
        const content = await firstPage.getTextContent();
        const hasTextLayer = content.items.some(
          (item) => "str" in item && item.str.trim().length > 0,
        );
        if (!cancelled) onLoaded?.({ numPages: doc.numPages, hasTextLayer });
        firstPage.cleanup();
      } catch (err) {
        console.warn("No se pudo leer la primera página para metadatos:", err);
      }
    })();

    return () => {
      cancelled = true;
      if (currentDoc) void currentDoc.cleanup();
      if (loadingTask) void loadingTask.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blob]);

  useEffect(() => {
    setInputPage(String(activePage));
  }, [activePage]);

  useEffect(() => {
    if (!jumpTo) return;
    const target = pageRefs.current.get(jumpTo.page);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(jumpTo.page);
    }
  }, [jumpTo]);

  function scrollToPage(pageNum: number) {
    const clamped = Math.max(1, Math.min(numPages, pageNum));
    const target = pageRefs.current.get(clamped);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActivePage(clamped);
    }
  }

  function handlePageInputSubmit(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      const parsed = parseInt(inputPage, 10);
      if (!isNaN(parsed)) {
        scrollToPage(parsed);
      } else {
        setInputPage(String(activePage));
      }
    }
  }

  function handleFitToWidth() {
    if (!scrollContainerRef.current || defaultPageSize.width <= 0) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 48;
    if (containerWidth > 0) {
      const fitScale = Math.round((containerWidth / defaultPageSize.width) * 100) / 100;
      onScaleChange(Math.max(0.6, Math.min(2.5, fitScale)));
    }
  }

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

  const PAGE_WINDOW_BUFFER = 2; // Rango de páginas activas (activePage ± 2)

  // Seguimiento de página activa durante el scroll
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || numPages <= 0) return;

    let ticking = false;
    function handleScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!container) return;
          const containerRect = container.getBoundingClientRect();
          const targetY = containerRect.top + 140; // Zona focal superior de lectura

          let closestPage = activePage;
          let minDistance = Infinity;

          for (const [pageNum, el] of pageRefs.current.entries()) {
            const rect = el.getBoundingClientRect();
            const distance = Math.abs(rect.top - targetY);
            if (distance < minDistance) {
              minDistance = distance;
              closestPage = pageNum;
            }
          }

          if (closestPage !== activePage && closestPage >= 1 && closestPage <= numPages) {
            setActivePage(closestPage);
          }
          ticking = false;
        });
        ticking = true;
      }
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [activePage, numPages]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle bg-bg-surface/50 px-3 py-1.5 backdrop-blur-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={ICON_BUTTON}
            disabled={activePage <= 1}
            onClick={() => scrollToPage(activePage - 1)}
            title="Página anterior"
          >
            <ChevronLeft size={16} strokeWidth={1.75} />
          </button>
          <div className="flex items-center gap-1 font-mono text-xs text-text-secondary">
            <input
              type="text"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={handlePageInputSubmit}
              onBlur={() => {
                const parsed = parseInt(inputPage, 10);
                if (!isNaN(parsed)) scrollToPage(parsed);
                else setInputPage(String(activePage));
              }}
              className="h-6 w-10 rounded border border-border-subtle bg-bg-elevated text-center font-mono text-xs text-text-primary focus:border-accent-primary focus:outline-hidden"
              title="Presiona Enter para saltar de página"
            />
            <span>/ {numPages || "—"}</span>
          </div>
          <button
            type="button"
            className={ICON_BUTTON}
            disabled={activePage >= numPages}
            onClick={() => scrollToPage(activePage + 1)}
            title="Página siguiente"
          >
            <ChevronRight size={16} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => onScaleChange(Math.max(0.6, Math.round((scale - 0.15) * 100) / 100))}
            title="Alejar (Zoom Out)"
          >
            <ZoomOut size={16} strokeWidth={1.75} />
          </button>
          <button
            type="button"
            onClick={() => onScaleChange(1.0)}
            className="w-12 text-center font-mono text-xs tabular-nums text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            title="Restablecer a 100%"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className={ICON_BUTTON}
            onClick={() => onScaleChange(Math.min(2.5, Math.round((scale + 0.15) * 100) / 100))}
            title="Acercar (Zoom In)"
          >
            <ZoomIn size={16} strokeWidth={1.75} />
          </button>

          <div className="mx-1 h-3.5 w-px bg-border-subtle" />

          <button
            type="button"
            className={ICON_BUTTON}
            onClick={handleFitToWidth}
            title="Ajustar al ancho"
          >
            <Maximize2 size={14} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-auto bg-bg-secondary px-4 py-6"
      >
        <div className="mx-auto flex w-fit flex-col items-center gap-6">
          {pdfDoc &&
            Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => {
              const isWithinWindow = Math.abs(pageNumber - activePage) <= PAGE_WINDOW_BUFFER;
              const isPriority = pageNumber === activePage;

              return (
                <PdfPage
                  key={pageNumber}
                  pdfDoc={pdfDoc}
                  pageNumber={pageNumber}
                  scale={scale}
                  defaultPageSize={defaultPageSize}
                  postItArmed={postItArmed}
                  isWithinWindow={isWithinWindow}
                  priority={isPriority}
                  onPageClick={onPageClick}
                  renderOverlay={renderOverlay}
                  ocrLines={getOcrLines?.(pageNumber)}
                  registerContainer={(pageNum, el) => {
                    if (el) pageRefs.current.set(pageNum, el);
                    else pageRefs.current.delete(pageNum);
                  }}
                />
              );
            })}
        </div>
      </div>
    </div>
  );
}

