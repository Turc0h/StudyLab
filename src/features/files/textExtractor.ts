/**
 * StudyLab Lightweight Streaming Text Extractor
 * Extrae texto de documentos físicos (PDF, TXT, MD) página a página
 * con liberación inmediata de recursos en memoria (zero-leak)
 * e indexación directa en SQLite FTS5.
 */

import { pdfjsLib } from "../../lib/pdf";
import { convertFileSrc, isDesktop } from "../../platform";
import { indexDocumentPageFts, removeDocumentPagesFts } from "../../platform/ftsSearch";

export interface ExtractionResult {
  totalPages: number;
  indexedPages: number;
  skipped: boolean;
}

/**
 * Extrae e indexa en SQLite FTS5 el texto de un documento de la biblioteca.
 * Procesa página por página liberando la memoria del parser de forma inmediata.
 */
export async function extractAndIndexDocumentText(
  documentId: string,
  filePath: string,
  fileName: string,
  onProgress?: (progressPct: number) => void
): Promise<ExtractionResult> {
  if (!isDesktop()) {
    return { totalPages: 0, indexedPages: 0, skipped: true };
  }

  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  // 1. Limpiar entradas anteriores de este documento para evitar duplicados
  await removeDocumentPagesFts(documentId);

  // 2. Procesamiento de archivos de texto plano (.txt, .md)
  if (ext === "txt" || ext === "md") {
    try {
      const srcUrl = convertFileSrc(filePath);
      const response = await fetch(srcUrl);
      const fullText = await response.text();

      // Dividir en páginas lógicas de aprox. 500 palabras
      const words = fullText.split(/\s+/);
      const pageSize = 500;
      const totalPages = Math.max(1, Math.ceil(words.length / pageSize));

      for (let p = 0; p < totalPages; p++) {
        const pageWords = words.slice(p * pageSize, (p + 1) * pageSize);
        const pageContent = pageWords.join(" ");

        await indexDocumentPageFts({
          documentId,
          filePath,
          fileName,
          pageNumber: p + 1,
          content: pageContent,
        });

        if (onProgress) {
          onProgress(Math.round(((p + 1) / totalPages) * 100));
        }
      }

      return { totalPages, indexedPages: totalPages, skipped: false };
    } catch (err) {
      console.error(`[TextExtractor] Error extrayendo texto de ${fileName}:`, err);
      return { totalPages: 0, indexedPages: 0, skipped: true };
    }
  }

  // 3. Procesamiento de archivos PDF por streaming de páginas
  if (ext === "pdf") {
    let loadingTask: any = null;
    let pdfDoc: any = null;

    try {
      const srcUrl = convertFileSrc(filePath);

      // Carga conservadora con chunks de 64 KB y auto-fetch deshabilitado
      loadingTask = pdfjsLib.getDocument({
        url: srcUrl,
        rangeChunkSize: 65536,
        disableAutoFetch: true,
        disableStream: false,
      });

      pdfDoc = await loadingTask.promise;
      const totalPages = pdfDoc.numPages;
      let indexedPages = 0;

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();

          const textItems = textContent.items
            .map((item: any) => ("str" in item ? item.str : ""))
            .filter((str: string) => str.trim().length > 0);

          const pageText = textItems.join(" ").trim();

          if (pageText.length > 0) {
            await indexDocumentPageFts({
              documentId,
              filePath,
              fileName,
              pageNumber: pageNum,
              content: pageText,
            });
            indexedPages++;
          }

          // Liberación inmediata de memoria de la página analizada
          page.cleanup();
        } catch (pageErr) {
          console.warn(`[TextExtractor] Error extrayendo pág ${pageNum} de ${fileName}:`, pageErr);
        }

        if (onProgress) {
          onProgress(Math.round((pageNum / totalPages) * 100));
        }
      }

      return { totalPages, indexedPages, skipped: false };
    } catch (pdfErr) {
      console.error(`[TextExtractor] Error abriendo PDF ${fileName}:`, pdfErr);
      return { totalPages: 0, indexedPages: 0, skipped: true };
    } finally {
      // Destrucción completa del documento PDF para asegurar recolección de basura
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch {}
      }
    }
  }

  // Formato no soportado para extracción ligera
  return { totalPages: 0, indexedPages: 0, skipped: true };
}
