import { createWorker } from "tesseract.js";
import { pdfjsLib } from "../../lib/pdf";
import { renderLatexToHtml } from "../../lib/latexHelper";

/* ── Tipos para el layout estructurado ── */

export interface OcrBbox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  confidence: number;
  bbox: OcrBbox;
}

export interface OcrLine {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  words: OcrWord[];
}

export interface OcrParagraph {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  lines: OcrLine[];
}

export interface OcrBlock {
  text: string;
  confidence: number;
  bbox: OcrBbox;
  blocktype: string;
  paragraphs: OcrParagraph[];
}

export interface PageOcrResult {
  pageNumber: number;
  text: string;
  hasNativeText: boolean;
  previewDataUrl?: string;
  /** Dimensiones del canvas usado para OCR (para normalizar bboxes) */
  canvasWidth: number;
  canvasHeight: number;
  /** Estructura de bloques con posiciones — solo disponible en páginas OCR */
  blocks: OcrBlock[];
}

export interface OcrProcessResult {
  fileName: string;
  totalPages: number;
  fullText: string;
  pages: PageOcrResult[];
  confidence: number;
  isScannedPdf: boolean;
  firstPagePreview?: string;
}

export type OcrProgressCallback = (status: string, percent: number) => void;

/**
 * Procesa un archivo (PDF o Imagen) para extraer texto con estructura espacial.
 * Si es un PDF con fotos/escaneado, renderiza cada página en alta resolución
 * y le aplica OCR con Tesseract, capturando bloques, párrafos y líneas con sus
 * bounding boxes para poder reconstruir el layout original.
 */
export async function processFileWithOcr(
  file: File,
  onProgress?: OcrProgressCallback,
): Promise<OcrProcessResult> {
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    return processPdfFile(file, onProgress);
  } else {
    return processImageFile(file, onProgress);
  }
}

/** Extrae bloques estructurados del resultado de Tesseract */
function extractBlocks(data: {
  blocks?: Array<{
    text: string;
    confidence: number;
    bbox: OcrBbox;
    blocktype: string;
    paragraphs: Array<{
      text: string;
      confidence: number;
      bbox: OcrBbox;
      lines: Array<{
        text: string;
        confidence: number;
        bbox: OcrBbox;
        words: Array<{
          text: string;
          confidence: number;
          bbox: OcrBbox;
        }>;
      }>;
    }>;
  }> | null;
}): OcrBlock[] {
  if (!data.blocks) return [];
  return data.blocks.map((block) => ({
    text: block.text,
    confidence: block.confidence,
    bbox: { ...block.bbox },
    blocktype: block.blocktype || "FLOWING_TEXT",
    paragraphs: block.paragraphs.map((para) => ({
      text: para.text,
      confidence: para.confidence,
      bbox: { ...para.bbox },
      lines: para.lines.map((line) => ({
        text: line.text,
        confidence: line.confidence,
        bbox: { ...line.bbox },
        words: line.words.map((word) => ({
          text: word.text,
          confidence: word.confidence,
          bbox: { ...word.bbox },
        })),
      })),
    })),
  }));
}

async function processImageFile(
  file: File,
  onProgress?: OcrProgressCallback,
): Promise<OcrProcessResult> {
  onProgress?.("Inicializando motor OCR para imagen...", 10);

  const previewUrl = URL.createObjectURL(file);
  const worker = await createWorker("spa");

  try {
    onProgress?.("Reconociendo caracteres y estructura de la imagen...", 40);
    // Habilitar bloques estructurados para preservar layout
    const ret = await worker.recognize(file, {}, { blocks: true });
    onProgress?.("Finalizando extracción...", 90);

    const text = ret.data.text.trim();
    const confidence = ret.data.confidence;
    const blocks = extractBlocks(ret.data);

    // Obtener dimensiones de la imagen para normalización
    const imgSize = await getImageDimensions(file);

    return {
      fileName: file.name,
      totalPages: 1,
      fullText: text,
      confidence,
      isScannedPdf: false,
      firstPagePreview: previewUrl,
      pages: [
        {
          pageNumber: 1,
          text,
          hasNativeText: false,
          previewDataUrl: previewUrl,
          canvasWidth: imgSize.width,
          canvasHeight: imgSize.height,
          blocks,
        },
      ],
    };
  } finally {
    await worker.terminate();
  }
}

