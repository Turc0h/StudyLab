import { db } from "../../db/db.ts";

export interface DossierSectionConfig {
  includeConcepts: boolean;
  includeHighlights: boolean;
  includePostits: boolean;
  includeErrors: boolean;
  includeFlashcards: boolean;
}

export const DEFAULT_DOSSIER_CONFIG: DossierSectionConfig = {
  includeConcepts: true,
  includeHighlights: true,
  includePostits: true,
  includeErrors: true,
  includeFlashcards: true,
};

export interface DossierData {
  title: string;
  subjectName: string;
  generatedAt: string;
  studentName?: string;
  stats: {
    totalConcepts: number;
    totalHighlights: number;
    totalPostits: number;
    totalErrors: number;
    totalFlashcards: number;
  };
  concepts: Array<{
    name: string;
    description: string;
    status: string;
    masteryScore: number;
    tags: string[];
    prerequisites: string[];
  }>;
  highlights: Array<{
    fileName: string;
    page: number;
    text: string;
    color?: string;
  }>;
  postits: Array<{
    fileName: string;
    page: number;
    content: string;
  }>;
  errors: Array<{
    conceptName: string;
    category: string;
    originalExercise: string;
    studentAnswer: string;
    expectedAnswer: string;
    explanation: string;
    resolved: boolean;
  }>;
  flashcards: Array<{
    front: string;
    back: string;
    stability?: number;
  }>;
}

export async function buildDossierData(
  folderId?: string | null,
  customTitle?: string,
): Promise<DossierData> {
  let subjectName = "Cátedra Universitaria / Estudio General";

  if (typeof indexedDB === "undefined") {
    // Modo Node / Mock fallback
    return {
      title: customTitle || "Dossier Académico de Síntesis",
      subjectName,
      generatedAt: new Date().toISOString(),
      studentName: "Estudiante StudyLab",
      stats: {
        totalConcepts: 0,
        totalHighlights: 0,
        totalPostits: 0,
        totalErrors: 0,
        totalFlashcards: 0,
      },
      concepts: [],
      highlights: [],
      postits: [],
      errors: [],
      flashcards: [],
    };
  }

  try {
    if (folderId) {
      const folder = await db.folders.get(folderId);
      if (folder?.name) {
        subjectName = folder.name;
      }
    }

    // 1. Archivos asociados
    const allFiles = await db.files.toArray();
    const relevantFiles = folderId
      ? allFiles.filter((f) => f.folderId === folderId)
      : allFiles;
    const relevantFileIds = new Set(relevantFiles.map((f) => f.id));
    const fileMap = new Map<string, string>();
    for (const f of allFiles) {
      fileMap.set(f.id, f.name);
    }

    // 2. Conceptos
    const rawConcepts = db.concepts ? await db.concepts.toArray() : [];
    const concepts = rawConcepts.map((c) => ({
      name: c.name,
      description: c.description || "",
      status: c.status || "available",
      masteryScore: Math.round((c.masteryScore || 0) * 100),
      tags: c.tags || [],
      prerequisites: c.prerequisites || [],
    }));

    // 3. Subrayados
    const allHighlights = await db.highlights.toArray();
    const highlights = allHighlights
      .filter((h) => relevantFileIds.size === 0 || relevantFileIds.has(h.fileId))
      .map((h) => ({
        fileName: fileMap.get(h.fileId) || "Documento",
        page: h.page || 1,
        text: (h as any).text || (h as any).comment || "Subrayado de texto",
        color: (h as any).color || "yellow",
      }));

    // 4. Post-its y Notas
    const allPostits = await db.postits.toArray();
    const postits = allPostits
      .filter((p) => relevantFileIds.size === 0 || relevantFileIds.has(p.fileId))
      .map((p) => ({
        fileName: fileMap.get(p.fileId) || "Documento",
        page: p.page || 1,
        content: (p as any).content || (p as any).text || "",
      }));

    // 5. Banco de Errores
    const rawErrors = db.studentErrors ? await db.studentErrors.toArray() : [];
    const errors = rawErrors.map((e) => ({
      conceptName: e.conceptName,
      category: e.category,
      originalExercise: e.originalExercise,
      studentAnswer: e.studentAnswer,
      expectedAnswer: e.expectedAnswer,
      explanation: e.explanation,
      resolved: e.resolved,
    }));

    // 6. Flashcards FSRS y Leitner
    const rawCardsFsrs = db.cardsFsrs ? await db.cardsFsrs.toArray() : [];
    const rawCardsLeitner = await db.flashcards.toArray();
    const flashcards: Array<{ front: string; back: string; stability?: number }> = [];

    for (const card of rawCardsFsrs) {
      flashcards.push({
        front: card.front,
        back: card.back,
        stability: Math.round(card.stability || 0),
      });
    }

    for (const card of rawCardsLeitner) {
      if (!flashcards.some((f) => f.front === card.front)) {
        flashcards.push({
          front: card.front,
          back: card.back,
        });
      }
    }

    return {
      title: customTitle || `Dossier de Síntesis — ${subjectName}`,
      subjectName,
      generatedAt: new Date().toISOString(),
      studentName: "Estudiante StudyLab",
      stats: {
        totalConcepts: concepts.length,
        totalHighlights: highlights.length,
        totalPostits: postits.length,
        totalErrors: errors.length,
        totalFlashcards: flashcards.length,
      },
      concepts,
      highlights,
      postits,
      errors,
      flashcards,
    };
  } catch (err) {
    console.error("Error al construir DossierData:", err);
    return {
      title: customTitle || "Dossier Académico",
      subjectName,
      generatedAt: new Date().toISOString(),
      studentName: "Estudiante StudyLab",
      stats: { totalConcepts: 0, totalHighlights: 0, totalPostits: 0, totalErrors: 0, totalFlashcards: 0 },
      concepts: [],
      highlights: [],
      postits: [],
      errors: [],
      flashcards: [],
    };
  }
}

