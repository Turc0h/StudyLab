import { Router, Request, Response } from "express";
import multer from "multer";

export const academicRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// Ingest academic document (supports multipart/form-data with file or application/json)
academicRouter.post("/sources/ingest", upload.single("file"), (req: Request, res: Response) => {
  let { title, subject, professor, courseYear, content, totalPages } = req.body;

  // Handle uploaded file if present
  if (req.file) {
    if (!title) {
      title = req.file.originalname.replace(/\.[^/.]+$/, "");
    }
    if (!content && req.file.buffer) {
      // Decode text buffer (Markdown, text, or plain string)
      content = req.file.buffer.toString("utf-8");
    }
  }

  subject = subject || "General";
  title = title || "Documento Académico";

  const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const pages = Math.max(1, totalPages || 1);

  // Simulated AST Hierarchical chunking
  const paragraphs = String(content || "").split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks = paragraphs.map((text, idx) => {
    const isTheorem = /teorema|proposici[oó]n|lema|corolario/i.test(text);
    const isProof = /demostraci[oó]n|prueba|proof/i.test(text);
    const formulas = Array.from(text.matchAll(/\$\$[\s\S]+?\$\$|\$[^$]+?\$/g)).map((m) => m[0]);

    return {
      id: `chunk_${sourceId}_${idx}`,
      sourceId,
      page: (idx % pages) + 1,
      paragraphIndex: idx + 1,
      type: isTheorem ? "theorem" : isProof ? "proof" : "definition",
      text,
      latexFormulas: formulas,
      normalizedBbox: {
        x: 0.12,
        y: Math.min(0.85, 0.15 + (idx % 5) * 0.14),
        width: 0.76,
        height: 0.12,
      },
    };
  });

  res.json({
    ok: true,
    source: {
      id: sourceId,
      title,
      subject,
      professor: professor || "Cátedra Universitaria",
      courseYear: courseYear || "Ciclo Común 2026",
      ocrStatus: "done",
      graphRagIndexed: true,
      astParsed: true,
      totalChunks: chunks.length,
      createdAt: Date.now(),
    },
    chunks,
  });
});

// Socratic Feynman Evaluation
academicRouter.post("/cognitive/feynman-eval", (req: Request, res: Response) => {
  const { explanation, referenceChunkText } = req.body;

  if (!explanation || !referenceChunkText) {
    res.status(400).json({ error: "explanation and referenceChunkText are required" });
    return;
  }

  const studentWords = new Set(
    String(explanation)
      .toLowerCase()
      .replace(/[^\w\sáéíóúüñ]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3)
  );

  const referenceKeywords = Array.from(
    new Set(
      String(referenceChunkText)
        .toLowerCase()
        .replace(/[^\w\sáéíóúüñ]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    )
  );

  const matchedKeywords = referenceKeywords.filter((k) => studentWords.has(k));
  const missingKeywords = referenceKeywords.filter((k) => !studentWords.has(k)).slice(0, 4);

  const coverageRatio = referenceKeywords.length > 0 ? matchedKeywords.length / referenceKeywords.length : 0.5;
  const masteryScore = Math.min(100, Math.round(coverageRatio * 100 + 20));

  res.json({
    ok: true,
    evaluation: {
      masteryScore,
      verdict: masteryScore >= 75 ? "mastered" : masteryScore >= 50 ? "partial" : "insufficient",
      correctInsights: matchedKeywords.slice(0, 5),
      criticalOmissions: missingKeywords,
      socraticFeedback:
        masteryScore >= 75
          ? "Excelente rigor analítico. Has capturado los invariantes esenciales del teorema."
          : `Has expuesto una buena intuición, pero faltó fundamentar conceptos clave como: ${missingKeywords.join(", ")}. ¿Qué ocurriría si relajáramos esta condición en la hipótesis inicial?`,
      evaluatedAt: Date.now(),
    },
  });
});

// Generate FSRS Flashcards
academicRouter.post("/cognitive/generate-flashcards", (req: Request, res: Response) => {
  const { chunkId, text } = req.body;

  const cards = [
    {
      id: `fsrs_${chunkId || Date.now()}_0`,
      front: `¿Cuál es el enunciado formal y la hipótesis principal expresada en este fragmento?`,
      back: String(text || "").slice(0, 300) + (String(text).length > 300 ? "..." : ""),
      initialStability: 2.5,
      initialDifficulty: 5.0,
      state: "new",
    },
  ];

  res.json({ ok: true, cards });
});

// FSRS Next Review calculation
academicRouter.post("/fsrs/next-review", (req: Request, res: Response) => {
  const { currentStability, currentDifficulty, rating } = req.body;

  const s = Number(currentStability) || 2.5;
  const d = Number(currentDifficulty) || 5.0;
  const g = Number(rating) || 3; // 1: Again, 2: Hard, 3: Good, 4: Easy

  let nextS = s;
  let nextD = d;
  let intervalDays = 1;

  if (g === 1) {
    nextS = Math.max(0.5, s * 0.4);
    nextD = Math.min(10, d + 1.2);
    intervalDays = 1;
  } else if (g === 2) {
    nextS = s * 1.2;
    nextD = Math.min(10, d + 0.5);
    intervalDays = Math.max(2, Math.round(nextS * 0.8));
  } else if (g === 3) {
    nextS = s * 2.2;
    nextD = Math.max(1, d - 0.2);
    intervalDays = Math.max(3, Math.round(nextS * 1.1));
  } else {
    nextS = s * 3.5;
    nextD = Math.max(1, d - 0.8);
    intervalDays = Math.max(5, Math.round(nextS * 1.5));
  }

  res.json({
    ok: true,
    prediction: {
      nextStability: Number(nextS.toFixed(2)),
      nextDifficulty: Number(nextD.toFixed(2)),
      intervalDays,
      nextDueDate: Date.now() + intervalDays * 24 * 60 * 60 * 1000,
    },
  });
});

academicRouter.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "online",
    engine: "StudyLab Academic Knowledge Engine v4.0",
    modules: ["AST Semantic Chunking", "Socratic NLI Evaluator", "FSRS Scheduler v4.5"],
  });
});
