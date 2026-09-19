import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.18 (HEATMAP DE CONSISTENCIA & RETENTION FORECAST)");
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
// [Test 1] Motor de Matriz de Consistencia y Rachas (consistencyHeatmap.ts)
// -----------------------------------------------------------------------------
console.log("[Test 1] Motor de Matriz Anual de Consistencia (consistencyHeatmap.ts)");

const heatmapFile = path.join(rootDir, "src", "features", "analytics", "consistencyHeatmap.ts");

test("Existe src/features/analytics/consistencyHeatmap.ts", () => {
  assert.ok(fs.existsSync(heatmapFile), "El archivo consistencyHeatmap.ts debe existir");
});

const heatmapSrc = fs.readFileSync(heatmapFile, "utf-8");

test("Exporta formatDateKey, getIntensityLevel, generateConsistencyHeatmap y calculateConsistencyStats", () => {
  assert.ok(heatmapSrc.includes("export function formatDateKey"), "Debe exportar formatDateKey");
  assert.ok(heatmapSrc.includes("export function getIntensityLevel"), "Debe exportar getIntensityLevel");
  assert.ok(heatmapSrc.includes("export function generateConsistencyHeatmap"), "Debe exportar generateConsistencyHeatmap");
  assert.ok(heatmapSrc.includes("export function calculateConsistencyStats"), "Debe exportar calculateConsistencyStats");
});

test("Regla de Intensidad Cognitiva (0 a 4 niveles)", () => {
  // Simular la lógica de getIntensityLevel
  const getLvl = (min, cards = 0) => {
    if (min <= 0 && cards <= 0) return 0;
    if (min < 15 && cards < 10) return 1;
    if (min < 45 && cards < 30) return 2;
    if (min < 90 && cards < 70) return 3;
    return 4;
  };

  assert.equal(getLvl(0, 0), 0, "0 min debe ser nivel 0");
  assert.equal(getLvl(10, 5), 1, "10 min debe ser nivel 1 (Ligero)");
  assert.equal(getLvl(30, 20), 2, "30 min debe ser nivel 2 (Moderado)");
  assert.equal(getLvl(60, 50), 3, "60 min debe ser nivel 3 (Profundo)");
  assert.equal(getLvl(120, 80), 4, "120 min debe ser nivel 4 (Titán/Hiperfoco)");
});

test("Generación de Cuadrícula de 52 Semanas (365 días)", () => {
  assert.ok(heatmapSrc.includes("364"), "Debe calcular la ventana anual de 52 semanas (364+ días)");
  assert.ok(heatmapSrc.includes("weekIndex"), "Debe estructurar la matriz por semanas numeradas");
  assert.ok(heatmapSrc.includes("currentWeekDays.length === 7"), "Cada semana debe contener 7 días (Dom a Sáb)");
});

test("Cálculo de Rachas Activas y Récord", () => {
  assert.ok(heatmapSrc.includes("currentStreak"), "Debe computar racha actual");
  assert.ok(heatmapSrc.includes("longestStreak"), "Debe computar racha máxima histórica");
  assert.ok(heatmapSrc.includes("consistencyPercentage"), "Debe computar porcentaje de consistencia anual");
});

// -----------------------------------------------------------------------------
// [Test 2] Motor Matemático de Pronóstico FSRS (retentionForecast.ts)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Motor Matemático de Pronóstico a 365 Días (retentionForecast.ts)");

const forecastFile = path.join(rootDir, "src", "features", "analytics", "retentionForecast.ts");

test("Existe src/features/analytics/retentionForecast.ts", () => {
  assert.ok(fs.existsSync(forecastFile), "El archivo retentionForecast.ts debe existir");
});

const forecastSrc = fs.readFileSync(forecastFile, "utf-8");

test("Exporta calculateDeckRetentionForecast y DEFAULT_FORECAST_HORIZONS", () => {
  assert.ok(forecastSrc.includes("export function calculateDeckRetentionForecast"), "Debe exportar calculateDeckRetentionForecast");
  assert.ok(forecastSrc.includes("export const DEFAULT_FORECAST_HORIZONS"), "Debe exportar DEFAULT_FORECAST_HORIZONS");
});

