import { STUDY_METHODS_30_SEEDS } from "../../data/studyMethodsSeed.ts";
import type { StudyMethod } from "../../db/db.ts";
import type { StudyMethodId } from "../../types/index.ts";

export type TriageUrgency = "urgent" | "medium" | "long";
export type TriageMaterial = "logical" | "factual" | "doctrinal" | "multimodal";
export type TriageMastery = "initial" | "intermediate" | "advanced";
export type TriageEnergy = "high" | "medium" | "low";

export interface TriageAnswers {
  urgency: TriageUrgency;
  material: TriageMaterial;
  mastery: TriageMastery;
  energy: TriageEnergy;
}

export interface TriageMethodMatch {
  method: StudyMethod;
  score: number;
  matchPercentage: number;
  rationale: string;
  keyBenefit: string;
}

export interface TriageResult {
  answers: TriageAnswers;
  topMatches: TriageMethodMatch[];
  diagnosticSummary: string;
  cautionAlert?: string;
}

const RATIONALE_TEMPLATES: Record<string, (a: TriageAnswers) => { rationale: string; keyBenefit: string }> = {
  "practice-testing": (a) => ({
    rationale: `Bajo presión temporal (${a.urgency === "urgent" ? "inminente" : "a corto plazo"}), las pruebas simuladas con corrección inmediata calibran con rigor tu umbral real de examen y eliminan la falsa fluidez.`,
    keyBenefit: "Exposición a condiciones de evaluación de cátedra y auditoría de tiempos."
  }),
  "blurting": () => ({
    rationale: "El vaciado mental a ciegas sin apuntes es el método de choque más veloz para diagnosticar con precisión qué conceptos tenés fijados y qué lagunas críticas debés repasar.",
    keyBenefit: "Evocación pura sin pistas visuales y contraste directo contra el material."
  }),
  "active-recall": () => ({
    rationale: "Forzar la recuperación sináptica activa genera huellas mnémicas hasta 3 veces más resistentes al olvido que la relectura pasiva tradicional.",
    keyBenefit: "Máxima eficiencia por minuto de estudio invertido."
  }),
  "feynman": (a) => ({
    rationale: `Ideal para contenidos ${a.material === "logical" ? "lógico-matemáticos" : "conceptuales"}: simplificar la explicación en términos llanos desmantela la ilusión de competencia y localiza la raíz del error.`,
    keyBenefit: "Claridad conceptual absoluta y lenguaje despojado de jerga vacía."
  }),
  "leitner": () => ({
    rationale: "La distribución física en 5 compartimentos separa de forma quirúrgica lo que ya dominás de lo que falla, multiplicando la frecuencia sobre las dificultades reales.",
    keyBenefit: "Economía cognitiva: el tiempo se concentra exclusivamente en lo que te cuesta."
  }),
  "spaced-repetition": (a) => ({
    rationale: `El algoritmo adaptativo (FSRS) calcula el instante matemático exacto antes de que el olvido se produzca, ${a.urgency === "long" ? "consolidando memoria duradera a meses vista" : "optimizando la retención de términos clave"}.`,
    keyBenefit: "Retención a largo plazo con el mínimo esfuerzo sináptico necesario."
  }),
  "distributed-practice": () => ({
    rationale: "Espaciar el estudio en micro-sesiones distribuidas duplica la tasa de retención frente al estudio masivo continuo o atracón de última hora (cramming).",
    keyBenefit: "Eliminación de la fatiga cognitiva por saturación de sesiones largas."
  }),
  "desirable-difficulties": () => ({
    rationale: "Introducir fricción deliberada (test retardado, intercalado ciego) desacelera la velocidad aparente de aprendizaje pero maximiza la transferencia profunda en el examen.",
    keyBenefit: "Desmonta la ilusión de saber y asegura retención en situaciones imprevistas."
  }),
  "concept-maps": () => ({
    rationale: "La construcción de mapas conceptuales con proposiciones y enlaces cruzados organiza redes semánticas complejas y jerarquías causales sólidas.",
    keyBenefit: "Estructuración relacional de alto nivel entre ideas nucleares y secundarias."
  }),
  "problem-based-learning": () => ({
    rationale: "Afrontar un dilema real de cátedra sitúa los hechos e incógnitas en primer plano, forzando la deducción activa antes de consultar la bibliografía.",
    keyBenefit: "Transferencia directa a exámenes de caso clínico, jurídicos o de ingeniería."
  }),
  "deep-work": () => ({
    rationale: "Bloques de inmersión total sin interrupciones ni notificaciones permiten alcanzar el estado de flujo cognitivo para asimilar doctrinas o teoremas densos.",
    keyBenefit: "Cero residuo de atención y máxima densidad de asimilación por hora."
  }),
  "pq4r": () => ({
    rationale: "El protocolo analítico de 6 etapas con fase nuclear 'Reflect' desafía los supuestos del texto con contraejemplos antes del recitado a libro cerrado.",
    keyBenefit: "Lectura crítica de literatura universitaria densa y científica."
  }),
  "story-method": () => ({
    rationale: "Encadenar términos mediante una trama visual dramática y absurda activa circuitos episódicos cerebrales, alcanzando más del 90% de recuerdo serial de listas.",
    keyBenefit: "Memorización perfecta de etapas secuenciales, artículos o taxonomías."
  }),
  "method-of-loci": () => ({
    rationale: "El anclaje espacial en locaciones familiares aprovecha la corteza parahipocampal para recuperar listas extensas y estructuras de temas completos.",
    keyBenefit: "Navegación espacial infalible por el temario durante la prueba oral o escrita."
  }),
  "chunking": () => ({
    rationale: "Comprimir los datos en 4±1 paquetes estructurados evita el desbordamiento de la memoria de trabajo y permite recordar catálogos extensos.",
    keyBenefit: "Alivio inmediato de la sobrecarga cognitiva en temas densos."
  }),
  "dual-coding": () => ({
    rationale: "La sinergia simultánea entre el canal verbal-analítico y el visual-espacial genera una doble vía de recuperación cortical en el momento del examen.",
    keyBenefit: "Dos huellas neuronales independientes para un mismo concepto."
  }),
  "multisensory-learning": () => ({
    rationale: "Activar simultáneamente la vista, el oído y el canal motor crea redundancia biológica, ideal para mantener la fijación cuando el nivel de energía es moderado o bajo.",
    keyBenefit: "Compensación multisensorial sin saturar un único canal de atención."
  }),
  "sleep-consolidation": () => ({
    rationale: "En estados de fatiga o estudio nocturno, sembrar los conceptos clave antes del reposo y respetar ciclos de 90 minutos permite la transferencia hipocampo-neocortical.",
    keyBenefit: "Fijación pasiva durante las ondas lentas (SWS) y despertar sin niebla mental."
  }),
  "segmentation-principle": () => ({
    rationale: "Fraccionar clases grabadas o textos largos en tramos de 3 a 5 minutos con pausas de síntesis de 60 segundos evita la saturación de procesamiento.",
    keyBenefit: "Asimilación sinérgica paso a paso al abordar temas desde cero."
  }),
  "cornell": () => ({
    rationale: "El formato tripartito (notas, columna de señales y síntesis) convierte los apuntes brutos en un instrumento inmediato de autoevaluación activa.",
    keyBenefit: "Toma de apuntes autoevaluable sin necesidad de resumir dos veces."
  }),
  "interleaving": () => ({
    rationale: "Alternar temas o problemas de diferente categoría entrena la discriminación estratégica de qué fórmula o principio aplicar en cada caso.",
    keyBenefit: "Alineación total con exámenes donde las preguntas vienen desordenadas."
  }),
  "protege-effect": () => ({
    rationale: "Prepararse para explicar el material a un aprendiz obliga a ordenar esquemas y traducir la jerga técnica a analogías del mundo real.",
    keyBenefit: "Detección implacable de zonas oscuras que creías dominar."
  }),
  "zettelkasten": () => ({
    rationale: "El sistema de notas atómicas enlazadas bidireccionalmente crea un segundo cerebro permanente para investigaciones, tesis o cursadas largas.",
    keyBenefit: "Emergencia de conexiones insospechadas entre autores y materias."
  }),
  "kwl-method": () => ({
    rationale: "Cartografiar lo que Sé, lo que Quiero saber y lo que Aprendí dirige la atención de forma metacognitiva hacia los vacíos de aprendizaje.",
    keyBenefit: "Dirección intencional de la indagación bibliográfica."
  }),
  "self-explanation": () => ({
    rationale: "Monologar internamente el sentido de cada paso de un razonamiento previene la ejecución mecánica y fija la lógica profunda.",
    keyBenefit: "Comprensión conceptual duradera en demostraciones y procedimientos."
  }),
  "pomodoro": () => ({
    rationale: "Pulsos de 25 minutos con pausas de 5 minutos mantienen el ritmo de trabajo evitando el desgaste en jornadas de estudio prolongadas.",
    keyBenefit: "Ritmo circadiano de trabajo y combate eficaz de la procrastinación."
  }),
  "sq3r": () => ({
    rationale: "Inspeccionar, Preguntar, Leer, Recitar y Repasar transforma la lectura de manuales densos en una investigación activa.",
    keyBenefit: "Lectura intencional y retención del argumento central."
  }),
  "elaborative-interrogation": () => ({
    rationale: "Preguntarse sistemáticamente '¿Por qué este hecho es verdadero y no de otra forma?' ancla los datos aislados en la causalidad lógica.",
    keyBenefit: "Transformación de datos sueltos en cadenas causales memorables."
  }),
  "mind-maps": () => ({
    rationale: "La organización gráfica radial permite una vista de pájaro de la jerarquía completa de un tema antes de profundizar en los detalles.",
    keyBenefit: "Visión panorámica e integración holística de ramas temáticas."
  }),
  "mnemonics": () => ({
    rationale: "Acrónimos y encadenamientos fonéticos proporcionan una muleta de rescate rápido para listas arbitrarias que no poseen lógica interna.",
    keyBenefit: "Acceso seguro a secuencias fácticas en el examen."
  })
};

