import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

console.log("================================================================================");
console.log("   TEST SUITE: STUDYLAB ETAPA v5.28 (DESKTOP NATIVO TAURI & WINDOWS BUILD)      ");
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
// [Test 1] Manifiesto y Configuración de Tauri 2.0 (tauri.conf.json)
// -----------------------------------------------------------------------------
console.log("[Test 1] Manifiesto y Configuración de Tauri 2.0 (tauri.conf.json)");

const confFile = path.join(rootDir, "src-tauri", "tauri.conf.json");

test("Existe src-tauri/tauri.conf.json y es un JSON válido", () => {
  assert.ok(fs.existsSync(confFile), "El archivo tauri.conf.json debe existir");
  const raw = fs.readFileSync(confFile, "utf-8");
  const conf = JSON.parse(raw);
  assert.equal(conf.productName, "StudyLab", "El nombre del producto debe ser StudyLab");
  assert.equal(conf.identifier, "com.studylab.desktop", "El identificador debe ser com.studylab.desktop");
  assert.equal(conf.build.frontendDist, "../dist", "frontendDist debe apuntar a ../dist");
});

const conf = JSON.parse(fs.readFileSync(confFile, "utf-8"));

test("Configuración de ventana principal define dimensiones de escritorio óptimas", () => {
  assert.ok(conf.app && conf.app.windows && conf.app.windows.length > 0, "Debe tener al menos una ventana");
  const win = conf.app.windows[0];
  assert.equal(win.title, "StudyLab", "El título de la ventana debe ser StudyLab");
  assert.ok(win.minWidth >= 960, "minWidth debe ser al menos 960");
  assert.ok(win.minHeight >= 640, "minHeight debe ser al menos 640");
});

test("Configuración de empaquetado (bundle) activa con iconos para Windows (.ico, .png)", () => {
  assert.ok(conf.bundle && conf.bundle.active, "El bundle debe estar activo");
  assert.ok(Array.isArray(conf.bundle.icon), "Debe incluir arreglo de iconos");
  assert.ok(conf.bundle.icon.some((i) => i.endsWith(".ico")), "Debe incluir icono .ico para Windows");
});

// -----------------------------------------------------------------------------
// [Test 2] Permisos y Capacidades de Tauri (capabilities/default.json)
// -----------------------------------------------------------------------------
console.log("\n[Test 2] Permisos y Capacidades de Tauri (capabilities/default.json)");

const capFile = path.join(rootDir, "src-tauri", "capabilities", "default.json");

test("Existe src-tauri/capabilities/default.json con permisos core, sql y dialog", () => {
  assert.ok(fs.existsSync(capFile), "El archivo default.json debe existir");
  const cap = JSON.parse(fs.readFileSync(capFile, "utf-8"));
  assert.ok(cap.permissions.includes("core:default"), "Debe tener permiso core:default");
  assert.ok(cap.permissions.includes("sql:default"), "Debe tener permiso sql:default");
  assert.ok(cap.permissions.includes("dialog:default"), "Debe tener permiso dialog:default");
});

// -----------------------------------------------------------------------------
// [Test 3] Cargo.toml y Backend Nativo Rust (src-tauri)
// -----------------------------------------------------------------------------
console.log("\n[Test 3] Cargo.toml y Backend Nativo Rust (src-tauri)");

const cargoFile = path.join(rootDir, "src-tauri", "Cargo.toml");

test("Existe src-tauri/Cargo.toml y declara dependencias de Tauri 2 y Plugins", () => {
  assert.ok(fs.existsSync(cargoFile), "El archivo Cargo.toml debe existir");
  const cargoSrc = fs.readFileSync(cargoFile, "utf-8");
  assert.ok(cargoSrc.includes("tauri ="), "Debe declarar dependencia tauri");
  assert.ok(cargoSrc.includes("tauri-plugin-sql"), "Debe declarar tauri-plugin-sql");
  assert.ok(cargoSrc.includes("tauri-plugin-dialog"), "Debe declarar tauri-plugin-dialog");
  assert.ok(cargoSrc.includes("notify ="), "Debe declarar notify para monitoreo de disco");
});

const libRsFile = path.join(rootDir, "src-tauri", "src", "lib.rs");

test("src-tauri/src/lib.rs conecta módulos nativos: filesystem, watcher, job_queue y context", () => {
  assert.ok(fs.existsSync(libRsFile), "El archivo lib.rs debe existir");
  const libSrc = fs.readFileSync(libRsFile, "utf-8");
  assert.ok(libSrc.includes("pub mod filesystem;"), "Debe exportar filesystem");
  assert.ok(libSrc.includes("pub mod watcher;"), "Debe exportar watcher");
  assert.ok(libSrc.includes("pub mod job_queue;"), "Debe exportar job_queue");
  assert.ok(libSrc.includes("pub mod desktop_context;"), "Debe exportar desktop_context");
  assert.ok(libSrc.includes("tauri::generate_handler!"), "Debe registrar invocación de comandos Tauri");
});

// -----------------------------------------------------------------------------
// [Test 4] Binario Nativo Compilado (.exe) y Distribución Frontend (dist/)
// -----------------------------------------------------------------------------
console.log("\n[Test 4] Binario Nativo Compilado (.exe) y Distribución Frontend (dist/)");

const exeRelease = path.join(rootDir, "src-tauri", "target", "release", "app.exe");
const exeDebug = path.join(rootDir, "src-tauri", "target", "debug", "app.exe");
const exeFile = fs.existsSync(exeRelease) ? exeRelease : exeDebug;

test("Binario ejecutable de Windows (app.exe) compilado con éxito en Rust target", () => {
  assert.ok(fs.existsSync(exeFile), "El binario app.exe debe estar compilado");
  const stats = fs.statSync(exeFile);
  assert.ok(stats.size > 1000000, `El ejecutable debe tener un tamaño sustancial (actual: ${stats.size} bytes)`);
});

const distIndex = path.join(rootDir, "dist", "index.html");

test("Distribución compilada de Vite (dist/index.html) sincronizada con bundle de producción", () => {
  assert.ok(fs.existsSync(distIndex), "dist/index.html debe existir");
  const html = fs.readFileSync(distIndex, "utf-8");
  assert.ok(html.includes("<div id=\"root\"></div>") || html.includes("<div id=\"root\">"), "Debe contener el elemento root montable");
});

// -----------------------------------------------------------------------------
// Resumen de la Suite
// -----------------------------------------------------------------------------
console.log("\n================================================================================");
console.log(`   RESULTADO SUITE v5.28: ${passed} PASADOS | ${failed} FALLADOS`);
console.log("================================================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
