/**
 * Test Suite: StudyLab Visual Cohesion & Design Refinement (Etapa 5)
 * Valida las 10 especificaciones de la experiencia visual y accesibilidad:
 * 1. Definición de paleta de descanso visual (--bg-primary, --bg-secondary, --bg-elevated)
 * 2. Modo oscuro sobrio mate (sin negros puros agresivos a la vista)
 * 3. Estandarización de anillos de foco visible en botones (focus-visible:ring-2)
 * 4. Estandarización de foco en campos de texto (Input, Textarea)
 * 5. Estados vacíos estructurados con diseño académico (EmptyState.tsx)
 * 6. Scrollbar personalizado no invasivo en index.css
 * 7. Tipografía serif académica para encabezados con tracking equilibrado
 * 8. Respeto estricto a prefers-reduced-motion y modo sin animaciones
 * 9. Ausencia de parpadeos o saltos forzados de layout
 * 10. Consistencia de elevación y microbordes (shadow-2xs, border-subtle)
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
  console.log("       TEST SUITE: STUDYLAB REFINAMIENTO VISUAL & COHESIÓN (ETAPA 5)           ");
  console.log("================================================================================");

  // Test 1: Variables de descanso visual en index.css
  {
    console.log("\n[Test 1] Paleta académica de descanso visual");
    const source = fs.readFileSync("src/index.css", "utf8");
    assert(source.includes("--bg-primary: #FAFAF8"), "Fondo claro con tono suave");
    assert(source.includes("--accent-primary: #3B5169"), "Azul pizarra académico configurado");
    assert(source.includes("--border-subtle: #E2E0D8"), "Bordes limpios de descanso visual");
  }

  // Test 2: Modo oscuro mate (sin negros puros)
  {
    console.log("\n[Test 2] Modo oscuro sobrio mate");
    const source = fs.readFileSync("src/index.css", "utf8");
    assert(source.includes(".dark"), "Selector .dark presente");
    assert(source.includes("--bg-primary: #18181A"), "Usa grafito mate en lugar de #000000");
  }

  // Test 3: Focus-visible en Button.tsx
  {
    console.log("\n[Test 3] Anillos de foco accesible en Button.tsx");
    const source = fs.readFileSync("src/components/ui/Button.tsx", "utf8");
    assert(source.includes("focus-visible:ring-2"), "Contiene focus-visible:ring-2");
    assert(source.includes("focus-visible:ring-offset-2"), "Contiene offset de separación de anillo");
  }

  // Test 4: Focus-visible en Input.tsx
  {
    console.log("\n[Test 4] Anillos de foco accesible en Input.tsx y Textarea");
    const source = fs.readFileSync("src/components/ui/Input.tsx", "utf8");
    assert(source.includes("focus-visible:ring-2"), "Input contiene focus-visible:ring-2");
    assert(source.includes("focus-visible:ring-accent-primary/20"), "Textarea contiene anillo suave de acento");
  }

  // Test 5: EmptyState refinado
  {
    console.log("\n[Test 5] EmptyState académico y accesible");
    const source = fs.readFileSync("src/components/EmptyState.tsx", "utf8");
    assert(source.includes("border-dashed"), "Borde delimitador suave");
    assert(source.includes("bg-accent-primary/10"), "Icono con cápsula de color de acento");
    assert(source.includes("font-serif"), "Título con tipografía académica serif");
  }

  // Test 6: Scrollbars estilizados
  {
    console.log("\n[Test 6] Scrollbars integrados y discretos");
    const source = fs.readFileSync("src/index.css", "utf8");
    assert(source.includes("::-webkit-scrollbar"), "Regla de scrollbar presente");
    assert(source.includes("width: 8px"), "Ancho de barra delgado y no obstructivo");
  }

  // Test 7: Jerarquía tipográfica serif para títulos
  {
    console.log("\n[Test 7] Tipografía serif para títulos");
    const source = fs.readFileSync("src/index.css", "utf8");
    assert(source.includes("font-family: var(--font-serif)"), "Encabezados configurados con font-serif");
  }

  // Test 8: Soporte a prefers-reduced-motion
  {
    console.log("\n[Test 8] Accesibilidad de movimiento reducido");
    const source = fs.readFileSync("src/index.css", "utf8");
    assert(source.includes("@media (prefers-reduced-motion: reduce)"), "Media query de movimiento reducido");
    assert(source.includes(".reduced-motion *"), "Clase manual .reduced-motion");
    assert(source.includes("animation-duration: 0.01ms !important"), "Fuerza transiciones instantáneas");
  }

  // Test 9: Cohesión de Card.tsx
  {
    console.log("\n[Test 9] Cohesión estructural en Card.tsx");
    const source = fs.readFileSync("src/components/ui/Card.tsx", "utf8");
    assert(source.includes("shadow-2xs"), "Sombra mínima y elegante");
    assert(source.includes("font-serif"), "CardTitle con estilo serif");
  }

  // Test 10: Rendimiento de renderizado sin layout thrashing
  {
    console.log("\n[Test 10] Simulación de estabilidad de clases de componentes UI");
    const buttonSource = fs.readFileSync("src/components/ui/Button.tsx", "utf8");
    const inputSource = fs.readFileSync("src/components/ui/Input.tsx", "utf8");
    assert(!buttonSource.includes("style="), "Button utiliza clases puras de Tailwind sin estilos inline costosos");
    assert(!inputSource.includes("style="), "Input utiliza clases puras de Tailwind sin estilos inline costosos");
  }

  console.log("\n================================================================================");
  console.log("            RESULTADO: 10/10 TESTS PASARON EXITOSAMENTE                        ");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Error fatal en suite de refinamiento visual:", err);
  process.exit(1);
});
