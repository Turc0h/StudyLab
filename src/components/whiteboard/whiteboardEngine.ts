/**
 * whiteboardEngine.ts
 *
 * Motor matemático y algorítmico de la Pizarra Virtual de StudyLab.
 *
 * DECISIÓN DE ARQUITECTURA DE SUAVIZADO:
 * Elegimos "Curvas Bézier Cuadráticas con Puntos Medios y Filtro EMA"
 * (Midpoint Quadratic Bézier with Exponential Moving Average) frente a Catmull-Rom.
 *
 * Justificación técnica:
 * 1. Catmull-Rom fuerza a la curva a pasar por TODOS los puntos muestreados. Al dibujar con mouse,
 *    la tasa de sondeo irregular y la discretización en píxeles enteros introducen ruido de alta
 *    frecuencia; forzar el paso por estos puntos produce ondulaciones y bucles no deseados.
 * 2. El método de Bézier cuadrática continua con puntos medios calcula cada punto de anclaje
 *    como el punto medio entre dos muestras sucesivas: M_i = (P_i + P_{i+1}) / 2, usando P_i
 *    como punto de control de curvatura. Esto garantiza continuidad de primer orden (C^1) sin
 *    resolución de sistemas matriciales costosos a 60 FPS.
 * 3. Se complementa con un filtro EMA (Media Móvil Exponencial) de baja latencia sobre las coordenadas
 *    entrantes del cursor, amortiguando micro-temblores sin retraso perceptible (< 10 ms).
 * 4. Para la función "Prolijar Trazo", se aplica el algoritmo Ramer-Douglas-Peucker (RDP) para
 *    simplificar vértices espurios y alinear trazos geométricos.
 */

export interface Point {
  x: number;
  y: number;
  time?: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  color: string;
  width: number;
  tool: "pen" | "eraser";
  beautified?: boolean;
}

export type SurfaceTheme = "chalkboard" | "notebook";

export interface ColorPreset {
  name: string;
  value: string;
}

export const CHALKBOARD_PALETTE: ColorPreset[] = [
  { name: "Blanca Caliza", value: "#F4F4F0" },
  { name: "Ocre Universitario", value: "#DFB76C" },
  { name: "Celeste Glaciar", value: "#88B7D5" },
  { name: "Rosa Cantera", value: "#DDA7A5" },
];

export const NOTEBOOK_PALETTE: ColorPreset[] = [
  { name: "Tinta Carbón", value: "#1A1C1E" },
  { name: "Azul Archivo", value: "#264466" },
  { name: "Ocre Seco", value: "#9E6E24" },
  { name: "Rojo Óxido", value: "#9E3B3B" },
];

export interface OcrRecognitionResult {
  rawText: string;
  latexEstimate: string;
  confidence: number;
}

/**
 * Filtro de Media Móvil Exponencial (EMA) para suavizar coordenadas del mouse.
 * S_t = alpha * Y_t + (1 - alpha) * S_{t-1}
 * alpha = 0.65 equilibra reactividad inmediata y supresión de temblor.
 */
export function applyEmaFilter(points: Point[], alpha: number = 0.65): Point[] {
  if (points.length <= 2) return [...points];

  const filtered: Point[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[i - 1];
    const curr = points[i];
    filtered.push({
      x: alpha * curr.x + (1 - alpha) * prev.x,
      y: alpha * curr.y + (1 - alpha) * prev.y,
      time: curr.time,
    });
  }
  return filtered;
}

/**
 * Algoritmo Ramer-Douglas-Peucker (RDP) para simplificación y prolijado de polilíneas.
 * Reduce puntos redundantes respetando la geometría del trazo.
 */
export function ramerDouglasPeucker(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
    const right = ramerDouglasPeucker(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  } else {
    return [start, end];
  }
}

function perpendicularDistance(pt: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const mag = Math.hypot(dx, dy);
  if (mag === 0) {
    return Math.hypot(pt.x - lineStart.x, pt.y - lineStart.y);
  }
  const u = ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / (mag * mag);
  const clampedU = Math.max(0, Math.min(1, u));
  const projX = lineStart.x + clampedU * dx;
  const projY = lineStart.y + clampedU * dy;
  return Math.hypot(pt.x - projX, pt.y - projY);
}

/**
 * Prolija un trazo manuscrito: aplica RDP con umbral adaptativo y re-interpola
 * con suavizado para dar una apariencia legible y limpia.
 */
export function beautifyStroke(stroke: Stroke, tolerance: number = 3.5): Stroke {
  if (stroke.points.length <= 3) return stroke;
  const simplified = ramerDouglasPeucker(stroke.points, tolerance);
  const smoothed = applyEmaFilter(simplified, 0.7);
  return {
    ...stroke,
    points: smoothed,
    beautified: true,
  };
}

/**
 * Renderiza un trazo en el contexto 2D de Canvas usando Bézier cuadrática continua
 * de puntos medios (Midpoint Quadratic Bézier).
 */
