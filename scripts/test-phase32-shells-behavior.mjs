import test from "node:test";
import assert from "node:assert/strict";

// Importar directamente las utilidades puras y funciones de comportamiento de los shells
import {
  shouldIgnoreKeyboardEvent,
  resolveRatingKey,
  clampSplitRatio,
  validateStepTransition,
} from "../src/components/shells/shellBehavior.ts";

test("================================================================================", () => {});
test("   TEST SUITE FASE 32: SUITE DE COMPORTAMIENTO REAL DE LOS INTERACTION SHELLS   ", () => {});
test("================================================================================", () => {});

// -----------------------------------------------------------------------------
// BLOQUE 1: FlipCard — Filtrado de Atajos Globales y Manejo de Form Controls
// -----------------------------------------------------------------------------
test("[Test 1.1] shouldIgnoreKeyboardEvent ignora inputs, textareas, selects y contenteditable", () => {
  // Caso A: Target es INPUT
  const inputTarget = { tagName: "INPUT", isContentEditable: false };
  assert.equal(shouldIgnoreKeyboardEvent(inputTarget), true, "Ignora evento cuando target es <input>");

  // Caso B: Target es TEXTAREA
  const textareaTarget = { tagName: "TEXTAREA", isContentEditable: false };
  assert.equal(shouldIgnoreKeyboardEvent(textareaTarget), true, "Ignora evento cuando target es <textarea>");

  // Caso C: Target es SELECT
  const selectTarget = { tagName: "SELECT", isContentEditable: false };
  assert.equal(shouldIgnoreKeyboardEvent(selectTarget), true, "Ignora evento cuando target es <select>");

  // Caso D: Target es elemento con contenteditable activo
  const editableTarget = { tagName: "DIV", isContentEditable: true };
  assert.equal(shouldIgnoreKeyboardEvent(editableTarget), true, "Ignora evento cuando target tiene isContentEditable=true");

  // Caso E: Target anidado dentro de un input/textarea (closest match)
  const nestedTarget = {
    tagName: "SPAN",
    isContentEditable: false,
    closest: (selector) => (selector.includes("textarea") ? {} : null),
  };
  assert.equal(shouldIgnoreKeyboardEvent(nestedTarget), true, "Ignora evento cuando target está anidado en un control editable vía closest()");

  // Caso F: Target normal (div, card, body) -> NO debe ignorarse
  const normalDivTarget = {
    tagName: "DIV",
    isContentEditable: false,
    closest: () => null,
  };
  assert.equal(shouldIgnoreKeyboardEvent(normalDivTarget), false, "Permite atajos cuando target es un <div> estándar");

  // Caso G: Target nulo o indefinido
  assert.equal(shouldIgnoreKeyboardEvent(null), false, "Maneja target nulo sin lanzar excepción");
});

test("[Test 1.2] FlipCard resuelve atajos numéricos '1'..'5' con mapeo exacto de valor", () => {
  const fivePointRatings = [
    { value: 1, label: "1. En blanco", keyHint: "1", variant: "danger" },
    { value: 2, label: "2. Con dudas", keyHint: "2", variant: "warning" },
    { value: 3, label: "3. Parcial", keyHint: "3", variant: "neutral" },
    { value: 4, label: "4. Correcto", keyHint: "4", variant: "primary" },
    { value: 5, label: "5. Perfecto", keyHint: "5", variant: "success" },
  ];

  // Tecla '1' a '5'
  assert.equal(resolveRatingKey("1", fivePointRatings)?.value, 1, "Tecla '1' resuelve value 1");
  assert.equal(resolveRatingKey("2", fivePointRatings)?.value, 2, "Tecla '2' resuelve value 2");
  assert.equal(resolveRatingKey("3", fivePointRatings)?.value, 3, "Tecla '3' resuelve value 3");
  assert.equal(resolveRatingKey("4", fivePointRatings)?.value, 4, "Tecla '4' resuelve value 4");
  assert.equal(resolveRatingKey("5", fivePointRatings)?.value, 5, "Tecla '5' (quinto botón) resuelve value 5");

  // Tecla no registrada no resuelve calificación
  assert.equal(resolveRatingKey("6", fivePointRatings), undefined, "Tecla '6' no registrada devuelve undefined");
  assert.equal(resolveRatingKey("Space", fivePointRatings), undefined, "Tecla 'Space' no se confunde con rating");
});