/**
 * Genera una representación en formato Markdown (.md) estándar para exportación o archivo personal.
 */
export function generateDossierMarkdown(
  data: DossierData,
  config: DossierSectionConfig = DEFAULT_DOSSIER_CONFIG,
): string {
  const dateStr = new Date(data.generatedAt).toLocaleDateString("es-AR", {
    dateStyle: "full",
  });

  const lines: string[] = [];

  // Portada
  lines.push(`# ${data.title}`);
  lines.push(`**Materia / Cátedra:** ${data.subjectName}`);
  lines.push(`**Fecha de Compilación:** ${dateStr}`);
  lines.push(`**Compilado con:** StudyLab Cognitive OS v5.14`);
  lines.push("");
  lines.push("---");
  lines.push("");

  // Métricas
  lines.push("## Resumen Estadístico de Aprendizaje");
  lines.push(`- **Conceptos Clave del Grafo:** ${data.stats.totalConcepts}`);
  lines.push(`- **Subrayados y Citas Documentales:** ${data.stats.totalHighlights}`);
  lines.push(`- **Notas Marginales (Post-its):** ${data.stats.totalPostits}`);
  lines.push(`- **Brechas y Errores Analizados:** ${data.stats.totalErrors}`);
  lines.push(`- **Tarjetas de Autoevaluación FSRS:** ${data.stats.totalFlashcards}`);
  lines.push("");

  // 1. Conceptos del Grafo
  if (config.includeConcepts && data.concepts.length > 0) {
    lines.push("## 1. Núcleo Conceptual y Red de Prerrequisitos");
    lines.push("");
    for (const c of data.concepts) {
      lines.push(`### ${c.name} [Dominio: ${c.masteryScore}%]`);
      if (c.description) lines.push(`> ${c.description}`);
      if (c.prerequisites && c.prerequisites.length > 0) {
        lines.push(`- **Prerrequisitos:** ${c.prerequisites.join(", ")}`);
      }
      if (c.tags && c.tags.length > 0) {
        lines.push(`- **Etiquetas:** ${c.tags.map((t) => `\`#${t}\``).join(" ")}`);
      }
      lines.push("");
    }
  }

  // 2. Subrayados
  if (config.includeHighlights && data.highlights.length > 0) {
    lines.push("## 2. Subrayados y Fragmentos Clave Extraídos");
    lines.push("");
    for (const h of data.highlights) {
      lines.push(`> "${h.text}"`);
      lines.push(`*— ${h.fileName} (Página ${h.page})*`);
      lines.push("");
    }
  }

  // 3. Post-its y Anotaciones
  if (config.includePostits && data.postits.length > 0) {
    lines.push("## 3. Notas Marginales de Cátedra");
    lines.push("");
    for (const p of data.postits) {
      lines.push(`- **[${p.fileName} - Pág. ${p.page}]:** ${p.content}`);
    }
    lines.push("");
  }

  // 4. Banco de Errores Pedagógicos
  if (config.includeErrors && data.errors.length > 0) {
    lines.push("## 4. Banco de Errores y Desafíos Pedagógicos");
    lines.push("");
    for (const e of data.errors) {
      lines.push(`### Desafío: ${e.conceptName} (${e.resolved ? "✓ Resuelto" : "⚠ Pendiente"})`);
      lines.push(`**Consigna / Ejercicio:** ${e.originalExercise}`);
      lines.push(`- **Respuesta Previa:** ~${e.studentAnswer}~`);
      lines.push(`- **Respuesta Correcta:** **${e.expectedAnswer}**`);
      lines.push(`- **Justificación y Racional:** ${e.explanation}`);
      lines.push("");
    }
  }

  // 5. Cuestionario de Autoevaluación
  if (config.includeFlashcards && data.flashcards.length > 0) {
    lines.push("## 5. Banco de Autoevaluación Activa (Flashcards)");
    lines.push("");
    for (let i = 0; i < data.flashcards.length; i++) {
      const card = data.flashcards[i];
      lines.push(`#### Pregunta ${i + 1}`);
      lines.push(`**${card.front}**`);
      lines.push("");
      lines.push("<details>");
      lines.push("<summary>Ver Respuesta</summary>");
      lines.push("");
      lines.push(card.back);
      lines.push("</details>");
      lines.push("");
    }
  }

  lines.push("---");
  lines.push("*Documento generado 100% en el dispositivo por StudyLab — Local-First Academic OS.*");

  return lines.join("\n");
}

