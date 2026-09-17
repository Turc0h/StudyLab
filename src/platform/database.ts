/**
 * StudyLab SQLite Database Client (Desktop)
 * Manages SQLite connection via @tauri-apps/plugin-sql, initializes schema,
 * and sets conservative, low-memory PRAGMAs tailored for modest PCs.
 */

import Database from "@tauri-apps/plugin-sql";
import { isDesktop } from "./platform";

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

export const DB_NAME = "sqlite:studylab.db";

/**
 * Initializes and returns the singleton SQLite database instance.
 * Applies conservative performance and memory PRAGMAs.
 */
export async function getSqliteDb(): Promise<Database> {
  if (!isDesktop()) {
    throw new Error("SQLite solo está disponible en el entorno de escritorio Tauri.");
  }

  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const db = await Database.load(DB_NAME);

    // 1. Configuración de PRAGMAs para bajo consumo de RAM y alta estabilidad
    // - WAL: permite lecturas y escrituras simultáneas sin bloqueos
    await db.execute("PRAGMA journal_mode = WAL;");
    // - NORMAL: balance óptimo de durabilidad y velocidad (evita fsync redundantes)
    await db.execute("PRAGMA synchronous = NORMAL;");
    // - ON: garantiza integridad referencial entre entidades
    await db.execute("PRAGMA foreign_keys = ON;");
    // - -8000: fija el límite de caché en ~8 MB de memoria RAM (seguro para PCs de 4GB)
    await db.execute("PRAGMA cache_size = -8000;");
    // - MEMORY: tablas temporales en RAM acotada para evitar I/O de disco
    await db.execute("PRAGMA temp_store = MEMORY;");
    // - 5000: tiempo de espera antes de arrojar error por contención
    await db.execute("PRAGMA busy_timeout = 5000;");

    // 2. Inicialización de esquema DDL si no existe
    await initializeSchema(db);

    dbInstance = db;
    return db;
  })();

  return initPromise;
}

/**
 * Crea las tablas del esquema unificado de StudyLab en SQLite si no existen.
 */