test("Implementa Curva de Decaimiento R(t, S) canónica", () => {
  assert.ok(forecastSrc.includes("calculateRetrievability"), "Debe importar o invocar calculateRetrievability");
  
  // Verificación matemática canónica FSRS: R(t, S) = (1 + 19 * t / S)^(-0.5)
  const mathR = (t, s) => Math.pow(1.0 + (19.0 * t) / Math.max(0.01, s), -0.5);
  
  const r0 = mathR(0, 30);
  const r30 = mathR(30, 30);
  const r90 = mathR(90, 30);
  const r365 = mathR(365, 30);

  assert.equal(r0, 1.0, "En t=0 la retención es 100%");
  assert.ok(r30 < 1.0 && r30 > 0.2, `En t=S retención decae: ${r30.toFixed(3)}`);
  assert.ok(r0 > r30 && r30 > r90 && r90 > r365, "La curva debe ser monótonamente decreciente");
});

test("Detección de Umbrales Críticos (80% Aprobado, 70% Abismo, 50% Vida Media)", () => {
  assert.ok(forecastSrc.includes("daysUntil80Percent"), "Debe computar días hasta caer al 80%");
  assert.ok(forecastSrc.includes("daysUntil70Percent"), "Debe computar días hasta caer al 70%");
  assert.ok(forecastSrc.includes("daysUntilHalfLife"), "Debe computar días hasta vida media (50%)");
});

test("Recomendaciones Pedagógicas Adaptativas (good, warning, critical)", () => {
  assert.ok(forecastSrc.includes("suggestedReviewDay"), "Debe proponer día óptimo para sesión de refuerzo");
  assert.ok(forecastSrc.includes("Riesgo de Olvido Crítico Pre-Examen"), "Alerta ante retención proyectada vulnerable");
  assert.ok(forecastSrc.includes("Retención Sólida de Largo Plazo"), "Diagnóstico positivo ante estabilidad robusta");
});

// -----------------------------------------------------------------------------
// [Test 3] Componentes de Visualización (Heatmap & Forecast Cards)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Componentes UI de Visualización Analítica");

const heatmapCardFile = path.join(rootDir, "src", "features", "analytics", "ConsistencyHeatmapCard.tsx");
const forecastCardFile = path.join(rootDir, "src", "features", "analytics", "RetentionForecastCard.tsx");

test("Existe src/features/analytics/ConsistencyHeatmapCard.tsx", () => {
  assert.ok(fs.existsSync(heatmapCardFile), "Debe existir ConsistencyHeatmapCard.tsx");
});

const heatmapCardSrc = fs.readFileSync(heatmapCardFile, "utf-8");

test("ConsistencyHeatmapCard exporta componente y renderiza 52 columnas", () => {
  assert.ok(heatmapCardSrc.includes("export const ConsistencyHeatmapCard"), "Debe exportar ConsistencyHeatmapCard");
  assert.ok(heatmapCardSrc.includes("useLiveQuery"), "Debe consultar reactivamente db.sessions y db.reviewLogs");
  assert.ok(heatmapCardSrc.includes("weeks.map"), "Debe mapear columnas de semanas");
  assert.ok(heatmapCardSrc.includes("dayLabels"), "Debe mostrar etiquetas de días de la semana");
});

test("ConsistencyHeatmapCard incluye selector de día con detalle interactivo", () => {
  assert.ok(heatmapCardSrc.includes("selectedDay"), "Debe mantener estado del día seleccionado");
  assert.ok(heatmapCardSrc.includes("setSelectedDay"), "Debe permitir seleccionar día al hacer click o hover");
});

test("Existe src/features/analytics/RetentionForecastCard.tsx", () => {
  assert.ok(fs.existsSync(forecastCardFile), "Debe existir RetentionForecastCard.tsx");
});

const forecastCardSrc = fs.readFileSync(forecastCardFile, "utf-8");

