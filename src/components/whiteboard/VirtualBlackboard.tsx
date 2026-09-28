import React, { useRef, useState, useEffect, useCallback } from "react";
import {
  Pen,
  Eraser,
  Undo2,
  Redo2,
  Trash2,
  Download,
  ScanText,
  Wand2,
  Check,
  Copy,
  X,
  FlaskConical,
  Save,
  FolderOpen,
} from "lucide-react";
import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db.ts";
import { renderLatexToHtml } from "../../lib/latexHelper";
import {
  type Point,
  type Stroke,
  type SurfaceTheme,
  CHALKBOARD_PALETTE,
  NOTEBOOK_PALETTE,
  applyEmaFilter,
  renderStrokeToContext,
  renderBackgroundGrid,
  recognizeWhiteboardCanvas,
  exportCanvasToPng,
} from "./whiteboardEngine";
import {
  beautifyStrokeNative,
  compressStrokesNative,
  decompressStrokesNative,
  type StrokeData,
} from "../../platform/nativeStroke";

export interface VirtualBlackboardProps {
  onInsertLatex?: (latex: string) => void;
  className?: string;
  initialSurface?: SurfaceTheme;
}

export const VirtualBlackboard: React.FC<VirtualBlackboardProps> = ({
  onInsertLatex,
  className = "",
  initialSurface = "chalkboard",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estados de dibujo y lienzo
  const [surface, setSurface] = useState<SurfaceTheme>(initialSurface);
  const [tool, setTool] = useState<"pen" | "eraser">("pen");
  const [brushWidth, setBrushWidth] = useState<number>(3);
  const [color, setColor] = useState<string>(
    initialSurface === "chalkboard" ? CHALKBOARD_PALETTE[0].value : NOTEBOOK_PALETTE[0].value,
  );
  const [gridType, setGridType] = useState<"none" | "lines" | "grid">("grid");

  // Pila de trazos para renderizado vectorial e historial
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [history, setHistory] = useState<Stroke[][]>([]);
  const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

  // Trazo activo
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const currentPointsRef = useRef<Point[]>([]);

  // Estado de herramientas experimentales de laboratorio (desactivado por defecto)
  const [showExperimentalOcr, setShowExperimentalOcr] = useState<boolean>(false);

  // Estado del Modal de Reconocimiento OCR
  const [isOcrModalOpen, setIsOcrModalOpen] = useState<boolean>(false);
  const [isRecognizing, setIsRecognizing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<number>(0);
  const [recognizedLatex, setRecognizedLatex] = useState<string>("");
  const [recognizedConfidence, setRecognizedConfidence] = useState<number>(0);
  const [copiedSuccess, setCopiedSuccess] = useState<boolean>(false);
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  // Estados de persistencia comprimida con Rust
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [saveTitle, setSaveTitle] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const savedBoards = useLiveQuery(() => db.blackboards?.reverse().sortBy("updatedAt"), []) || [];

  // Redibujado completo del lienzo
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Resetear transformaciones antes de dibujar fondo
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Fondo y Cuadrícula
    renderBackgroundGrid(ctx, width, height, surface, gridType);

    // Renderizar trazos confirmados
    for (const stroke of strokes) {
      renderStrokeToContext(ctx, stroke, surface);
    }

    // Renderizar trazo en curso
    if (currentPointsRef.current.length > 0) {
      const liveStroke: Stroke = {
        id: "live",
        points: currentPointsRef.current,
        color,
        width: brushWidth,
        tool,
      };
      renderStrokeToContext(ctx, liveStroke, surface);
    }

    ctx.restore();
  }, [strokes, surface, gridType, color, brushWidth, tool]);

  // Sincronización del tamaño del canvas con soporte para HiDPI/Retina y SplitPanel resize
  useEffect(() => {
    const updateSize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      // Ancho y alto lógicos
      const displayWidth = Math.floor(rect.width);
      const displayHeight = Math.max(480, Math.floor(rect.height));

      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      redrawCanvas();
    };

    updateSize();

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      observer = new ResizeObserver(() => {
        updateSize();
      });
      observer.observe(containerRef.current);
    }

    window.addEventListener("resize", updateSize);
    return () => {
      if (observer) observer.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, [redrawCanvas]);

  // Actualizar paleta al cambiar superficie
  const handleSurfaceChange = (newSurface: SurfaceTheme) => {
    setSurface(newSurface);
    if (newSurface === "chalkboard") {
      setColor(CHALKBOARD_PALETTE[0].value);
    } else {
      setColor(NOTEBOOK_PALETTE[0].value);
    }
  };

  // Notificación toast efímera
  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // --- GESTIÓN DE EVENTOS DE PUNTERO (Mouse / Stylus / Touch) ---
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      time: Date.now(),
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Solo botón principal
    if (e.button !== 0 && e.pointerType === "mouse") return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDrawing(true);

    const pt = getCanvasCoords(e);
    currentPointsRef.current = [pt];
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const pt = getCanvasCoords(e);
    const pts = currentPointsRef.current;

    // Descartar movimientos mínimos para evitar acumulación de puntos idénticos
    if (pts.length > 0) {
      const last = pts[pts.length - 1];
      const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
      if (dist < 1.5) return;
    }

    pts.push(pt);

    // Aplicar filtro EMA en caliente sobre los últimos puntos
    currentPointsRef.current = applyEmaFilter(pts, 0.65);
    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignorar si el puntero ya fue liberado
    }
    setIsDrawing(false);

    const pts = currentPointsRef.current;
    if (pts.length > 0) {
      const newStroke: Stroke = {
        id: `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        points: [...pts],
        color,
        width: brushWidth,
        tool,
      };

      setHistory((prev) => [...prev, strokes]);
      setStrokes((prev) => [...prev, newStroke]);
      setRedoStack([]);
    }

    currentPointsRef.current = [];
    redrawCanvas();
  };

  // --- HERRAMIENTAS: DESHACER / REHACER / LIMPIAR ---
  const handleUndo = () => {
    if (history.length === 0) return;
    const previousState = history[history.length - 1];
    setRedoStack((prev) => [...prev, strokes]);
    setStrokes(previousState);
    setHistory((prev) => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setHistory((prev) => [...prev, strokes]);
    setStrokes(nextState);
    setRedoStack((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    if (strokes.length === 0) return;
    setHistory((prev) => [...prev, strokes]);
    setStrokes([]);
    setRedoStack([]);
    showToast("Pizarra despejada.");
  };

  // --- PROLIJAR TRAZO (BEAUTIFY VIA RDP EN RUST / TS FALLBACK) ---
  const handleBeautifyLastStroke = async () => {
    if (strokes.length === 0) {
      showToast("No hay trazos recientes para prolijar.");
      return;
    }

    setHistory((prev) => [...prev, strokes]);
    const updated = [...strokes];
    const lastIdx = updated.length - 1;
    updated[lastIdx] = await beautifyStrokeNative(updated[lastIdx], 4.0);
    setStrokes(updated);
    showToast("✨ Trazo prolijado y estabilizado.");
  };

  // --- RECONOCIMIENTO ÓPTICO CON TESSERACT.JS ---
  const handleOpenOcrModal = async () => {
    if (strokes.length === 0) {
      showToast("Dibuja una fórmula o texto antes de reconocer.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsOcrModalOpen(true);
    setIsRecognizing(true);
    setOcrProgress(10);
    setCopiedSuccess(false);

    const result = await recognizeWhiteboardCanvas(canvas, surface, (p) => {
      setOcrProgress(p);
    });

    setRecognizedLatex(result.latexEstimate || result.rawText || "");
    setRecognizedConfidence(Math.round(result.confidence));
    setIsRecognizing(false);
  };

  const handleCopyLatex = () => {
    if (!recognizedLatex.trim()) return;
    navigator.clipboard.writeText(recognizedLatex);
    setCopiedSuccess(true);
    showToast("LaTeX copiado al portapapeles.");
    setTimeout(() => setCopiedSuccess(false), 2000);
  };

  const handleConfirmInsert = () => {
    if (!recognizedLatex.trim()) return;
    onInsertLatex?.(recognizedLatex);
    setIsOcrModalOpen(false);
    showToast("Fórmula insertada en la sesión de cátedra.");
  };

  // Exportar como imagen PNG limpia
  const handleExportPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    exportCanvasToPng(canvas, `pizarra_estudio_${Date.now()}.png`);
    showToast("Pizarra exportada a PNG con éxito.");
  };

  // Guardar pizarra comprimida con delta en Rust
  const handleSaveBlackboard = async () => {
    if (strokes.length === 0) {
      showToast("La pizarra está vacía.");
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    try {
      const strokesData: StrokeData[] = strokes.map((s) => ({
        id: s.id,
        color: s.color,
        width: s.width,
        points: s.points.map((p) => ({ x: p.x, y: p.y, time: p.time })),
      }));

      const compressed = await compressStrokesNative(strokesData);
      const previewDataUrl = canvas.toDataURL("image/png");

      const title = saveTitle.trim() || `Pizarra ${new Date().toLocaleDateString("es-AR")} ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

      await db.blackboards.add({
        id: "board_" + Date.now(),
        title,
        compressedPayload: compressed.payload,
        strokeCount: strokes.length,
        pointCount: compressed.point_count,
        surfaceTheme: surface,
        previewDataUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      setShowSaveModal(false);
      setSaveTitle("");
      showToast(`Pizarra guardada (${compressed.compression_ratio_pct}% compresión Rust)`);
    } catch (err) {
      console.error("Error al guardar pizarra:", err);
      showToast("Error al guardar la pizarra.");
    } finally {
      setIsSaving(false);
    }
  };

  // Cargar pizarra descomprimiendo con Rust
  const handleLoadBlackboard = async (record: typeof savedBoards[0]) => {
    try {
      const decompressed = await decompressStrokesNative(record.compressedPayload);
      const restoredStrokes: Stroke[] = decompressed.map((sd) => ({
        id: sd.id,
        color: sd.color,
        width: sd.width,
        tool: "pen" as const,
        points: sd.points.map((p) => ({ x: p.x, y: p.y, time: p.time })),
      }));

      setSurface(record.surfaceTheme);
      setStrokes(restoredStrokes);
      setHistory([]);
      setRedoStack([]);
      setShowGalleryModal(false);
      showToast(`Pizarra "${record.title}" restaurada.`);
    } catch (err) {
      console.error("Error al cargar pizarra:", err);
      showToast("Error al cargar la pizarra.");
    }
  };

  const handleDeleteBoard = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Eliminar esta pizarra guardada?")) {
      await db.blackboards.delete(id);
      showToast("Pizarra eliminada.");
    }
  };

  const palette = surface === "chalkboard" ? CHALKBOARD_PALETTE : NOTEBOOK_PALETTE;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col h-full w-full select-none rounded-xl overflow-hidden border border-border-hairline bg-bg-surface-1 shadow-md relative ${className}`}
    >
      {/* Toast de confirmación sobrio */}
      {feedbackToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-bg-surface-2 border border-border-hairline text-text-primary font-mono text-xs shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Check className="w-3.5 h-3.5 text-signal-ok shrink-0" />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Barra de Herramientas de Cátedra Superior */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-border-hairline bg-bg-surface-2 text-xs font-mono">
        {/* Herramientas Principales (Lápiz, Borrador, Anchos) */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center rounded-lg border border-border-hairline bg-bg-surface-1 p-0.5">
            <button
              type="button"
              onClick={() => setTool("pen")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                tool === "pen"
                  ? "bg-accent-primary text-text-inverted"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-3"
              }`}
              title="Lápiz / Tiza de Cátedra"
            >
              <Pen className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setTool("eraser")}
              className={`p-1.5 rounded transition-colors cursor-pointer ${
                tool === "eraser"
                  ? "bg-accent-primary text-text-inverted"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-surface-3"
              }`}
              title="Borrador de Tiza"
            >
              <Eraser className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Selector de Grosor */}
          <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg border border-border-hairline bg-bg-surface-1">
            {[
              { label: "Fino", val: 2 },
              { label: "Medio", val: 4 },
              { label: "Grueso", val: 7 },
            ].map((bw) => (
              <button
                key={bw.val}
                type="button"
                onClick={() => setBrushWidth(bw.val)}
                className={`px-1.5 py-0.5 rounded text-[10px] transition-colors cursor-pointer ${
                  brushWidth === bw.val
                    ? "bg-bg-surface-3 text-text-primary font-bold"
                    : "text-text-tertiary hover:text-text-primary"
                }`}
              >
                {bw.label}
              </button>
            ))}
          </div>

          {/* Paleta Mineral Sobria */}
          {tool === "pen" && (
            <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg border border-border-hairline bg-bg-surface-1">
              {palette.map((cp) => (
                <button
                  key={cp.value}
                  type="button"
                  onClick={() => setColor(cp.value)}
                  style={{ backgroundColor: cp.value }}
                  className={`w-4 h-4 rounded-full border transition-transform cursor-pointer ${
                    color === cp.value
                      ? "scale-110 ring-2 ring-accent-primary border-white"
                      : "border-border-hairline opacity-80 hover:opacity-100"
                  }`}
                  title={cp.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* Acciones de Edición, Cuadrícula y Superficie */}
        <div className="flex items-center gap-1.5">
          {/* Prolijar Trazo */}
          <button
            type="button"
            onClick={handleBeautifyLastStroke}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 transition-colors cursor-pointer text-[11px]"
            title="Prolijar y estabilizar el último trazo con suavizado RDP"
          >
            <Wand2 className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="hidden sm:inline">Prolijar</span>
          </button>

          {/* Sección de Laboratorio Experimental: OCR (Desactivado por defecto) */}
          {!showExperimentalOcr ? (
            <button
              type="button"
              onClick={() => setShowExperimentalOcr(true)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-tertiary hover:text-text-secondary hover:bg-bg-surface-3 transition-colors cursor-pointer text-[10px]"
              title="Habilitar herramientas experimentales de laboratorio"
            >
              <FlaskConical className="w-3 h-3 text-system-notice" />
              <span>Lab OCR</span>
              <span className="px-1 py-0.2 rounded bg-system-notice-bg text-system-notice border border-system-notice-border text-[9px] font-mono">
                Beta
              </span>
            </button>
          ) : (
            <div className="flex items-center gap-1 p-0.5 rounded-lg border border-system-notice-border bg-system-notice-bg">
              <button
                type="button"
                onClick={handleOpenOcrModal}
                className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-system-notice-border hover:opacity-90 text-text-primary transition-colors cursor-pointer text-[11px] font-medium"
                title="Función experimental: OCR de mejor esfuerzo (precisión limitada)"
              >
                <ScanText className="w-3 h-3 text-system-notice" />
                <span>Reconocer</span>
                <span className="px-1 py-0.2 rounded bg-system-notice-bg text-system-notice text-[9px] font-mono border border-system-notice-border">
                  Beta
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowExperimentalOcr(false)}
                className="p-1 rounded text-system-notice hover:text-text-primary transition-colors cursor-pointer"
                title="Ocultar herramienta experimental"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Selector de Fondo Técnico (Lisa / Rayada / Cuadrícula Técnica) */}
          <div className="flex items-center rounded-lg border border-border-hairline bg-bg-surface-1 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => setGridType("none")}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                gridType === "none"
                  ? "bg-bg-surface-3 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title="Superficie lisa sin guías"
            >
              Lisa
            </button>
            <button
              type="button"
              onClick={() => setGridType("lines")}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                gridType === "lines"
                  ? "bg-bg-surface-3 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title="Guías horizontales rayadas cada 32px para redacción y deducciones paso a paso"
            >
              Rayada
            </button>
            <button
              type="button"
              onClick={() => setGridType("grid")}
              className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                gridType === "grid"
                  ? "bg-bg-surface-3 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
              title="Cuadrícula técnica de ingeniería cada 24px con ejes mayores cada 120px"
            >
              Cuadrícula
            </button>
          </div>

          {/* Selector de Superficie (Pizarra vs Cuaderno) */}
          <div className="flex items-center rounded-lg border border-border-hairline bg-bg-surface-1 p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => handleSurfaceChange("chalkboard")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                surface === "chalkboard"
                  ? "bg-bg-surface-3 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Pizarra
            </button>
            <button
              type="button"
              onClick={() => handleSurfaceChange("notebook")}
              className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                surface === "notebook"
                  ? "bg-bg-surface-3 text-text-primary font-medium"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              Cuaderno
            </button>
          </div>

          <div className="h-4 w-px bg-border-hairline mx-0.5" />

          {/* Deshacer / Rehacer */}
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            className="p-1.5 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Deshacer trazo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Rehacer trazo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Limpiar */}
          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-1.5 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-signal-danger disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
            title="Limpiar pizarra completa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Descargar / Exportar PNG */}
          <button
            type="button"
            onClick={handleExportPng}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 transition-colors cursor-pointer text-[11px]"
            title="Exportar imagen PNG limpia con fondo y trazos"
          >
            <Download className="w-3.5 h-3.5 text-accent-primary" />
            <span className="hidden md:inline">Exportar PNG</span>
          </button>

          {/* Guardar Pizarra con Rust */}
          <button
            type="button"
            onClick={() => setShowSaveModal(true)}
            disabled={strokes.length === 0}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-[11px]"
            title="Guardar pizarra comprimida con Rust en base local"
          >
            <Save className="w-3.5 h-3.5 text-accent-primary" />
            <span className="hidden md:inline">Guardar</span>
          </button>

          {/* Galería de Pizarras Guardadas */}
          <button
            type="button"
            onClick={() => setShowGalleryModal(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-border-hairline bg-bg-surface-1 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3 transition-colors cursor-pointer text-[11px]"
            title="Ver pizarras guardadas y restaurar trazos"
          >
            <FolderOpen className="w-3.5 h-3.5 text-accent-primary" />
            <span className="hidden md:inline">Mis Pizarras</span>
            {savedBoards.length > 0 && (
              <span className="ml-0.5 px-1 py-0.2 rounded-full bg-accent-primary/10 text-accent-primary text-[9px] font-bold">
                {savedBoards.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Lienzo Interactivo HTML5 */}
      <div className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="absolute inset-0 block w-full h-full"
        />
      </div>

      {/* Modal de Revisión y Reconocimiento OCR Asistido */}
      {isOcrModalOpen && (
        <Modal
          open={isOcrModalOpen}
          onClose={() => setIsOcrModalOpen(false)}
          title="Reconocimiento Óptico Asistido (Borrador)"
        >
          <div className="flex flex-col gap-3 font-sans text-xs">
            {/* Aviso explícito de limitaciones técnicas (Gris pizarra mineral tokenizado, sin choque con ocre FSRS) */}
            <div className="p-3 rounded-lg bg-system-notice-bg border border-system-notice-border text-system-notice text-[11px] leading-relaxed flex items-start gap-2.5">
              <FlaskConical className="w-4 h-4 text-system-notice shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold text-text-primary">
                  Laboratorio Experimental (Mejor Esfuerzo):
                </strong>
                El motor OCR local está optimizado para tipografía de imprenta. En trazos manuscritos libres y fórmulas 2D la tasa de acierto es limitada (borrador exploratorio). Es obligatorio revisar y ajustar la expresión antes de insertarla.
              </div>
            </div>

            {/* Barra de progreso de Tesseract */}
            {isRecognizing ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2">
                <div className="w-full bg-bg-surface-2 rounded-full h-2 overflow-hidden border border-border-hairline">
                  <div
                    className="bg-accent-primary h-full transition-all duration-300"
                    style={{ width: `${ocrProgress}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-text-secondary">
                  Procesando trazos de pizarra ({ocrProgress}%)...
                </span>
              </div>
            ) : (
              <>
                {/* Editor manual editable del borrador */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-text-secondary">
                    <span>Fórmula o Texto reconocido (editable):</span>
                    {recognizedConfidence > 0 && (
                      <span className="text-text-tertiary">
                        Confianza Tesseract: {recognizedConfidence}%
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={recognizedLatex}
                    onChange={(e) => setRecognizedLatex(e.target.value)}
                    placeholder="Escribe o ajusta la expresión LaTeX aquí..."
                    className="w-full p-2.5 rounded-lg border border-border-hairline bg-bg-surface-2 font-mono text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
                  />
                </div>

                {/* Previsualización KaTeX en Vivo */}
                <div className="space-y-1">
                  <span className="font-mono text-[10px] text-text-tertiary block">
                    Previsualización KaTeX en Vivo:
                  </span>
                  <div className="p-3 rounded-lg border border-border-hairline bg-bg-surface-2 min-h-[50px] flex items-center justify-center overflow-x-auto">
                    {recognizedLatex.trim() ? (
                      <div
                        className="font-serif text-sm text-text-primary"
                        dangerouslySetInnerHTML={{
                          __html: renderLatexToHtml(`$$${recognizedLatex}$$`),
                        }}
                      />
                    ) : (
                      <span className="font-mono text-[11px] text-text-tertiary italic">
                        Sin expresión matemática para previsualizar.
                      </span>
                    )}
                  </div>
                </div>

                {/* Botonera de Acción */}
                <div className="pt-2 flex flex-wrap items-center justify-end gap-2 border-t border-border-hairline">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsOcrModalOpen(false)}
                    className="text-xs font-mono"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancelar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLatex}
                    disabled={!recognizedLatex.trim()}
                    className="text-xs font-mono"
                  >
                    {copiedSuccess ? (
                      <>
                        <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                        Copiado
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 mr-1" />
                        Copiar LaTeX
                      </>
                    )}
                  </Button>

                  {onInsertLatex && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleConfirmInsert}
                      disabled={!recognizedLatex.trim()}
                      className="text-xs font-mono"
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Insertar en Cátedra
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </Modal>
      )}

      {/* Modal para Guardar Pizarra Comprimida con Rust */}
      {showSaveModal && (
        <Modal
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          title="Guardar Pizarra en Almacenamiento Local"
        >
          <div className="flex flex-col gap-4 font-sans text-xs">
            <p className="text-text-secondary">
              La sesión se guardará en la base de datos local usando compresión delta nativa en Rust, reduciendo hasta un 80% el espacio ocupado.
            </p>

            <div className="space-y-1.5">
              <label htmlFor="board-title-input" className="block text-[11px] font-mono text-text-secondary">
                Título o consigna de la pizarra:
              </label>
              <input
                id="board-title-input"
                type="text"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder={`Demostración ${new Date().toLocaleDateString("es-AR")}`}
                className="w-full p-2.5 rounded-lg border border-border-hairline bg-bg-surface-2 font-sans text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
              />
            </div>

            <div className="p-3 rounded-lg border border-border-hairline bg-bg-surface-2 font-mono text-[11px] text-text-secondary space-y-1">
              <div>Trazos actuales: <span className="font-bold text-text-primary">{strokes.length}</span></div>
              <div>Puntos vectoriales: <span className="font-bold text-text-primary">{strokes.reduce((acc, s) => acc + s.points.length, 0)}</span></div>
              <div className="text-accent-primary">Compresión delta activada: Ramer-Douglas-Peucker + Delimited Delta</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-hairline">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSaveModal(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveBlackboard}
                disabled={isSaving}
                className="flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? "Comprimiendo..." : "Guardar Pizarra"}</span>
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal Galería de Mis Pizarras Guardadas */}
      {showGalleryModal && (
        <Modal
          open={showGalleryModal}
          onClose={() => setShowGalleryModal(false)}
          title="Mis Pizarras Guardadas"
        >
          <div className="flex flex-col gap-3 font-sans text-xs max-h-[65vh] overflow-y-auto pr-1">
            {savedBoards.length === 0 ? (
              <div className="p-8 text-center text-text-muted space-y-2">
                <FolderOpen className="w-8 h-8 mx-auto opacity-40 text-text-tertiary" />
                <p>No tienes pizarras guardadas todavía.</p>
                <p className="text-[11px]">Dibuja una demostración o esquema y haz clic en &quot;Guardar&quot;.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedBoards.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 rounded-xl border border-border-hairline bg-bg-surface-2 hover:border-accent-primary/50 transition-colors flex flex-col justify-between gap-2.5"
                  >
                    <div>
                      {b.previewDataUrl ? (
                        <div className="w-full h-24 rounded-lg overflow-hidden border border-border-hairline mb-2 bg-black/10">
                          <img
                            src={b.previewDataUrl}
                            alt={b.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-20 rounded-lg bg-bg-surface-3 flex items-center justify-center text-text-tertiary mb-2 font-mono text-[10px]">
                          Sin miniatura
                        </div>
                      )}
                      <h4 className="font-semibold text-text-primary text-xs truncate" title={b.title}>
                        {b.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-text-secondary font-mono mt-1">
                        <span>{new Date(b.updatedAt).toLocaleDateString("es-AR")}</span>
                        <span>&bull;</span>
                        <span>{b.strokeCount} trazos</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-hairline">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleLoadBlackboard(b)}
                        className="text-[11px] py-1 h-auto flex-1"
                      >
                        Restaurar
                      </Button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBoard(b.id, e)}
                        className="p-1 rounded text-text-tertiary hover:text-signal-danger transition-colors cursor-pointer"
                        title="Eliminar pizarra"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