export function renderStrokeToContext(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  _surface: SurfaceTheme,
) {
  const pts = stroke.points;
  if (!pts || pts.length === 0) return;

  ctx.save();

  if (stroke.tool === "eraser") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.lineWidth = stroke.width * 2.5;
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
  }

  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  if (pts.length === 1) {
    // Un solo punto (clic sin arrastre)
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, stroke.width / 2, 0, Math.PI * 2);
    ctx.fillStyle = stroke.tool === "eraser" ? "rgba(0,0,0,1)" : stroke.color;
    ctx.fill();
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);

  if (pts.length === 2) {
    ctx.lineTo(pts[1].x, pts[1].y);
  } else {
    // Bézier cuadrática continua con puntos medios como anclajes
    for (let i = 1; i < pts.length - 1; i++) {
      const midX = (pts[i].x + pts[i + 1].x) / 2;
      const midY = (pts[i].y + pts[i + 1].y) / 2;
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, midX, midY);
    }
    // Conectar el último segmento
    const last = pts[pts.length - 1];
    const secondLast = pts[pts.length - 2];
    ctx.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
  }

  ctx.stroke();
  ctx.restore();
}

/**
/**
 * Renderiza la superficie técnica de fondo según la superficie y patrón elegidos:
 * - "none": Lisa (pizarra de mineral oscuro mate o cuaderno marfil puro).
 * - "lines": Rayada (guías horizontales discretas cada 32px para derivaciones y redacción paso a paso).
 * - "grid": Cuadrícula técnica de ingeniería (rejilla secundaria cada 24px y ejes mayores cada 120px para gráficos y esquemas).
 */
