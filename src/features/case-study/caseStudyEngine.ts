import { db } from "../../db/db";

export interface CaseInvestigation {
  id: string;
  name: string;
  category: "Laboratorio" | "Imágenes" | "Telemetría / Trazado" | "Peritaje / Prueba" | "Historial";
  resultText: string;
  isEssential: boolean;
  costPoints: number; // Penalty if requested when redundant
}

export interface CaseStudy {
  id: string;
  title: string;
  discipline: "Medicina & Salud" | "Derecho & Litigio" | "Ingeniería & DevOps" | "General";
  difficulty: "Inicial" | "Intermedio" | "Avanzado / Concurrencia";
  summary: string;
  chiefComplaint: string; // Motivo de consulta / Hecho detonante
  anamnesisOrFacts: string; // Antecedentes / Hechos probados
  physicalExamOrContext: string; // Examen físico / Inspección de entorno
  availableInvestigations: CaseInvestigation[];
  goldStandard: {
    primaryDiagnosis: string;
    differentialDiagnoses: string[];
    criticalActionOrPlan: string;
    contraindicatedActions: string[];
    clinicalPearls: string[];
  };
}

export interface CaseEvaluationResult {
  diagnosticScore: number; // 0 to 10
  efficiencyScore: number; // 0 to 10 (penalizes unnecessary tests)
  planScore: number; // 0 to 10
  totalScore: number; // 0 to 10
  efficiencyCategory: "Excelente (Criterio Ockham)" | "Moderada" | "Exceso de Pruebas / Iatrogenia";
  unnecessaryInvestigationsRequested: string[];
  essentialInvestigationsMissed: string[];
  feedback: string[];
}