/**
 * Genera un documento HTML autosuficiente listo para imprimir en A4 o guardar como PDF nativo.
 */
export function generateDossierHtml(
  data: DossierData,
  config: DossierSectionConfig = DEFAULT_DOSSIER_CONFIG,
): string {
  const dateStr = new Date(data.generatedAt).toLocaleDateString("es-AR", {
    dateStyle: "full",
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${data.title}</title>
  <style>
    @media print {
      @page {
        size: A4;
        margin: 20mm 15mm 20mm 15mm;
      }
      body {
        background: #ffffff !important;
        color: #111827 !important;
        font-size: 11pt;
      }
      .no-print {
        display: none !important;
      }
      .page-break {
        page-break-before: always;
        break-before: page;
      }
      .card {
        break-inside: avoid;
      }
    }

    body {
      font-family: Charter, Georgia, "Times New Roman", serif;
      line-height: 1.6;
      color: #1f2937;
      max-width: 860px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #fafafa;
    }

    .cover {
      text-align: center;
      padding: 60px 20px 40px;
      border-bottom: 2px solid #e5e7eb;
      margin-bottom: 40px;
    }

    .cover h1 {
      font-size: 26pt;
      margin-bottom: 8px;
      color: #111827;
      font-weight: 700;
    }

    .cover .subtitle {
      font-size: 14pt;
      color: #4b5563;
      margin-bottom: 24px;
    }

    .badge-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 20px;
    }

    .badge {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      padding: 4px 10px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 9999px;
      color: #374151;
    }

    h2 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 16pt;
      border-bottom: 1.5px solid #111827;
      padding-bottom: 6px;
      margin-top: 36px;
      margin-bottom: 18px;
      color: #111827;
    }

    h3 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 12pt;
      margin-top: 20px;
      margin-bottom: 6px;
      color: #1f2937;
    }

    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 14px;
    }

    blockquote {
      margin: 0;
      padding: 10px 16px;
      background: #f9fafb;
      border-left: 4px solid #3b82f6;
      font-style: italic;
    }

    .error-card {
      border-left: 4px solid #ef4444;
      background: #fff;
    }

    .qa-box {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 10px;
      background: #fff;
    }

    .qa-question {
      font-weight: bold;
      color: #111827;
      margin-bottom: 6px;
    }

    .qa-answer {
      color: #374151;
      border-top: 1px dashed #e5e7eb;
      padding-top: 6px;
    }

    .toolbar {
      position: sticky;
      top: 10px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-bottom: 20px;
    }

    .btn {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 9pt;
      font-weight: 600;
      padding: 8px 14px;
      border-radius: 6px;
      border: 1px solid #d1d5db;
      background: #ffffff;
      color: #1f2937;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    .btn-primary {
      background: #1f2937;
      color: #ffffff;
      border-color: #1f2937;
    }
  </style>