test("[Test 1.3] Simulación de ciclo de vida FlipCard: volteo con Espacio y calificación condicionada", () => {
  let isFlipped = false;
  let ratedValue = null;

  const mockRatings = [
    { value: 0.5, label: "Repetir", keyHint: "1" },
    { value: 1.0, label: "Difícil", keyHint: "2" },
    { value: 1.5, label: "Bien", keyHint: "3" },
    { value: 2.5, label: "Fácil", keyHint: "4" },
  ];

  const simulateKey = (key, code, target = { tagName: "DIV", isContentEditable: false, closest: () => null }) => {
    // 1. Filtrado de formulario
    if (shouldIgnoreKeyboardEvent(target)) return;

    // 2. Espacio voltea
    if (code === "Space") {
      isFlipped = !isFlipped;
      return;
    }

    // 3. Dígito califica SOLO si la tarjeta está volteada
    if (isFlipped) {
      const matched = resolveRatingKey(key, mockRatings);
      if (matched) {
        ratedValue = matched.value;
      }
    }
  };

  // Estado inicial: Anverso (isFlipped = false)
  // Presionar '1' en anverso -> NO debe calificar
  simulateKey("1", "Digit1");
  assert.equal(ratedValue, null, "Presionar número con tarjeta sin voltear NO califica");
  assert.equal(isFlipped, false, "Tarjeta permanece en el anverso");

  // Presionar Espacio en un textarea -> NO debe voltear
  simulateKey(" ", "Space", { tagName: "TEXTAREA", isContentEditable: false });
  assert.equal(isFlipped, false, "Espacio dentro de <textarea> es ignorado y no voltea la tarjeta");

  // Presionar '1' en un input -> NO debe calificar
  simulateKey("1", "Digit1", { tagName: "INPUT", isContentEditable: false });
  assert.equal(ratedValue, null, "Dígito dentro de <input> es ignorado");

  // Presionar Espacio en contenedor normal -> Voltea la tarjeta
  simulateKey(" ", "Space");
  assert.equal(isFlipped, true, "Espacio en contenedor normal voltea la tarjeta al reverso");

  // Ahora que está volteada, presionar '4' -> Califica con 2.5
  simulateKey("4", "Digit4");
  assert.equal(ratedValue, 2.5, "Con tarjeta volteada, presionar '4' envía el valor correspondiente (2.5)");

  // Presionar Espacio nuevamente -> Vuelve al anverso
  simulateKey(" ", "Space");
  assert.equal(isFlipped, false, "Espacio vuelve a voltear la tarjeta al anverso");
});

test("[Test 1.4] onRate recibe los valores exactos para Repetición Espaciada (0.5, 1.0, 1.5, 2.5) y Active Recall (1..5)", () => {
  // Caso A: Repetición Espaciada (multiplicadores decimales)
  const srRatings = [
    { value: 0.5, label: "Repetir (0.5x)", keyHint: "1" },
    { value: 1.0, label: "Difícil (1x)", keyHint: "2" },
    { value: 1.5, label: "Bien (1.5x)", keyHint: "3" },
    { value: 2.5, label: "Fácil (2.5x)", keyHint: "4" },
  ];

  const receivedSr = [];
  const handleSrRate = (val) => receivedSr.push(val);

  for (const item of srRatings) {
    const matched = resolveRatingKey(item.keyHint, srRatings);
    assert.ok(matched, `Tecla ${item.keyHint} debe emparejar opción`);
    handleSrRate(matched.value);
  }
  assert.deepEqual(receivedSr, [0.5, 1.0, 1.5, 2.5], "onRate recibe exactamente los multiplicadores de Repetición Espaciada [0.5, 1.0, 1.5, 2.5]");

  // Caso B: Active Recall (escala ordinal 1 a 5)
  const arRatings = [
    { value: 1, label: "1. En blanco", keyHint: "1" },
    { value: 2, label: "2. Con dudas", keyHint: "2" },
    { value: 3, label: "3. Parcial", keyHint: "3" },
    { value: 4, label: "4. Correcto", keyHint: "4" },
    { value: 5, label: "5. Perfecto", keyHint: "5" },
  ];

  const receivedAr = [];
  const handleArRate = (val) => receivedAr.push(val);

  for (const item of arRatings) {
    const matched = resolveRatingKey(item.keyHint, arRatings);
    assert.ok(matched, `Tecla ${item.keyHint} debe emparejar opción`);
    handleArRate(matched.value);
  }
  assert.deepEqual(receivedAr, [1, 2, 3, 4, 5], "onRate recibe exactamente la escala 1..5 de Active Recall, incluyendo el quinto botón (5)");
});

