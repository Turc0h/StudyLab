/**
 * StudyLab Asynchronous Background OCR Runner
 * Ejecuta tareas de reconocimiento óptico de caracteres fuera del hilo principal.
 * - Streaming página a página con liberación inmediata de canvas (zero-leak).
 * - Detección inteligente de texto nativo (> 50 caracteres) para omitir OCR redundante.
 * - Inserción inmediata en SQLite FTS5 (fts_documents) para búsqueda instantánea.
 * - Cancelación cooperativa con tokens atómicos.
 */

import { pdfjsLib } from "../../lib/pdf";
import { convertFileSrc, isDesktop } from "../../platform";
import { indexDocumentPageFts, removeDocumentPagesFts } from "../../platform/ftsSearch";

export interface OcrJobOptions {
  maxScale?: number;
  onProgress?: (progressPct: number, page: number, totalPages: number) => void;
  isCancelled?: () => boolean;
}

export interface OcrJobResult {
  documentId: string;
  totalPages: number;
  nativePagesCount: number;
  ocrPagesCount: number;
  indexedPagesCount: number;
  cancelled: boolean;
  error?: string;
}

/**
 * Ejecuta el trabajo de OCR en segundo plano para un documento PDF.
 */
export async function runDocumentOcrJob(
  documentId: string,
  filePath: string,
  fileName: string,
  options?: OcrJobOptions
): Promise<OcrJobResult> {
  if (!isDesktop()) {
    return {
      documentId,
      totalPages: 0,
      nativePagesCount: 0,
      ocrPagesCount: 0,
      indexedPagesCount: 0,
      cancelled: false,
      error: "OCR en segundo plano requiere entorno de escritorio.",
    };
  }

  let worker: any = null;
  let loadingTask: any = null;
  let pdfDoc: any = null;

  let nativePagesCount = 0;
  let ocrPagesCount = 0;
  let indexedPagesCount = 0;
  let cancelled = false;

  try {
    // 1. Limpiar entradas anteriores de FTS5 para este documento
    await removeDocumentPagesFts(documentId);

    const srcUrl = convertFileSrc(filePath);

    // 2. Carga por streaming con chunks de 64 KB
    loadingTask = pdfjsLib.getDocument({
      url: srcUrl,
      rangeChunkSize: 65536,
      disableAutoFetch: true,
      disableStream: false,
    });

    pdfDoc = await loadingTask.promise;
    const totalPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      // 3. Verificación de cancelación cooperativa
      if (options?.isCancelled && options.isCancelled()) {
        cancelled = true;
        break;
      }

      let page: any = null;
      let canvas: HTMLCanvasElement | null = null;

      try {
        page = await pdfDoc.getPage(pageNum);

        // 4. Comprobar si la página ya posee texto digital seleccionable
        const textContent = await page.getTextContent();
        const nativeStrings = textContent.items
          .map((item: any) => ("str" in item ? item.str : ""))
          .join(" ")
          .trim();

        if (nativeStrings.length > 50) {
          // Bypass inteligente: usar texto digital existente sin ejecutar Tesseract
          nativePagesCount++;
          await indexDocumentPageFts({
            documentId,
            filePath,
            fileName,
            pageNumber: pageNum,
            content: nativeStrings,
          });
          indexedPagesCount++;
        } else {
          // 5. Página escaneada: Requiere OCR con Tesseract
          ocrPagesCount++;

          // Inicializar worker de Tesseract de forma diferida (lazy load)
          if (!worker) {
            const { createWorker } = await import("tesseract.js");
            worker = await createWorker("spa");
          }

          // Escala calibrada: máximo 1600px de ancho/alto para proteger memoria RAM
          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const maxDim = Math.max(unscaledViewport.width, unscaledViewport.height);
          const maxAllowed = 1600;
          const targetScale = options?.maxScale || 1.5;
          const scale = maxDim * targetScale > maxAllowed ? maxAllowed / maxDim : targetScale;
          const viewport = page.getViewport({ scale });

          canvas = document.createElement("canvas");
          canvas.width = Math.round(viewport.width);
          canvas.height = Math.round(viewport.height);
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            await page.render({ canvasContext: ctx, viewport, canvas }).promise;

            const ret = await worker.recognize(canvas);
            const extractedText = ret.data.text.trim();

            if (extractedText.length > 0) {
              await indexDocumentPageFts({
                documentId,
                filePath,
                fileName,
                pageNumber: pageNum,
                content: extractedText,
              });
              indexedPagesCount++;
            }
          }
        }
      } catch (pageErr) {
        console.warn(`[OcrJobRunner] Advertencia en pág ${pageNum} de ${fileName}:`, pageErr);
      } finally {
        // 6. Liberación inmediata de memoria RAM de canvas y página (Zero-Leak)
        if (canvas) {
          canvas.width = 0;
          canvas.height = 0;
          canvas = null;
        }
        if (page) {
          page.cleanup();
          page = null;
        }
      }

      // 7. Notificación de progreso
      if (options?.onProgress) {
        const pct = Math.round((pageNum / totalPages) * 100);
        options.onProgress(pct, pageNum, totalPages);
      }

      // 8. Yield cooperativo al loop de eventos (15ms)
      await new Promise((r) => setTimeout(r, 15));
    }

    return {
      documentId,
      totalPages: pdfDoc?.numPages || 0,
      nativePagesCount,
      ocrPagesCount,
      indexedPagesCount,
      cancelled,
    };
  } catch (err: any) {
    console.error(`[OcrJobRunner] Error en job OCR de ${fileName}:`, err);
    return {
      documentId,
      totalPages: 0,
      nativePagesCount,
      ocrPagesCount,
      indexedPagesCount,
      cancelled,
      error: err?.message || String(err),
    };
  } finally {
    // 9. Destrucción de worker y documento para asegurar recolección de basura
    if (worker) {
      try {
        await worker.terminate();
      } catch {}
    }
    if (pdfDoc) {
      try {
        pdfDoc.destroy();
      } catch {}
    }
  }
}
