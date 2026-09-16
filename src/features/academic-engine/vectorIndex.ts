import { db, type AcademicChunkRecord, type AcademicSourceRecord, type AcademicBoundingBox } from "../../db/db";
import { computeEmbeddingVector } from "./embeddings/embeddingManager";

export interface SearchResult {
  chunk: AcademicChunkRecord;
  sourceTitle: string;
  sourceId: string;
  pageNumber: number;
  boundingBox?: AcademicBoundingBox;
  score: number; // Combined RRF Score
  vectorRank: number;
  keywordRank: number;
  denseScore: number;
  sparseScore: number;
  exactMatchBoost: number;
  graphBoost: number;
  matchedLatex: string[];
}

export interface SourceDiscrepancy {
  topic: string;
  sourceA: { id: string; title: string; snippet: string; pageNumber: number };
  sourceB: { id: string; title: string; snippet: string; pageNumber: number };
  reason: string;
}

export interface HybridSearchResponse {
  results: SearchResult[];
  hasSufficientEvidence: boolean;
  refusalReason?: string;
  queryAnalyzed: {
    exactPatterns: string[];
    technicalTerms: string[];
  };
  discrepancies?: SourceDiscrepancy[];
}

export const EVIDENCE_THRESHOLD = 0.015; // Minimum RRF score required to consider evidence sufficient

/**
 * Calculates cosine similarity between two unit-normalized vectors.
 */