/**
 * Motor algorítmico de Triaje Cognitivo.
 * Evalúa los 30 métodos del catálogo y devuelve el Top 3 con puntuación,
 * fundamento pedagógico adaptado y alertas de diagnóstico.
 */
export function calculateMethodRecommendations(answers: TriageAnswers): TriageResult {
  const { urgency, material, mastery, energy } = answers;

  const scores: Record<string, number> = {};

  // Inicializar puntaje base
  for (const m of STUDY_METHODS_30_SEEDS) {
    scores[m.id] = 50;
  }

  // 1. Eje de Urgencia
  if (urgency === "urgent") {
    // Examen en < 24h: Evocación rápida y detección de brechas
    scores["practice-testing"] += 45;
    scores["blurting"] += 45;
    scores["active-recall"] += 35;
    scores["feynman"] += 20;
    scores["leitner"] += 15;
    scores["desirable-difficulties"] += 15;

    // Penalizar métodos de largo aliento
    scores["distributed-practice"] -= 40;
    scores["zettelkasten"] -= 40;
    scores["concept-maps"] -= 30;
    scores["problem-based-learning"] -= 25;
    scores["method-of-loci"] -= 25;
  } else if (urgency === "medium") {
    // 2 a 7 días: Consolidación, intercalado y separación de fallos
    scores["leitner"] += 35;
    scores["interleaving"] += 35;
    scores["feynman"] += 30;
    scores["desirable-difficulties"] += 30;
    scores["cornell"] += 25;
    scores["elaborative-interrogation"] += 25;
    scores["chunking"] += 20;
    scores["pq4r"] += 20;
  } else {
    // > 2 semanas: Estructura profunda, FSRS y práctica distribuida
    scores["distributed-practice"] += 45;
    scores["spaced-repetition"] += 40;
    scores["concept-maps"] += 35;
    scores["problem-based-learning"] += 35;
    scores["zettelkasten"] += 30;
    scores["dual-coding"] += 25;
    scores["protege-effect"] += 25;
    scores["blurting"] -= 15;
  }

  // 2. Eje de Naturaleza del Material
  if (material === "logical") {
    scores["feynman"] += 40;
    scores["problem-based-learning"] += 40;
    scores["concept-maps"] += 35;
    scores["self-explanation"] += 35;
    scores["elaborative-interrogation"] += 30;
    scores["deep-work"] += 20;
    scores["story-method"] -= 30;
    scores["mnemonics"] -= 30;
  } else if (material === "factual") {
    scores["leitner"] += 40;
    scores["method-of-loci"] += 35;
    scores["story-method"] += 35;
    scores["chunking"] += 35;
    scores["mnemonics"] += 30;
    scores["active-recall"] += 25;
    scores["spaced-repetition"] += 20;
  } else if (material === "doctrinal") {
    scores["pq4r"] += 40;
    scores["sq3r"] += 35;
    scores["cornell"] += 35;
    scores["elaborative-interrogation"] += 30;
    scores["zettelkasten"] += 25;
    scores["segmentation-principle"] += 20;
  } else if (material === "multimodal") {
    scores["dual-coding"] += 40;
    scores["multisensory-learning"] += 35;
    scores["mind-maps"] += 35;
    scores["concept-maps"] += 30;
    scores["zettelkasten"] += 25;
  }

  // 3. Eje de Nivel de Dominio
  if (mastery === "initial") {
    scores["segmentation-principle"] += 35;
    scores["sq3r"] += 30;
    scores["feynman"] += 25;
    scores["protege-effect"] += 25;
    scores["kwl-method"] += 25;
    scores["desirable-difficulties"] -= 30;
    scores["blurting"] -= 25;
    scores["practice-testing"] -= 20;
  } else if (mastery === "intermediate") {
    scores["concept-maps"] += 30;
    scores["interleaving"] += 25;
    scores["dual-coding"] += 25;
    scores["cornell"] += 20;
    scores["chunking"] += 20;
  } else if (mastery === "advanced") {
    scores["desirable-difficulties"] += 40;
    scores["practice-testing"] += 35;
    scores["blurting"] += 30;
    scores["elaborative-interrogation"] += 25;
    scores["sq3r"] -= 20;
  }

  // 4. Eje de Nivel de Energía / Fatiga
  if (energy === "high") {
    scores["deep-work"] += 35;
    scores["problem-based-learning"] += 30;
    scores["practice-testing"] += 25;
    scores["feynman"] += 20;
  } else if (energy === "medium") {
    scores["pomodoro"] += 30;
    scores["leitner"] += 25;
    scores["interleaving"] += 25;
    scores["cornell"] += 20;
  } else if (energy === "low") {
    scores["sleep-consolidation"] += 55;
    scores["multisensory-learning"] += 45;
    scores["segmentation-principle"] += 35;
    scores["spaced-repetition"] += 30;
    scores["deep-work"] -= 40;
    scores["practice-testing"] -= 35;
    scores["problem-based-learning"] -= 30;
  }

  // Mapear y ordenar
  const seedMap = new Map(STUDY_METHODS_30_SEEDS.map((s) => [s.id, s]));

  const allRanked: TriageMethodMatch[] = Object.entries(scores).map(([id, rawScore]) => {
    const seed = seedMap.get(id as StudyMethodId)!;
    // Normalizar a porcentaje visual (50% a 99%)
    const clampedScore = Math.max(20, Math.min(180, rawScore));
    const matchPercentage = Math.round(50 + ((clampedScore - 20) / 160) * 49);

    const template = RATIONALE_TEMPLATES[id]
      ? RATIONALE_TEMPLATES[id](answers)
      : {
          rationale: `Metodología indicada con respaldo de ${seed.scientificBasis || "evidencia neurocognitiva"}.`,
          keyBenefit: seed.description
        };

    return {
      method: seed,
      score: rawScore,
      matchPercentage,
      rationale: template.rationale,
      keyBenefit: template.keyBenefit
    };
  });

  allRanked.sort((a, b) => b.score - a.score);

  const topMatches = allRanked.slice(0, 3);

  // Diagnóstico textual
  const urgencyLabel =
    urgency === "urgent" ? "menos de 24 horas para rendir" : urgency === "medium" ? "2 a 7 días disponibles" : "más de 2 semanas de horizonte";
  const materialLabel =
    material === "logical" ? "materia lógica o computacional" : material === "factual" ? "contenido de alta memorización fáctica" : material === "doctrinal" ? "textos doctrinales densos" : "conceptos abstractos o multimodales";
  const energyLabel =
    energy === "high" ? "foco mental pleno" : energy === "medium" ? "ritmo cognitivo sostenido" : "fatiga mental o estudio nocturno";

  const diagnosticSummary = `Diagnóstico: Para una situación con ${urgencyLabel}, sobre ${materialLabel} y con ${energyLabel}, tu prioridad pedagógica es maximizar la eficiencia y proteger la memoria de trabajo.`;

  let cautionAlert: string | undefined;
  if (urgency === "urgent" && energy === "low") {
    cautionAlert = "¡Alerta de Fatiga Extrema! Intentar sesiones masivas de última hora con baja energía produce ilusión de competencia y bloqueo sináptico. Te recomendamos repasar los simulacros o activar Consolidación por Sueño.";
  } else if (urgency === "urgent" && mastery === "initial") {
    cautionAlert = "¡Precaución por tiempo crítico! Al ser la primera vez que ves el tema, concentrate en el Principio de Segmentación o Feynman básico en vez de intentar abarcar todo el manual.";
  }

  return {
    answers,
    topMatches,
    diagnosticSummary,
    cautionAlert
  };
}
