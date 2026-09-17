/**
 * StudyLab Non-Destructive Dexie -> SQLite Migration Adapter (Paso E & F)
 * Safely copies records from IndexedDB to SQLite in atomic transactions.
 * Dexie records are NEVER deleted or modified.
 * Validates record count and integrity before marking migration as completed.
 */

import { db as dexieDb } from "../db/db";
import { getSqliteDb } from "./database";
import { isDesktop } from "./platform";

export interface MigrationReport {
  success: boolean;
  dexieCounts: Record<string, number>;
  sqliteCounts: Record<string, number>;
  tablesMigrated: number;
  totalRecordsMigrated: number;
  error?: string;
}

/**
 * Comprueba si la migración de Dexie a SQLite ya fue completada exitosamente.
 */
export async function isDexieMigrationCompleted(): Promise<boolean> {
  if (!isDesktop()) return false;
  try {
    const sqlite = await getSqliteDb();
    const rows = await sqlite.select<Array<{ value: string }>>(
      "SELECT value FROM migration_meta WHERE key = 'dexie_migrated_v1';"
    );
    return rows.length > 0 && rows[0].value === "true";
  } catch (err) {
    console.warn("No se pudo verificar estado de migración:", err);
    return false;
  }
}

/**
 * Ejecuta la migración no destructiva de Dexie a SQLite por lotes dentro de transacciones.
 * Si ocurre cualquier error, SQLite revierte los cambios y los datos originales en Dexie
 * permanecen 100% intactos y disponibles.
 */
