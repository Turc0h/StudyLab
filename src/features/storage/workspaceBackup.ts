import JSZip from "jszip";
import { db } from "../../db/db";
import { storeFileBlob } from "./fileStorage";

export interface BackupManifest {
  app: "StudyLab";
  version: "5.12";
  format: "studylab-bundle";
  timestamp: number;
  totalFiles: number;
  sha256Checksum: string;
  dexieSchemaVersion: number;
  tableCounts: Record<string, number>;
}

export interface BackupInspectionResult {
  manifest: BackupManifest;
  isValid: boolean;
  checksumValid: boolean;
  stats: {
    fileCount: number;
    cardCount: number;
    studySessionCount: number;
    projectCount: number;
    totalTables: number;
  };
  error?: string;
}

/**
 * Calcula el hash criptográfico SHA-256 de una cadena de texto en hexadecimal.
 */
export async function computeSha256(text: string): Promise<string> {
  const enc = new TextEncoder();
  const buffer = enc.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Exporta el espacio de trabajo completo de StudyLab a un paquete portable .studylab-bundle (formato zip con SHA-256).
 * Incluye las 28 tablas de Dexie, documentos binarios, sesiones de los 30 métodos y Context Engine.
 */
export async function exportWorkspaceToZip(onProgress?: (msg: string, pct: number) => void): Promise<Blob> {
  onProgress?.("Recopilando todas las tablas de la base de datos...", 10);
  const zip = new JSZip();

  // 1. Export all 28 tables to JSON
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
    studySessions,
    studyMethods,
    contextProjects,
    contextProjectDocs,
    contextEvents,
    energyLogs,
    textIntakes,
    fatigueTelemetry,
    contextTimeBlocks,
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
    (db as any).studySessions ? (db as any).studySessions.toArray() : Promise.resolve([]),
    db.studyMethods ? db.studyMethods.toArray() : Promise.resolve([]),
    db.contextProjects ? db.contextProjects.toArray() : Promise.resolve([]),
    (db as any).contextProjectDocs ? (db as any).contextProjectDocs.toArray() : Promise.resolve([]),
    (db as any).contextEvents ? (db as any).contextEvents.toArray() : Promise.resolve([]),
    (db as any).energyLogs ? (db as any).energyLogs.toArray() : Promise.resolve([]),
    (db as any).textIntakes ? (db as any).textIntakes.toArray() : Promise.resolve([]),
    db.fatigueTelemetry ? db.fatigueTelemetry.toArray() : Promise.resolve([]),
    db.contextTimeBlocks ? db.contextTimeBlocks.toArray() : Promise.resolve([]),
  ]);

  const databaseData = {
    folders,
    files: (files as any[]).map((f) => ({ ...f, blob: undefined })), // Omit blob from json, saved in files/
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
    studySessions,
    studyMethods,
    contextProjects,
    contextProjectDocs,
    contextEvents,
    energyLogs,
    textIntakes,
    fatigueTelemetry,
    contextTimeBlocks,
  };

  const dbJson = JSON.stringify(databaseData, null, 2);
  const sha256Checksum = await computeSha256(dbJson);

  zip.file("studylab_db.json", dbJson);

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

  // 3. Manifest metadata with cryptographic signature
  const manifest: BackupManifest = {
    app: "StudyLab",
    version: "5.12",
    format: "studylab-bundle",
    timestamp: Date.now(),
    totalFiles: files.length,
    sha256Checksum,
    dexieSchemaVersion: 6,
    tableCounts: {
      folders: folders.length,
      files: files.length,
      cardsFsrs: cardsFsrs.length,
      reviewLogs: reviewLogs.length,
      concepts: concepts.length,
      academicSources: academicSources.length,
      academicChunks: academicChunks.length,
      studySessions: studySessions.length,
      studyMethods: studyMethods.length,
      contextProjects: contextProjects.length,
      contextEvents: contextEvents.length,
      energyLogs: energyLogs.length,
    },
  };

  zip.file("studylab_manifest.json", JSON.stringify(manifest, null, 2));

  onProgress?.("Generando archivo portable final...", 85);
  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  onProgress?.("¡Exportación completada con éxito!", 100);

  return zipBlob;
}

/**
 * Inspecciona un archivo .studylab-bundle o .zip sin realizar modificaciones en la base de datos local.
 * Verifica la firma criptográfica SHA-256 y extrae estadísticas previas.
 */