async function initializeSchema(db: Database): Promise<void> {
  // Tabla de metadatos de migraciones
  await db.execute(`
    CREATE TABLE IF NOT EXISTS migration_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  // 1. Carpetas y Archivos
  await db.execute(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      parent_id TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      ocr_status TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0,
      disk_path TEXT,
      hash TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  // 2. Anotaciones y OCR
  await db.execute(`
    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      page INTEGER NOT NULL,
      text TEXT NOT NULL,
      rects TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS ocr_pages (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      page INTEGER NOT NULL,
      lines TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS postits (
      id TEXT PRIMARY KEY,
      file_id TEXT NOT NULL,
      page INTEGER NOT NULL,
      x_pct REAL NOT NULL,
      y_pct REAL NOT NULL,
      text TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 3. Sesiones y Planificación
  await db.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      method_id TEXT NOT NULL,
      subject_folder_id TEXT,
      started_at INTEGER NOT NULL,
      ended_at INTEGER NOT NULL,
      duration_sec INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS deadlines (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      due_date INTEGER NOT NULL,
      subject_folder_id TEXT,
      source TEXT NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS review_schedule (
      id TEXT PRIMARY KEY,
      file_id TEXT,
      subject_folder_id TEXT,
      topic TEXT NOT NULL,
      due_date INTEGER NOT NULL,
      interval_days REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  // 4. Flashcards y FSRS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS flashcard_decks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject_folder_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS flashcards (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      box INTEGER NOT NULL,
      due_date INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS cards_fsrs (
      id TEXT PRIMARY KEY,
      deck_id TEXT NOT NULL,
      concept_id TEXT,
      front TEXT NOT NULL,
      back TEXT NOT NULL,
      state TEXT NOT NULL,
      stability REAL NOT NULL,
      difficulty REAL NOT NULL,
      reps INTEGER NOT NULL,
      lapses INTEGER NOT NULL,
      last_review INTEGER,
      due_date INTEGER NOT NULL,
      half_life REAL NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS review_logs (
      id TEXT PRIMARY KEY,
      card_id TEXT NOT NULL,
      rating INTEGER NOT NULL,
      review_timestamp INTEGER NOT NULL,
      latency_ms INTEGER NOT NULL,
      state_before TEXT NOT NULL,
      state_after TEXT NOT NULL,
      stability_before REAL NOT NULL,
      stability_after REAL NOT NULL,
      difficulty_before REAL NOT NULL,
      difficulty_after REAL NOT NULL,
      scheduled_days REAL NOT NULL
    );
  `);

  // 5. Grafo de Conocimiento y Telemetría
  await db.execute(`
    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      domain_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      mastery_score REAL NOT NULL,
      current_retrievability REAL NOT NULL,
      status TEXT NOT NULL,
      prerequisites TEXT NOT NULL,
      tags TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS concept_edges (
      id TEXT PRIMARY KEY,
      source_concept_id TEXT NOT NULL,
      target_concept_id TEXT NOT NULL,
      type TEXT NOT NULL,
      strength REAL NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_configs (
      id TEXT PRIMARY KEY,
      profile_type TEXT NOT NULL,
      active_widgets TEXT NOT NULL,
      automation_enabled INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS fatigue_telemetry (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      fatigue_score REAL NOT NULL,
      keystroke_variance REAL NOT NULL,
      pause_rate REAL NOT NULL,
      session_duration_sec REAL NOT NULL
    );
  `);

  // 6. Motor Académico (Sources, Chunks, Evaluations, WorkspaceState)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS academic_sources (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      professor_id TEXT,
      career TEXT,
      year INTEGER,
      semester TEXT,
      title TEXT NOT NULL,
      document_type TEXT NOT NULL,
      page_count INTEGER NOT NULL,
      file_id TEXT,
      ocr_processed INTEGER NOT NULL,
      chunk_count INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS academic_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      chunk_type TEXT NOT NULL,
      title TEXT,
      hierarchy_path TEXT NOT NULL,
      page_number INTEGER NOT NULL,
      paragraph_index INTEGER NOT NULL,
      raw_content TEXT NOT NULL,
      latex_formulas TEXT NOT NULL,
      bounding_box TEXT NOT NULL,
      dense_vector TEXT,
      sparse_tokens TEXT,
      char_offset TEXT,
      web_url_fragment TEXT,
      transcript_timestamp TEXT,
      created_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS academic_evaluations (
      id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL,
      source_id TEXT NOT NULL,
      student_explanation TEXT NOT NULL,
      mastery_score REAL NOT NULL,
      diagnostic_category TEXT NOT NULL,
      entailed_points TEXT NOT NULL,
      omissions TEXT NOT NULL,
      contradictions TEXT NOT NULL,
      citation_proof TEXT,
      socratic_question TEXT NOT NULL,
      evaluated_at INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS workspace_state (
      id TEXT PRIMARY KEY,
      active_subject_id TEXT NOT NULL,
      active_source_id TEXT,
      active_page INTEGER NOT NULL,
      active_bounding_box_focus TEXT,
      panel1_width_pct REAL NOT NULL,
      panel2_width_pct REAL NOT NULL,
      panel3_width_pct REAL NOT NULL,
      open_tabs TEXT NOT NULL,
      synced_at INTEGER NOT NULL
    );
  `);

  // 7. Error Bank y Exam Planner
  await db.execute(`
    CREATE TABLE IF NOT EXISTS student_errors (
      id TEXT PRIMARY KEY,
      concept_id TEXT NOT NULL,
      concept_name TEXT NOT NULL,
      subject_id TEXT,
      category TEXT NOT NULL,
      original_exercise TEXT NOT NULL,
      student_answer TEXT NOT NULL,
      expected_answer TEXT NOT NULL,
      explanation TEXT NOT NULL,
      citation_proof TEXT,
      timestamp INTEGER NOT NULL,
      repetition_count INTEGER NOT NULL,
      resolved INTEGER NOT NULL
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS exam_plans (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      subject_name TEXT NOT NULL,
      exam_date INTEGER NOT NULL,
      available_minutes_per_day REAL NOT NULL,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      phases TEXT NOT NULL
    );
  `);

  // 8. Cola de Trabajos en Segundo Plano (Job System)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS document_jobs (
      id TEXT PRIMARY KEY,
      job_type TEXT NOT NULL,
      document_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      progress INTEGER NOT NULL,
      error TEXT,
      attempt INTEGER NOT NULL,
      max_attempts INTEGER NOT NULL,
      created_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER
    );
  `);

  // 9. Índices esenciales para búsquedas instantáneas
  await db.execute("CREATE INDEX IF NOT EXISTS idx_files_folder ON files(folder_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_highlights_file_page ON highlights(file_id, page);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_postits_file_page ON postits(file_id, page);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_flashcards_deck ON flashcards(deck_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_cards_fsrs_deck ON cards_fsrs(deck_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_academic_chunks_source ON academic_chunks(source_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_academic_chunks_subject ON academic_chunks(subject_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_student_errors_concept ON student_errors(concept_id);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_status_priority ON document_jobs(status, priority);");
  await db.execute("CREATE INDEX IF NOT EXISTS idx_jobs_doc_type ON document_jobs(document_id, job_type);");

  // 10. Motor de Búsqueda de Texto Completo FTS5 (Bajo consumo de RAM)
  try {
    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_academic_chunks USING fts5(
        chunk_id UNINDEXED,
        source_id UNINDEXED,
        subject_id UNINDEXED,
        page_number UNINDEXED,
        title,
        raw_content,
        latex_formulas,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    await db.execute(`
      CREATE VIRTUAL TABLE IF NOT EXISTS fts_documents USING fts5(
        document_id UNINDEXED,
        file_path UNINDEXED,
        file_name,
        page_number UNINDEXED,
        content,
        tokenize = 'unicode61 remove_diacritics 2'
      );
    `);

    // Triggers automáticos de sincronización academic_chunks -> fts_academic_chunks
    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS trg_academic_chunks_ai AFTER INSERT ON academic_chunks
      BEGIN
        INSERT INTO fts_academic_chunks(chunk_id, source_id, subject_id, page_number, title, raw_content, latex_formulas)
        VALUES (new.id, new.source_id, new.subject_id, new.page_number, coalesce(new.title, ''), new.raw_content, coalesce(new.latex_formulas, ''));
      END;
    `);

    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS trg_academic_chunks_ad AFTER DELETE ON academic_chunks
      BEGIN
        DELETE FROM fts_academic_chunks WHERE chunk_id = old.id;
      END;
    `);

    await db.execute(`
      CREATE TRIGGER IF NOT EXISTS trg_academic_chunks_au AFTER UPDATE ON academic_chunks
      BEGIN
        DELETE FROM fts_academic_chunks WHERE chunk_id = old.id;
        INSERT INTO fts_academic_chunks(chunk_id, source_id, subject_id, page_number, title, raw_content, latex_formulas)
        VALUES (new.id, new.source_id, new.subject_id, new.page_number, coalesce(new.title, ''), new.raw_content, coalesce(new.latex_formulas, ''));
      END;
    `);
  } catch (ftsErr) {
    console.warn("[SQLite] Advertencia al inicializar tablas virtuales FTS5:", ftsErr);
  }
}

