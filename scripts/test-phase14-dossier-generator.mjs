import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDossierData,
  generateDossierMarkdown,
  generateDossierHtml,
  DEFAULT_DOSSIER_CONFIG,
} from "../src/features/dossier/dossierGenerator.ts";
import { searchCommandPalette } from "../src/features/command-palette/commandPaletteService.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("     TEST SUITE: STUDYLAB ETAPA v5.14 (DOSSIER UNIVERSITARIO IMPRIMIBLE A4)     ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// Test 1: Servicio Generador de Dossier (dossierGenerator.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 1] Estructura y Exportaciones de dossierGenerator.ts");
const servicePath = path.join(root, "src/features/dossier/dossierGenerator.ts");
assert(fs.existsSync(servicePath), "Existe dossierGenerator.ts");
const serviceContent = fs.readFileSync(servicePath, "utf-8");

assert(serviceContent.includes("export async function buildDossierData"), "Exporta buildDossierData");
assert(serviceContent.includes("export function generateDossierMarkdown"), "Exporta generateDossierMarkdown");
assert(serviceContent.includes("export function generateDossierHtml"), "Exporta generateDossierHtml");
assert(serviceContent.includes("DEFAULT_DOSSIER_CONFIG"), "Exporta DEFAULT_DOSSIER_CONFIG");

// -----------------------------------------------------------------------------
// Test 2: Compilación y Estructura de Datos (buildDossierData)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Compilación de Datos del Dossier");
const mockData = {
  title: "Dossier de Síntesis — Anatomía General",
  subjectName: "Anatomía General",
  generatedAt: new Date().toISOString(),
  studentName: "Estudiante Universitario",
  stats: {
    totalConcepts: 2,
    totalHighlights: 2,
    totalPostits: 1,
    totalErrors: 1,
    totalFlashcards: 2,
  },
  concepts: [
    {
      name: "Neurona y Sinapsis",
      description: "Unidad funcional del sistema nervioso.",
      status: "mastered",
      masteryScore: 92,
      tags: ["neurologia", "celular"],
      prerequisites: ["Biologia Celular"],
    },
    {
      name: "Mielinización",
      description: "Recubrimiento lipídico que acelera la conducción.",
      status: "in_progress",
      masteryScore: 65,
      tags: ["axones"],
      prerequisites: ["Neurona y Sinapsis"],
    },
  ],
  highlights: [
    {
      fileName: "Tratado_Neuroanatomia.pdf",
      page: 45,
      text: "La despolarización de la membrana depende del influjo masivo de iones sodio.",
      color: "yellow",
    },
    {
      fileName: "Apuntes_Fisiologia.pdf",
      page: 12,
      text: "El potencial de reposo se mantiene cerca de los -70 mV.",
      color: "blue",
    },
  ],
  postits: [
    {
      fileName: "Tratado_Neuroanatomia.pdf",
      page: 46,
      content: "Pregunta clásica de final: diferencia entre sinapsis química y eléctrica.",
    },
  ],
  errors: [
    {
      conceptName: "Bomba Sodio-Potasio",
      category: "misconception",
      originalExercise: "¿Cuántos iones de Na+ se expulsan por cada ciclo de ATP?",
      studentAnswer: "2 iones Na+",
      expectedAnswer: "3 iones Na+ hacia el exterior y 2 iones K+ hacia el interior",
      explanation: "El gradiente electroquímico requiere la relación estequiométrica 3 Na+ / 2 K+.",
      resolved: true,
    },
  ],
  flashcards: [
    {
      front: "¿Qué celula produce mielina en el SNC?",
      back: "Oligodendrocitos.",
      stability: 18,
    },
    {
      front: "¿Qué celula produce mielina en el SNP?",
      back: "Células de Schwann.",
      stability: 24,
    },
  ],
};

assert(mockData.concepts.length === 2, "Contiene 2 conceptos en el mock de prueba");
assert(mockData.stats.totalErrors === 1, "Registra 1 error analizado");

// -----------------------------------------------------------------------------
// Test 3: Generación de Markdown Académico
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Formato Markdown Estructurado (.md)");
const markdown = generateDossierMarkdown(mockData);