export async function inspectBackupBundle(bundleFile: File | Blob): Promise<BackupInspectionResult> {
  try {
    const zip = await JSZip.loadAsync(bundleFile);

    const manifestFile = zip.file("studylab_manifest.json");
    if (!manifestFile) {
      return {
        manifest: null as any,
        isValid: false,
        checksumValid: false,
        stats: { fileCount: 0, cardCount: 0, studySessionCount: 0, projectCount: 0, totalTables: 0 },
        error: "El archivo no contiene studylab_manifest.json válido.",
      };
    }

    const manifest: BackupManifest = JSON.parse(await manifestFile.async("string"));
    const dbFile = zip.file("studylab_db.json");

    if (!dbFile) {
      return {
        manifest,
        isValid: false,
        checksumValid: false,
        stats: { fileCount: 0, cardCount: 0, studySessionCount: 0, projectCount: 0, totalTables: 0 },
        error: "Falta el archivo studylab_db.json dentro del paquete.",
      };
    }

    const dbContent = await dbFile.async("string");
    let checksumValid = true;

    if (manifest.sha256Checksum) {
      const calculatedHash = await computeSha256(dbContent);
      checksumValid = calculatedHash === manifest.sha256Checksum;
    }

    const dbData = JSON.parse(dbContent);
    const totalTables = Object.keys(dbData).length;

    return {
      manifest,
      isValid: true,
      checksumValid,
      stats: {
        fileCount: dbData.files?.length || 0,
        cardCount: (dbData.cardsFsrs?.length || 0) + (dbData.flashcards?.length || 0),
        studySessionCount: (dbData.studySessions?.length || 0) + (dbData.sessions?.length || 0),
        projectCount: dbData.contextProjects?.length || 0,
        totalTables,
      },
    };
  } catch (err: any) {
    return {
      manifest: null as any,
      isValid: false,
      checksumValid: false,
      stats: { fileCount: 0, cardCount: 0, studySessionCount: 0, projectCount: 0, totalTables: 0 },
      error: err.message || "Error al descomprimir el archivo de respaldo.",
    };
  }
}

/**
 * Importa y restaura el espacio de trabajo completo desde un archivo .studylab-bundle o .zip.
 * Vierte con seguridad las 28 tablas y reconstruye los binarios en IndexedDB.
 */
export async function importWorkspaceFromZip(
  zipFile: File | Blob,
  onProgress?: (msg: string, pct: number) => void,
): Promise<BackupManifest> {
  onProgress?.("Leyendo archivo de respaldo...", 10);
  const zip = await JSZip.loadAsync(zipFile);

  const manifestFile = zip.file("studylab_manifest.json");
  if (!manifestFile) {
    throw new Error("El archivo no es un respaldo válido de StudyLab (falta manifest).");
  }

  const manifest: BackupManifest = JSON.parse(await manifestFile.async("string"));
  onProgress?.("Validando integridad de la base de datos...", 20);

  const dbFile = zip.file("studylab_db.json");
  if (!dbFile) {
    throw new Error("No se encontraron los datos de la base de datos en el respaldo.");
  }

  const dbText = await dbFile.async("string");

  // Validar checksum SHA-256 si está presente en el manifiesto
  if (manifest.sha256Checksum) {
    const hash = await computeSha256(dbText);
    if (hash !== manifest.sha256Checksum) {
      throw new Error("Fallo de integridad criptográfica: el archivo studylab_db.json ha sido alterado o está corrupto.");
    }
  }

  const dbData = JSON.parse(dbText);
  onProgress?.("Restaurando tablas del sistema...", 35);

  // Restore all tables safely
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

  // Restore new v5 tables
  const anyDb = db as any;
  if (dbData.studySessions?.length && anyDb.studySessions) await anyDb.studySessions.bulkPut(dbData.studySessions);
  if (dbData.studyMethods?.length && db.studyMethods) await db.studyMethods.bulkPut(dbData.studyMethods);
  if (dbData.contextProjects?.length && db.contextProjects) await db.contextProjects.bulkPut(dbData.contextProjects);
  if (dbData.contextProjectDocs?.length && anyDb.contextProjectDocs) await anyDb.contextProjectDocs.bulkPut(dbData.contextProjectDocs);
  if (dbData.contextEvents?.length && anyDb.contextEvents) await anyDb.contextEvents.bulkPut(dbData.contextEvents);
  if (dbData.energyLogs?.length && anyDb.energyLogs) await anyDb.energyLogs.bulkPut(dbData.energyLogs);
  if (dbData.textIntakes?.length && anyDb.textIntakes) await anyDb.textIntakes.bulkPut(dbData.textIntakes);
  if (dbData.fatigueTelemetry?.length && db.fatigueTelemetry) await db.fatigueTelemetry.bulkPut(dbData.fatigueTelemetry);
  if (dbData.contextTimeBlocks?.length && db.contextTimeBlocks) await db.contextTimeBlocks.bulkPut(dbData.contextTimeBlocks);

  // Restore file records and extract blobs
  const fileRecords = dbData.files || [];
  onProgress?.("Restaurando archivos PDF y documentos binarios...", 60);

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

  onProgress?.("¡Espacio de trabajo restaurado al 100% con éxito!", 100);
  return manifest;
}