function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 800, height: 1100 });
    img.src = URL.createObjectURL(file);
  });
}

async function processPdfFile(
  file: File,
  onProgress?: OcrProgressCallback,
): Promise<OcrProcessResult> {
  onProgress?.("Cargando documento PDF...", 5);

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdfDoc.numPages;

  let worker: Awaited<ReturnType<typeof createWorker>> | null = null;
  const pagesResult: PageOcrResult[] = [];
  let totalConfidence = 0;
  let ocrPagesCount = 0;
  let firstPagePreview = "";

  try {
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const pagePercent = Math.round((pageNum / numPages) * 100);
      onProgress?.(`Analizando página ${pageNum} de ${numPages}...`, Math.min(pagePercent, 90));

      const page = await pdfDoc.getPage(pageNum);

      // 1. Verificar si la página tiene texto nativo incrustado
      const textContent = await page.getTextContent();
      const nativeStrings = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .trim();

      // Renderizar página a canvas para preview o para OCR
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      }

      const pageDataUrl = canvas.toDataURL("image/jpeg", 0.85);
      if (pageNum === 1) {
        firstPagePreview = pageDataUrl;
      }

      // Si tiene más de 50 caracteres de texto nativo no vacío, usarlo
      if (nativeStrings.length > 50) {
        pagesResult.push({
          pageNumber: pageNum,
          text: nativeStrings,
          hasNativeText: true,
          previewDataUrl: pageDataUrl,
          canvasWidth: viewport.width,
          canvasHeight: viewport.height,
          blocks: [],
        });
      } else {
        // PDF con fotos/escaneo: Requiere OCR con layout
        onProgress?.(
          `Aplicando OCR a página ${pageNum} de ${numPages} (escaneo detectado)...`,
          Math.min(pagePercent, 90),
        );

        if (!worker) {
          worker = await createWorker("spa");
        }

        const ret = await worker.recognize(canvas, {}, { blocks: true });
        const extracted = ret.data.text.trim();
        totalConfidence += ret.data.confidence;
        ocrPagesCount++;

        const blocks = extractBlocks(ret.data);

        pagesResult.push({
          pageNumber: pageNum,
          text: extracted || "(Sin texto detectado en esta página)",
          hasNativeText: false,
          previewDataUrl: pageDataUrl,
          canvasWidth: viewport.width,
          canvasHeight: viewport.height,
          blocks,
        });
      }

      // Liberación de recursos de canvas y página
      canvas.width = 0;
      canvas.height = 0;
      page.cleanup();
    }
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }

  onProgress?.("Completando digitalización...", 100);

  const fullText = pagesResult
    .map((p) => `--- Página ${p.pageNumber} ---\n${p.text}`)
    .join("\n\n");

  const avgConfidence = ocrPagesCount > 0 ? Math.round(totalConfidence / ocrPagesCount) : 95;

  return {
    fileName: file.name,
    totalPages: numPages,
    fullText,
    pages: pagesResult,
    confidence: avgConfidence,
    isScannedPdf: ocrPagesCount > 0,
    firstPagePreview,
  };
}

/* ─────────────────────────────────────────────────────────────────────────────
 * EXPORT: PDF "dual-layer" — imagen de fondo + texto posicionado encima
 * ───────────────────────────────────────────────────────────────────────────── */

export type PdfExportMode = "overlay" | "text-only";

/**
 * Genera un documento HTML optimizado para imprimir/guardar como PDF.
 *
 * - **overlay** (por defecto): Muestra la imagen original de fondo a tamaño completo
 *   y superpone el texto reconocido en sus posiciones originales con bounding boxes.
 *   Al imprimirlo a PDF se obtiene un documento visualmente idéntico al original
 *   pero con texto seleccionable y buscable.
 *
 * - **text-only**: Reformatea el texto respetando la estructura de bloques y párrafos
 *   detectada, sin mostrar la imagen. Produce un documento limpio y legible.
 */
