import {
  type AcademicBoundingBox,
  type AcademicChunkRecord,
  type AcademicChunkType,
  type AcademicSourceRecord,
} from "../../db/db";
import { pdfjsLib } from "../../lib/pdf";
import {
  extractLatexFormulas,
  extractSparseTokens,
  computeLocalEmbedding,
} from "./academicChunker";

export interface IngestResult {
  source: AcademicSourceRecord;
  chunks: AcademicChunkRecord[];
  fileBlob?: Blob;
}

/**
 * 1. PDF Ingestion Adapter
 */
export async function pdfAdapter(params: {
  file: File;
  title?: string;
  subjectId?: string;
  career?: string;
  onProgress?: (pct: number) => void;
}): Promise<IngestResult> {
  const { file, subjectId = "academic_general", career = "Ingeniería / Ciencias", onProgress } = params;
  const sourceId = `src_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const title = params.title || file.name.replace(/\.[^/.]+$/, "");

  onProgress?.(15);
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const pageCount = pdfDoc.numPages;

  const chunks: AcademicChunkRecord[] = [];
  const defaultBbox: AcademicBoundingBox = { x: 50, y: 50, width: 500, height: 200 };

  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageString = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    const paragraphs = pageString
      .split(/\n{2,}|\.\s{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length >= 20);

    paragraphs.forEach((pText, pIndex) => {
      const chunkId = `chk_${sourceId}_p${pageNum}_${pIndex}`;
      const formulas = extractLatexFormulas(pText);
      const sparse = extractSparseTokens(pText);
      const dense = computeLocalEmbedding(pText);

      let chunkType: AcademicChunkType = "paragraph";
      if (/teorema|theorem/i.test(pText)) chunkType = "theorem";
      else if (/demostraci[oó]n|proof/i.test(pText)) chunkType = "proof";
      else if (/definici[oó]n|definition/i.test(pText)) chunkType = "definition";
      else if (/ejemplo|example/i.test(pText)) chunkType = "example";
      else if (formulas.length > 0) chunkType = "formula";

      chunks.push({
        id: chunkId,
        sourceId,
        subjectId,
        chunkType,
        title: `${title} - Pág. ${pageNum}`,
        hierarchyPath: `${title} > Página ${pageNum}`,
        pageNumber: pageNum,
        paragraphIndex: pIndex + 1,
        rawContent: pText,
        latexFormulas: formulas,
        boundingBox: defaultBbox,
        denseVector: dense,
        sparseTokens: sparse,
        createdAt: Date.now(),
      });
    });

    if (onProgress) {
      onProgress(15 + Math.round((pageNum / pageCount) * 65));
    }
  }

  const source: AcademicSourceRecord = {
    id: sourceId,
    subjectId,
    professorId: "Cátedra Universitaria",
    career,
    year: 2026,
    semester: "1C",
    title,
    documentType: "textbook",
    pageCount,
    fileId,
    ocrProcessed: true,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };

  return { source, chunks, fileBlob: file };
}

/**
 * 2. Pasted Text Ingestion Adapter
 */
export async function pastedTextAdapter(params: {
  title: string;
  text: string;
  subjectId?: string;
  career?: string;
}): Promise<IngestResult> {
  const { title, text, subjectId = "academic_general", career = "Ingeniería / Ciencias" } = params;
  const sourceId = `src_txt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const cleanTitle = title.trim() || `Apuntes pegados - ${new Date().toLocaleDateString()}`;

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: AcademicChunkRecord[] = [];
  let currentOffset = 0;

  paragraphs.forEach((pText, idx) => {
    const trimmed = pText.trim();
    const startOffset = text.indexOf(trimmed, currentOffset);
    const endOffset = startOffset >= 0 ? startOffset + trimmed.length : currentOffset + trimmed.length;
    currentOffset = endOffset;

    const formulas = extractLatexFormulas(trimmed);
    const sparse = extractSparseTokens(trimmed);
    const dense = computeLocalEmbedding(trimmed);

    let chunkType: AcademicChunkType = "paragraph";
    if (/teorema/i.test(trimmed)) chunkType = "theorem";
    else if (/demostraci[oó]n/i.test(trimmed)) chunkType = "proof";
    else if (/definici[oó]n/i.test(trimmed)) chunkType = "definition";
    else if (formulas.length > 0) chunkType = "formula";

    chunks.push({
      id: `chk_${sourceId}_${idx}`,
      sourceId,
      subjectId,
      chunkType,
      title: `${cleanTitle} - §${idx + 1}`,
      hierarchyPath: `${cleanTitle} > Sección ${idx + 1}`,
      pageNumber: Math.floor(idx / 3) + 1,
      paragraphIndex: idx + 1,
      rawContent: trimmed,
      latexFormulas: formulas,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      denseVector: dense,
      sparseTokens: sparse,
      charOffset: {
        start: Math.max(0, startOffset),
        end: endOffset,
      },
      createdAt: Date.now(),
    });
  });

  const source: AcademicSourceRecord = {
    id: sourceId,
    subjectId,
    career,
    title: cleanTitle,
    documentType: "pasted_text",
    pageCount: Math.max(1, Math.ceil(chunks.length / 3)),
    ocrProcessed: true,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };

  return { source, chunks };
}

