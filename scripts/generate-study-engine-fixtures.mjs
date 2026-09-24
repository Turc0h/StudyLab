import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { calculateMethodRecommendations } from "../src/features/study-methods/cognitiveTriageEngine.ts";
import { calculateTimeBudgetPlan } from "../src/features/study-engine/timeBudgetEngine.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

console.log("Generando fixtures oficiales de Study Engine desde código TS original...");

// -----------------------------------------------------------------------------
// 1. Triage Fixtures
// -----------------------------------------------------------------------------
const triageInputs = [
  { urgency: "urgent", material: "logical", mastery: "advanced", energy: "high" },
  { urgency: "urgent", material: "factual", mastery: "intermediate", energy: "low" },
  { urgency: "urgent", material: "doctrinal", mastery: "initial", energy: "medium" },
  { urgency: "medium", material: "logical", mastery: "intermediate", energy: "medium" },
  { urgency: "long", material: "factual", mastery: "advanced", energy: "high" },
  { urgency: "long", material: "multimodal", mastery: "initial", energy: "low" },
];

const triageCases = triageInputs.map((input) => {
  const result = calculateMethodRecommendations(input);
  return {
    input,
    expected: {
      topMatches: result.topMatches.map((m) => ({
        methodId: m.method.id,
        score: m.score,
        matchPercentage: m.matchPercentage,
        rationale: m.rationale,
        keyBenefit: m.keyBenefit,
      })),
      diagnosticSummary: result.diagnosticSummary,
      cautionAlert: result.cautionAlert || null,
    },
  };
});

// -----------------------------------------------------------------------------
// 2. Exam Planner Cases (Algoritmo original de examPlanner.ts líneas 15-61)
// -----------------------------------------------------------------------------
function originalExamPlannerPhases(examDate, now) {
  const totalDays = Math.max(1, Math.ceil((examDate - now) / (1000 * 60 * 60 * 24)));
  const d1 = Math.max(1, Math.round(totalDays * 0.3));
  const d2 = Math.max(1, Math.round(totalDays * 0.4));
  const d3 = Math.max(1, Math.round(totalDays * 0.2));
  const d4 = Math.max(1, totalDays - (d1 + d2 + d3));

  let offset = 0;
  const phases = [
    {
      name: "Fase 1: Diagnóstico e Ingesta Conceptual",
      description: "Lectura activa de apuntes de cátedra, extracción de teoremas y construcción del Grafo.",
      startDayOffset: offset,
      endDayOffset: offset + d1,
      targetMilestone: "100% de conceptos cargados y evaluados en Feynman preliminar.",
      completed: false,
    },
    {
      name: "Fase 2: Resolución Profunda y Desarme de Errores",
      description: "Práctica de guías de trabajos prácticos, auditoría socrática y vaciado del Error Bank.",
      startDayOffset: offset + d1,
      endDayOffset: offset + d1 + d2,
      targetMilestone: "Cero errores repetidos en temas troncales y retención FSRS > 85%.",
      completed: false,
    },
    {
      name: "Fase 3: Simulacros de Examen Cronometrados",
      description: "Simulacros en Modo Examen estricto, sin pistas, con tiempo límite y evaluación formal.",
      startDayOffset: offset + d1 + d2,
      endDayOffset: offset + d1 + d2 + d3,
      targetMilestone: "3 simulacros aprobados con calificación >= 7/10 en condiciones reales.",
      completed: false,
    },
    {
      name: "Fase 4: Consolidación y Repaso de Retención",
      description: "Repasos ligeros de tarjetas FSRS con retención en riesgo. No aprender temas nuevos.",
      startDayOffset: offset + d1 + d2 + d3,
      endDayOffset: offset + d1 + d2 + d3 + d4,
      targetMilestone: "Dominio global consolidado y descanso mental previo a la mesa de examen.",
      completed: false,
    },
  ];

  return { totalDays, d1, d2, d3, d4, phases };
}

const baseNow = 1727180000000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

const examPlannerScenarios = [
  { name: "1_dia", examDate: baseNow + 1 * ONE_DAY_MS, now: baseNow },
  { name: "2_dias", examDate: baseNow + 2 * ONE_DAY_MS, now: baseNow },
  { name: "3_dias", examDate: baseNow + 3 * ONE_DAY_MS, now: baseNow },
  { name: "7_dias", examDate: baseNow + 7 * ONE_DAY_MS, now: baseNow },
  { name: "11_dias", examDate: baseNow + 11 * ONE_DAY_MS, now: baseNow },
  { name: "20_dias", examDate: baseNow + 20 * ONE_DAY_MS, now: baseNow },
  { name: "hoy_mismo", examDate: baseNow, now: baseNow },
  { name: "fecha_pasada", examDate: baseNow - 5 * ONE_DAY_MS, now: baseNow },
  { name: "hora_23_30_a_00_30", examDate: baseNow + 1 * ONE_HOUR_MS, now: baseNow }, // 1 hora después
  { name: "hora_00_30_a_23_30", examDate: baseNow + 47 * ONE_HOUR_MS, now: baseNow }, // 47 horas después
];