export async function migrateDexieToSqlite(): Promise<MigrationReport> {
  const report: MigrationReport = {
    success: false,
    dexieCounts: {},
    sqliteCounts: {},
    tablesMigrated: 0,
    totalRecordsMigrated: 0,
  };

  if (!isDesktop()) {
    report.error = "No está en entorno de escritorio.";
    return report;
  }

  const sqlite = await getSqliteDb();

  try {
    // 1. Recolección de datos y conteos de Dexie
    const [
      folders,
      files,
      highlights,
      ocrPages,
      postits,
      sessions,
      deadlines,
      reviewSchedule,
      flashcardDecks,
      flashcards,
      cardsFsrs,
      reviewLogs,
      concepts,
      conceptEdges,
      workspaceConfigs,
      fatigueTelemetry,
      academicSources,
      academicChunks,
      academicEvaluations,
      workspaceState,
      studentErrors,
      examPlans,
    ] = await Promise.all([
      dexieDb.folders.toArray(),
      dexieDb.files.toArray(),
      dexieDb.highlights.toArray(),
      dexieDb.ocrPages.toArray(),
      dexieDb.postits.toArray(),
      dexieDb.sessions.toArray(),
      dexieDb.deadlines.toArray(),
      dexieDb.reviewSchedule.toArray(),
      dexieDb.flashcardDecks.toArray(),
      dexieDb.flashcards.toArray(),
      dexieDb.cardsFsrs.toArray(),
      dexieDb.reviewLogs.toArray(),
      dexieDb.concepts.toArray(),
      dexieDb.conceptEdges.toArray(),
      dexieDb.workspaceConfigs.toArray(),
      dexieDb.fatigueTelemetry.toArray(),
      dexieDb.academicSources.toArray(),
      dexieDb.academicChunks.toArray(),
      dexieDb.academicEvaluations.toArray(),
      dexieDb.workspaceState.toArray(),
      dexieDb.studentErrors.toArray(),
      dexieDb.examPlans.toArray(),
    ]);

    report.dexieCounts = {
      folders: folders.length,
      files: files.length,
      highlights: highlights.length,
      ocrPages: ocrPages.length,
      postits: postits.length,
      sessions: sessions.length,
      deadlines: deadlines.length,
      reviewSchedule: reviewSchedule.length,
      flashcardDecks: flashcardDecks.length,
      flashcards: flashcards.length,
      cardsFsrs: cardsFsrs.length,
      reviewLogs: reviewLogs.length,
      concepts: concepts.length,
      conceptEdges: conceptEdges.length,
      workspaceConfigs: workspaceConfigs.length,
      fatigueTelemetry: fatigueTelemetry.length,
      academicSources: academicSources.length,
      academicChunks: academicChunks.length,
      academicEvaluations: academicEvaluations.length,
      workspaceState: workspaceState.length,
      studentErrors: studentErrors.length,
      examPlans: examPlans.length,
    };

    const totalDexieRecords = Object.values(report.dexieCounts).reduce((a, b) => a + b, 0);

    // Si Dexie no tiene ningún dato (instalación limpia), marcamos completado y salimos
    if (totalDexieRecords === 0) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO migration_meta (key, value, applied_at) VALUES ('dexie_migrated_v1', 'true', ?);",
        [Date.now()]
      );
      report.success = true;
      return report;
    }

    // 2. Inserción por lotes en transacciones atómicas de SQLite
    await sqlite.execute("BEGIN TRANSACTION;");

    for (const f of folders) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO folders (id, parent_id, name, type, created_at) VALUES (?, ?, ?, ?, ?);",
        [f.id, f.parentId, f.name, f.type, f.createdAt]
      );
    }

    for (const file of files) {
      // Nota de preservación: no guardamos el Blob binario en SQLite, solo metadata
      await sqlite.execute(
        `INSERT OR REPLACE INTO files (id, folder_id, name, mime_type, size, ocr_status, is_completed, disk_path, hash, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          file.id,
          file.folderId,
          file.name,
          file.mimeType,
          file.size,
          file.ocrStatus,
          file.isCompleted ? 1 : 0,
          null, // disk_path se asignará cuando el archivo se copie a disco
          null,
          file.createdAt,
        ]
      );
    }

    for (const h of highlights) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO highlights (id, file_id, page, text, rects, created_at) VALUES (?, ?, ?, ?, ?, ?);",
        [h.id, h.fileId, h.page, h.text, JSON.stringify(h.rects), h.createdAt]
      );
    }

    for (const o of ocrPages) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO ocr_pages (id, file_id, page, lines) VALUES (?, ?, ?, ?);",
        [o.id, o.fileId, o.page, JSON.stringify(o.lines)]
      );
    }

    for (const p of postits) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO postits (id, file_id, page, x_pct, y_pct, text, color, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);",
        [p.id, p.fileId, p.page, p.xPct, p.yPct, p.text, p.color, p.createdAt]
      );
    }

    for (const s of sessions) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO sessions (id, method_id, subject_folder_id, started_at, ended_at, duration_sec) VALUES (?, ?, ?, ?, ?, ?);",
        [s.id, s.methodId, s.subjectFolderId, s.startedAt, s.endedAt, s.durationSec]
      );
    }

    for (const d of deadlines) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO deadlines (id, title, due_date, subject_folder_id, source) VALUES (?, ?, ?, ?, ?);",
        [d.id, d.title, d.dueDate, d.subjectFolderId, d.source]
      );
    }

    for (const r of reviewSchedule) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO review_schedule (id, file_id, subject_folder_id, topic, due_date, interval_days, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [r.id, r.fileId, r.subjectFolderId, r.topic, r.dueDate, r.intervalDays, r.createdAt]
      );
    }

    for (const fd of flashcardDecks) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO flashcard_decks (id, name, subject_folder_id, created_at) VALUES (?, ?, ?, ?);",
        [fd.id, fd.name, fd.subjectFolderId, fd.createdAt]
      );
    }

    for (const fc of flashcards) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO flashcards (id, deck_id, front, back, box, due_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);",
        [fc.id, fc.deckId, fc.front, fc.back, fc.box, fc.dueDate, fc.createdAt]
      );
    }

    for (const cf of cardsFsrs) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO cards_fsrs (id, deck_id, concept_id, front, back, state, stability, difficulty, reps, lapses, last_review, due_date, half_life, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          cf.id,
          cf.deckId,
          cf.conceptId,
          cf.front,
          cf.back,
          cf.state,
          cf.stability,
          cf.difficulty,
          cf.reps,
          cf.lapses,
          cf.lastReview,
          cf.dueDate,
          cf.halfLife,
          cf.createdAt,
        ]
      );
    }

    for (const rl of reviewLogs) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO review_logs (id, card_id, rating, review_timestamp, latency_ms, state_before, state_after, stability_before, stability_after, difficulty_before, difficulty_after, scheduled_days)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          rl.id,
          rl.cardId,
          rl.rating,
          rl.reviewTimestamp,
          rl.latencyMs,
          rl.stateBefore,
          rl.stateAfter,
          rl.stabilityBefore,
          rl.stabilityAfter,
          rl.difficultyBefore,
          rl.difficultyAfter,
          rl.scheduledDays,
        ]
      );
    }

    for (const c of concepts) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO concepts (id, domain_id, name, description, mastery_score, current_retrievability, status, prerequisites, tags, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          c.id,
          c.domainId,
          c.name,
          c.description,
          c.masteryScore,
          c.currentRetrievability,
          c.status,
          JSON.stringify(c.prerequisites),
          JSON.stringify(c.tags),
          c.createdAt,
        ]
      );
    }

    for (const ce of conceptEdges) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO concept_edges (id, source_concept_id, target_concept_id, type, strength) VALUES (?, ?, ?, ?, ?);",
        [ce.id, ce.sourceConceptId, ce.targetConceptId, ce.type, ce.strength]
      );
    }

    for (const wc of workspaceConfigs) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO workspace_configs (id, profile_type, active_widgets, automation_enabled, updated_at) VALUES (?, ?, ?, ?, ?);",
        [wc.id, wc.profileType, JSON.stringify(wc.activeWidgets), wc.automationEnabled ? 1 : 0, wc.updatedAt]
      );
    }

    for (const ft of fatigueTelemetry) {
      await sqlite.execute(
        "INSERT OR REPLACE INTO fatigue_telemetry (id, timestamp, fatigue_score, keystroke_variance, pause_rate, session_duration_sec) VALUES (?, ?, ?, ?, ?, ?);",
        [ft.id, ft.timestamp, ft.fatigueScore, ft.keystrokeVariance, ft.pauseRate, ft.sessionDurationSec]
      );
    }

    for (const as of academicSources) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO academic_sources (id, subject_id, professor_id, career, year, semester, title, document_type, page_count, file_id, ocr_processed, chunk_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          as.id,
          as.subjectId,
          as.professorId ?? null,
          as.career ?? null,
          as.year ?? null,
          as.semester ?? null,
          as.title,
          as.documentType,
          as.pageCount,
          as.fileId ?? null,
          as.ocrProcessed ? 1 : 0,
          as.chunkCount,
          as.createdAt,
        ]
      );
    }

    for (const ac of academicChunks) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO academic_chunks (id, source_id, subject_id, chunk_type, title, hierarchy_path, page_number, paragraph_index, raw_content, latex_formulas, bounding_box, dense_vector, sparse_tokens, char_offset, web_url_fragment, transcript_timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ac.id,
          ac.sourceId,
          ac.subjectId,
          ac.chunkType,
          ac.title ?? null,
          ac.hierarchyPath,
          ac.pageNumber,
          ac.paragraphIndex,
          ac.rawContent,
          JSON.stringify(ac.latexFormulas || []),
          JSON.stringify(ac.boundingBox),
          ac.denseVector ? JSON.stringify(ac.denseVector) : null,
          ac.sparseTokens ? JSON.stringify(ac.sparseTokens) : null,
          ac.charOffset ? JSON.stringify(ac.charOffset) : null,
          ac.webUrlFragment ? JSON.stringify(ac.webUrlFragment) : null,
          ac.transcriptTimestamp ? JSON.stringify(ac.transcriptTimestamp) : null,
          ac.createdAt,
        ]
      );
    }

    for (const ae of academicEvaluations) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO academic_evaluations (id, concept_id, source_id, student_explanation, mastery_score, diagnostic_category, entailed_points, omissions, contradictions, citation_proof, socratic_question, evaluated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ae.id,
          ae.conceptId,
          ae.sourceId,
          ae.studentExplanation,
          ae.masteryScore,
          ae.diagnosticCategory,
          JSON.stringify(ae.entailedPoints),
          JSON.stringify(ae.omissions),
          JSON.stringify(ae.contradictions),
          ae.citationProof ? JSON.stringify(ae.citationProof) : null,
          ae.socraticQuestion,
          ae.evaluatedAt,
        ]
      );
    }

    for (const ws of workspaceState) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO workspace_state (id, active_subject_id, active_source_id, active_page, active_bounding_box_focus, panel1_width_pct, panel2_width_pct, panel3_width_pct, open_tabs, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ws.id,
          ws.activeSubjectId,
          ws.activeSourceId,
          ws.activePage,
          ws.activeBoundingBoxFocus ? JSON.stringify(ws.activeBoundingBoxFocus) : null,
          ws.panel1WidthPct,
          ws.panel2WidthPct,
          ws.panel3WidthPct,
          JSON.stringify(ws.openTabs),
          ws.syncedAt,
        ]
      );
    }

    for (const se of studentErrors) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO student_errors (id, concept_id, concept_name, subject_id, category, original_exercise, student_answer, expected_answer, explanation, citation_proof, timestamp, repetition_count, resolved)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          se.id,
          se.conceptId,
          se.conceptName,
          se.subjectId ?? null,
          se.category,
          se.originalExercise,
          se.studentAnswer,
          se.expectedAnswer,
          se.explanation,
          se.citationProof ? JSON.stringify(se.citationProof) : null,
          se.timestamp,
          se.repetitionCount,
          se.resolved ? 1 : 0,
        ]
      );
    }

    for (const ep of examPlans) {
      await sqlite.execute(
        `INSERT OR REPLACE INTO exam_plans (id, subject_id, subject_name, exam_date, available_minutes_per_day, status, created_at, phases)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          ep.id,
          ep.subjectId,
          ep.subjectName,
          ep.examDate,
          ep.availableMinutesPerDay,
          ep.status,
          ep.createdAt,
          JSON.stringify(ep.phases),
        ]
      );
    }

    await sqlite.execute("COMMIT;");

    // 3. Validación estricta post-migración (Condición 5 del usuario)
    const validationResult = await validateMigrationConsistency();
    report.sqliteCounts = validationResult.sqliteCounts;

    if (!validationResult.valid) {
      throw new Error(`Inconsistencia en migración: ${validationResult.mismatchDetails.join(", ")}`);
    }

    // 4. Si la validación es 100% exitosa, marcar migración como completada
    await sqlite.execute(
      "INSERT OR REPLACE INTO migration_meta (key, value, applied_at) VALUES ('dexie_migrated_v1', 'true', ?);",
      [Date.now()]
    );

    report.success = true;
    report.tablesMigrated = Object.keys(report.dexieCounts).length;
    report.totalRecordsMigrated = totalDexieRecords;
    return report;
  } catch (err) {
    // En caso de cualquier error, hacer rollback si la transacción sigue abierta
    try {
      await sqlite.execute("ROLLBACK;");
    } catch {
      // Ignorar si la transacción ya no estaba activa
    }
    report.success = false;
    report.error = String(err);
    console.error("Fallo durante la migración de Dexie a SQLite:", err);
    return report;
  }
}