export const PRESET_CASE_STUDIES: CaseStudy[] = [
  {
    id: "case-cardio-emergency",
    title: "Dolor Torácico Agudo en Paciente de 58 Años",
    discipline: "Medicina & Salud",
    difficulty: "Intermedio",
    summary: "Hombre de 58 años con antecedentes de HTA y tabaquismo que ingresa por dolor retroesternal opresivo irradiado a mandíbula y diaforesis de 90 minutos de evolución.",
    chiefComplaint: "Dolor retroesternal retroesternal opresivo de inicio súbito en reposo con sudoración fría.",
    anamnesisOrFacts: "Hipertenso mal adherente a enalapril, fumador de 20 paquetes/año. Sin antecedentes de cirugía reciente ni traumatismos.",
    physicalExamOrContext: "TA: 160/95 mmHg, FC: 96 lpm, SatO2: 97% aire ambiente. Ruidos cardíacos rítmicos sin soplos, murmullo vesicular conservado sin estertores. Pulsos periféricos simétricos y presentes en 4 miembros.",
    availableInvestigations: [
      {
        id: "ecg",
        name: "Electrocardiograma (ECG) de 12 derivaciones",
        category: "Telemetría / Trazado",
        resultText: "Elevación del segmento ST de 3 mm en derivaciones V1 a V4 con ondas T picudas (IAM con elevación de ST anteroseptal).",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "tropo",
        name: "Troponina I ultrasensible",
        category: "Laboratorio",
        resultText: "Troponina I: 1.8 ng/mL (Normal < 0.04 ng/mL). Elevación significativa.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "rx-torax",
        name: "Radiografía de tórax portátil",
        category: "Imágenes",
        resultText: "Silueta cardíaca normal, mediastino de calibre conservado, sin signos de disección aórtica ni neumotórax.",
        isEssential: false,
        costPoints: 1,
      },
      {
        id: "angiotac",
        name: "Angio-TC de aorta torácica con contraste",
        category: "Imágenes",
        resultText: "Aorta torácica sin flaps de disección ni hematoma intramural.",
        isEssential: false,
        costPoints: 3, // Muy costoso e innecesario dado ECG diagnóstico y pulsos simétricos
      },
      {
        id: "dimero-d",
        name: "Dímero D plasmático",
        category: "Laboratorio",
        resultText: "Dímero D: 320 ng/mL (normal < 500 ng/mL). Negativo.",
        isEssential: false,
        costPoints: 2,
      },
    ],
    goldStandard: {
      primaryDiagnosis: "Infarto Agudo de Miocardio con Elevación del Segmento ST (IAMCEST) Anteroseptal",
      differentialDiagnoses: [
        "Disección Aórtica aguda (Stanford A)",
        "Tromboembolismo Pulmonar masivo",
        "Pericarditis aguda",
      ],
      criticalActionOrPlan: "Activación inmediata de Código Infarto / Cinecoronariografía urgente (angioplastia primaria dentro de los 90 minutos) + Doble antiagregación (AAS + Ticagrelor/Clopidogrel) + Anticoagulación parenteral.",
      contraindicatedActions: [
        "Retrasar la reperfusión esperando resultados de laboratorio adicionales",
        "Administrar trombolíticos si el dolor ya comenzó hace más de 12 horas o si existe sospecha real de disección",
      ],
      clinicalPearls: [
        "En presencia de supradesnivel del ST en ECG, no se debe demorar la angioplastia esperando la troponina.",
        "La angio-TC es innecesaria y peligrosa si el paciente tiene IAMCEST confirmado sin discordancia de pulsos ni ensanchamiento mediastínico.",
      ],
    },
  },
  {
    id: "case-civil-force-majeure",
    title: "Incumplimiento de Suministro Industrial y Caso Fortuito",
    discipline: "Derecho & Litigio",
    difficulty: "Intermedio",
    summary: "Empresa proveedora de semiconductores suspende entregas pactadas alegando huelga aduanera y corte de energía intempestivo. El comprador demanda resolución y daños.",
    chiefComplaint: "Demanda por rescisión contractual unilateral con reclamo de lucro cesante por paralización de planta automotriz.",
    anamnesisOrFacts: "Contrato firmado con cláusula penal por retraso. El proveedor alega que el conflicto gremial aduanero constituyó un hecho sobreviniente imprevisible e insuperable.",
    physicalExamOrContext: "Documentación comercial: intercambio de cartas documento, cláusulas de eximentes de responsabilidad pactadas, dictámenes de la autoridad aduanera.",
    availableInvestigations: [
      {
        id: "doc-contract",
        name: "Copia del Contrato y Cláusulas de Asignación de Riesgos",
        category: "Peritaje / Prueba",
        resultText: "La cláusula 14 establece que los conflictos gremiales previsibles y demoras de despacho aduanero ordinarias corren por cuenta exclusiva del proveedor.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "aduana-report",
        name: "Oficio a la Dirección General de Aduanas",
        category: "Peritaje / Prueba",
        resultText: "Informa que la medida gremial duró únicamente 48 horas y hubo canales alternativos terrestres habilitados que no fueron contratados.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "peritaje-contable",
        name: "Peritaje Contable sobre Lucro Cesante del Comprador",
        category: "Peritaje / Prueba",
        resultText: "Determina que la planta automotriz detuvo 1 línea durante 5 días hábiles, cuantificando un daño neto de 145.000 USD.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "testigo-operario",
        name: "Declaración Testimonial de Operarios de Planta",
        category: "Historial",
        resultText: "Declaran el clima laboral tenso en las semanas previas.",
        isEssential: false,
        costPoints: 2,
      },
    ],
    goldStandard: {
      primaryDiagnosis: "Incumplimiento Contractual Imputable — Inadmisibilidad de la Defensa de Caso Fortuito",
      differentialDiagnoses: [
        "Fuerza mayor / Caso fortuito eximente total",
        "Teoría de la Imprevisión con renegociación judicial",
      ],
      criticalActionOrPlan: "Declarar la resolución por culpa del deudor, hacer efectiva la cláusula penal e indemnizar el daño emergente acreditado por la pericia contable, descontando rubros de lucro cesante especulativo.",
      contraindicatedActions: [
        "Eximir al deudor sin verificar si el evento era evitable mediante vías logísticas alternativas disponibles",
      ],
      clinicalPearls: [
        "Las huelgas de terceros no constituyen fuerza mayor automática si el deudor asumió expresamente el riesgo o si existían medios de transporte alternativos razonables.",
      ],
    },
  },
  {
    id: "case-devops-pool-exhaustion",
    title: "Caída de Latencia Crítica en Pasarela de Pagos",
    discipline: "Ingeniería & DevOps",
    difficulty: "Avanzado / Concurrencia",
    summary: "Durante una campaña de ofertas masivas (CyberMonday), el servicio de checkout experimenta errores 504 Gateway Timeout y CPU baja en pods Kubernetes.",
    chiefComplaint: "Pérdida de transacciones y degradación del SLA al 40% a partir de 10.000 req/s.",
    anamnesisOrFacts: "Último deploy hace 2 días. El escalado horizontal de Pods (HPA) no logra reducir la latencia pese a multiplicar réplicas de 10 a 60.",
    physicalExamOrContext: "Dashboard Grafana: CPU en 25%, memoria en 40%, pero el pool de threads Tomcat y conexiones HikariCP reportan saturation=100%.",
    availableInvestigations: [
      {
        id: "db-pool-metrics",
        name: "Métricas de Pool de Conexiones a Base de Datos (HikariCP)",
        category: "Telemetría / Trazado",
        resultText: "ActiveConnections: 10/10 (max pool size=10). PendingThreads: 840 esperando conexión libre con timeout de 30.000ms.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "thread-dump",
        name: "Thread Dump de la JVM en Instancia de Producción",
        category: "Telemetría / Trazado",
        resultText: "Cientos de threads bloqueados en java.sql.Connection.prepareStatement dentro de una llamada no cacheada a SELECT * FROM fraud_rules.",
        isEssential: true,
        costPoints: 0,
      },
      {
        id: "disk-io-check",
        name: "Monitoreo de IOPS de Disco en Nodos de Kubernetes",
        category: "Telemetría / Trazado",
        resultText: "IOPS al 12% de capacidad. No existe cuello de botella en almacenamiento físico.",
        isEssential: false,
        costPoints: 1,
      },
      {
        id: "k8s-pod-restart",
        name: "Reinicio Masivo Forzado de Pods (Rolling Restart)",
        category: "Peritaje / Prueba",
        resultText: "La caída de pods satura momentáneamente más la base de datos al reabrir los pools simultáneamente (Thundering Herd Problem).",
        isEssential: false,
        costPoints: 3,
      },
    ],
    goldStandard: {
      primaryDiagnosis: "Agotamiento de Pool de Conexiones por Fuga o Contención de Conexiones en Query Lenta No Cacheada",
      differentialDiagnoses: [
        "DDoS externo volumétrico en ingress",
        "Saturación de CPU por serialización JSON",
        "Fuga de memoria (OOMKill) en heap de la JVM",
      ],
      criticalActionOrPlan: "Aumentar temporalmente maxPoolSize de HikariCP a nivel seguro en BD + Habilitar caché local in-memory (Redis/Caffeine) para fraud_rules + Disminuir connectionTimeout para evitar retención de threads.",
      contraindicatedActions: [
        "Aumentar réplicas de Pods indefinidamente (agrava la saturación de conexiones hacia la base de datos)",
      ],
      clinicalPearls: [
        "Añadir más pods cuando el recurso compartido de backend (pool de BD) está saturado acelera la degradación total del sistema.",
      ],
    },
  },
];

