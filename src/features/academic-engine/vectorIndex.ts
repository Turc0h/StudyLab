import { db, type AcademicChunkRecord, type AcademicSourceRecord } from "../../db/db";
import { chunkAcademicText, computeLocalEmbedding } from "./academicChunker";

export interface SearchResult {
  chunk: AcademicChunkRecord;
  sourceTitle: string;
  combinedScore: number;
  denseScore: number;
  sparseScore: number;
  graphBoost: number;
  matchedLatex: string[];
}

/**
 * Calculates cosine similarity between two unit-normalized vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
  }
  return Math.max(0, Math.min(1, dot));
}

/**
 * Calculates BM25 score approximation between query tokens and chunk sparse tokens
 */
export function sparseLexicalScore(
  queryTokens: Record<string, number>,
  chunkTokens: Record<string, number> = {},
): number {
  let score = 0;
  for (const term in queryTokens) {
    if (chunkTokens[term]) {
      const qf = queryTokens[term];
      const cf = chunkTokens[term];
      // TF term saturation
      const tf = (cf * 2.2) / (cf + 1.2);
      score += tf * qf;
    }
  }
  return score;
}

/**
 * Hybrid Vector + BM25 + Graph Reciprocal Rank Fusion (RRF) Search
 */
export async function searchAcademicKnowledge(params: {
  query: string;
  subjectFilter?: string | null;
  topK?: number;
}): Promise<SearchResult[]> {
  const { query, subjectFilter, topK = 6 } = params;
  if (!query.trim()) return [];

  let allChunks = await db.academicChunks.toArray();
  if (subjectFilter) {
    allChunks = allChunks.filter((c) => c.subjectId === subjectFilter);
  }

  if (allChunks.length === 0) return [];

  const queryDense = computeLocalEmbedding(query);
  const queryTerms = query
    .toLowerCase()
    .replace(/[^\w\sáéíóúüñ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const querySparse: Record<string, number> = {};
  for (const t of queryTerms) {
    querySparse[t] = (querySparse[t] || 0) + 1;
  }

  // Fetch sources mapping
  const sources = await db.academicSources.toArray();
  const sourceMap = new Map(sources.map((s) => [s.id, s.title]));

  // Fetch knowledge graph concepts to apply inter-subject graph boost
  const concepts = await db.concepts.toArray();
  const conceptNames = new Set(concepts.map((c) => c.name.toLowerCase()));

  const results: SearchResult[] = [];

  for (const chunk of allChunks) {
    const denseScore = chunk.denseVector
      ? cosineSimilarity(queryDense, chunk.denseVector)
      : 0;

    const rawSparse = chunk.sparseTokens
      ? sparseLexicalScore(querySparse, chunk.sparseTokens)
      : 0;
    const sparseScore = Math.min(1.0, rawSparse / Math.max(1, queryTerms.length * 2));

    // Graph boost if chunk content mentions a core concept
    let graphBoost = 0;
    for (const cName of conceptNames) {
      if (chunk.rawContent.toLowerCase().includes(cName)) {
        graphBoost += 0.08;
      }
    }
    graphBoost = Math.min(0.25, graphBoost);

    // Reciprocal Rank / Hybrid Composite Score
    const combinedScore = Number((denseScore * 0.5 + sparseScore * 0.35 + graphBoost * 0.15).toFixed(4));

    if (combinedScore > 0.10) {
      results.push({
        chunk,
        sourceTitle: sourceMap.get(chunk.sourceId) || "Documento Académico",
        combinedScore,
        denseScore,
        sparseScore,
        graphBoost,
        matchedLatex: chunk.latexFormulas || [],
      });
    }
  }

  // Sort descending by combined score
  return results.sort((a, b) => b.combinedScore - a.combinedScore).slice(0, topK);
}

/**
 * Seeds default university textbook and lecture notes if none exist in IndexedDB
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

  const sampleRawText1 = `# Capítulo 4: Electrodinámica Clásica y Ley de Faraday-Lenz
--- Page 12 ---
La inducción electromagnética relaciona la variación temporal del flujo magnético con la circulación del campo eléctrico inducido en un contorno cerrado.

Teorema 4.1: Ley de Faraday-Lenz
En todo circuito cerrado atravesado por un flujo magnético variable $\\Phi_B$, la fuerza electromotriz (fem) $\\mathcal{E}$ inducida es igual a la tasa de variación temporal negativa del flujo:
$$\\mathcal{E} = -\\frac{d\\Phi_B}{dt} = -\\frac{d}{dt} \\iint_S \\mathbf{B} \\cdot d\\mathbf{A}$$
Demostración:
A partir de la ecuación de Maxwell en forma diferencial:
$$\\nabla \\times \\mathbf{E} = -\\frac{\\partial \\mathbf{B}}{\\partial t}$$
Aplicando el Teorema de Stokes a una superficie abierta $S$ delimitada por la curva cerrada $C$:
$$\\oint_C \\mathbf{E} \\cdot d\\mathbf{l} = \\iint_S (\\nabla \\times \\mathbf{E}) \\cdot d\\mathbf{A} = -\\iint_S \\frac{\\partial \\mathbf{B}}{\\partial t} \\cdot d\\mathbf{A}$$
Por definición de potencial de circuito $\\mathcal{E} = \\oint_C \\mathbf{E} \\cdot d\\mathbf{l}$, queda demostrada la igualdad. Q.E.D. ■

El signo negativo impuesto por Heinrich Lenz obedece estrictamente a la conservación de la energía: las corrientes inducidas generan un campo magnético secundario que se opone al cambio del flujo original.

--- Page 18 ---
# Capítulo 5: Formalismo de la Mecánica Cuántica y Espacios de Hilbert
En mecánica cuántica, los estados físicos se representan mediante rayos en un espacio de Hilbert complejo separable $\\mathcal{H}$, y los observables físicos medibles corresponden a operadores lineales Hermíticos (autoadjuntos).

Definición 5.1: Operador Hermítico
Un operador lineal $\\hat{A}$ sobre $\\mathcal{H}$ es Hermítico o autoadjunto si coincide con su adjunto Hermítico:
$$\\langle \\phi | \\hat{A} \\psi \\rangle = \\langle \\hat{A} \\phi | \\psi \\rangle, \\quad \\forall |\\phi\\rangle, |\\psi\\rangle \\in \\mathcal{H}$$
lo que implica formalmente $\\hat{A} = \\hat{A}^\\dagger$.

Teorema 5.2: Realidad de los Autovalores Cuánticos
Todos los autovalores de un operador Hermítico son números estrictamente reales, y los autovectores correspondientes a autovalores distintos son mutuamente ortogonales:
$$\\hat{A} |a_n\\rangle = a_n |a_n\\rangle \\implies a_n \\in \\mathbb{R}$$
Demostración:
Multiplicando por la izquierda por el bra $\\langle a_n|$:
$$\\langle a_n | \\hat{A} | a_n \\rangle = a_n \\langle a_n | a_n \\rangle$$
Tomando el conjugado complejo y usando la propiedad de hermiticidad:
$$\\langle a_n | \\hat{A} | a_n \\rangle^* = a_n^* \\langle a_n | a_n \\rangle$$
Como $\\langle a_n | \\hat{A} | a_n \\rangle = \\langle \\hat{A} a_n | a_n \\rangle = \\langle a_n | \\hat{A} | a_n \\rangle^*$, se deduce $(a_n - a_n^*) \\|a_n\\|^2 = 0$. Dado que $|a_n\\rangle \\neq 0$, se concluye $a_n = a_n^*$, probando que $a_n \\in \\mathbb{R}$. Q.E.D. ■`;

  const source2: AcademicSourceRecord = {
    id: "src-algebra-spectral",
    subjectId: "algebra-lineal",
    professorId: "Dra. Emmy Noether",
    career: "Matemática / Ciencias de la Computación",
    year: 2026,
    semester: "1C",
    title: "Álgebra Lineal: Descomposición Espectral y Formas Canónicas",
    documentType: "lecture_notes",
    pageCount: 45,
    ocrProcessed: true,
    chunkCount: 5,
    createdAt: now,
  };

  const sampleRawText2 = `# Capítulo 3: Diagonalización y Teorema Espectral
--- Page 24 ---
Definición 3.1: Autovalores y Polinomio Característico
Sea $V$ un espacio vectorial sobre un cuerpo $\\mathbb{K}$ y $T: V \\to V$ una transformación lineal. Un escalar $\\lambda \\in \\mathbb{K}$ es autovalor si existe un vector no nulo $v \\in V$ tal que:
$$T(v) = \\lambda v \\iff (T - \\lambda I)v = 0$$
El conjunto de autovalores se determina por las raíces del polinomio característico:
$$p(\\lambda) = \\det(A - \\lambda I) = 0$$

Teorema 3.2: Teorema Espectral para Matrices Simétricas Reales
Toda matriz simétrica real $A = A^T \\in \\mathbb{R}^{n \\times n}$ es ortogonalmente diagonalizable. Existe una matriz ortogonal $Q$ ($Q^{-1} = Q^T$) y una matriz diagonal $\\Lambda$ tal que:
$$A = Q \\Lambda Q^T = \\sum_{i=1}^n \\lambda_i q_i q_i^T$$
donde los $\\lambda_i$ son autovalores reales y los $q_i$ forman una base ortonormal de $\\mathbb{R}^n$. ■`;

  const chunks1 = chunkAcademicText(source1.id, source1.subjectId, sampleRawText1, 12);
  const chunks2 = chunkAcademicText(source2.id, source2.subjectId, sampleRawText2, 24);

  await db.transaction("rw", [db.academicSources, db.academicChunks], async () => {
    await db.academicSources.add(source1);
    await db.academicSources.add(source2);
    await db.academicChunks.bulkAdd([...chunks1, ...chunks2]);
  });
}
