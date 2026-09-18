import { db, type AcademicChunkRecord, type AcademicSourceRecord, type AcademicBoundingBox, type CardFsrsRecord } from "../../db/db";
import { computeEmbeddingVector, computeFallbackProjection } from "./embeddings/embeddingManager";
import { extractSparseTokens } from "./academicChunker";
import { isDesktop, searchFtsAcademicChunks } from "../../platform";

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

  // 3.1 Consultar SQLite FTS5 si corre en Desktop (bajo consumo de RAM)
  const ftsMap = new Map<string, { bm25_score: number; snippet: string }>();
  if (isDesktop()) {
    try {
      const ftsHits = await searchFtsAcademicChunks({
        query: trimmed,
        subjectId: subjectFilter || undefined,
        limit: 100,
      });
      for (const hit of ftsHits) {
        ftsMap.set(hit.chunk_id, { bm25_score: hit.bm25_score, snippet: hit.snippet });
      }
    } catch (e) {
      console.warn("[HybridSearch] Fallback a BM25 en memoria:", e);
    }
  }

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

    // BM25 sparse score (con boost nativo SQLite FTS5 si aplica)
    const baseBm25 = computeBM25Score(queryTerms, chunk.sparseTokens);
    const ftsHit = ftsMap.get(chunk.id);
    const ftsBoost = ftsHit ? Math.max(0, 5.0 - Math.abs(ftsHit.bm25_score) * 0.1) : 0;
    const bm25Score = baseBm25 + ftsBoost;

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
  const now = Date.now();
  const sourceId = "src-penrose-quantum-physics";

  const existing = await db.academicSources.get(sourceId);
  const existingChunks = await db.academicChunks.where("sourceId").equals(sourceId).count();

  if (!existing) {
    const source1: AcademicSourceRecord = {
      id: sourceId,
      subjectId: "fisica-3",
      professorId: "Dr. Roger Penrose",
      career: "Lic. en Física / Ingeniería",
      year: 2026,
      semester: "1C",
      title: "Física III: Fundamentos de Electrodinámica y Mecánica Cuántica",
      documentType: "textbook",
      pageCount: 3,
      ocrProcessed: true,
      chunkCount: 3,
      createdAt: now,
    };
    await db.academicSources.put(source1);
  }

  // Populate chunks if missing
  if (existingChunks === 0) {
    const sampleChunks: AcademicChunkRecord[] = [
      {
        id: `chk_${sourceId}_p1_0`,
        sourceId,
        subjectId: "fisica-3",
        chunkType: "definition",
        title: "Definición 1.1 — Campo Electromagnético Clásico",
        hierarchyPath: "Física III > Capítulo 1: Electrodinámica > Campo Electromagnético",
        pageNumber: 1,
        paragraphIndex: 1,
        rawContent: "Definición 1.1 (Campo Electromagnético Clásico):\nSe define el tensor de campo electromagnético $F^{\\mu\\nu} = \\partial^\\mu A^\\nu - \\partial^\\nu A^\\mu$ en términos del cuatro-potencial $A^\\mu = (\\phi/c, \\mathbf{A})$. Las ecuaciones homogéneas de Maxwell se expresan como $\\partial_\\lambda F_{\\mu\\nu} + \\partial_\\mu F_{\\nu\\lambda} + \\partial_\\nu F_{\\lambda\\mu} = 0$.",
        latexFormulas: [
          "F^{\\mu\\nu} = \\partial^\\mu A^\\nu - \\partial^\\nu A^\\mu",
          "\\partial_\\lambda F_{\\mu\\nu} + \\partial_\\mu F_{\\nu\\lambda} + \\partial_\\nu F_{\\lambda\\mu} = 0",
        ],
        boundingBox: { x: 0.1, y: 0.15, width: 0.8, height: 0.2 },
        denseVector: computeFallbackProjection("Definición Campo Electromagnetico Clasico Maxwell", 64),
        sparseTokens: extractSparseTokens("definicion campo electromagnetico clasico maxwell tensor"),
        createdAt: now,
      },
      {
        id: `chk_${sourceId}_p1_1`,
        sourceId,
        subjectId: "fisica-3",
        chunkType: "theorem",
        title: "Teorema 1.2 — Conservación de la Carga y Continuidad",
        hierarchyPath: "Física III > Capítulo 1: Electrodinámica > Ecuación de Continuidad",
        pageNumber: 1,
        paragraphIndex: 2,
        rawContent: "Teorema 1.2 (Ecuación de Continuidad Local):\nLa conservación local de la carga eléctrica exige que la cuatro-divergencia de la densidad de corriente se anule idénticamente: $\\partial_\\mu J^\\mu = 0$, lo que en forma tridimensional equivale a $\\nabla \\cdot \\mathbf{J} + \\frac{\\partial \\rho}{\\partial t} = 0$.",
        latexFormulas: [
          "\\partial_\\mu J^\\mu = 0",
          "\\nabla \\cdot \\mathbf{J} + \\frac{\\partial \\rho}{\\partial t} = 0",
        ],
        boundingBox: { x: 0.1, y: 0.4, width: 0.8, height: 0.25 },
        denseVector: computeFallbackProjection("Teorema Ecuacion Continuidad Local Carga Electrica", 64),
        sparseTokens: extractSparseTokens("teorema ecuacion continuidad local carga electrica divergencia"),
        createdAt: now,
      },
      {
        id: `chk_${sourceId}_p1_2`,
        sourceId,
        subjectId: "fisica-3",
        chunkType: "proof",
        title: "Demostración — Deducción a partir de la Invarianza Gauge",
        hierarchyPath: "Física III > Capítulo 1: Electrodinámica > Deducción de Continuidad",
        pageNumber: 1,
        paragraphIndex: 3,
        rawContent: "Demostración:\nAplicando la divergencia a la ley de Maxwell no homogénea $\\partial_\\nu F^{\\nu\\mu} = \\mu_0 J^\\mu$, y notando que $\\partial_\\mu \\partial_\\nu$ es un operador simétrico contra el tensor antisimétrico $F^{\\nu\\mu}$, se concluye inmediatamente que $\\partial_\\mu J^\\mu = \\frac{1}{\\mu_0} \\partial_\\mu \\partial_\\nu F^{\\nu\\mu} = 0$. Q.E.D.",
        latexFormulas: [
          "\\partial_\\nu F^{\\nu\\mu} = \\mu_0 J^\\mu",
          "\\partial_\\mu J^\\mu = \\frac{1}{\\mu_0} \\partial_\\mu \\partial_\\nu F^{\\nu\\mu} = 0",
        ],
        boundingBox: { x: 0.1, y: 0.7, width: 0.8, height: 0.2 },
        denseVector: computeFallbackProjection("Demostración Deduccion Continuidad Invarianza Gauge", 64),
        sparseTokens: extractSparseTokens("demostracion deduccion continuidad invarianza gauge maxwell"),
        createdAt: now,
      },
    ];

    await db.academicChunks.bulkPut(sampleChunks);
  }

  // Seed sample FSRS flashcard for cognitive repetition
  const cardCount = await db.cardsFsrs.count();
  if (cardCount === 0) {
    const sampleCard: CardFsrsRecord = {
      id: "card_seed_penrose_1",
      deckId: `deck_${sourceId}`,
      conceptId: "fisica-3",
      front: "¿Cuál es la formulación covariante cuatridimensional de la ecuación de continuidad para la corriente eléctrica?",
      back: "$\\partial_\\mu J^\\mu = 0$, que en coordenadas espaciotemporales equivale a $\\nabla \\cdot \\mathbf{J} + \\frac{\\partial \\rho}{\\partial t} = 0$.",
      state: "review",
      stability: 4.2,
      difficulty: 4.8,
      reps: 2,
      lapses: 0,
      lastReview: now - 86400000,
      dueDate: now,
      halfLife: 4.2,
      createdAt: now,
    };
    await db.cardsFsrs.put(sampleCard);
  }
}