/**
 * Normalizes text for lenient keyword matching
 */
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, " ");
}

/**
 * Evaluates a student's diagnostic attempt on a case study
 */
export function evaluateCaseStudyAttempt(
  caseStudy: CaseStudy,
  unlockedInvestigationIds: string[],
  studentDiagnosis: string,
  studentPlan: string,
): CaseEvaluationResult {
  const normDiag = normalizeText(studentDiagnosis);
  const normPlan = normalizeText(studentPlan);
  const normGoldDiag = normalizeText(caseStudy.goldStandard.primaryDiagnosis);
  const normGoldPlan = normalizeText(caseStudy.goldStandard.criticalActionOrPlan);

  // 1. Diagnostic Score (0 to 10)
  let diagnosticScore = 2.0; // base for participating
  const goldDiagWords = normGoldDiag.split(/\s+/).filter((w) => w.length > 3);
  let diagMatches = 0;

  for (const w of goldDiagWords) {
    if (normDiag.includes(w)) diagMatches++;
  }

  if (goldDiagWords.length > 0) {
    const ratio = diagMatches / goldDiagWords.length;
    diagnosticScore = Math.min(10, Math.max(1, ratio * 10));
  }

  // Check differential diagnoses bonus
  for (const diff of caseStudy.goldStandard.differentialDiagnoses) {
    const normDiff = normalizeText(diff);
    if (normDiag.includes(normDiff.split(" ")[0])) {
      diagnosticScore = Math.min(10, diagnosticScore + 0.5);
    }
  }

  // 2. Efficiency Score (0 to 10) — Ockham's Razor
  let penaltyPoints = 0;
  const unnecessaryInvestigationsRequested: string[] = [];
  const essentialInvestigationsMissed: string[] = [];

  for (const inv of caseStudy.availableInvestigations) {
    const wasUnlocked = unlockedInvestigationIds.includes(inv.id);
    if (wasUnlocked && !inv.isEssential) {
      penaltyPoints += inv.costPoints;
      unnecessaryInvestigationsRequested.push(inv.name);
    } else if (!wasUnlocked && inv.isEssential) {
      essentialInvestigationsMissed.push(inv.name);
      penaltyPoints += 2.0; // penalize missing critical tests
    }
  }

  const efficiencyScore = Math.max(1, Math.min(10, 10 - penaltyPoints));

  let efficiencyCategory: CaseEvaluationResult["efficiencyCategory"];
  if (efficiencyScore >= 8.5) {
    efficiencyCategory = "Excelente (Criterio Ockham)";
  } else if (efficiencyScore >= 5.5) {
    efficiencyCategory = "Moderada";
  } else {
    efficiencyCategory = "Exceso de Pruebas / Iatrogenia";
  }

  // 3. Plan / Action Score (0 to 10)
  let planScore = 3.0;
  const goldPlanWords = normGoldPlan.split(/\s+/).filter((w) => w.length > 4);
  let planMatches = 0;

  for (const w of goldPlanWords) {
    if (normPlan.includes(w)) planMatches++;
  }

  if (goldPlanWords.length > 0) {
    const ratio = planMatches / goldPlanWords.length;
    planScore = Math.min(10, Math.max(2, ratio * 10));
  }

  // Check contraindicated actions
  for (const cont of caseStudy.goldStandard.contraindicatedActions) {
    const normCont = normalizeText(cont);
    if (normPlan.includes(normCont.slice(0, 15))) {
      planScore = Math.max(1, planScore - 3.0);
    }
  }

  // 4. Weighted Total Score
  const totalWeighted = diagnosticScore * 0.45 + efficiencyScore * 0.25 + planScore * 0.30;
  const totalScore = Math.round(Math.min(10, Math.max(1, totalWeighted)) * 10) / 10;

  // Feedback points
  const feedback: string[] = [];

  if (diagnosticScore >= 7.5) {
    feedback.push("Diagnóstico principal acertado y alineado con los hallazgos patognomónicos.");
  } else {
    feedback.push(`El diagnóstico de referencia era: "${caseStudy.goldStandard.primaryDiagnosis}".`);
  }

  if (efficiencyScore >= 8.0) {
    feedback.push("Excelente economía de recursos: solicitaste únicamente los estudios esenciales sin recurrir a pruebas redundantes.");
  } else if (unnecessaryInvestigationsRequested.length > 0) {
    feedback.push(`Se solicitaron estudios no esenciales o potencialmente iatrogénicos: ${unnecessaryInvestigationsRequested.join(", ")}.`);
  }

  if (essentialInvestigationsMissed.length > 0) {
    feedback.push(`Se omitieron estudios diagnósticos de primera línea: ${essentialInvestigationsMissed.join(", ")}.`);
  }

  if (planScore >= 7.0) {
    feedback.push("Plan terapéutico/resolutivo adecuado a las guías clínicas y doctrinales.");
  } else {
    feedback.push("El plan terapéutico omitió intervenciones críticas de primera línea.");
  }

  return {
    diagnosticScore: Math.round(diagnosticScore * 10) / 10,
    efficiencyScore: Math.round(efficiencyScore * 10) / 10,
    planScore: Math.round(planScore * 10) / 10,
    totalScore,
    efficiencyCategory,
    unnecessaryInvestigationsRequested,
    essentialInvestigationsMissed,
    feedback,
  };
}

/**
 * Persists a case study attempt to db.sessions
 */
export async function saveCaseSessionRecord(
  caseTitle: string,
  durationSec: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void caseTitle;
  const recordId = `case_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "case-study",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
