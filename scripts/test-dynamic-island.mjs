import fs from "fs";
import path from "path";
import assert from "assert";

console.log("=".repeat(80));
console.log("       TEST SUITE: STUDYLAB ISLA DINÁMICA ESTUDIANTIL (ETAPA 2)       ");
console.log("=".repeat(80));

let passCount = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`[Test ${totalTests}] ${name} [PASS]`);
    passCount++;
  } catch (err) {
    console.error(`[Test ${totalTests}] ${name} [FAIL]:`, err.message);
  }
}

const rootDir = process.cwd();
const storePath = path.join(rootDir, "src/stores/useDynamicIslandStore.ts");
const componentPath = path.join(rootDir, "src/components/layout/DynamicIsland.tsx");
const shellPath = path.join(rootDir, "src/components/layout/Shell.tsx");
const settingsPath = path.join(rootDir, "src/pages/Settings.tsx");
const islandWindowPath = path.join(rootDir, "src/platform/islandWindow.ts");
const widgetPagePath = path.join(rootDir, "src/pages/FloatingIslandWidget.tsx");
const appPath = path.join(rootDir, "src/App.tsx");
const tauriConfPath = path.join(rootDir, "src-tauri/tauri.conf.json");
const capPath = path.join(rootDir, "src-tauri/capabilities/default.json");
const windowManagerPath = path.join(rootDir, "src-tauri/src/window_manager.rs");

const storeContent = fs.readFileSync(storePath, "utf-8");
const componentContent = fs.readFileSync(componentPath, "utf-8");
const shellContent = fs.readFileSync(shellPath, "utf-8");
const settingsContent = fs.readFileSync(settingsPath, "utf-8");
const islandWindowContent = fs.readFileSync(islandWindowPath, "utf-8");
const widgetPageContent = fs.readFileSync(widgetPagePath, "utf-8");
const appContent = fs.readFileSync(appPath, "utf-8");
const windowManagerContent = fs.readFileSync(windowManagerPath, "utf-8");
const tauriConfContent = fs.readFileSync(tauriConfPath, "utf-8");
const capContent = fs.readFileSync(capPath, "utf-8");

runTest("Contrato y estado del store useDynamicIslandStore", () => {
  assert(storeContent.includes("enabled: boolean"), "Debe definir enabled");
  assert(storeContent.includes("gameMode: boolean"), "Debe definir gameMode");
  assert(storeContent.includes("desktopWidgetMode: boolean"), "Debe definir desktopWidgetMode");
  assert(storeContent.includes("isExpanded: boolean"), "Debe definir isExpanded");
  assert(storeContent.includes("showClock: boolean"), "Debe definir showClock");
  assert(storeContent.includes("showTimer: boolean"), "Debe definir showTimer");
  assert(storeContent.includes("showReminders: boolean"), "Debe definir showReminders");
  assert(storeContent.includes("reminderFrequency: IslandReminderFrequency"), "Debe definir reminderFrequency");
  assert(storeContent.includes("timerSeconds: number"), "Debe definir timerSeconds");
});

runTest("Persistencia de configuración en localStorage", () => {
  assert(storeContent.includes("studylab-dynamic-island"), "Debe persistir con la clave studylab-dynamic-island");
  assert(storeContent.includes("partialize:"), "Debe filtrar las propiedades persistidas con partialize");
});

runTest("Acciones de control del Temporizador Pomodoro", () => {
  assert(storeContent.includes("startTimer: () =>"), "Debe exponer startTimer");
  assert(storeContent.includes("pauseTimer: () =>"), "Debe exponer pauseTimer");
  assert(storeContent.includes("resetTimer: ("), "Debe exponer resetTimer");
  assert(storeContent.includes("tickTimer: () =>"), "Debe exponer tickTimer");
  assert(storeContent.includes("setTimerMode: ("), "Debe permitir cambiar entre work y break");
});

runTest("Física de animación fluida y tokens de movimiento en DynamicIsland.tsx", () => {
  assert(componentContent.includes("motion/react"), "Debe importar motion/react");
  assert(componentContent.includes("type: \"spring\""), "Debe emplear física spring");
  assert(componentContent.includes("stiffness:"), "Debe calibrar stiffness para respuesta elástica");
  assert(componentContent.includes("damping:"), "Debe calibrar damping para evitar oscilaciones desmedidas");
});

runTest("Filtrado estricto en Modo Juego (gameMode)", () => {
  assert(componentContent.includes("gameMode"), "Debe evaluar gameMode");
  assert(componentContent.includes("activeAlert.level !== \"urgent\""), "Solo debe permitir alertas urgentes en gameMode");
});