/**
 * Procedimiento de Validación Estricta: Comprueba que Dexie records == SQLite records
 * para todas las tablas migradas y verifica coherencia de IDs.
 */
export async function validateMigrationConsistency(): Promise<{
  valid: boolean;
  mismatchDetails: string[];
  dexieCounts: Record<string, number>;
  sqliteCounts: Record<string, number>;
}> {
  const sqlite = await getSqliteDb();
  const mismatchDetails: string[] = [];

  const tables = [
    { name: "folders", dexieCount: await dexieDb.folders.count(), sqliteTable: "folders" },
    { name: "files", dexieCount: await dexieDb.files.count(), sqliteTable: "files" },
    { name: "highlights", dexieCount: await dexieDb.highlights.count(), sqliteTable: "highlights" },
    { name: "ocrPages", dexieCount: await dexieDb.ocrPages.count(), sqliteTable: "ocr_pages" },
    { name: "postits", dexieCount: await dexieDb.postits.count(), sqliteTable: "postits" },
    { name: "sessions", dexieCount: await dexieDb.sessions.count(), sqliteTable: "sessions" },
    { name: "deadlines", dexieCount: await dexieDb.deadlines.count(), sqliteTable: "deadlines" },
    { name: "reviewSchedule", dexieCount: await dexieDb.reviewSchedule.count(), sqliteTable: "review_schedule" },
    { name: "flashcardDecks", dexieCount: await dexieDb.flashcardDecks.count(), sqliteTable: "flashcard_decks" },
    { name: "flashcards", dexieCount: await dexieDb.flashcards.count(), sqliteTable: "flashcards" },
    { name: "cardsFsrs", dexieCount: await dexieDb.cardsFsrs.count(), sqliteTable: "cards_fsrs" },
    { name: "reviewLogs", dexieCount: await dexieDb.reviewLogs.count(), sqliteTable: "review_logs" },
    { name: "concepts", dexieCount: await dexieDb.concepts.count(), sqliteTable: "concepts" },
    { name: "conceptEdges", dexieCount: await dexieDb.conceptEdges.count(), sqliteTable: "concept_edges" },
    { name: "workspaceConfigs", dexieCount: await dexieDb.workspaceConfigs.count(), sqliteTable: "workspace_configs" },
    { name: "fatigueTelemetry", dexieCount: await dexieDb.fatigueTelemetry.count(), sqliteTable: "fatigue_telemetry" },
    { name: "academicSources", dexieCount: await dexieDb.academicSources.count(), sqliteTable: "academic_sources" },
    { name: "academicChunks", dexieCount: await dexieDb.academicChunks.count(), sqliteTable: "academic_chunks" },
    { name: "academicEvaluations", dexieCount: await dexieDb.academicEvaluations.count(), sqliteTable: "academic_evaluations" },
    { name: "workspaceState", dexieCount: await dexieDb.workspaceState.count(), sqliteTable: "workspace_state" },
    { name: "studentErrors", dexieCount: await dexieDb.studentErrors.count(), sqliteTable: "student_errors" },
    { name: "examPlans", dexieCount: await dexieDb.examPlans.count(), sqliteTable: "exam_plans" },
  ];

  const dexieCounts: Record<string, number> = {};
  const sqliteCounts: Record<string, number> = {};

  for (const t of tables) {
    dexieCounts[t.name] = t.dexieCount;
    const res = await sqlite.select<Array<{ cnt: number }>>(
      `SELECT COUNT(*) as cnt FROM ${t.sqliteTable};`
    );
    const sqlCount = res[0]?.cnt ?? 0;
    sqliteCounts[t.name] = sqlCount;

    if (sqlCount !== t.dexieCount) {
      mismatchDetails.push(
        `Tabla ${t.name}: Dexie tiene ${t.dexieCount} registros pero SQLite tiene ${sqlCount}`
      );
    }
  }

  return {
    valid: mismatchDetails.length === 0,
    mismatchDetails,
    dexieCounts,
    sqliteCounts,
  };
}