// -----------------------------------------------------------------------------
// BLOQUE 2: StepperShell — Validación de Avance (canAdvance) y Navegación Segura
// -----------------------------------------------------------------------------
test("[Test 2.1] validateStepTransition permite siempre retroceder sin bloqueos", async () => {
  const strictValidation = () => false; // Nunca permite avanzar

  const canGoBack = await validateStepTransition(2, 1, strictValidation);
  assert.equal(canGoBack, true, "Retroceder del paso 2 al 1 siempre está permitido independientemente de canAdvance");

  const stayOnSame = await validateStepTransition(2, 2, strictValidation);
  assert.equal(stayOnSame, true, "Permanecer en el mismo paso siempre está permitido");
});

test("[Test 2.2] validateStepTransition evalúa canAdvance al avanzar", async () => {
  let conceptValue = "";
  const canAdvance = (stepIdx) => {
    if (stepIdx === 0) return Boolean(conceptValue.trim());
    return true;
  };

  // Intento de avance con campo vacío
  const blocked = await validateStepTransition(0, 1, canAdvance);
  assert.equal(blocked, false, "canAdvance bloquea la transición del paso 0 al 1 si conceptValue está vacío");

  // Llenar campo y reintentar
  conceptValue = "Teorema de Green";
  const allowed = await validateStepTransition(0, 1, canAdvance);
  assert.equal(allowed, true, "canAdvance permite la transición del paso 0 al 1 una vez completado el requisito");
});

test("[Test 2.3] validateStepTransition es resiliente ante excepciones en canAdvance", async () => {
  const throwingValidation = () => {
    throw new Error("Fallo de red o validación asíncrona inesperada");
  };

  const allowed = await validateStepTransition(0, 1, throwingValidation);
  assert.equal(allowed, false, "Si canAdvance lanza una excepción, la transición se bloquea limpiamente sin crashear");
});

// -----------------------------------------------------------------------------
// BLOQUE 3: SplitPanel — Clamping de Ratio y Límites Ergonómicos
// -----------------------------------------------------------------------------
test("[Test 3.1] clampSplitRatio limita estrictamente entre minRatio y maxRatio", () => {
  // Con límites 20% a 80%
  assert.equal(clampSplitRatio(10, 20, 80), 20, "Valor inferior al mínimo (10 < 20) se ajusta al piso de 20");
  assert.equal(clampSplitRatio(95, 20, 80), 80, "Valor superior al máximo (95 > 80) se ajusta al techo de 80");
  assert.equal(clampSplitRatio(50, 20, 80), 50, "Valor dentro de rango (50) se preserva intacto");

  // Con límites Cornell clásicos (20% a 50%)
  assert.equal(clampSplitRatio(35, 20, 50), 35, "Ratio inicial Cornell (35) está en rango [20, 50]");
  assert.equal(clampSplitRatio(60, 20, 50), 50, "Arrastre excesivo en Cornell se detiene en 50%");
  assert.equal(clampSplitRatio(5, 20, 50), 20, "Colapso excesivo en Cornell se detiene en 20%");
});

test("[Test 3.2] clampSplitRatio respeta los presets ergonómicos de pantalla dividida", () => {
  const PRESETS = [30, 50, 70];
  for (const preset of PRESETS) {
    const clamped = clampSplitRatio(preset, 20, 80);
    assert.equal(clamped, preset, `Preset ${preset}/${100 - preset} se encuentra dentro de los límites estándar [20, 80]`);
  }
});
