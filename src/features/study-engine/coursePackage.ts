import JSZip from "jszip";
import {
  db,
  type ConceptRecord,
  type ConceptEdgeRecord,
  type CardFsrsRecord,
  type FlashcardDeckRecord,
  type AcademicSourceRecord,
} from "../../db/db";

export interface CoursePackageManifest {
  schemaVersion: "5.0";
  exportedAt: number;
  subjectId: string;
  subjectName: string;
  description: string;
  copyrightNotice: string;
  counts: {
    concepts: number;
    edges: number;
    cards: number;
    sources: number;
  };
}

export interface ImportCoursePackageResult {
  manifest: CoursePackageManifest;
  importedConcepts: number;
  importedEdges: number;
  importedCards: number;
  importedSources: number;
}

/**
 * Exporta una materia completa como Paquete de Cátedra (.zip) para circulación libre entre estudiantes.
 * Cumple con la regla de derechos de autor de la Sección 32-BIS.B:
 * - Se exportan grafos, prerrequisitos, flashcards limpias de telemetría y metadatos de fuentes.
 * - Los binarios PDF se excluyen por defecto; cada estudiante aporta su propio ejemplar del libro.
 */
export async function exportCoursePackage(
  subjectId: string,
  subjectName: string,
): Promise<Blob> {
  const zip = new JSZip();

  // 1. Conceptos y Aristas del Grafo
  const concepts = await db.concepts.toArray();
  const edges = await db.conceptEdges.toArray();

  // 2. Tarjetas Flashcards / FSRS de la materia (limpias de historial personal)
  const decks = await db.flashcardDecks.where("subjectFolderId").equals(subjectId).toArray();
  const deckIds = new Set(decks.map((d) => d.id));

  const allFsrs = await db.cardsFsrs.toArray();
  const subjectFsrs = allFsrs.filter((c) => deckIds.has(c.deckId));

  // Limpiar telemetría personal de las tarjetas para que el receptor comience fresco
  const sanitizedFsrsCards = subjectFsrs.map((c) => ({
    id: c.id,
    deckId: c.deckId,
    conceptId: c.conceptId,
    front: c.front,
    back: c.back,
    state: "new" as const,
    stability: 2.0,
    difficulty: 5.0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    dueDate: Date.now(),
    halfLife: 2.0,
    createdAt: Date.now(),
  }));

  // 3. Metadatos de Fuentes Académicas (Citas de cátedra, sin archivos binarios)
  const sources = await db.academicSources.where("subjectId").equals(subjectId).toArray();
  const sanitizedSources = sources.map((s) => ({
    id: s.id,
    subjectId: s.subjectId,
    title: s.title,
    career: s.career,
    year: s.year,
    semester: s.semester,
    documentType: s.documentType,
    pageCount: s.pageCount,
    chunkCount: s.chunkCount,
    createdAt: s.createdAt,
    // Se omite fileId deliberadamente
  }));

  // 4. Manifiesto
  const manifest: CoursePackageManifest = {
    schemaVersion: "5.0",
    exportedAt: Date.now(),
    subjectId,
    subjectName,
    description: `Paquete de cátedra para "${subjectName}" generado por StudyLab CognitiveOS.`,
    copyrightNotice:
      "Aviso de Cátedra: Los libros y apuntes con derechos de autor se referencian por metadatos (título, autor, páginas); cada estudiante aporta su propio ejemplar.",
    counts: {
      concepts: concepts.length,
      edges: edges.length,
      cards: sanitizedFsrsCards.length,
      sources: sanitizedSources.length,
    },
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));
  zip.file("concepts.json", JSON.stringify(concepts, null, 2));
  zip.file("concept-edges.json", JSON.stringify(edges, null, 2));
  zip.file("decks.json", JSON.stringify(decks, null, 2));
  zip.file("cards-fsrs.json", JSON.stringify(sanitizedFsrsCards, null, 2));
  zip.file("sources-metadata.json", JSON.stringify(sanitizedSources, null, 2));

  return await zip.generateAsync({ type: "blob" });
}

/**
 * Importa un paquete de cátedra (.zip) e inserta sus conceptos, grafo y tarjetas en Dexie.
 */
export async function importCoursePackage(zipBlob: Blob): Promise<ImportCoursePackageResult> {
  const zip = await JSZip.loadAsync(zipBlob);

  const manifestFile = zip.file("manifest.json");
  if (!manifestFile) {
    throw new Error("El archivo .zip no es un paquete de cátedra válido de StudyLab (falta manifest.json).");
  }

  const manifestText = await manifestFile.async("string");
  const manifest: CoursePackageManifest = JSON.parse(manifestText);

  // Leer archivos JSON
  const conceptsFile = zip.file("concepts.json");
  const edgesFile = zip.file("concept-edges.json");
  const decksFile = zip.file("decks.json");
  const cardsFile = zip.file("cards-fsrs.json");
  const sourcesFile = zip.file("sources-metadata.json");

  const concepts: ConceptRecord[] = conceptsFile ? JSON.parse(await conceptsFile.async("string")) : [];
  const edges: ConceptEdgeRecord[] = edgesFile ? JSON.parse(await edgesFile.async("string")) : [];
  const decks: FlashcardDeckRecord[] = decksFile ? JSON.parse(await decksFile.async("string")) : [];
  const cards: CardFsrsRecord[] = cardsFile ? JSON.parse(await cardsFile.async("string")) : [];
  const sources: AcademicSourceRecord[] = sourcesFile ? JSON.parse(await sourcesFile.async("string")) : [];

  let importedConcepts = 0;
  let importedEdges = 0;
  let importedCards = 0;
  let importedSources = 0;

  await db.transaction("rw", [db.concepts, db.conceptEdges, db.flashcardDecks, db.cardsFsrs, db.academicSources], async () => {
    for (const c of concepts) {
      await db.concepts.put(c);
      importedConcepts++;
    }
    for (const e of edges) {
      await db.conceptEdges.put(e);
      importedEdges++;
    }
    for (const d of decks) {
      await db.flashcardDecks.put(d);
    }
    for (const card of cards) {
      await db.cardsFsrs.put(card);
      importedCards++;
    }
    for (const s of sources) {
      await db.academicSources.put(s);
      importedSources++;
    }
  });

  return {
    manifest,
    importedConcepts,
    importedEdges,
    importedCards,
    importedSources,
  };
}