runTest("Soporte de reloj en vivo y formato de tiempo", () => {
  assert(componentContent.includes("toLocaleTimeString"), "Debe formatear la hora del reloj");
  assert(componentContent.includes("formatTimer"), "Debe contar con formateador MM:SS para el temporizador");
});

runTest("Atajo global Ctrl+I y desvinculación de la aplicación base (Shell.tsx)", () => {
  assert(shellContent.includes("key.toLowerCase() === \"i\""), "Debe escuchar la tecla I");
  assert(shellContent.includes("toggleFloatingIslandWindow"), "Debe alternar la ventana flotante con Ctrl+I");
  assert(!shellContent.includes("<DynamicIsland />"), "La isla no debe estar integrada en la aplicación base (ventana limpia)");
});

runTest("Cierre accesible con tecla Escape", () => {
  assert(shellContent.includes("if (isIslandExpanded)"), "Escape debe colapsar la isla si está expandida");
  assert(shellContent.includes("setIslandExpanded(false)"), "Debe forzar false en Escape");
});

runTest("Controles de personalización en Settings.tsx", () => {
  assert(settingsContent.includes("Isla Dinámica Estudiantil"), "Debe incluir sección en Ajustes");
  assert(settingsContent.includes("Modo \"No Molestar / Juego\""), "Debe ofrecer switch de Modo Juego");
  assert(settingsContent.includes("Frecuencia de Recordatorios Inteligentes"), "Debe permitir configurar frecuencia");
  assert(settingsContent.includes("Segundo Plano e Íconos Ocultos"), "Debe ofrecer control de ocultación a la bandeja");
});

runTest("Módulo de ventana de escritorio y bandeja (src/platform/islandWindow.ts)", () => {
  assert(islandWindowContent.includes("openFloatingIslandWindow"), "Debe exponer openFloatingIslandWindow");
  assert(islandWindowContent.includes("closeFloatingIslandWindow"), "Debe exponer closeFloatingIslandWindow");
  assert(islandWindowContent.includes("hideMainWindow"), "Debe exponer hideMainWindow para ocultar en segundo plano");
  assert(islandWindowContent.includes("showMainWindow"), "Debe exponer showMainWindow para restaurar desde la isla");
  assert(islandWindowContent.includes("alwaysOnTop"), "Debe configurar alwaysOnTop para ventana flotante");
});

runTest("Ruta y componente de widget de escritorio independiente (/island-widget)", () => {
  assert(appContent.includes("island-widget"), "App.tsx debe registrar la ruta /island-widget");
  assert(widgetPageContent.includes("FloatingIslandWidget"), "Debe implementar FloatingIslandWidget");
  assert(widgetPageContent.includes("data-tauri-drag-region"), "Debe soportar arrastre por el escritorio");
  assert(widgetPageContent.includes("showMainWindow"), "Debe permitir abrir StudyLab desde el widget flotante");
});

runTest("Ventana de inicio independiente y permisos en Tauri (tauri.conf.json)", () => {
  assert(tauriConfContent.includes("\"label\": \"island\""), "tauri.conf.json debe configurar ventana island");
  assert(tauriConfContent.includes("\"visible\": true"), "La isla debe iniciar como ventana aparte desde el arranque");
  assert(tauriConfContent.includes("\"skipTaskbar\": true"), "La isla no debe estorbar en la barra de tareas");
  assert(capContent.includes("\"*\""), "capabilities/default.json debe permitir todas las ventanas");
});

runTest("Horario dinámico Día (blanco) vs Noche (negro)", () => {
  assert(widgetPageContent.includes("isDayTime = currentHour >= 7 && currentHour < 19"), "Debe calcular isDayTime entre las 07:00 y las 19:00");
  assert(widgetPageContent.includes("bg-white/95 text-neutral-900"), "Debe aplicar paleta blanca y texto oscuro de día");
  assert(widgetPageContent.includes("bg-neutral-950/98 text-white"), "Debe aplicar paleta negra y texto claro de noche");
  assert(widgetPageContent.includes("<Sun"), "Debe incluir icono solar para el día");
  assert(widgetPageContent.includes("<Moon"), "Debe incluir icono lunar para la noche");
});

runTest("Handle de 6 puntitos del lado izquierdo y arrastre fluido con startDragging", () => {
  assert(widgetPageContent.includes("GripVertical"), "Debe emplear icono canónico de 6 puntos GripVertical");
  assert(widgetPageContent.includes("handleStartDrag"), "Debe conectar callback de arrastre nativo");
  assert(widgetPageContent.includes("startIslandDrag()") || widgetPageContent.includes("startDragging()"), "Debe invocar startIslandDrag de Tauri para arrastre fluido");
  assert(widgetPageContent.includes("cursor-grab active:cursor-grabbing"), "Debe proveer feedback visual de cursor grab");
});