export function exportOcrResultAsPdf(
  result: OcrProcessResult,
  mode: PdfExportMode = "overlay",
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor, permite ventanas emergentes para exportar el documento.");
    return;
  }

  const pagesHtml = result.pages
    .map((p) => (mode === "overlay" ? buildOverlayPage(p) : buildTextOnlyPage(p)))
    .join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>${escapeHtml(result.fileName)} — Digitalizado StudyLab</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
        <style>
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          @page { size: A4; margin: 8mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #1a1a1a;
            margin: 0;
            padding: 0;
            background: #f1f5f9;
          }
          /* ── Barra superior (no se imprime) ── */
          .toolbar {
            position: sticky; top: 0; z-index: 100;
            background: #0f172a; color: white;
            padding: 12px 20px; display: flex;
            justify-content: space-between; align-items: center;
            gap: 12px; flex-wrap: wrap;
          }
          .toolbar-label { font-size: 13px; }
          .toolbar-actions { display: flex; gap: 8px; align-items: center; }
          .toolbar button, .toolbar select {
            font-size: 12px; padding: 6px 14px;
            border: none; border-radius: 4px; cursor: pointer;
            font-weight: 600;
          }
          .toolbar .btn-print { background: #2563eb; color: white; }
          .toolbar .btn-print:hover { background: #1d4ed8; }
          .toolbar select {
            background: #1e293b; color: #cbd5e1;
            border: 1px solid #334155; font-weight: 500;
          }

          /* ── Modo Overlay: imagen + texto posicionado ── */
          .page-overlay {
            position: relative;
            width: 100%;
            max-width: 900px;
            margin: 16px auto;
            background: white;
            box-shadow: 0 1px 4px rgba(0,0,0,.12);
            overflow: hidden;
            page-break-after: always;
          }
          .page-overlay img.page-bg {
            display: block;
            width: 100%;
            height: auto;
          }
          .text-layer {
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
          }
          .text-layer .ocr-line {
            position: absolute;
            white-space: pre;
            font-family: "Segoe UI", Helvetica, Arial, sans-serif;
            color: transparent;
            line-height: 1;
            overflow: hidden;
          }
          /* Al seleccionar texto, se hace visible brevemente */
          .text-layer .ocr-line::selection,
          .text-layer .ocr-line *::selection {
            background: rgba(37, 99, 235, 0.35);
            color: #1e293b;
          }
          /* Cuando el usuario quiere ver el texto superpuesto */
          .show-text .text-layer .ocr-line {
            color: #1e3a5f;
            background: rgba(255,255,255,0.75);
            border-radius: 2px;
          }

          /* ── Modo Text-Only: lectura limpia ── */
          .page-text-only {
            max-width: 720px;
            margin: 20px auto;
            background: white;
            padding: 40px 48px;
            border-radius: 4px;
            box-shadow: 0 1px 4px rgba(0,0,0,.08);
            page-break-after: always;
          }
          .page-text-only .page-number {
            font-size: 11px;
            color: #94a3b8;
            margin-bottom: 20px;
            padding-bottom: 8px;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          .page-text-only .ocr-block {
            margin-bottom: 20px;
          }
          .page-text-only .ocr-block.heading {
            font-size: 18px;
            font-weight: 700;
            line-height: 1.3;
            margin-bottom: 12px;
            color: #0f172a;
          }
          .page-text-only .ocr-paragraph {
            font-size: 14px;
            line-height: 1.7;
            color: #1e293b;
            margin-bottom: 12px;
            text-align: justify;
            hyphens: auto;
          }
          .page-text-only .ocr-paragraph:last-child { margin-bottom: 0; }

          /* ── Thumbnail lateral ── */
          .page-text-only .page-thumb {
            float: right;
            width: 140px;
            margin: 0 0 12px 16px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            opacity: 0.7;
          }

          @media print {
            .toolbar { display: none !important; }
            body { background: white; }
            .page-overlay { box-shadow: none; margin: 0 auto; }
            .page-text-only { box-shadow: none; margin: 0 auto; padding: 24px 32px; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar no-print">
          <span class="toolbar-label">
            <strong>${escapeHtml(result.fileName)}</strong>
            &nbsp;• ${result.totalPages} pág. • Confianza: ${result.confidence}%
          </span>
          <div class="toolbar-actions">
            <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer;color:#94a3b8;" id="lbl-show">
              <input type="checkbox" id="chk-show" style="accent-color:#2563eb" />
              Mostrar texto sobre imagen
            </label>
            <button class="btn-print" onclick="window.print()">
              Imprimir / Guardar PDF
            </button>
          </div>
        </div>
        ${pagesHtml}
        <script>
          document.getElementById('chk-show')?.addEventListener('change', function() {
            document.body.classList.toggle('show-text', this.checked);
          });
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

/** Construye una página overlay: imagen de fondo + texto posicionado */
function buildOverlayPage(page: PageOcrResult): string {
  if (!page.previewDataUrl) return buildTextOnlyPage(page);

  // Construir la capa de texto posicionado sobre la imagen
  let textLayerHtml = "";

  if (page.blocks.length > 0 && page.canvasWidth > 0 && page.canvasHeight > 0) {
    for (const block of page.blocks) {
      for (const para of block.paragraphs) {
        for (const line of para.lines) {
          const text = line.text.trim();
          if (!text) continue;

          // Normalizar bounding box a porcentajes
          const left = (line.bbox.x0 / page.canvasWidth) * 100;
          const top = (line.bbox.y0 / page.canvasHeight) * 100;
          const width = ((line.bbox.x1 - line.bbox.x0) / page.canvasWidth) * 100;
          const height = ((line.bbox.y1 - line.bbox.y0) / page.canvasHeight) * 100;

          // Calcular tamaño de fuente proporcional a la altura del bbox
          const fontSizePct = height * 0.85;

          textLayerHtml += `<span class="ocr-line" style="left:${left.toFixed(2)}%;top:${top.toFixed(2)}%;width:${width.toFixed(2)}%;height:${height.toFixed(2)}%;font-size:${fontSizePct.toFixed(2)}cqh">${escapeHtml(text)}</span>`;
        }
      }
    }
  }

  return `
    <div class="page-overlay" style="container-type:size">
      <img class="page-bg" src="${page.previewDataUrl}" alt="Página ${page.pageNumber}" />
      <div class="text-layer">${textLayerHtml}</div>
    </div>
  `;
}

/** Construye una página de texto limpio formateada por bloques/párrafos */
function buildTextOnlyPage(page: PageOcrResult): string {
  let blocksHtml = "";

  if (page.blocks.length > 0) {
    for (const block of page.blocks) {
      const isHeading = block.blocktype === "HEADING_TEXT"
        || (block.paragraphs.length === 1
            && block.paragraphs[0].lines.length <= 2
            && block.text.length < 120);

      const blockClass = isHeading ? "ocr-block heading" : "ocr-block";

      let parasHtml = "";
      for (const para of block.paragraphs) {
        const text = para.text.trim();
        if (!text) continue;

        const renderedText = renderLatexToHtml(text);
        if (isHeading) {
          parasHtml += `<div class="ocr-paragraph">${renderedText}</div>`;
        } else {
          parasHtml += `<div class="ocr-paragraph">${renderedText}</div>`;
        }
      }

      if (parasHtml) {
        blocksHtml += `<div class="${blockClass}">${parasHtml}</div>`;
      }
    }
  } else {
    // Sin datos de bloques — usar texto plano formateado con KaTeX
    const paragraphs = page.text.split(/\n\s*\n/).filter((p) => p.trim());
    for (const para of paragraphs) {
      blocksHtml += `<div class="ocr-paragraph">${renderLatexToHtml(para.trim())}</div>`;
    }
  }

  // Miniatura de la imagen original si existe
  const thumbHtml = page.previewDataUrl
    ? `<img class="page-thumb" src="${page.previewDataUrl}" alt="Miniatura Pág. ${page.pageNumber}" />`
    : "";

  return `
    <div class="page-text-only">
      <div class="page-number">Página ${page.pageNumber} ${page.hasNativeText ? "" : "— Digitalizada por OCR"}</div>
      ${thumbHtml}
      ${blocksHtml}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