export function renderBackgroundGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  surface: SurfaceTheme,
  gridType: "none" | "lines" | "grid" = "grid",
  offsetX = 0,
  offsetY = 0,
) {
  ctx.save();

  if (surface === "chalkboard") {
    // Verde mineral oscuro pizarra mate
    ctx.fillStyle = "#161D1A";
    ctx.fillRect(0, 0, width, height);

    if (gridType === "lines") {
      ctx.strokeStyle = "rgba(244, 244, 240, 0.08)";
      ctx.lineWidth = 1;
      const step = 32;

      ctx.beginPath();
      for (let worldY = Math.ceil(offsetY / step) * step; worldY < offsetY + height; worldY += step) {
        const y = worldY - offsetY;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (gridType === "grid") {
      const step = 24;
      const majorStep = 120; // Cada 5 módulos (cuadrícula técnica de ingeniería)

      // Rejilla menor
      ctx.strokeStyle = "rgba(244, 244, 240, 0.04)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let worldX = Math.ceil(offsetX / step) * step; worldX < offsetX + width; worldX += step) {
        const x = worldX - offsetX;
        if (worldX % majorStep !== 0) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
      }
      for (let worldY = Math.ceil(offsetY / step) * step; worldY < offsetY + height; worldY += step) {
        const y = worldY - offsetY;
        if (worldY % majorStep !== 0) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
      }
      ctx.stroke();

      // Ejes mayores técnicos
      ctx.strokeStyle = "rgba(244, 244, 240, 0.09)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let worldX = Math.ceil(offsetX / majorStep) * majorStep; worldX < offsetX + width; worldX += majorStep) {
        const x = worldX - offsetX;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let worldY = Math.ceil(offsetY / majorStep) * majorStep; worldY < offsetY + height; worldY += majorStep) {
        const y = worldY - offsetY;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
  } else {
    // Cuaderno marfil técnico universitario
    ctx.fillStyle = "#F9F8F5";
    ctx.fillRect(0, 0, width, height);

    if (gridType === "lines") {
      ctx.strokeStyle = "rgba(44, 74, 111, 0.10)";
      ctx.lineWidth = 1;
      const step = 32;

      ctx.beginPath();
      for (let worldY = Math.ceil(offsetY / step) * step; worldY < offsetY + height; worldY += step) {
        const y = worldY - offsetY;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    } else if (gridType === "grid") {
      const step = 24;
      const majorStep = 120;

      // Rejilla menor
      ctx.strokeStyle = "rgba(44, 74, 111, 0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let worldX = Math.ceil(offsetX / step) * step; worldX < offsetX + width; worldX += step) {
        const x = worldX - offsetX;
        if (worldX % majorStep !== 0) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
      }
      for (let worldY = Math.ceil(offsetY / step) * step; worldY < offsetY + height; worldY += step) {
        const y = worldY - offsetY;
        if (worldY % majorStep !== 0) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
      }
      ctx.stroke();

      // Ejes mayores técnicos
      ctx.strokeStyle = "rgba(44, 74, 111, 0.14)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let worldX = Math.ceil(offsetX / majorStep) * majorStep; worldX < offsetX + width; worldX += majorStep) {
        const x = worldX - offsetX;
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let worldY = Math.ceil(offsetY / majorStep) * majorStep; worldY < offsetY + height; worldY += majorStep) {
        const y = worldY - offsetY;
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();
}

/**
 * Exporta el contenido del lienzo como un archivo de imagen PNG limpio para descarga directa.
 */
export function exportCanvasToPng(
  canvas: HTMLCanvasElement,
  filename: string = `pizarra_estudio_${Date.now()}.png`,
): void {
  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

/**
 * Preprocesa el lienzo de la pizarra para optimizar el reconocimiento óptico de Tesseract:
 * 1. Invierte colores si es pizarra oscura (para que queden caracteres oscuros sobre fondo blanco puro).
 * 2. Aumenta el contraste y aplica umbral binarizador.
 * 3. Escala x2 con padding para dar resolución suficiente.
 */
export function preprocessCanvasForOcr(
  sourceCanvas: HTMLCanvasElement,
  surface: SurfaceTheme,
): HTMLCanvasElement {
  const offscreen = document.createElement("canvas");
  const scale = 2;
  const padding = 40;

  offscreen.width = sourceCanvas.width * scale + padding * 2;
  offscreen.height = sourceCanvas.height * scale + padding * 2;

  const ctx = offscreen.getContext("2d");
  if (!ctx) return sourceCanvas;

  // Fondo blanco puro estándar para OCR
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, offscreen.width, offscreen.height);

  ctx.drawImage(
    sourceCanvas,
    padding,
    padding,
    sourceCanvas.width * scale,
    sourceCanvas.height * scale,
  );

  const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  const data = imgData.data;

  // Si la superficie era oscura (chalkboard), invertir luminosidad
  const isInverted = surface === "chalkboard";

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Luminancia relativa
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    if (isInverted) {
      // En pizarra verde oscuro: fondo oscuro (~30) y tiza clara (~220).
      // Queremos que la tiza sea negra (0) y el fondo sea blanco (255).
      if (gray > 80 && a > 50) {
        gray = 0;
      } else {
        gray = 255;
      }
    } else {
      // En cuaderno: tinta oscura sobre papel marfil
      if (gray < 170 && a > 50) {
        gray = 0;
      } else {
        gray = 255;
      }
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return offscreen;
}

/**
 * Heurística de conversión de caracteres reconocidos por Tesseract hacia LaTeX matemático.
 * Nota: Tesseract está diseñado para imprenta, por lo que esta capa actúa como "mejor esfuerzo"
 * asistido para expresiones sencillas y símbolos frecuentes.
 */
export function heuristicOcrToLatex(text: string): string {
  let cleaned = text.trim();
  if (!cleaned) return "";

  // Normalizar saltos y espacios
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  // Sustituciones heurísticas comunes de OCR para fórmulas matemáticas
  const mappings: Array<[RegExp, string]> = [
    // Integrales: símbolos parecidos a S alargada o 'f' sola antes de variables
    [/\b[S∫ſ]\s*(?=[a-z(])/gi, "\\int "],
    // Sumatorias: 'E' o '3' suelta o 'Σ'
    [/\b[Σ]\b/g, "\\sum "],
    // Fracciones simples de tipo: a / b o (a)/(b)
    [/(\w+)\s*\/\s*(\w+)/g, "\\frac{$1}{$2}"],
    // Potencias y superíndices comunes
    [/(\w)2\b/g, "$1^2"],
    [/(\w)3\b/g, "$1^3"],
    [/(\w)n\b/g, "$1^n"],
    // Símbolos griegos comunes
    [/\balpha\b/gi, "\\alpha"],
    [/\bbeta\b/gi, "\\beta"],
    [/\bpi\b/gi, "\\pi"],
    [/\btheta\b/gi, "\\theta"],
    [/\blambda\b/gi, "\\lambda"],
    [/\bsigma\b/gi, "\\sigma"],
    // Operadores
    [/<=|≤/g, "\\le "],
    [/>=|≥/g, "\\ge "],
    [/!=|≠/g, "\\neq "],
    [/->|→/g, "\\to "],
    [/<->|↔/g, "\\iff "],
    [/\binf\b|∞/gi, "\\infty"],
    [/\bsqrt\b/gi, "\\sqrt"],
  ];

  for (const [regex, replacement] of mappings) {
    cleaned = cleaned.replace(regex, replacement);
  }

  return cleaned;
}

/**
 * Ejecuta el reconocimiento óptico con Tesseract.js sobre el canvas procesado.
 * Retorna el texto bruto y la estimación en LaTeX.
 */
export async function recognizeWhiteboardCanvas(
  canvas: HTMLCanvasElement,
  surface: SurfaceTheme,
  onProgress?: (progress: number) => void,
): Promise<OcrRecognitionResult> {
  const processed = preprocessCanvasForOcr(canvas, surface);

  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          onProgress?.(Math.round(20 + m.progress * 75));
        }
      },
    });

    onProgress?.(15);
    await worker.setParameters({
      tessedit_pageseg_mode: "6" as any, // Single uniform block of text / equations
    });

    onProgress?.(25);
    const result = await worker.recognize(processed);
    onProgress?.(95);

    await worker.terminate();
    onProgress?.(100);

    const rawText = result.data.text.trim();
    const confidence = result.data.confidence;
    const latexEstimate = heuristicOcrToLatex(rawText);

    return {
      rawText,
      latexEstimate,
      confidence,
    };
  } catch (err) {
    console.error("Error ejecutando OCR en pizarra:", err);
    return {
      rawText: "",
      latexEstimate: "",
      confidence: 0,
    };
  }
}
