import { PDFDocument } from "pdf-lib";
import { pdfjsLib } from "../../lib/pdf";
import { db } from "../../db/db";
import { savePdfDocument } from "../../lib/db";
import { generateId } from "../files/fileHelpers";

export interface ChapterPlan {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
}

export interface SplitChapterResult {
  id: string;
  title: string;
  startPage: number;
  endPage: number;
  pageCount: number;
  fileSize: number;
  blob: Blob;
  pdfDocId: string;
  fileRecordId: string;
}

export interface SplitBookResult {
  folderId: string;
  folderName: string;
  totalChapters: number;
  chapters: SplitChapterResult[];
}

export type BookSplitProgressCallback = (message: string, percent: number) => void;

/**
 * Analiza un archivo PDF buscando marcadores (outline) o encabezados de páginas
 * para identificar automáticamente los capítulos y unidades del libro.
 */
export async function detectBookChapters(
  file: File,
  onProgress?: BookSplitProgressCallback,
): Promise<{ chapters: ChapterPlan[]; totalPages: number; detectedMethod: string }> {
  onProgress?.("Cargando documento para análisis estructural...", 10);

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const totalPages = pdfDoc.numPages;

  // 1. Intentar obtener el índice nativo del PDF (bookmarks / outline)
  onProgress?.("Buscando tabla de contenidos y marcadores nativos...", 25);
  try {
    const outline = await pdfDoc.getOutline();
    if (outline && outline.length > 0) {
      const outlineChapters: { title: string; page: number }[] = [];

      for (const item of outline) {
        const title = item.title?.trim();
        if (!title) continue;

        try {
          let dest = item.dest;
          if (typeof dest === "string") {
            dest = await pdfDoc.getDestination(dest);
          }
          if (Array.isArray(dest) && dest.length > 0) {
            const pageIndex = await pdfDoc.getPageIndex(dest[0]);
            const pageNum = pageIndex + 1;
            if (pageNum >= 1 && pageNum <= totalPages) {
              outlineChapters.push({ title, page: pageNum });
            }
          }
        } catch {
          // Ignorar fallas de resolución de destinos individuales
        }
      }

      if (outlineChapters.length >= 2) {
        // Ordenar por página ascendente y descartar duplicados de página
        outlineChapters.sort((a, b) => a.page - b.page);
        const uniqueChapters: { title: string; page: number }[] = [];
        for (const chap of outlineChapters) {
          if (
            uniqueChapters.length === 0 ||
            uniqueChapters[uniqueChapters.length - 1].page !== chap.page
          ) {
            uniqueChapters.push(chap);
          }
        }

        const plan: ChapterPlan[] = uniqueChapters.map((chap, idx) => {
          const next = uniqueChapters[idx + 1];
          const end = next ? next.page - 1 : totalPages;
          return {
            id: `chap_${idx + 1}`,
            title: cleanChapterTitle(chap.title),
            startPage: chap.page,
            endPage: Math.max(chap.page, end),
          };
        });

        onProgress?.("¡Capítulos detectados mediante índice oficial!", 100);
        return { chapters: plan, totalPages, detectedMethod: "Índice nativo (Outline)" };
      }
    }
  } catch {
    console.warn("No se pudo leer outline nativo del PDF.");
  }

  // 2. Heurística: Explorar páginas buscando patrones de títulos de capítulo
  onProgress?.("Analizando texto de páginas para detectar capítulos...", 45);

  const detectedStarts: { title: string; page: number }[] = [];
  const maxPagesToScan = Math.min(totalPages, 120);

  const CHAPTER_REGEX =
    /^(?:cap[ií]tulo|chapter|unidad|unit|tema|m[oó]dulo|lecci[oó]n|secci[oó]n|parte)\s+([0-9ivxlcdm]+)[\s:.\-–—]*(.*)/i;

  for (let pageNum = 1; pageNum <= maxPagesToScan; pageNum++) {
    if (pageNum % 5 === 0) {
      onProgress?.(
        `Escaneando página ${pageNum} de ${maxPagesToScan}...`,
        Math.round(45 + (pageNum / maxPagesToScan) * 45),
      );
    }

    try {
      const page = await pdfDoc.getPage(pageNum);
      const content = await page.getTextContent();
      const lines = content.items
        .map((it) => ("str" in it ? it.str : ""))
        .join(" ")
        .split(/\n|\r/);

      // Buscar si alguna de las primeras líneas coincide con un capítulo
      for (const rawLine of lines.slice(0, 10)) {
        const line = rawLine.trim();
        const match = line.match(CHAPTER_REGEX);
        if (match) {
          const unitNumber = match[1];
          const extraTitle = match[2]?.trim() || "";
          const fullTitle = extraTitle
            ? `Capítulo ${unitNumber}: ${extraTitle}`
            : `Capítulo ${unitNumber}`;

          // Evitar registrar la misma página dos veces
          if (
            detectedStarts.length === 0 ||
            detectedStarts[detectedStarts.length - 1].page !== pageNum
          ) {
            detectedStarts.push({ title: fullTitle, page: pageNum });
          }
          break;
        }
      }
    } catch {
      // Continuar si una página no puede extraerse
    }
  }

  if (detectedStarts.length >= 2) {
    const plan: ChapterPlan[] = detectedStarts.map((chap, idx) => {
      const next = detectedStarts[idx + 1];
      const end = next ? next.page - 1 : totalPages;
      return {
        id: `chap_${idx + 1}`,
        title: cleanChapterTitle(chap.title),
        startPage: chap.page,
        endPage: Math.max(chap.page, end),
      };
    });

    onProgress?.("¡Capítulos detectados por análisis de texto!", 100);
    return { chapters: plan, totalPages, detectedMethod: "Detección de patrones de texto" };
  }

  // 3. Fallback inteligente: Proponer particionado por bloques razonables (ej. 15 páginas)
  onProgress?.("Sin índice explícito. Generando propuesta de partición...", 90);
  const pageSize = totalPages > 60 ? 20 : 10;
  const fallbackPlan: ChapterPlan[] = [];
  let currentStart = 1;
  let partIndex = 1;

  while (currentStart <= totalPages) {
    const currentEnd = Math.min(currentStart + pageSize - 1, totalPages);
    fallbackPlan.push({
      id: `chap_${partIndex}`,
      title: `Unidad ${partIndex} (Págs. ${currentStart}–${currentEnd})`,
      startPage: currentStart,
      endPage: currentEnd,
    });
    currentStart = currentEnd + 1;
    partIndex++;
  }

  onProgress?.("Propuesta de unidades lista para revisar.", 100);
  return {
    chapters: fallbackPlan,
    totalPages,
    detectedMethod: "Partición por bloques sugeridos (personalizable)",
  };
}