const examPlannerCases = examPlannerScenarios.map((sc) => {
  const result = originalExamPlannerPhases(sc.examDate, sc.now);
  return {
    scenario: sc.name,
    input: {
      examDateMs: sc.examDate,
      nowMs: sc.now,
      subjectId: "sub_test",
      subjectName: "Materia Prueba",
      availableMinutesPerDay: 90,
    },
    expected: {
      totalDays: result.totalDays,
      d1: result.d1,
      d2: result.d2,
      d3: result.d3,
      d4: result.d4,
      phases: result.phases,
    },
  };
});

// -----------------------------------------------------------------------------
// 3. Time Budget Cases (Función original de timeBudgetEngine.ts)
// -----------------------------------------------------------------------------
async function runTimeBudgetCases() {
  const timeBudgetCases = [];

  const baseAgenda = {
    targetDate: "2026-09-24",
    headline: "Prueba",
    rationale: "Prueba",
    totalDebtMinutes: 45,
    urgentReviews: {
      cardCount: 10,
      estimatedMinutes: 10,
      conceptIds: ["c1"],
      topConceptNames: ["Cálculo"],
    },
    conceptualGaps: [
      {
        conceptId: "c2",
        conceptName: "Integrales Impropias",
        reason: "Error de convergencia",
        suggestedAction: "feynman",
        estimatedMinutes: 20,
      },
    ],
    bottleneckPrerequisites: [],
    examAlerts: [],
    generatedAt: Date.now(),
  };

  const emptyAgenda = {
    ...baseAgenda,
    urgentReviews: { cardCount: 0, estimatedMinutes: 0, conceptIds: [], topConceptNames: [] },
    conceptualGaps: [],
  };

  const agendaNoGap = {
    ...baseAgenda,
    conceptualGaps: [],
  };

  const budgets = [
    { budget: 20, agenda: baseAgenda, label: "20_con_cartas_y_gap" },
    { budget: 20, agenda: emptyAgenda, label: "20_sin_cartas_ni_gap" },
    { budget: 45, agenda: baseAgenda, label: "45_con_cartas_y_gap" },
    { budget: 45, agenda: agendaNoGap, label: "45_con_cartas_sin_gap" },
    { budget: 90, agenda: baseAgenda, label: "90_con_cartas_y_gap" },
    { budget: 90, agenda: agendaNoGap, label: "90_con_cartas_sin_gap" },
  ];

  for (const b of budgets) {
    const plan = await calculateTimeBudgetPlan(b.budget, b.agenda);
    timeBudgetCases.push({
      scenario: b.label,
      input: {
        budgetMinutes: b.budget,
        urgentCardsCount: b.agenda.urgentReviews.cardCount,
        topConceptName: b.agenda.urgentReviews.topConceptNames[0] || undefined,
        primaryGapConceptName: b.agenda.conceptualGaps[0]?.conceptName || undefined,
      },
      expected: {
        totalMinutes: plan.totalMinutes,
        headline: plan.headline,
        targetFocus: plan.targetFocus,
        steps: plan.steps.map((s) => ({
          id: s.id,
          stepType: s.type,
          title: s.title,
          description: s.description,
          allocatedMinutes: s.allocatedMinutes,
          actionUrl: s.actionUrl,
          actionLabel: s.actionLabel,
          badge: s.badge,
        })),
      },
    });
  }

  return timeBudgetCases;
}

