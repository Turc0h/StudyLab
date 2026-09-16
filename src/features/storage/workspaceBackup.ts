import JSZip from "jszip";
import { db } from "../../db/db";
import { storeFileBlob } from "./fileStorage";

export interface BackupManifest {
  app: "StudyLab";
  version: "5.0";
  timestamp: number;
  totalFiles: number;
  tableCounts: Record<string, number>;
}

/**
 * Exports the entire StudyLab workspace into a portable .zip package.
 */
export async function exportWorkspaceToZip(onProgress?: (msg: string, pct: number) => void): Promise<Blob> {
  onProgress?.("Recopilando base de datos...", 10);
  const zip = new JSZip();

  // 1. Export tables to JSON
  const [
    folders,
    files,
    highlights,
    postits,
    sessions,
    deadlines,
    reviewSchedule,
    flashcards,
    flashcardDecks,
    ocrPages,
    cardsFsrs,
    reviewLogs,
    concepts,
    conceptEdges,
    workspaceConfigs,
    academicSources,
    academicChunks,
    academicEvaluations,
    workspaceState,
    studentErrors,
    examPlans,
  ] = await Promise.all([
    db.folders.toArray(),
    db.files.toArray(),
    db.highlights.toArray(),
    db.postits.toArray(),
    db.sessions.toArray(),
    db.deadlines.toArray(),
    db.reviewSchedule.toArray(),
    db.flashcards.toArray(),
    db.flashcardDecks.toArray(),
    db.ocrPages.toArray(),
    db.cardsFsrs.toArray(),
    db.reviewLogs.toArray(),
    db.concepts.toArray(),
    db.conceptEdges.toArray(),
    db.workspaceConfigs.toArray(),
    db.academicSources.toArray(),
    db.academicChunks.toArray(),
    db.academicEvaluations.toArray(),
    db.workspaceState.toArray(),
    db.studentErrors.toArray(),
    db.examPlans.toArray(),
  ]);

  const databaseData = {
    folders,
    files: files.map((f) => ({ ...f, blob: undefined })), // Omit blob from json, saved in files/
    highlights,
    postits,
    sessions,
    deadlines,
    reviewSchedule,
    flashcards,
    flashcardDecks,
    ocrPages,
    cardsFsrs,
    reviewLogs,
    concepts,
    conceptEdges,
    workspaceConfigs,
    academicSources,
    academicChunks,
    academicEvaluations,
    workspaceState,
    studentErrors,
    examPlans,
  };

  zip.file("studylab_db.json", JSON.stringify(databaseData, null, 2));

  // 2. Package binary file blobs
  onProgress?.("Empaquetando documentos PDF binarios...", 30);
  const filesFolder = zip.folder("files");

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    if (f.blob && filesFolder) {
      filesFolder.file(`${f.id}.bin`, f.blob);
    }
    const pct = 30 + Math.round(((i + 1) / Math.max(1, files.length)) * 40);
    onProgress?.(`Comprimiendo archivo ${i + 1}/${files.length}...`, pct);
  }

  // 3. Manifest metadata
  const manifest: BackupManifest = {
    app: "StudyLab",
    version: "5.0",
    timestamp: Date.now(),
    totalFiles: files.length,
    tableCounts: {
      folders: folders.length,
      files: files.length,
      cardsFsrs: cardsFsrs.length,
      reviewLogs: reviewLogs.length,
      concepts: concepts.length,
      academicSources: academicSources.length,
      academicChunks: academicChunks.length,
    },
  };

  zip.file("studylab_manifest.json", JSON.stringify(manifest, null, 2));

  onProgress?.("Generando archivo comprimido .zip final...", 85);
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  onProgress?.("¡Exportación completada con éxito!", 100);

  return zipBlob;
}

/**
 * Imports and restores an entire StudyLab workspace from a .zip backup.
 */