/**
 * 3. Web Page Ingestion Adapter
 */
export async function webPageAdapter(params: {
  url: string;
  title?: string;
  rawHtmlOrText?: string;
  subjectId?: string;
  career?: string;
}): Promise<IngestResult> {
  const { url, subjectId = "academic_general", career = "Ingeniería / Ciencias" } = params;
  const sourceId = `src_web_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  let pageTitle = params.title || "";
  let readableText = "";

  if (params.rawHtmlOrText) {
    const cleanHtml = params.rawHtmlOrText
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, "")
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, "")
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, "");

    try {
      const doc = new DOMParser().parseFromString(cleanHtml, "text/html");
      if (!pageTitle) {
        pageTitle = doc.title || new URL(url).hostname;
      }
      readableText = doc.body.textContent?.replace(/\s+/g, " ").trim() || "";
    } catch {
      readableText = cleanHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
  } else {
    readableText = `Contenido extraído del artículo web de cátedra en ${url}.`;
    pageTitle = pageTitle || new URL(url).hostname;
  }

  const sections = readableText
    .split(/\.\s+(?=[A-ZÁÉÍÓÚ])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 30);

  const chunks: AcademicChunkRecord[] = [];
  sections.forEach((secText, idx) => {
    const formulas = extractLatexFormulas(secText);
    const sparse = extractSparseTokens(secText);
    const dense = computeLocalEmbedding(secText);

    chunks.push({
      id: `chk_${sourceId}_${idx}`,
      sourceId,
      subjectId,
      chunkType: formulas.length > 0 ? "formula" : "paragraph",
      title: `${pageTitle} - Fragmento ${idx + 1}`,
      hierarchyPath: `${pageTitle} > Web`,
      pageNumber: Math.floor(idx / 4) + 1,
      paragraphIndex: idx + 1,
      rawContent: secText,
      latexFormulas: formulas,
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
      denseVector: dense,
      sparseTokens: sparse,
      webUrlFragment: {
        url,
        textSnippet: secText.slice(0, 100),
      },
      createdAt: Date.now(),
    });
  });

  const source: AcademicSourceRecord = {
    id: sourceId,
    subjectId,
    career,
    title: pageTitle || url,
    documentType: "web_page",
    pageCount: Math.max(1, Math.ceil(chunks.length / 4)),
    ocrProcessed: true,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };

  return { source, chunks };
}

/**
 * 4. Class Transcript Adapter (.srt or bracketed timestamps [mm:ss])
 */
export function parseTimestampToSeconds(ts: string): number {
  const parts = ts.replace(",", ".").split(":").map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

export function formatSecondsToMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = Math.floor(totalSec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export async function transcriptAdapter(params: {
  title: string;
  content: string;
  subjectId?: string;
  career?: string;
}): Promise<IngestResult> {
  const { title, content, subjectId = "academic_general", career = "Ingeniería / Ciencias" } = params;
  const sourceId = `src_tr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const cleanTitle = title.trim() || `Transcripción de Clase - ${new Date().toLocaleDateString()}`;

  const chunks: AcademicChunkRecord[] = [];
  const srtBlockRegex = /(\d+)\s*\n(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*\n([\s\S]*?)(?=\n\s*\n\d+|\s*$)/g;
  let srtMatch: RegExpExecArray | null;
  let idx = 0;

  if (content.includes("-->")) {
    while ((srtMatch = srtBlockRegex.exec(content)) !== null) {
      const startSec = parseTimestampToSeconds(srtMatch[2]);
      const endSec = parseTimestampToSeconds(srtMatch[3]);
      const speechText = srtMatch[4].replace(/\n/g, " ").trim();

      if (speechText.length >= 10) {
        const formulas = extractLatexFormulas(speechText);
        const sparse = extractSparseTokens(speechText);
        const dense = computeLocalEmbedding(speechText);

        chunks.push({
          id: `chk_${sourceId}_${idx}`,
          sourceId,
          subjectId,
          chunkType: "concept",
          title: `${cleanTitle} [${formatSecondsToMmSs(startSec)}]`,
          hierarchyPath: `${cleanTitle} > Audio [${formatSecondsToMmSs(startSec)}]`,
          pageNumber: Math.floor(startSec / 300) + 1,
          paragraphIndex: idx + 1,
          rawContent: speechText,
          latexFormulas: formulas,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          denseVector: dense,
          sparseTokens: sparse,
          transcriptTimestamp: {
            startSeconds: startSec,
            endSeconds: endSec,
            formatted: formatSecondsToMmSs(startSec),
          },
          createdAt: Date.now(),
        });
        idx++;
      }
    }
  }

  if (chunks.length === 0) {
    const lines = content.split("\n").filter((l) => l.trim().length > 0);
    lines.forEach((line, lIdx) => {
      const timeMatch = line.match(/\b(?:\[)?(\d{1,2}:\d{2}(?::\d{2})?)(?:\])?/);
      const startSec = timeMatch ? parseTimestampToSeconds(timeMatch[1]) : lIdx * 30;
      const cleanLine = line.replace(/\b(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?/, "").trim();

      if (cleanLine.length >= 10) {
        const formulas = extractLatexFormulas(cleanLine);
        const sparse = extractSparseTokens(cleanLine);
        const dense = computeLocalEmbedding(cleanLine);

        chunks.push({
          id: `chk_${sourceId}_${lIdx}`,
          sourceId,
          subjectId,
          chunkType: "paragraph",
          title: `${cleanTitle} [${formatSecondsToMmSs(startSec)}]`,
          hierarchyPath: `${cleanTitle} > Audio [${formatSecondsToMmSs(startSec)}]`,
          pageNumber: Math.floor(startSec / 300) + 1,
          paragraphIndex: lIdx + 1,
          rawContent: cleanLine,
          latexFormulas: formulas,
          boundingBox: { x: 0, y: 0, width: 0, height: 0 },
          denseVector: dense,
          sparseTokens: sparse,
          transcriptTimestamp: {
            startSeconds: startSec,
            endSeconds: startSec + 30,
            formatted: formatSecondsToMmSs(startSec),
          },
          createdAt: Date.now(),
        });
      }
    });
  }

  const source: AcademicSourceRecord = {
    id: sourceId,
    subjectId,
    career,
    title: cleanTitle,
    documentType: "transcript",
    pageCount: Math.max(1, Math.ceil(chunks.length / 5)),
    ocrProcessed: true,
    chunkCount: chunks.length,
    createdAt: Date.now(),
  };

  return { source, chunks };
}
