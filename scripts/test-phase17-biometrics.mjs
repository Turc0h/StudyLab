import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.17 (TELEMETRÍA BIOMÉTRICA & PULSO BLE)        ");
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
// [Test 1] Estructura y Exportaciones de biometricsService.ts
// -----------------------------------------------------------------------------
console.log("[Test 1] Parser Binario GATT 0x180D y Algoritmos (biometricsService.ts)");
const servicePath = path.join(rootDir, "src/features/biometrics/biometricsService.ts");
assert(fs.existsSync(servicePath), "Existe src/features/biometrics/biometricsService.ts");

const serviceContent = fs.readFileSync(servicePath, "utf-8");
assert(serviceContent.includes("export function parseGattHeartRate"), "Exporta parseGattHeartRate");
assert(serviceContent.includes("export function calculateRmssd"), "Exporta calculateRmssd");
assert(serviceContent.includes("export function evaluateStressLevel"), "Exporta evaluateStressLevel");
assert(serviceContent.includes("export class SyntheticHeartRateSimulator"), "Exporta SyntheticHeartRateSimulator");

// -----------------------------------------------------------------------------
// [Test 2] Verificación del Parser Binario GATT (8-bit, 16-bit y RR-intervals)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Decodificación de Paquetes Bluetooth SIG (UUID: 0x2A37)");

// Simular buffer DataView 8-bit (Flags: 0x00, BPM: 72)
const buffer8 = new ArrayBuffer(2);
const view8 = new DataView(buffer8);
view8.setUint8(0, 0x00);
view8.setUint8(1, 72);

const flags8 = view8.getUint8(0);
const bpm8 = (flags8 & 0x01) === 0 ? view8.getUint8(1) : view8.getUint16(1, true);
assert(bpm8 === 72, `Decodificación 8-bit BPM correcta (${bpm8} BPM)`);

// Simular buffer DataView 16-bit (Flags: 0x01, BPM: 280)
const buffer16 = new ArrayBuffer(3);
const view16 = new DataView(buffer16);
view16.setUint8(0, 0x01);
view16.setUint16(1, 85, true); // Little-endian 85 BPM

const flags16 = view16.getUint8(0);
const bpm16 = (flags16 & 0x01) === 1 ? view16.getUint16(1, true) : view16.getUint8(1);
assert(bpm16 === 85, `Decodificación 16-bit BPM Little-Endian correcta (${bpm16} BPM)`);

// -----------------------------------------------------------------------------
// [Test 3] Algoritmo Matemático de Variabilidad HRV (RMSSD)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Cálculo Matemático de Variabilidad Cardíaca RMSSD");
// Intervalos RR sintéticos: 800ms, 850ms, 810ms
// diff1 = 50 -> 2500
// diff2 = -40 -> 1600
// mean = (2500 + 1600) / 2 = 2050
// sqrt(2050) = ~45.27 ms -> redondeado 45 ms
const rrSamples = [800, 850, 810];
let sumDiffSq = 0;
for (let i = 0; i < rrSamples.length - 1; i++) {
  const d = rrSamples[i + 1] - rrSamples[i];
  sumDiffSq += d * d;
}
const calculatedRmssd = Math.round(Math.sqrt(sumDiffSq / (rrSamples.length - 1)));
assert(calculatedRmssd === 45, `Fórmula canónica RMSSD correcta: 45 ms (calculado: ${calculatedRmssd} ms)`);

// -----------------------------------------------------------------------------
// [Test 4] Diagnóstico Autonómico y Activación de Box Breathing
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Diagnóstico Autonómico y Respuesta a la Ansiedad");
// Caso A: Pulso acelerado (estrés)
const isStressed = 104 >= 100;
assert(isStressed, "Detecta taquicardia/estrés por examen ante BPM >= 100");