export async function importWorkspaceFromZip(
  zipFile: File | Blob,
  onProgress?: (msg: string, pct: number) => void,
): Promise<BackupManifest> {
  onProgress?.("Leyendo archivo zip de respaldo...", 10);
  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("studylab_manifest.json");
  if (!manifestFile) {
    throw new Error("El archivo no es un respaldo válido de StudyLab (falta manifest).");
  }

  const manifest: BackupManifest = JSON.parse(await manifestFile.async("string"));
  onProgress?.("Restaurando datos estructurados...", 30);

  const dbFile = zip.file("studylab_db.json");
  if (!dbFile) {
    throw new Error("No se encontraron los datos de la base de datos en el respaldo.");
  }

  const dbData = JSON.parse(await dbFile.async("string"));

  // Restore tables safely
  if (dbData.folders?.length) await db.folders.bulkPut(dbData.folders);
  if (dbData.highlights?.length) await db.highlights.bulkPut(dbData.highlights);
  if (dbData.postits?.length) await db.postits.bulkPut(dbData.postits);
  if (dbData.sessions?.length) await db.sessions.bulkPut(dbData.sessions);
  if (dbData.deadlines?.length) await db.deadlines.bulkPut(dbData.deadlines);
  if (dbData.reviewSchedule?.length) await db.reviewSchedule.bulkPut(dbData.reviewSchedule);
  if (dbData.flashcards?.length) await db.flashcards.bulkPut(dbData.flashcards);
  if (dbData.flashcardDecks?.length) await db.flashcardDecks.bulkPut(dbData.flashcardDecks);
  if (dbData.ocrPages?.length) await db.ocrPages.bulkPut(dbData.ocrPages);
  if (dbData.cardsFsrs?.length) await db.cardsFsrs.bulkPut(dbData.cardsFsrs);
  if (dbData.reviewLogs?.length) await db.reviewLogs.bulkPut(dbData.reviewLogs);
  if (dbData.concepts?.length) await db.concepts.bulkPut(dbData.concepts);
  if (dbData.conceptEdges?.length) await db.conceptEdges.bulkPut(dbData.conceptEdges);
  if (dbData.workspaceConfigs?.length) await db.workspaceConfigs.bulkPut(dbData.workspaceConfigs);
  if (dbData.academicSources?.length) await db.academicSources.bulkPut(dbData.academicSources);
  if (dbData.academicChunks?.length) await db.academicChunks.bulkPut(dbData.academicChunks);
  if (dbData.academicEvaluations?.length) await db.academicEvaluations.bulkPut(dbData.academicEvaluations);
  if (dbData.workspaceState?.length) await db.workspaceState.bulkPut(dbData.workspaceState);
  if (dbData.studentErrors?.length) await db.studentErrors.bulkPut(dbData.studentErrors);
  if (dbData.examPlans?.length) await db.examPlans.bulkPut(dbData.examPlans);

  // Restore file records and extract blobs
  const fileRecords = dbData.files || [];
  onProgress?.("Restaurando archivos PDF y documentos...", 60);

  for (let i = 0; i < fileRecords.length; i++) {
    const f = fileRecords[i];
    const blobEntry = zip.file(`files/${f.id}.bin`);
    let fileBlob: Blob | undefined;

    if (blobEntry) {
      const buffer = await blobEntry.async("arraybuffer");
      fileBlob = new Blob([buffer], { type: f.mimeType || "application/pdf" });
    }

    await db.files.put({
      ...f,
      blob: fileBlob || new Blob(),
    });

    if (fileBlob) {
      await storeFileBlob(f.id, fileBlob);
    }

    const pct = 60 + Math.round(((i + 1) / Math.max(1, fileRecords.length)) * 35);
    onProgress?.(`Restaurando archivo ${i + 1}/${fileRecords.length}...`, pct);
  }

  onProgress?.("¡Workspace restaurado con éxito!", 100);
  return manifest;
}