runTest("Eliminación de doble recuadro y sombras rectangulares (shadow: false)", () => {
  assert(tauriConfContent.includes("\"shadow\": false"), "tauri.conf.json debe desactivar shadow del SO para evitar recuadro exterior");
  assert(widgetPageContent.includes("document.documentElement.style.background = \"transparent\""), "Debe asegurar html transparente");
  assert(widgetPageContent.includes("document.body.style.background = \"transparent\""), "Debe asegurar body transparente");
  assert(widgetPageContent.includes("border-none outline-none"), "El contenedor exterior no debe tener bordes de página");
});

runTest("Arrastre fluido en estado expandido y preservación de clics en botones", () => {
  assert(widgetPageContent.includes("target?.closest(\"button\")"), "handleStartDrag debe omitir clics interactivos en botones para no bloquear controles");
  assert(widgetPageContent.includes("e.stopPropagation()"), "Debe evitar propagación duplicada de eventos de arrastre");
  assert(widgetPageContent.includes("widget-expanded"), "Debe incluir contenedor expandido con arrastre accesible");
  assert(islandWindowContent.includes("startIslandDrag"), "islandWindow debe exportar startIslandDrag");
});

runTest("Auto-colocación magnética en los 4 puntos requeridos en backend Rust", () => {
  assert(windowManagerContent.includes("\"top-left\""), "Backend Rust debe calcular anclaje esquina superior izquierda");
  assert(windowManagerContent.includes("\"top-center\""), "Backend Rust debe calcular anclaje centro superior");
  assert(windowManagerContent.includes("\"top-right\""), "Backend Rust debe calcular anclaje esquina superior derecha");
  assert(windowManagerContent.includes("\"bottom-center\""), "Backend Rust debe calcular anclaje centro inferior");
  assert(windowManagerContent.includes("snap_threshold"), "Backend Rust debe evaluar umbral de atracción magnética");
  assert(windowManagerContent.includes("set_position"), "Backend Rust debe reposicionar la ventana automáticamente al anclaje más cercano");
});

runTest("Apertura dinámica hacia arriba al colocarse en mitad inferior y eliminación de degradados", () => {
  assert(widgetPageContent.includes("openDirection"), "Debe rastrear openDirection para apertura dinámica");
  assert(widgetPageContent.includes("items-end"), "Al estar abajo debe alinear a items-end para expandirse hacia arriba");
  assert(widgetPageContent.includes("<ChevronDown"), "Debe alternar icono chevron hacia abajo al plegar desde el centro inferior");
  assert(!widgetPageContent.includes("shadow-[0_12px_40px_rgba(0,0,0,0.7)]"), "Debe eliminar el degradado difuso oscuro que causaba halos en los laterales");
});

runTest("Hitbox estricta de pantalla y prevención de ocultamiento en barra de tareas", () => {
  assert(windowManagerContent.includes("min_x") && windowManagerContent.includes("max_x"), "Debe calcular límites horizontales de la pantalla");
  assert(windowManagerContent.includes("min_y") && windowManagerContent.includes("max_y"), "Debe calcular límites verticales respetando área de trabajo sobre la barra de tareas");
  assert(windowManagerContent.includes("clamp"), "Debe forzar clamping estricto para que la ventana nunca salga de la pantalla");
});

runTest("Prevención de saltos de ventana en clics simples sin arrastre", () => {
  assert(windowManagerContent.includes("dist_sq < 64"), "Debe detectar si el cursor se movió menos de 8px");
  assert(windowManagerContent.includes("\"click\""), "Debe retornar señal de clic sin alterar la posición de la ventana");
  assert(widgetPageContent.includes("placement.dock !== \"click\""), "El frontend debe ignorar reposicionamiento si solo fue un clic");
});

runTest("Apoyo directo sobre la barra de tareas de Windows con apertura hacia arriba", () => {
  assert(windowManagerContent.includes("work_h - win_h + 4"), "Debe calcular límite inferior para posarse sobre la barra");
  assert(widgetPageContent.includes("isUp ? \"items-end pb-1\""), "Debe alinear con pb-1 para posarse sin margen visible sobre la barra");
});

runTest("Animación suave al acomodarse y acoplarse magnéticamente", () => {
  assert(windowManagerContent.includes("animate_window_to"), "Backend Rust debe interpolar suavemente el desplazamiento al acoplarse");
  assert(widgetPageContent.includes("isSettling"), "Frontend debe activar leve animación visual de acomodo al acoplarse");
});

console.log("=".repeat(80));
console.log(`        RESULTADO: ${passCount}/${totalTests} TESTS PASARON EXITOSAMENTE        `);
console.log("=".repeat(80));

if (passCount !== totalTests) {
  process.exit(1);
}