</head>
<body>
  <div class="toolbar no-print">
    <button class="btn btn-primary" onclick="window.print()">Imprimir / Guardar como PDF</button>
  </div>

  <div class="cover">
    <h1>${data.title}</h1>
    <div class="subtitle">Cátedra: ${data.subjectName}</div>
    <div style="font-size: 10pt; color: #6b7280;">Compilado el ${dateStr} • StudyLab Cognitive OS</div>

    <div class="badge-bar">
      <span class="badge"><strong>${data.stats.totalConcepts}</strong> Conceptos</span>
      <span class="badge"><strong>${data.stats.totalHighlights}</strong> Citas / Subrayados</span>
      <span class="badge"><strong>${data.stats.totalPostits}</strong> Notas</span>
      <span class="badge"><strong>${data.stats.totalErrors}</strong> Errores Auditados</span>
      <span class="badge"><strong>${data.stats.totalFlashcards}</strong> Tarjetas FSRS</span>
    </div>
  </div>

  ${config.includeConcepts && data.concepts.length > 0 ? `
  <div class="section">
    <h2>1. Grafo Conceptual y Dominio</h2>
    ${data.concepts.map((c) => `
      <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h3 style="margin:0;">${c.name}</h3>
          <span class="badge" style="font-size:8pt;">Dominio: ${c.masteryScore}%</span>
        </div>
        ${c.description ? `<p style="margin:6px 0 0 0; color:#4b5563;">${c.description}</p>` : ""}
        ${c.prerequisites.length > 0 ? `<div style="font-size:9pt; margin-top:6px; color:#6b7280;">Prerrequisitos: ${c.prerequisites.join(", ")}</div>` : ""}
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${config.includeHighlights && data.highlights.length > 0 ? `
  <div class="section page-break">
    <h2>2. Citas y Subrayados Documentales</h2>
    ${data.highlights.map((h) => `
      <div class="card" style="padding:10px 14px;">
        <blockquote>"${h.text}"</blockquote>
        <div style="font-size:9pt; color:#6b7280; text-align:right; margin-top:4px;">
          Fuente: ${h.fileName} (Página ${h.page})
        </div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${config.includePostits && data.postits.length > 0 ? `
  <div class="section">
    <h2>3. Notas Marginales de Cátedra</h2>
    ${data.postits.map((p) => `
      <div class="card" style="border-left:4px solid #f59e0b;">
        <div style="font-size:9pt; color:#6b7280; margin-bottom:4px;">${p.fileName} — Pág. ${p.page}</div>
        <div>${p.content}</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${config.includeErrors && data.errors.length > 0 ? `
  <div class="section page-break">
    <h2>4. Banco de Errores y Justificaciones</h2>
    ${data.errors.map((e) => `
      <div class="card error-card">
        <div style="display:flex; justify-content:space-between;">
          <strong>Concepto: ${e.conceptName}</strong>
          <span class="badge" style="font-size:8pt;">${e.resolved ? "Resuelto" : "Pendiente"}</span>
        </div>
        <p style="margin:6px 0;"><strong>Consigna:</strong> ${e.originalExercise}</p>
        <div style="font-size:10pt; background:#fef2f2; padding:6px 10px; border-radius:4px; margin-bottom:6px;">
          <strong>Respuesta previa errónea:</strong> ${e.studentAnswer}
        </div>
        <div style="font-size:10pt; background:#ecfdf5; padding:6px 10px; border-radius:4px; margin-bottom:6px;">
          <strong>Respuesta correcta:</strong> ${e.expectedAnswer}
        </div>
        <p style="margin:4px 0 0; font-size:10pt; color:#4b5563;"><em>${e.explanation}</em></p>
      </div>
    `).join("")}
  </div>
  ` : ""}

  ${config.includeFlashcards && data.flashcards.length > 0 ? `
  <div class="section page-break">
    <h2>5. Banco de Autoevaluación (Active Recall)</h2>
    ${data.flashcards.map((card, i) => `
      <div class="qa-box">
        <div class="qa-question">Pregunta ${i + 1}: ${card.front}</div>
        <div class="qa-answer"><strong>Respuesta:</strong> ${card.back}</div>
      </div>
    `).join("")}
  </div>
  ` : ""}

  <div style="text-align:center; font-size:9pt; color:#9ca3af; margin-top:40px; border-top:1px solid #e5e7eb; padding-top:20px;">
    Documento académico generado 100% en el dispositivo por StudyLab Cognitive OS.
  </div>
</body>
</html>`;
}
