import type { AcademicBoundingBox, AcademicChunkRecord, AcademicChunkType } from "../../db/db";

export interface RawDocumentSection {
  title?: string;
  hierarchy: string[]; // e.g. ["Capítulo 4", "Electromagnetismo", "Ley de Faraday-Lenz"]
  type: AcademicChunkType;
  pageNumber: number;
  paragraphIndex: number;
  text: string;
  boundingBox?: AcademicBoundingBox;
}

/**
 * Extracts math formulas delimited by $$ ... $$ or $ ... $ or \[ ... \] or \( ... \)
 */
export function extractLatexFormulas(text: string): string[] {
  const formulas: string[] = [];
  // Block formulas $$...$$ or \[...\]
  const blockRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(text)) !== null) {
    const formula = match[1] || match[2];
    if (formula && formula.trim()) {
      formulas.push(formula.trim());
    }
  }

  // Inline formulas $...$ or \(...\)
  const inlineRegex = /(?:^|[^\\])\$([^$\n]+?)\$|\\\(([^)]+?)\\\)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    const formula = match[1] || match[2];
    if (formula && formula.trim() && !formulas.includes(formula.trim())) {
      formulas.push(formula.trim());
    }
  }

  return formulas;
}

/**
 * Tokenizes text into sparse word frequencies for BM25 search
 */
export function extractSparseTokens(text: string): Record<string, number> {
  const words = text
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return freq;
}

/**
 * Computes a pseudo-dense embedding vector (16-dimensional hash projection)
 * for fast offline client-side cosine similarity search when backend is offline.
 */
export function computeLocalEmbedding(text: string): number[] {
  const dim = 16;
  const vector = Array.from({ length: dim }, () => 0);
  const words = text.toLowerCase().split(/\s+/).filter(Boolean);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dim;
    vector[idx] += 1.0 / Math.sqrt(words.length);
  }

  // Normalize vector to unit length
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0)) || 1.0;
  return vector.map((v) => Number((v / norm).toFixed(4)));
}

/**
 * Hierarchical AST Academic Chunker
 *
 * Breaks dense academic texts while respecting theorem-proof atomic blocks
 * and injecting breadcrumb hierarchy metadata into each chunk.
 */
export function chunkAcademicText(
  sourceId: string,
  subjectId: string,
  rawText: string,
  defaultPage = 1,
): AcademicChunkRecord[] {
  const lines = rawText.split("\n");
  const chunks: AcademicChunkRecord[] = [];

  let currentHierarchy: string[] = ["General"];
  let currentParagraph = "";
  let paragraphIndex = 0;
  let currentPage = defaultPage;

  let inTheoremBlock = false;
  let currentTheoremTitle = "";

  const commitChunk = (type: AcademicChunkType, title?: string) => {
    const cleanContent = currentParagraph.trim();
    if (!cleanContent) return;

    const formulas = extractLatexFormulas(cleanContent);
    const sparse = extractSparseTokens(cleanContent);
    const dense = computeLocalEmbedding(cleanContent);

    // Contextual Breadcrumb
    const hierarchyPath = currentHierarchy.join(" > ");
    const breadcrumbHeader = `[Contexto: ${hierarchyPath}${title ? ` > ${title}` : ""}]`;
    const enrichedContent = `${breadcrumbHeader}\n${cleanContent}`;

    // Synthetic BoundingBox per paragraph for precise Citation-First UI
    const yTop = Math.min(0.85, 0.10 + (paragraphIndex % 6) * 0.13);
    const bbox: AcademicBoundingBox = {
      x: 0.12,
      y: Number(yTop.toFixed(3)),
      width: 0.76,
      height: 0.11,
    };

    chunks.push({
      id: `chk-${sourceId}-${currentPage}-${paragraphIndex}-${Date.now().toString(36)}`,
      sourceId,
      subjectId,
      chunkType: type,
      title: title || (inTheoremBlock ? currentTheoremTitle : undefined),
      hierarchyPath: currentHierarchy.join(" / "),
      pageNumber: currentPage,
      paragraphIndex,
      rawContent: enrichedContent,
      latexFormulas: formulas,
      boundingBox: bbox,
      denseVector: dense,
      sparseTokens: sparse,
      createdAt: Date.now(),
    });

    currentParagraph = "";
    paragraphIndex++;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect Page Markers (e.g. "--- Page 5 ---" or "[Pág. 5]")
    const pageMatch = line.match(/(?:page|pág(?:ina)?\.?)\s*(\d+)/i);
    if (pageMatch) {
      if (currentParagraph.trim()) {
        commitChunk(inTheoremBlock ? "theorem" : "paragraph");
      }
      currentPage = parseInt(pageMatch[1], 10);
      continue;
    }

    // Detect Chapters / Sections (Headers: #, ##, ###)
    if (line.startsWith("# ")) {
      if (currentParagraph.trim()) commitChunk(inTheoremBlock ? "theorem" : "paragraph");
      currentHierarchy = [line.replace(/^#\s+/, "").trim()];
      continue;
    }
    if (line.startsWith("## ")) {
      if (currentParagraph.trim()) commitChunk(inTheoremBlock ? "theorem" : "paragraph");
      currentHierarchy = [currentHierarchy[0] || "General", line.replace(/^##\s+/, "").trim()];
      continue;
    }
    if (line.startsWith("### ")) {
      if (currentParagraph.trim()) commitChunk(inTheoremBlock ? "theorem" : "paragraph");
      currentHierarchy = [
        currentHierarchy[0] || "General",
        currentHierarchy[1] || "Sección",
        line.replace(/^###\s+/, "").trim(),
      ];
      continue;
    }

    // Detect Theorem / Definition / Lemma start (Atomic Block)
    const theoremStartMatch = line.match(
      /^(teorema|definici[oó]n|lema|corolario|proposici[oó]n)\s*([\d.]+)?/i,
    );
    if (theoremStartMatch) {
      if (currentParagraph.trim()) {
        commitChunk(inTheoremBlock ? "theorem" : "paragraph");
      }
      inTheoremBlock = true;
      currentTheoremTitle = line;
      currentParagraph = `${line}\n`;
      continue;
    }

    // Detect Proof start
    if (line.match(/^demostraci[oó]n\b/i)) {
      currentParagraph += `${line}\n`;
      continue;
    }

    // Detect End of Proof (Q.E.D. / ■ / cuadrito)
    if (line.includes("■") || line.toLowerCase().includes("q.e.d.") || line.includes("$\\blacksquare$")) {
      currentParagraph += `${line}\n`;
      commitChunk("theorem", currentTheoremTitle);
      inTheoremBlock = false;
      currentTheoremTitle = "";
      continue;
    }

    // Empty line: boundary for standard paragraph
    if (!line) {
      if (!inTheoremBlock && currentParagraph.trim()) {
        commitChunk("paragraph");
      }
      continue;
    }

    currentParagraph += `${line}\n`;
  }

  // Commit remaining text
  if (currentParagraph.trim()) {
    commitChunk(inTheoremBlock ? "theorem" : "paragraph");
  }

  return chunks;
}