/**
 * Corta el libro en múltiples archivos PDF independientes (uno por capítulo)
 * y los guarda automáticamente en una carpeta dedicada en la base de datos local.
 */
export async function splitAndStoreBookChapters(
  file: File,
  chapters: ChapterPlan[],
  bookTitle: string,
  onProgress?: BookSplitProgressCallback,
): Promise<SplitBookResult> {
  onProgress?.("Cargando documento en motor binario de PDF...", 5);

  const arrayBuffer = await file.arrayBuffer();
  const sourcePdf = await PDFDocument.load(arrayBuffer);

  // 1. Crear carpeta en la base de datos de Archivos (StudyLabDB)
  const folderId = generateId();
  const cleanBookName = bookTitle.trim() || file.name.replace(/\.[^/.]+$/, "");

  await db.folders.put({
    id: folderId,
    parentId: null,
    name: cleanBookName,
    type: "custom",
    createdAt: Date.now(),
  });

  const results: SplitChapterResult[] = [];
  const total = chapters.length;

  // 2. Extraer cada capítulo a un sub-PDF independiente
  for (let i = 0; i < total; i++) {
    const chap = chapters[i];
    const progressPct = Math.round(10 + (i / total) * 85);
    onProgress?.(`Generando archivo: ${chap.title} (${i + 1} de ${total})...`, progressPct);

    // Crear sub-documento PDF
    const subPdf = await PDFDocument.create();

    // Rango de páginas (0-based)
    const pageIndices: number[] = [];
    for (let p = chap.startPage; p <= chap.endPage; p++) {
      if (p >= 1 && p <= sourcePdf.getPageCount()) {
        pageIndices.push(p - 1);
      }
    }

    if (pageIndices.length > 0) {
      const copied = await subPdf.copyPages(sourcePdf, pageIndices);
      copied.forEach((p) => subPdf.addPage(p));
    }

    const pdfBytes = await subPdf.save();
    const chapterBlob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: "application/pdf" });
    const pageCount = pageIndices.length;

    // A. Guardar en StudyLabDB (Gestor de Archivos por Carpeta)
    const fileRecordId = generateId();
    const fileName = `${sanitizeFileName(chap.title)}.pdf`;

    await db.files.put({
      id: fileRecordId,
      folderId,
      name: fileName,
      mimeType: "application/pdf",
      size: chapterBlob.size,
      blob: chapterBlob,
      ocrStatus: "not_applicable",
      createdAt: Date.now(),
    });

    // B. Guardar en StudyLabAcademicDB (Anotador PDF / Métodos)
    const pdfDocId = `doc_${Date.now()}_${i}`;
    await savePdfDocument({
      id: pdfDocId,
      title: `${cleanBookName} — ${chap.title}`,
      fileName,
      fileSize: chapterBlob.size,
      totalPages: pageCount,
      blob: chapterBlob,
      uploadedAt: Date.now(),
    });

    results.push({
      id: chap.id,
      title: chap.title,
      startPage: chap.startPage,
      endPage: chap.endPage,
      pageCount,
      fileSize: chapterBlob.size,
      blob: chapterBlob,
      pdfDocId,
      fileRecordId,
    });
  }

  onProgress?.("¡Libro separado y guardado con éxito en su carpeta!", 100);

  return {
    folderId,
    folderName: cleanBookName,
    totalChapters: results.length,
    chapters: results,
  };
}

function cleanChapterTitle(raw: string): string {
  return raw
    .replace(/^[\s\-_.:]+|[\s\-_.:]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 100);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, "_").slice(0, 80);
}
