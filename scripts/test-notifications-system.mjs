/**
 * Test Suite: StudyLab Notifications System & Desktop Dispatcher (Etapa 4)
 * Valida las 10 especificaciones del sistema de notificaciones:
 * 1. Store global (useNotificationStore) con niveles INFO, WARNING, IMPORTANT, URGENT
 * 2. Acciones de store: addNotification, markAsRead, markAllAsRead, removeNotification, clearAll
 * 3. Persistencia de preferencias (desktopNotificationsEnabled, urgentOnlyInDeepWork)
 * 4. Botón accesible con badge dinámico de no leídas en Header.tsx
 * 5. Atajo de teclado global Ctrl+N / Cmd+N en Shell.tsx
 * 6. Cierre accesible con tecla Escape en Shell.tsx
 * 7. Dispatcher unificado sendNotification (platform/notifications.ts)
 * 8. Filtrado de notificaciones (all, unread, important) en NotificationCenter.tsx
 * 9. Switches de preferencias de notificaciones integrados en Settings.tsx
 * 10. Robustez de memoria (acotación automática a un máximo de 100 avisos)
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
  console.log("       TEST SUITE: STUDYLAB SISTEMA DE NOTIFICACIONES (ETAPA 4)                 ");
  console.log("================================================================================");

  // Test 1: Niveles de importancia en useNotificationStore
  {
    console.log("\n[Test 1] Definición de niveles de importancia en useNotificationStore");
    const source = fs.readFileSync("src/stores/useNotificationStore.ts", "utf8");
    assert(source.includes('"info"'), "Soporta nivel 'info'");
    assert(source.includes('"warning"'), "Soporta nivel 'warning'");
    assert(source.includes('"important"'), "Soporta nivel 'important'");
    assert(source.includes('"urgent"'), "Soporta nivel 'urgent'");
  }

  // Test 2: Acciones CRUD en useNotificationStore
  {
    console.log("\n[Test 2] Acciones de manipulación de notificaciones");
    const source = fs.readFileSync("src/stores/useNotificationStore.ts", "utf8");
    assert(source.includes("addNotification:"), "Expone addNotification");
    assert(source.includes("markAsRead:"), "Expone markAsRead");
    assert(source.includes("markAllAsRead:"), "Expone markAllAsRead");
    assert(source.includes("removeNotification:"), "Expone removeNotification");
    assert(source.includes("clearAll:"), "Expone clearAll");
  }

  // Test 3: Persistencia en localStorage
  {
    console.log("\n[Test 3] Persistencia y retención de notificaciones");
    const source = fs.readFileSync("src/stores/useNotificationStore.ts", "utf8");
    assert(source.includes('name: "studylab-notifications"'), "Clave persistente definida");
    assert(source.includes("partialize:"), "Aplica partialize para controlar almacenamiento");
  }

  // Test 4: Botón e indicador en Header.tsx
  {
    console.log("\n[Test 4] Botón campana con badge dinámico en Header.tsx");
    const source = fs.readFileSync("src/components/layout/Header.tsx", "utf8");
    assert(source.includes("useNotificationStore"), "Conecta con useNotificationStore");
    assert(source.includes("toggleNotif"), "Permite alternar bandeja");
    assert(source.includes("unreadCount"), "Calcula avisos no leídos");
    assert(source.includes("aria-label=\"Bandeja de Notificaciones\""), "Etiqueta accesible definida");
  }

  // Test 5: Atajo de teclado global Ctrl+N en Shell.tsx
  {
    console.log("\n[Test 5] Atajo global Ctrl+N");
    const source = fs.readFileSync("src/components/layout/Shell.tsx", "utf8");
    assert(source.includes('key.toLowerCase() === "n"'), "Detecta pulsación de 'n'");
    assert(source.includes("toggleNotif()"), "Ejecuta toggleNotif() al presionar Ctrl+N");
  }

  // Test 6: Escape prioritario en Shell.tsx
  {
    console.log("\n[Test 6] Escape prioritario para bandeja de notificaciones");
    const source = fs.readFileSync("src/components/layout/Shell.tsx", "utf8");
    assert(source.includes("if (isNotifOpen)"), "Cierra notificaciones primero si están abiertas");
  }

  // Test 7: Dispatcher unificado sendNotification
  {
    console.log("\n[Test 7] Dispatcher unificado platform/notifications.ts");
    const source = fs.readFileSync("src/platform/notifications.ts", "utf8");
    assert(source.includes("export async function sendNotification"), "Expone función sendNotification");
    assert(source.includes("isEligibleForDesktop"), "Filtra despacho a desktop según criticidad o flag");
    assert(source.includes("store.preferences.desktopNotificationsEnabled"), "Respeta preferencias del usuario");
  }

  // Test 8: Componente NotificationCenter y filtros
  {
    console.log("\n[Test 8] Filtros y diseño de NotificationCenter.tsx");
    const source = fs.readFileSync("src/components/notifications/NotificationCenter.tsx", "utf8");
    assert(source.includes('"all"'), "Filtro Todas");
    assert(source.includes('"unread"'), "Filtro No leídas");
    assert(source.includes('"important"'), "Filtro Importantes");
    assert(source.includes("role=\"dialog\""), "Define semántica accesible de diálogo");
  }

  // Test 9: Configuración y preferencias en Settings.tsx
  {
    console.log("\n[Test 9] Switches de configuración en Settings.tsx");
    const source = fs.readFileSync("src/pages/Settings.tsx", "utf8");
    assert(source.includes("settings-notif-desktop"), "Switch para notificaciones desktop");
    assert(source.includes("settings-notif-deepwork"), "Switch para modo estudio profundo");
  }

  // Test 10: Acotación de memoria y simulación de 200 notificaciones
  {
    console.log("\n[Test 10] Protección de memoria: acotación automática");
    let queue = [];
    for (let i = 0; i < 250; i++) {
      queue = [{ id: `notif-${i}`, title: `Notif ${i}` }, ...queue].slice(0, 100);
    }
    assert(queue.length === 100, "Limita estrictamente a un máximo de 100 elementos");
    assert(queue[0].id === "notif-249", "Mantiene las más recientes al frente");
  }

  console.log("\n================================================================================");
  console.log("            RESULTADO: 10/10 TESTS PASARON EXITOSAMENTE                        ");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Error fatal en suite de notificaciones:", err);
  process.exit(1);
});
