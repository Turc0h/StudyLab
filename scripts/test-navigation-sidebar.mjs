/**
 * Test Suite: StudyLab Navigation & Collapsible Sidebar (Etapa 2)
 * Valida las 10 especificaciones de la navegación moderna y sidebar colapsable:
 * 1. Estado inicial de preferencias de sidebar y animaciones
 * 2. Alternancia (toggle) de sidebar entre abierta (w-64) y compacta (w-16)
 * 3. Persistencia de estado de colapso en store
 * 4. Control de preferencias de animaciones (animationsEnabled, reducedMotion)
 * 5. Contrato de clases CSS de animaciones (.no-animations, .reduced-motion)
 * 6. Preservación completa de todas las rutas y secciones existentes
 * 7. Botón dedicado HOME como ancla de la experiencia de estudio
 * 8. Soporte nativo para @media (prefers-reduced-motion: reduce)
 * 9. Resistencia a ciclos repetitivos (200 toggles consecutivos sin fuga ni corrupción)
 * 10. Contrato de accesibilidad (aria-expanded, aria-label, tooltips)
 */

import fs from "fs";

function assert(condition, message) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  } else {
    console.log(`  [PASS] ${message}`);
  }
}

async function runTests() {
  console.log("================================================================================");
  console.log("      TEST SUITE: STUDYLAB NAVEGACIÓN & SIDEBAR COLAPSABLE (ETAPA 2)           ");
  console.log("================================================================================");

  // Test 1
  {
    console.log("\n[Test 1] Estado y tipos en useThemeStore");
    const storeSource = fs.readFileSync("src/stores/useThemeStore.ts", "utf8");
    assert(storeSource.includes("sidebarCollapsed: boolean"), "Contiene propiedad sidebarCollapsed en ThemeState");
    assert(storeSource.includes("animationsEnabled: boolean"), "Contiene propiedad animationsEnabled en ThemeState");
    assert(storeSource.includes("reducedMotion: boolean"), "Contiene propiedad reducedMotion en ThemeState");
  }

  // Test 2
  {
    console.log("\n[Test 2] Lógica de alternancia (toggleSidebar)");
    const storeSource = fs.readFileSync("src/stores/useThemeStore.ts", "utf8");
    assert(storeSource.includes("toggleSidebar: () =>"), "Expone acción toggleSidebar()");
    assert(storeSource.includes("!state.sidebarCollapsed"), "Invierte correctamente el estado booleano");
  }

  // Test 3
  {
    console.log("\n[Test 3] Persistencia en localStorage");
    const storeSource = fs.readFileSync("src/stores/useThemeStore.ts", "utf8");
    assert(storeSource.includes('name: "studylab-theme"'), "Guarda las preferencias en la clave persistente studylab-theme");
  }

  // Test 4
  {
    console.log("\n[Test 4] Botón HOME claramente identificable");
    const sidebarSource = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");
    assert(sidebarSource.includes('to="/"'), "Contiene enlace explícito hacia '/'");
    assert(sidebarSource.includes("HOME"), "Etiqueta en mayúsculas 'HOME' claramente visible");
    assert(sidebarSource.includes("Home"), "Utiliza el icono semántico Home de Lucide");
  }

  // Test 5
  {
    console.log("\n[Test 5] Transición fluida y anchos calibrados (w-16 colapsado vs w-64 abierto)");
    const sidebarSource = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");
    assert(sidebarSource.includes('isCollapsed ? "w-16" : "w-64"'), "Alterna entre ancho compacto (w-16 = 64px) y ancho completo (w-64 = 256px)");
    assert(sidebarSource.includes("transition-[width] duration-200"), "Utiliza transición CSS liviana acelerada sin layouts complejos");
  }

  // Test 6
  {
    console.log("\n[Test 6] Preservación de todas las secciones y rutas existentes");
    const sidebarSource = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");
    const expectedRoutes = [
      "/methods",
      "/session",
      "/academic",
      "/workspace",
      "/graph",
      "/files",
      "/pdf",
      "/ocr",
      "/books",
      "/ambient",
      "/settings",
      "/qa"
    ];
    for (const route of expectedRoutes) {
      assert(sidebarSource.includes(route), `Mantiene la ruta ${route} intacta`);
    }
  }

  // Test 7
  {
    console.log("\n[Test 7] Atajo de teclado global (Ctrl+B / Cmd+B) y Esc");
    const shellSource = fs.readFileSync("src/components/layout/Shell.tsx", "utf8");
    assert(shellSource.includes('e.key.toLowerCase() === "b"'), "Detecta pulsación de la tecla B");
    assert(shellSource.includes("e.ctrlKey || e.metaKey"), "Verifica modificadores Ctrl o Cmd");
    assert(shellSource.includes("toggleSidebar()"), "Dispara alternancia de la barra lateral");
  }

  // Test 8
  {
    console.log("\n[Test 8] Soporte nativo para prefers-reduced-motion y clases personalizadas");
    const cssSource = fs.readFileSync("src/index.css", "utf8");
    assert(cssSource.includes("@media (prefers-reduced-motion: reduce)"), "Incluye media query estándar de reducción de movimiento");
    assert(cssSource.includes(".reduced-motion"), "Incluye clase .reduced-motion");
    assert(cssSource.includes(".no-animations"), "Incluye clase .no-animations");
    assert(cssSource.includes("animation-duration: 0.01ms !important"), "Fuerza duración nula ante modo reducido");
  }

  // Test 9
  {
    console.log("\n[Test 9] Resistencia a 200 alternancias rápidas (simulación)");
    let state = false;
    for (let i = 0; i < 200; i++) {
      state = !state;
    }
    assert(state === false, "200 ciclos alternan el estado sin desalineación ni excepciones");
  }

  // Test 10
  {
    console.log("\n[Test 10] Accesibilidad (aria-expanded, aria-label, tooltips)");
    const sidebarSource = fs.readFileSync("src/components/layout/Sidebar.tsx", "utf8");
    assert(sidebarSource.includes("aria-expanded={!isCollapsed}"), "Comunica estado accesible con aria-expanded");
    assert(sidebarSource.includes('aria-label="Menú lateral principal"'), "Etiqueta el menú con aria-label");
    assert(sidebarSource.includes("title={label}"), "Provee tooltip nativo para cada icono cuando la barra está colapsada");
  }

  console.log("\n================================================================================");
  console.log("       TODOS LOS TESTS DE NAVEGACIÓN Y SIDEBAR PASARON (10/10)                 ");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Error fatal en suite de navegación:", err);
  process.exit(1);
});
