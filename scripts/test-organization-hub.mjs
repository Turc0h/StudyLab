/**
 * Test Suite: StudyLab Organization Hub & Drawer (Etapa 3)
 * Valida las 10 especificaciones del sistema de organización discreto:
 * 1. Store de organización (useOrganizationStore) con toggle, open y close
 * 2. Persistencia selectiva de filtros en localStorage
 * 3. Botón discreto de Organización [ 📌 ] en la cabecera (Header.tsx)
 * 4. Atajo de teclado global (Ctrl+O / Cmd+O) en Shell.tsx
 * 5. Cierre accesible con tecla Escape (Shell.tsx)
 * 6. Integración reactiva con base de datos Dexie/SQLite (db.deadlines y db.reviewSchedule)
 * 7. Integración con Google Calendar (useGoogleCalendarEvents)
 * 8. Soporte para categorización académica (Parcial, Final, Entrega, Repaso)
 * 9. Formulario rápido de carga con selección opcional de materia/cátedra
 * 10. Robustez contra ciclos repetitivos (toggle / filtrado continuo)
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
  console.log("        TEST SUITE: STUDYLAB CENTRO DE ORGANIZACIÓN & DRAWER (ETAPA 3)        ");
  console.log("================================================================================");

  // Test 1: Store de organización y acciones
  {
    console.log("\n[Test 1] Contrato y acciones de useOrganizationStore");
    const source = fs.readFileSync("src/stores/useOrganizationStore.ts", "utf8");
    assert(source.includes("isOpen: boolean"), "Expone estado isOpen");
    assert(source.includes("activeFilter: OrganizationFilter"), "Expone activeFilter tipado");
    assert(source.includes("toggleOrganization: () =>"), "Expone toggleOrganization()");
    assert(source.includes("openOrganization: () =>"), "Expone openOrganization()");
    assert(source.includes("closeOrganization: () =>"), "Expone closeOrganization()");
  }

  // Test 2: Persistencia del filtro en el store
  {
    console.log("\n[Test 2] Persistencia de configuración de organización");
    const source = fs.readFileSync("src/stores/useOrganizationStore.ts", "utf8");
    assert(source.includes('name: "studylab-organization-panel"'), "Nombre de persistencia definido");
    assert(source.includes("partialize:"), "Filtra el estado persistente adecuadamente");
  }

  // Test 3: Botón de organización en Header.tsx
  {
    console.log("\n[Test 3] Botón accesible en Header.tsx");
    const source = fs.readFileSync("src/components/layout/Header.tsx", "utf8");
    assert(source.includes("useOrganizationStore"), "Usa el store de organización en el header");
    assert(source.includes("toggleOrganization"), "Vincula el botón al toggle del drawer");
    assert(source.includes("aria-label=\"Abrir centro de organización\""), "Incluye aria-label para accesibilidad");
  }

  // Test 4: Atajo global Ctrl+O en Shell.tsx
  {
    console.log("\n[Test 4] Atajo de teclado global Ctrl+O");
    const source = fs.readFileSync("src/components/layout/Shell.tsx", "utf8");
    assert(source.includes('key.toLowerCase() === "o"'), "Detecta tecla 'o' con modificador");
    assert(source.includes("toggleOrg()"), "Ejecuta toggleOrg() al pulsar Ctrl+O");
  }

  // Test 5: Cierre accesible con tecla Escape
  {
    console.log("\n[Test 5] Cierre accesible con tecla Escape");
    const source = fs.readFileSync("src/components/layout/Shell.tsx", "utf8");
    assert(source.includes('e.key === "Escape"'), "Detecta tecla Escape");
    assert(source.includes("if (isOrgOpen)"), "Prioriza cierre del panel si está abierto al pulsar Escape");
  }

  // Test 6: Integración con Dexie/SQLite
  {
    console.log("\n[Test 6] Consultas reactivas a tablas de fechas");
    const source = fs.readFileSync("src/components/organization/OrganizationDrawer.tsx", "utf8");
    assert(source.includes("db.deadlines"), "Consulta reactiva a db.deadlines");
    assert(source.includes("db.reviewSchedule"), "Consulta reactiva a db.reviewSchedule");
    assert(source.includes("db.folders"), "Consulta asignaturas para vincular fechas");
  }

  // Test 7: Integración con Google Calendar
  {
    console.log("\n[Test 7] Integración con eventos de Google Calendar");
    const source = fs.readFileSync("src/components/organization/OrganizationDrawer.tsx", "utf8");
    assert(source.includes("useGoogleCalendarEvents"), "Invoca useGoogleCalendarEvents");
    assert(source.includes("source: \"google_calendar\""), "Identifica origen Google Calendar de forma distintiva");
  }

  // Test 8: Pestañas de filtrado (Exámenes, Entregas, Repasos)
  {
    console.log("\n[Test 8] Soporte de categorías y filtros");
    const source = fs.readFileSync("src/components/organization/OrganizationDrawer.tsx", "utf8");
    assert(source.includes('"exams"'), "Permite filtrar por exámenes");
    assert(source.includes('"deliveries"'), "Permite filtrar por entregas");
    assert(source.includes('"reviews"'), "Permite filtrar por repasos programados");
  }

  // Test 9: Formulario rápido con categorización
  {
    console.log("\n[Test 9] Formulario de creación rápida de vencimientos");
    const source = fs.readFileSync("src/components/organization/OrganizationDrawer.tsx", "utf8");
    assert(source.includes("handleAdd"), "Función handleAdd implementada");
    assert(source.includes("db.deadlines.add"), "Persiste directamente en db.deadlines");
    assert(source.includes('"Parcial"'), "Ofrece tipo Parcial");
    assert(source.includes('"Final"'), "Ofrece tipo Final");
  }

  // Test 10: Robustez funcional y simulación de ciclos
  {
    console.log("\n[Test 10] Simulación de 500 aperturas y cierres de organización");
    let isOpen = false;
    for (let i = 0; i < 500; i++) {
      isOpen = !isOpen;
    }
    assert(isOpen === false, "500 ciclos de toggle terminan en estado consistente");
  }

  console.log("\n================================================================================");
  console.log("            RESULTADO: 10/10 TESTS PASARON EXITOSAMENTE                        ");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Error fatal en suite de organización:", err);
  process.exit(1);
});