// -----------------------------------------------------------------------------
// 4. Agenda Cases (Lógica algorítmica original de recommendationEngine.ts líneas 28-140)
// -----------------------------------------------------------------------------
function originalAgendaPure(params) {
  const { totalDueCards, topConceptNames, gapSignals, bottleneckSignals, totalConceptsRegistered } = params;

  const urgentMinutes = Math.ceil(totalDueCards * 1.0);
  const urgentReviews = {
    cardCount: totalDueCards,
    estimatedMinutes: urgentMinutes,
    conceptIds: [],
    topConceptNames,
  };

  const conceptualGaps = gapSignals.slice(0, 3).map((sig) => {
    const isMisconception = sig.gapType === "persistent_misconception";
    return {
      conceptId: sig.conceptId,
      conceptName: sig.conceptName,
      reason: sig.explanation,
      suggestedAction: isMisconception ? "feynman" : "socratic_audit",
      estimatedMinutes: isMisconception ? 20 : 15,
    };
  });

  const bottleneckPrerequisites = bottleneckSignals.slice(0, 2).map((b) => ({
    conceptId: b.conceptId,
    conceptName: b.conceptName,
    blockedDownstreamCount: b.blockedDownstreamCount,
    blockedConceptNames: b.blockedConceptNames,
    estimatedMinutes: 25,
  }));

  const gapMinutes = conceptualGaps.reduce((acc, g) => acc + g.estimatedMinutes, 0);
  const bottleneckMinutes = bottleneckPrerequisites.reduce((acc, b) => acc + b.estimatedMinutes, 0);
  const totalDebtMinutes = urgentMinutes + gapMinutes + bottleneckMinutes;

  let headline = "¿Qué debería estudiar hoy y por qué?";
  let rationale = "";

  if (totalDueCards > 0 && conceptualGaps.length > 0) {
    headline = `Repasar ${totalDueCards} tarjeta(s) vencidas y desarmar la laguna en "${conceptualGaps[0].conceptName}"`;
    rationale = `Tu curva de retención FSRS indica riesgo de olvido inminente en ${topConceptNames.join(", ") || "temas troncales"} (${urgentMinutes} min). Además, registraste errores reiterados en "${conceptualGaps[0].conceptName}" que requieren una explicación Feynman breve (${conceptualGaps[0].estimatedMinutes} min). Deuda total acumulada: ${totalDebtMinutes} min.`;
  } else if (totalDueCards > 0) {
    headline = `Consolidar memoria: ${totalDueCards} tarjeta(s) espaciadas pendientes`;
    rationale = `No presentas lagunas conceptuales críticas abiertas. Dedica ${urgentMinutes} minutos a limpiar el mazo para preservar la estabilidad de memoria a largo plazo.`;
  } else if (bottleneckPrerequisites.length > 0) {
    headline = `Desbloquear cuello de botella: "${bottleneckPrerequisites[0].conceptName}"`;
    rationale = `Este concepto fundacional tiene dominio bajo y está frenando tu comprensión de ${bottleneckPrerequisites[0].blockedConceptNames.join(", ")}. Dedica 25 minutos a auditar sus teoremas en el RAG.`;
  } else if (totalConceptsRegistered > 0) {
    headline = `Todo al día. Momento ideal para avanzar materia o simular un examen`;
    rationale = `Tu retención se encuentra en zona segura (>85%) y no hay deudas de estudio urgentes. Puedes avanzar con nuevas lecturas o poner a prueba tu dominio con un simulacro exprés.`;
  } else {
    headline = `Carga tus primeros apuntes de cátedra en el visor`;
    rationale = `El Cognitive OS necesita material bibliográfico para indexar conceptos, extraer teoremas y comenzar a calcular tu mapa de dominio 4D.`;
  }

  return {
    totalDebtMinutes,
    urgentReviews,
    conceptualGaps,
    bottleneckPrerequisites,
    headline,
    rationale,
  };
}

const agendaScenarios = [
  {
    name: "cards_plus_misconception_plus_bottleneck",
    input: {
      totalDueCards: 14,
      topConceptNames: ["Álgebra Lineal"],
      gapSignals: [
        {
          conceptId: "c_alg",
          conceptName: "Matrices Inversas",
          gapType: "persistent_misconception",
          explanation: "Confusión de determinante nulo",
        },
      ],
      bottleneckSignals: [
        {
          conceptId: "c_calc",
          conceptName: "Límites",
          blockedDownstreamCount: 2,
          blockedConceptNames: ["Derivadas", "Integrales"],
        },
      ],
      totalConceptsRegistered: 10,
    },
  },
  {
    name: "cards_plus_retention_decay",
    input: {
      totalDueCards: 8,
      topConceptNames: ["Física I"],
      gapSignals: [
        {
          conceptId: "c_fis",
          conceptName: "Cinemática",
          gapType: "retention_decay",
          explanation: "Retención cayó por debajo del 70%",
        },
      ],
      bottleneckSignals: [],
      totalConceptsRegistered: 8,
    },
  },
  {
    name: "cards_only",
    input: {
      totalDueCards: 5,
      topConceptNames: ["Química"],
      gapSignals: [],
      bottleneckSignals: [],
      totalConceptsRegistered: 5,
    },
  },
  {
    name: "bottleneck_only",
    input: {
      totalDueCards: 0,
      topConceptNames: [],
      gapSignals: [],
      bottleneckSignals: [
        {
          conceptId: "c_log",
          conceptName: "Lógica Proposicional",
          blockedDownstreamCount: 3,
          blockedConceptNames: ["Predicados", "Demostraciones", "Grafos"],
        },
      ],
      totalConceptsRegistered: 12,
    },
  },
  {
    name: "clean_slate",
    input: {
      totalDueCards: 0,
      topConceptNames: [],
      gapSignals: [],
      bottleneckSignals: [],
      totalConceptsRegistered: 10,
    },
  },
  {
    name: "empty_repository",
    input: {
      totalDueCards: 0,
      topConceptNames: [],
      gapSignals: [],
      bottleneckSignals: [],
      totalConceptsRegistered: 0,
    },
  },
];

const agendaCases = agendaScenarios.map((sc) => {
  const result = originalAgendaPure(sc.input);
  return {
    scenario: sc.name,
    input: sc.input,
    expected: result,
  };
});

async function main() {
  const timeBudgetCases = await runTimeBudgetCases();

  const fixtureData = {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    triageCases,
    examPlannerCases,
    timeBudgetCases,
    agendaCases,
  };

  const outputPath = path.join(root, "scripts/fixtures/study-engine-cases.json");
  fs.writeFileSync(outputPath, JSON.stringify(fixtureData, null, 2), "utf-8");
  console.log(`Fixtures generadas con éxito en: ${outputPath}`);
}

main().catch((err) => {
  console.error("Error generando fixtures:", err);
  process.exit(1);
});