export function cosineSimilarity(vecA?: number[], vecB?: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * Calculates Okapi BM25 score approximation between query tokens and chunk sparse tokens.
 * Accounts for term frequency (TF), saturation (k1 = 1.5, b = 0.75), and length normalization.
 */
export function computeBM25Score(
  queryTerms: string[],
  chunkTokens: Record<string, number> = {},
  chunkLength = 100,
  avgDocLength = 120,
): number {
  const k1 = 1.5;
  const b = 0.75;
  let score = 0;

  for (const term of queryTerms) {
    const tf = chunkTokens[term] || 0;
    if (tf > 0) {
      const lenNorm = 1 - b + b * (chunkLength / Math.max(1, avgDocLength));
      const saturatedTf = (tf * (k1 + 1)) / (tf + k1 * lenNorm);
      score += saturatedTf;
    }
  }

  return score;
}

/**
 * Detects engineering exact matches such as equation numbers, standards, and norms.
 * e.g., "ecuación 4.17", "ec. 2.4", "IRAM 2437", "IEEE 802.11", "teorema 3.1".
 */
export function extractExactTechnicalPatterns(text: string): string[] {
  const patterns: string[] = [];

  // Equation patterns
  const eqMatches = text.match(/(?:ecuaci[oó]n|ec\.)\s*(\d+(?:\.\d+)?)/gi);
  if (eqMatches) patterns.push(...eqMatches.map((m) => m.toLowerCase().replace(/\s+/g, " ")));

  // Theorem & proposition patterns
  const thMatches = text.match(/(?:teorema|proposici[oó]n|lema|definici[oó]n)\s*(\d+(?:\.\d+)?)/gi);
  if (thMatches) patterns.push(...thMatches.map((m) => m.toLowerCase().replace(/\s+/g, " ")));

  // Technical standards and norms (IRAM, ISO, IEEE, DIN, ASTM)
  const normMatches = text.match(/\b(IRAM|ISO|IEEE|DIN|ASTM|IEC)\s*[-_]?\s*(\d+)/gi);
  if (normMatches) patterns.push(...normMatches.map((m) => m.toLowerCase().replace(/\s+/g, " ")));

  return patterns;
}

/**
 * Hybrid Vector + BM25 + Exact Nomenclature + Reciprocal Rank Fusion (RRF) Search.
 */
export async function searchAcademicKnowledge(params: {
  query: string;
  subjectFilter?: string | null;
  sourceIds?: string[];
  topK?: number;
}): Promise<SearchResult[]> {
  const response = await searchAcademicKnowledgeWithEvidence(params);
  return response.results;
}

/**
 * Full Hybrid Search with Evidence Verification for Citation-First integrity.
 */
export async function searchAcademicKnowledgeWithEvidence(params: {
  query: string;
  subjectFilter?: string | null;
  sourceIds?: string[];
  topK?: number;
}): Promise<HybridSearchResponse> {
  const { query, subjectFilter, sourceIds, topK = 6 } = params;
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      results: [],
      hasSufficientEvidence: false,
      refusalReason: "No se ha ingresado una consulta de búsqueda.",
      queryAnalyzed: { exactPatterns: [], technicalTerms: [] },
    };
  }

  let allChunks = await db.academicChunks.toArray();
  if (sourceIds && sourceIds.length > 0) {
    const sourceIdSet = new Set(sourceIds);
    allChunks = allChunks.filter((c) => sourceIdSet.has(c.sourceId));
  } else if (subjectFilter) {
    allChunks = allChunks.filter((c) => c.subjectId === subjectFilter);
  }

  if (allChunks.length === 0) {
    return {
      results: [],
      hasSufficientEvidence: false,
      refusalReason: "No existen fragmentos indexados en la base de datos para esta cátedra.",
      queryAnalyzed: { exactPatterns: [], technicalTerms: [] },
    };
  }

  // 1. Analyze Query
  const exactPatterns = extractExactTechnicalPatterns(trimmed);
  const queryTerms = trimmed
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  // 2. Compute Query Embedding (on-device Transformers.js / fallback)
  const queryDense = await computeEmbeddingVector(trimmed);

  // 3. Mapping sources & graph concepts
  const [sources, concepts] = await Promise.all([
    db.academicSources.toArray(),
    db.concepts.toArray(),
  ]);
  const sourceMap = new Map(sources.map((s) => [s.id, s.title]));
  const conceptNames = new Set(concepts.map((c) => c.name.toLowerCase()));

  // 4. Calculate Raw Dense and Sparse Scores for each chunk
  interface ScoredCandidate {
    chunk: AcademicChunkRecord;
    denseScore: number;
    bm25Score: number;
    exactMatchBoost: number;
    graphBoost: number;
    matchedLatex: string[];
    vectorRank: number;
    keywordRank: number;
    rrfScore: number;
  }

  const candidates: ScoredCandidate[] = allChunks.map((chunk) => {
    // Dense similarity
    const denseScore = chunk.denseVector
      ? cosineSimilarity(queryDense, chunk.denseVector)
      : 0;

    // BM25 sparse score
    const bm25Score = computeBM25Score(queryTerms, chunk.sparseTokens);

    // Exact pattern matching (equation numbers, norms, theorems)
    let exactMatchBoost = 0;
    const chunkLower = chunk.rawContent.toLowerCase();
    for (const pat of exactPatterns) {
      if (chunkLower.includes(pat)) {
        exactMatchBoost += 2.5; // Significant boost for exact technical match
      }
    }

    // Knowledge graph concept boost
    let graphBoost = 0;
    for (const cName of conceptNames) {
      if (chunkLower.includes(cName)) {
        graphBoost += 0.08;
      }
    }
    graphBoost = Math.min(0.25, graphBoost);

    return {
      chunk,
      denseScore,
      bm25Score: bm25Score + exactMatchBoost,
      exactMatchBoost,
      graphBoost,
      matchedLatex: chunk.latexFormulas || [],
      vectorRank: 0,
      keywordRank: 0,
      rrfScore: 0,
    };
  });

  // 5. Rank by Dense Vector
  candidates.sort((a, b) => b.denseScore - a.denseScore);
  candidates.forEach((c, idx) => {
    c.vectorRank = idx + 1;
  });

  // 6. Rank by BM25 Keyword
  candidates.sort((a, b) => b.bm25Score - a.bm25Score);
  candidates.forEach((c, idx) => {
    c.keywordRank = idx + 1;
  });

  // 7. Reciprocal Rank Fusion (RRF) with k = 60
  const kRRF = 60;
  candidates.forEach((c) => {
    const rrfDense = 1.0 / (kRRF + c.vectorRank);
    const rrfKeyword = 1.0 / (kRRF + c.keywordRank);
    c.rrfScore = rrfDense + rrfKeyword + c.graphBoost * 0.01;
  });

  // 8. Sort by combined RRF Score descending
  candidates.sort((a, b) => b.rrfScore - a.rrfScore);

  const topCandidates = candidates.slice(0, topK);
  const bestMatch = topCandidates[0];

  const hasSufficientEvidence = !!(
    bestMatch &&
    (bestMatch.rrfScore >= EVIDENCE_THRESHOLD || bestMatch.exactMatchBoost > 0 || bestMatch.denseScore > 0.45)
  );

  const results: SearchResult[] = topCandidates.map((c) => ({
    chunk: c.chunk,
    sourceTitle: sourceMap.get(c.chunk.sourceId) || "Documento Académico",
    sourceId: c.chunk.sourceId,
    pageNumber: c.chunk.pageNumber,
    boundingBox: c.chunk.boundingBox,
    score: Number(c.rrfScore.toFixed(5)),
    vectorRank: c.vectorRank,
    keywordRank: c.keywordRank,
    denseScore: Number(c.denseScore.toFixed(4)),
    sparseScore: Number(c.bm25Score.toFixed(4)),
    exactMatchBoost: c.exactMatchBoost,
    graphBoost: c.graphBoost,
    matchedLatex: c.matchedLatex,
  }));

  // 9. Detect discrepancies across distinct sources
  const discrepancies: SourceDiscrepancy[] = [];
  const distinctSourceIds = Array.from(new Set(results.map((r) => r.sourceId)));
  if (distinctSourceIds.length >= 2) {
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const resA = results[i];
        const resB = results[j];
        if (resA.sourceId !== resB.sourceId) {
          const textA = resA.chunk.rawContent.toLowerCase();
          const textB = resB.chunk.rawContent.toLowerCase();

          const hasPolarConflict =
            (textA.includes("aumenta") && textB.includes("disminuye")) ||
            (textA.includes("disminuye") && textB.includes("aumenta")) ||
            (textA.includes("directamente proporcional") && textB.includes("inversamente proporcional")) ||
            (textA.includes("inversamente proporcional") && textB.includes("directamente proporcional")) ||
            (textA.includes("siempre") && textB.includes("nunca")) ||
            (textA.includes("atractiva") && textB.includes("repulsiva")) ||
            (textA.includes("conservativa") && textB.includes("no conservativa"));

          if (hasPolarConflict) {
            discrepancies.push({
              topic: trimmed,
              sourceA: {
                id: resA.sourceId,
                title: resA.sourceTitle,
                snippet: resA.chunk.rawContent.slice(0, 150),
                pageNumber: resA.pageNumber,
              },
              sourceB: {
                id: resB.sourceId,
                title: resB.sourceTitle,
                snippet: resB.chunk.rawContent.slice(0, 150),
                pageNumber: resB.pageNumber,
              },
              reason: "Las fuentes afirman comportamientos o relaciones opuestas respecto a esta consulta.",
            });
            break;
          }
        }
      }
      if (discrepancies.length > 0) break;
    }
  }

  return {
    results,
    hasSufficientEvidence,
    refusalReason: hasSufficientEvidence
      ? undefined
      : "No encuentro evidencia suficiente en las fuentes cargadas para fundamentar una deducción rigurosa.",
    queryAnalyzed: {
      exactPatterns,
      technicalTerms: queryTerms,
    },
    discrepancies: discrepancies.length > 0 ? discrepancies : undefined,
  };
}

/**
 * Seeds sample university textbook and lecture notes if none exist in IndexedDB.
 */
export async function seedAcademicSources(): Promise<void> {
  const existing = await db.academicSources.count();
  if (existing > 0) return;

  const now = Date.now();

  const source1: AcademicSourceRecord = {
    id: "src-penrose-quantum-physics",
    subjectId: "fisica-3",
    professorId: "Dr. Roger Penrose",
    career: "Lic. en Física / Ingeniería",
    year: 2026,
    semester: "1C",
    title: "Física III: Fundamentos de Electrodinámica y Mecánica Cuántica",
    documentType: "textbook",
    pageCount: 68,
    ocrProcessed: true,
    chunkCount: 8,
    createdAt: now,
  };

  await db.academicSources.put(source1);
}