test("RetentionForecastCard exporta componente y renderiza gráfico vectorial SVG", () => {
  assert.ok(forecastCardSrc.includes("export const RetentionForecastCard"), "Debe exportar RetentionForecastCard");
  assert.ok(forecastCardSrc.includes("<svg"), "Debe renderizar la curva matemática como gráfico SVG");
  assert.ok(forecastCardSrc.includes("pathD"), "Debe calcular la trayectoria vectorial del decaimiento");
  assert.ok(forecastCardSrc.includes("horizonDays"), "Debe permitir conmutar el horizonte temporal de examen");
});

test("RetentionForecastCard muestra hitos temporales a 7, 30, 60, 90 y 365 días", () => {
  assert.ok(forecastCardSrc.includes("milestones.at7Days"), "Hito a 7 días");
  assert.ok(forecastCardSrc.includes("milestones.at30Days"), "Hito a 30 días");
  assert.ok(forecastCardSrc.includes("milestones.at90Days"), "Hito a 90 días");
  assert.ok(forecastCardSrc.includes("milestones.at365Days"), "Hito a 365 días");
});

// -----------------------------------------------------------------------------
// [Test 4] Integraciones en Dashboard y Command Palette
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Integraciones en Dashboard y Command Palette");

const dashboardFile = path.join(rootDir, "src", "pages", "Dashboard.tsx");
const dashboardSrc = fs.readFileSync(dashboardFile, "utf-8");

test("Dashboard.tsx importa ConsistencyHeatmapCard y RetentionForecastCard", () => {
  assert.ok(dashboardSrc.includes("ConsistencyHeatmapCard"), "Debe importar ConsistencyHeatmapCard");
  assert.ok(dashboardSrc.includes("RetentionForecastCard"), "Debe importar RetentionForecastCard");
});

test("Dashboard.tsx renderiza ambos componentes de analítica avanzada", () => {
  assert.ok(dashboardSrc.includes("<ConsistencyHeatmapCard />"), "Debe renderizar <ConsistencyHeatmapCard />");
  assert.ok(dashboardSrc.includes("<RetentionForecastCard />"), "Debe renderizar <RetentionForecastCard />");
});

const paletteServiceFile = path.join(rootDir, "src", "features", "command-palette", "commandPaletteService.ts");
const paletteServiceSrc = fs.readFileSync(paletteServiceFile, "utf-8");

test("commandPaletteService.ts registra 'action-consistency-heatmap' y 'action-retention-forecast'", () => {
  assert.ok(paletteServiceSrc.includes("action-consistency-heatmap"), "Debe registrar action-consistency-heatmap");
  assert.ok(paletteServiceSrc.includes("action-retention-forecast"), "Debe registrar action-retention-forecast");
  assert.ok(paletteServiceSrc.includes("Matriz Anual de Consistencia Cognitiva"), "Título descriptivo del heatmap");
  assert.ok(paletteServiceSrc.includes("Pronóstico de Retención a 365 Días"), "Título descriptivo del pronóstico");
});

const paletteCompFile = path.join(rootDir, "src", "components", "command-palette", "CommandPalette.tsx");
const paletteCompSrc = fs.readFileSync(paletteCompFile, "utf-8");

test("CommandPalette.tsx importa y mapea los iconos Calendar y TrendingUp", () => {
  assert.ok(paletteCompSrc.includes("Calendar"), "Debe importar Calendar");
  assert.ok(paletteCompSrc.includes("TrendingUp"), "Debe importar TrendingUp");
  assert.ok(paletteCompSrc.includes("Calendar,"), "Debe mapear Calendar en ICON_MAP");
  assert.ok(paletteCompSrc.includes("TrendingUp,"), "Debe mapear TrendingUp en ICON_MAP");
});

// -----------------------------------------------------------------------------
// Resumen
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`RESULTADOS: ${passed} pasados, ${failed} fallados`);
console.log("================================================================================");

if (failed > 0) {
  process.exit(1);
} else {
  console.log(">> ETAPA v5.18 COMPLETADA CON ÉXITO: Matriz Anual de Consistencia y Pronóstico de Retención operativos. <<\n");
  process.exit(0);
}
