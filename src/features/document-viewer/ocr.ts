import { createWorker } from "tesseract.js";
import { pdfjsLib } from "../../lib/pdf";
import type { OcrLine } from "../../db/db";

export interface OcrPageResult {
  page: number;
  lines: OcrLine[];
}

/**
 * Corre OCR página por página sobre un PDF escaneado (sin capa de texto).
 * Devuelve las líneas reconocidas por Tesseract con su caja normalizada (0–1) para poder
 * construir una capa de texto sintética y seleccionable sobre la imagen, igual que en un PDF
 * con texto real.
 */
export async function runOcrOnFile(
  blob: Blob,
  onProgress?: (percent: number) => void,
): Promise<OcrPageResult[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const worker = await createWorker("spa");

  const results: OcrPageResult[] = [];
  try {
    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      await page.render({ canvas, canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas, {}, { blocks: true });

      const lines: OcrLine[] = [];
      for (const block of data.blocks ?? []) {
        for (const paragraph of block.paragraphs) {
          for (const line of paragraph.lines) {
            const text = line.text.trim();
            if (!text) continue;
            const { x0, y0, x1, y1 } = line.bbox;
            lines.push({
              text,
              x: x0 / viewport.width,
              y: y0 / viewport.height,
              width: (x1 - x0) / viewport.width,
              height: (y1 - y0) / viewport.height,
            });
          }
        }
      }
      if (lines.length > 0) results.push({ page: pageNum, lines });

      onProgress?.(Math.round((pageNum / doc.numPages) * 100));
    }
  } finally {
    await worker.terminate();
  }

  return results;
}
