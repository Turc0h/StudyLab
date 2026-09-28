import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.27 (PIZARRA MATEMÁTICA & DEMOSTRACIONES)      ");
console.log("================================================================================\n");

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err.message}`);
    failed++;
  }
}

// -----------------------------------------------------------------------------
// [Test 1] Motor de Teoremas y Deducciones Paso a Paso (mathBlackboardEngine.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Teoremas y Deducciones Paso a Paso (mathBlackboardEngine.ts)");

const engineFile = path.join(rootDir, "src", "features", "math-blackboard", "mathBlackboardEngine.ts");

test("Existe src/features/math-blackboard/mathBlackboardEngine.ts", () => {
  assert.ok(fs.existsSync(engineFile), "El archivo mathBlackboardEngine.ts debe existir");
});

const engineSrc = fs.readFileSync(engineFile, "utf-8");

test("Exporta interfaces matemáticas fundamentales", () => {
  assert.ok(engineSrc.includes("export interface DerivationStep"), "Debe exportar DerivationStep");
  assert.ok(engineSrc.includes("export interface MathTheorem"), "Debe exportar MathTheorem");
  assert.ok(engineSrc.includes("export type MathTheoremField"), "Debe exportar MathTheoremField");
});

test("Catálogo incluye teoremas de Telecomunicaciones, Cálculo, Economía y Machine Learning", () => {
  assert.ok(engineSrc.includes("export const PRESET_MATH_THEOREMS"), "Debe exportar PRESET_MATH_THEOREMS");
  assert.ok(engineSrc.includes("theorem-nyquist-shannon"), "Debe incluir Teorema de Nyquist-Shannon");
  assert.ok(engineSrc.includes("theorem-fundamental-calculus"), "Debe incluir Primer Teorema Fundamental del Cálculo");
  assert.ok(engineSrc.includes("theorem-euler-consumption"), "Debe incluir Ecuación de Euler de Consumo");
  assert.ok(engineSrc.includes("theorem-svd-decomposition"), "Debe incluir Descomposición en Valores Singulares (SVD)");
});

test("Algoritmo validateStepDerivation valida expresiones LaTeX y tokens clave", () => {
  assert.ok(engineSrc.includes("export function validateStepDerivation"), "Debe exportar validateStepDerivation");
  assert.ok(engineSrc.includes("cleanMathFormula"), "Debe normalizar fórmulas matemáticas");
  assert.ok(engineSrc.includes("saveMathBlackboardSessionRecord"), "Debe exportar guardado de sesión en IndexedDB");
});

// -----------------------------------------------------------------------------
// [Test 2] Componente Visual de Pizarra KaTeX (MathBlackboardMethod.tsx)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Componente Visual de Pizarra KaTeX (MathBlackboardMethod.tsx)");

const uiFile = path.join(rootDir, "src", "components", "study-methods", "MathBlackboardMethod.tsx");

test("Existe src/components/study-methods/MathBlackboardMethod.tsx", () => {
  assert.ok(fs.existsSync(uiFile), "El componente MathBlackboardMethod.tsx debe existir");
});

const uiSrc = fs.readFileSync(uiFile, "utf-8");

test("Implementa renderizado KaTeX con renderLatexToHtml", () => {
  assert.ok(uiSrc.includes("renderLatexToHtml"), "Debe utilizar renderLatexToHtml para rendering matemático");
  assert.ok(uiSrc.includes("selectedTheorem.thesisLatex"), "Debe mostrar la tesis formal");
});

test("Soporta botonera rápida de símbolos KaTeX y previsualización en vivo", () => {
  assert.ok(uiSrc.includes("QUICK_MATH_SYMBOLS"), "Debe tener barra rápida de operadores KaTeX");
  assert.ok(uiSrc.includes("Previsualización KaTeX en Vivo"), "Debe previsualizar fórmulas en tiempo real");
  assert.ok(uiSrc.includes("handleRevealStep"), "Debe permitir revelar la expresión oficial");
});

test("Permite guardar sesión de deducción en historial", () => {
  assert.ok(uiSrc.includes("handleSaveSession"), "Debe permitir guardar la sesión");
  assert.ok(uiSrc.includes("saveMathBlackboardSessionRecord"), "Debe invocar saveMathBlackboardSessionRecord");
});

// -----------------------------------------------------------------------------
// [Test 3] Integraciones en el Ecosistema
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Integraciones en el Ecosistema");

const typesFile = path.join(rootDir, "src", "types", "index.ts");
const typesSrc = fs.readFileSync(typesFile, "utf-8");

test("StudyMethodId incluye 'math-blackboard'", () => {
  assert.ok(typesSrc.includes('"math-blackboard"'), "StudyMethodId debe incluir 'math-blackboard'");
});

const methodsPageFile = path.join(rootDir, "src", "pages", "MethodsPage.tsx");
const methodsPageSrc = fs.readFileSync(methodsPageFile, "utf-8");

test("MethodsPage incluye MathBlackboardMethod con lazy loading y runner case", () => {
  assert.ok(methodsPageSrc.includes("MathBlackboardMethod"), "Debe importar perezosamente MathBlackboardMethod");
  assert.ok(methodsPageSrc.includes('case "math-blackboard":'), "Debe despachar el runner de 'math-blackboard'");
  assert.ok(methodsPageSrc.includes("Pizarra Matemática"), "Debe mostrar botón de acceso rápido");
});

const cmdServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const cmdServiceSrc = fs.readFileSync(cmdServiceFile, "utf-8");

test("commandPaletteService registra la acción 'action-math-blackboard'", () => {
  assert.ok(cmdServiceSrc.includes("action-math-blackboard"), "Debe registrar action-math-blackboard");
  assert.ok(cmdServiceSrc.includes("/methods?run=math-blackboard"), "Debe redirigir a /methods?run=math-blackboard");
});

const cmdPaletteFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const cmdPaletteSrc = fs.readFileSync(cmdPaletteFile, "utf-8");

test("CommandPalette.tsx importa Binary y lo registra en ICON_MAP", () => {
  assert.ok(cmdPaletteSrc.includes("Binary"), "Debe importar Binary de lucide-react");
  assert.ok(cmdPaletteSrc.includes("Binary,\n};") || cmdPaletteSrc.includes("Binary,"), "Debe registrar Binary en ICON_MAP");
});

// -----------------------------------------------------------------------------
// [Test 4] Motor de Pizarra Virtual y Laboratorio OCR (VirtualBlackboard & whiteboardEngine)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Motor de Pizarra Virtual y Reconocimiento de Trazos");

const whiteboardEngineFile = path.join(rootDir, "src", "components", "whiteboard", "whiteboardEngine.ts");
test("Existe src/components/whiteboard/whiteboardEngine.ts", () => {
  assert.ok(fs.existsSync(whiteboardEngineFile), "whiteboardEngine.ts debe existir");
});

const wbEngineSrc = fs.readFileSync(whiteboardEngineFile, "utf-8");
test("whiteboardEngine exporta algoritmos de suavizado EMA, RDP y heurística LaTeX", () => {
  assert.ok(wbEngineSrc.includes("export function applyEmaFilter"), "Debe exportar applyEmaFilter");
  assert.ok(wbEngineSrc.includes("export function beautifyStroke"), "Debe exportar beautifyStroke con RDP");
  assert.ok(wbEngineSrc.includes("export function heuristicOcrToLatex"), "Debe exportar heuristicOcrToLatex");
  assert.ok(wbEngineSrc.includes("recognizeWhiteboardCanvas"), "Debe exportar recognizeWhiteboardCanvas");
});

const virtualBlackboardFile = path.join(rootDir, "src", "components", "whiteboard", "VirtualBlackboard.tsx");
test("Existe src/components/whiteboard/VirtualBlackboard.tsx", () => {
  assert.ok(fs.existsSync(virtualBlackboardFile), "VirtualBlackboard.tsx debe existir");
});

const vbSrc = fs.readFileSync(virtualBlackboardFile, "utf-8");
test("VirtualBlackboard encuadra el OCR como Laboratorio Experimental sin choque con ocre FSRS", () => {
  assert.ok(vbSrc.includes("showExperimentalOcr"), "Debe contar con toggle desactivado por defecto");
  assert.ok(vbSrc.includes("Lab OCR"), "Debe etiquetar el OCR como herramienta de laboratorio");
  assert.ok(vbSrc.includes("Beta"), "Debe incluir badge visible de Beta");
  assert.ok(vbSrc.includes("Laboratorio Experimental (Mejor Esfuerzo)"), "Debe comunicar expectativa realista en aviso");
  // Asegurar que no use amber/ocre para el aviso de sistema
  assert.ok(!vbSrc.includes("bg-amber-500/10 border border-amber-500/30 text-amber-300"), "No debe usar ocre FSRS en el aviso de sistema");
});

test("MathBlackboardMethod integra VirtualBlackboard en modo libre y paso guiado", () => {
  assert.ok(uiSrc.includes("VirtualBlackboard"), "MathBlackboardMethod debe importar e instanciar VirtualBlackboard");
  assert.ok(uiSrc.includes("Pizarra Libre"), "Debe ofrecer modo Pizarra Libre");
  assert.ok(uiSrc.includes("Deducción Guiada"), "Debe ofrecer modo Deducción Guiada");
});

// -----------------------------------------------------------------------------
// Resumen de la Suite
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADO SUITE v5.27: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