assert(markdown.includes("# Dossier de Síntesis — Anatomía General"), "Incluye encabezado de portada en Markdown");
assert(markdown.includes("## 1. Núcleo Conceptual y Red de Prerrequisitos"), "Incluye sección de conceptos");
assert(markdown.includes("Neurona y Sinapsis [Dominio: 92%]"), "Incluye conceptos con score de dominio");
assert(markdown.includes("## 2. Subrayados y Fragmentos Clave Extraídos"), "Incluye sección de subrayados");
assert(markdown.includes("La despolarización de la membrana depende"), "Incluye texto del subrayado");
assert(markdown.includes("## 3. Notas Marginales de Cátedra"), "Incluye sección de post-its");
assert(markdown.includes("## 4. Banco de Errores y Desafíos Pedagógicos"), "Incluye sección de banco de errores");
assert(markdown.includes("3 iones Na+ hacia el exterior"), "Muestra corrección del error pedagógico");
assert(markdown.includes("## 5. Banco de Autoevaluación Activa (Flashcards)"), "Incluye cuestionario de autoevaluación");
assert(markdown.includes("Oligodendrocitos"), "Incluye respuestas de flashcards en bloques colapsables");

// Test de exclusión selectiva
const markdownSinCards = generateDossierMarkdown(mockData, {
  ...DEFAULT_DOSSIER_CONFIG,
  includeFlashcards: false,
});
assert(!markdownSinCards.includes("## 5. Banco de Autoevaluación"), "Excluye sección de autoevaluación cuando includeFlashcards es false");

// -----------------------------------------------------------------------------
// Test 4: Generación de Documento HTML / Maquetación A4 Imprimible
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Documento HTML Autosuficiente y Estilos @media print");
const html = generateDossierHtml(mockData);

assert(html.includes("<!DOCTYPE html>"), "Genera HTML válido completo");
assert(html.includes("@media print"), "Contiene reglas CSS para impresora");
assert(html.includes("size: A4;"), "Configura hoja en formato estándar A4");
assert(html.includes("page-break-before: always;"), "Aplica saltos de página antes de secciones mayores");
assert(html.includes("window.print()"), "Incluye disparador de impresión nativa");
assert(html.includes("Dossier de Síntesis — Anatomía General"), "Renderiza título de cátedra");
assert(html.includes("Bomba Sodio-Potasio"), "Renderiza tarjeta de error pedagógico");

// -----------------------------------------------------------------------------
// Test 5: Modal de Vista Previa (DossierPreviewModal.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Modal de Vista Previa y Configuración (DossierPreviewModal.tsx)");
const modalPath = path.join(root, "src/components/dossier/DossierPreviewModal.tsx");
assert(fs.existsSync(modalPath), "Existe DossierPreviewModal.tsx");
const modalContent = fs.readFileSync(modalPath, "utf-8");

assert(modalContent.includes("export const DossierPreviewModal"), "Exporta DossierPreviewModal");
assert(modalContent.includes("selectedFolderId"), "Permite filtrar por cátedra o materia específica");
assert(modalContent.includes("toggleSection"), "Permite activar o desactivar secciones individualmente");
assert(modalContent.includes("handlePrint"), "Implementa acción de impresión directa / PDF");
assert(modalContent.includes("handleDownloadMarkdown"), "Implementa descarga en archivo Markdown (.md)");
assert(modalContent.includes("handleDownloadHtml"), "Implementa descarga en HTML autónomo (.html)");

// -----------------------------------------------------------------------------
// Test 6: Integración en Files.tsx y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Integración en Gestor de Archivos y Paleta de Comandos");
const filesPath = path.join(root, "src/pages/Files.tsx");
assert(fs.existsSync(filesPath), "Existe Files.tsx");
const filesContent = fs.readFileSync(filesPath, "utf-8");

assert(filesContent.includes("DossierPreviewModal"), "Files.tsx importa DossierPreviewModal");
assert(filesContent.includes("Exportar Dossier"), "Files.tsx dispone de botón para exportar dossier");
assert(filesContent.includes("<DossierPreviewModal"), "Files.tsx monta el componente DossierPreviewModal");

// Búsqueda en Command Palette
let searchNavigated = "";
const commandResults = await searchCommandPalette("dossier", {
  navigate: (to) => { searchNavigated = to; },
});
assert(commandResults.length > 0, "Command Palette encuentra la acción de exportar dossier");
assert(commandResults[0].id === "action-dossier", "El resultado top es action-dossier");
commandResults[0].onSelect();
assert(searchNavigated.includes("/files?dossier=true"), `Navega directamente a la apertura del dossier: ${searchNavigated}`);

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> ETAPA v5.14 COMPLETADA CON ÉXITO: Exportador de Dossier Universitario operativo. <<\n");
}