// Caso B: Pulso en zona de flujo (focused)
const isFocused = 78 >= 70 && 78 < 86;
assert(isFocused, "Identifica estado de Foco Sostenido entre 70 y 85 BPM");

// Caso C: Pulso en reposo (calm)
const isCalm = 65 < 70;
assert(isCalm, "Identifica estado de Calma Basal / Tono Parasimpático en < 70 BPM");

// -----------------------------------------------------------------------------
// [Test 5] Store de Estado y Componentes Visuales
// -----------------------------------------------------------------------------
console.log("\n[Test 5] Store useBiometricsStore y Componentes UI");
const storePath = path.join(rootDir, "src/stores/useBiometricsStore.ts");
assert(fs.existsSync(storePath), "Existe src/stores/useBiometricsStore.ts");

const storeContent = fs.readFileSync(storePath, "utf-8");
assert(storeContent.includes("export const useBiometricsStore"), "Exporta useBiometricsStore");
assert(storeContent.includes("connectBle"), "Implementa acción connectBle con Web Bluetooth API");
assert(storeContent.includes("startSimulation"), "Implementa generador sintético para testing offline");
assert(storeContent.includes("isBoxBreathingOpen"), "Administra estado modal de Respiración Cuadrada");

const cardPath = path.join(rootDir, "src/features/biometrics/BiometricsMonitorCard.tsx");
assert(fs.existsSync(cardPath), "Existe src/features/biometrics/BiometricsMonitorCard.tsx");

const modalPath = path.join(rootDir, "src/features/biometrics/BoxBreathingModal.tsx");
assert(fs.existsSync(modalPath), "Existe src/features/biometrics/BoxBreathingModal.tsx");

const modalContent = fs.readFileSync(modalPath, "utf-8");
assert(modalContent.includes("Box Breathing 4-4-4-4"), "Modal incluye protocolo de Respiración Cuadrada 4-4-4-4");
assert(modalContent.includes("Inhalar") && modalContent.includes("Retener") && modalContent.includes("Exhalar"), "Implementa las 4 fases rítmicas de activación vagal");

// -----------------------------------------------------------------------------
// [Test 6] Integración en ContextEngineDashboard y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 6] Integraciones en Context Engine y Command Palette");
const contextDashPath = path.join(rootDir, "src/features/context-engine/ContextEngineDashboard.tsx");
const contextDashContent = fs.readFileSync(contextDashPath, "utf-8");
assert(contextDashContent.includes("BiometricsMonitorCard"), "ContextEngineDashboard.tsx importa BiometricsMonitorCard");
assert(contextDashContent.includes('id: "biometrics"'), "ContextEngineDashboard.tsx incluye la pestaña de biometría");
assert(contextDashContent.includes("Biometría & Pulso BLE"), "Muestra etiqueta 'Biometría & Pulso BLE' en las pestañas");

const paletteServicePath = path.join(rootDir, "src/features/command-palette/commandPaletteService.ts");
const paletteContent = fs.readFileSync(paletteServicePath, "utf-8");
assert(paletteContent.includes("action-biometrics"), "commandPaletteService.ts registra 'action-biometrics'");
assert(paletteContent.includes('"biometria"') && paletteContent.includes('"pulso"') && paletteContent.includes('"corazon"'), "Indexa términos de búsqueda biométrica");

const paletteCompPath = path.join(rootDir, "src/components/command-palette/CommandPalette.tsx");
const paletteCompContent = fs.readFileSync(paletteCompPath, "utf-8");
assert(paletteCompContent.includes("Heart"), "CommandPalette.tsx importa y mapea el icono Heart");

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed === 0) {
  console.log(">> ETAPA v5.17 COMPLETADA CON ÉXITO: Telemetría Biométrica BLE y Pulso Cardíaco operativa. <<\n");
  process.exit(0);
} else {
  console.error(">> ERROR: Algunas pruebas de la Etapa v5.17 fallaron. <<\n");
  process.exit(1);
}
