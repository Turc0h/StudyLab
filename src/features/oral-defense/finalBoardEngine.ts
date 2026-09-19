import { db } from "../../db/db.ts";

export type JuryArchetype = "dogmatic" | "practical" | "methodological";

export interface JuryMember {
  id: string;
  name: string;
  academicTitle: string;
  archetype: JuryArchetype;
  archetypeTitle: string;
  focusDescription: string;
  avatarColor: string;
}

export interface BoardQuestionRound {
  roundNumber: number;
  juryMemberId: string;
  questionText: string;
  rubricCriteria: string[];
  trapOrPitfall: string;
  modelAnswerKeyPoints: string[];
  smokeThresholdWords: number;
}

export interface DefenseScenario {
  id: string;
  title: string;
  career: string;
  thesisOrTopic: string;
  context: string;
  timeLimitMinutes: number;
  jury: JuryMember[];
  rounds: BoardQuestionRound[];
}

export interface StudentBoardAnswer {
  roundNumber: number;
  juryMemberId: string;
  answerText: string;
  timeSpentSec: number;
}

export interface BoardEvaluationRecord {
  scenarioId: string;
  scenarioTitle: string;
  actaNumber: string;
  studentName?: string;
  juryScores: Record<
    string,
    {
      juryName: string;
      archetype: JuryArchetype;
      score: number; // 1 to 10
      dimension: string;
      comment: string;
    }
  >;
  finalWeightedGrade: number; // 1.0 to 10.0
  verdict: "sobresaliente_distincion" | "aprobado" | "insuficiente";
  verdictLabel: string;
  strengths: string[];
  criticalDeficits: string[];
  timestamp: number;
}

// -----------------------------------------------------------------------------
// BANCO DE CASOS Y TRIBUNALES PRECARGADOS
// -----------------------------------------------------------------------------

export const PRESET_DEFENSE_SCENARIOS: DefenseScenario[] = [
  {
    id: "defense-med-ateneo",
    title: "Ateneo Clínico y Defensa Final de Residencia",
    career: "Medicina & Cuidados Críticos",
    thesisOrTopic: "Manejo Hemodinámico del Shock Mixto y Fibrilación Auricular Refractaria",
    context: "Paciente de 68 años ingresa a UTI post-angioplastia fallida en shock cardiogénico con hiperlactatemia severa (6 mmol/L) y compromiso renal agudo oligúrico.",
    timeLimitMinutes: 20,
    jury: [
      {
        id: "jury-med-1",
        name: "Dr. Alberto Zimmermann",
        academicTitle: "Profesor Titular Plenario de Cátedra",
        archetype: "dogmatic",
        archetypeTitle: "El Dogmático / Fisiopatología Pura",
        focusDescription: "Exige rigor molecular exacto, curvas de Frank-Starling, leyes biofísicas y dosificación farmacodinámica milimétrica.",
        avatarColor: "from-blue-600 to-indigo-800",
      },
      {
        id: "jury-med-2",
        name: "Dra. Valeria Fontana",
        academicTitle: "Jefa de Servicio UTI y Docente Adscripta",
        archetype: "practical",
        archetypeTitle: "La Práctica / Casos Límite y Terreno Hostil",
        focusDescription: "Desafía con el paciente que no responde al libro: shock refractario, interacción de vasopresores y rescate con ECMO.",
        avatarColor: "from-rose-600 to-amber-700",
      },
      {
        id: "jury-med-3",
        name: "Dr. Marcelo Benítez",
        academicTitle: "Presidente del Tribunal & Director Académico",
        archetype: "methodological",
        archetypeTitle: "El Metodólogo / Coordinador de Cátedra",
        focusDescription: "Evalúa criterio de priorización vital, detección de inconsistencias o diagnósticos apresurados sin confirmación.",
        avatarColor: "from-emerald-600 to-teal-800",
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        juryMemberId: "jury-med-1",
        questionText: "Explique detalladamente la alteración en el acoplamiento ventrículo-arterial y justifique celularmente por qué los inotrópicos puros agonistas beta-1 aumentan el consumo miocárdico de oxígeno en este miocardio isquémico.",
        rubricCriteria: [
          "Definición de elastancia ventricular sistólica (Ees) y elastancia arterial efectiva (Ea)",
          "Aumento de AMP cíclico intracelular y sobrecarga citosólica de calcio",
          "Ineficiencia energética mitocondrial en miocardio con reserva coronaria agotada",
        ],
        trapOrPitfall: "Responder genéricamente que 'hace latir más rápido al corazón' sin nombrar la elastancia y el calcio intracelular.",
        modelAnswerKeyPoints: [
          "Elastancia ventrículo-arterial Ees/Ea",
          "Consumo miocárdico de O2 (MVO2) dependiente de tensión parietal y frecuencia",
          "Aumento de Ca2+ citosólico que favorece arritmias y apoptosis celular",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 2,
        juryMemberId: "jury-med-2",
        questionText: "El paciente entra en Fibrilación Auricular aguda con respuesta ventricular de 165 lpm y la PAM cae a 48 mmHg a pesar de Noradrenalina a 0.5 mcg/kg/min. ¿Cuál es su maniobra inmediata y qué fármaco tiene formalmente prohibido prescribir en este instante?",
        rubricCriteria: [
          "Cardioversión eléctrica sincronizada inmediata por inestabilidad hemodinámica manifiesta",
          "Contraindicación estricta de betabloqueantes y bloqueantes cálcicos no dihidropiridínicos (Diltiazem/Verapamilo)",
          "Uso eventual de amiodarona intravenosa sólo tras restablecer estabilidad básica",
        ],
        trapOrPitfall: "Proponer infusión de betabloqueantes para 'bajar la frecuencia' en un paciente con colapso hemodinámico.",
        modelAnswerKeyPoints: [
          "Cardioversión eléctrica sincronizada inmediata",
          "Inestabilidad hemodinámica con hipotensión severa",
          "Prohibidos bloqueantes cálcicos y betabloqueantes por colapso contráctil fulminante",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 3,
        juryMemberId: "jury-med-3",
        questionText: "Resuma en dos minutos el criterio definitivo para decidir entre soporte circulatorio mecánico (Impella o ECMO V-A) versus paliación, considerando la presencia de falla multiorgánica incipiente.",
        rubricCriteria: [
          "Evaluación de viabilidad neurológica previa (ausencia de daño anóxico irreversible)",
          "Reversibilidad potencial de la causa etiológica primaria",
          "Ausencia de contraindicaciones absolutas como hemorragia activa o acidosis letal prolongada",
        ],
        trapOrPitfall: "Hablar de generalidades sin especificar reversibilidad etiológica y preservación neurológica.",
        modelAnswerKeyPoints: [
          "Puente a la recuperación o decisión (Bridge to decision/recovery)",
          "Estado neurológico y ventana de viabilidad orgánica",
          "Consentimiento informado y objetivos terapéuticos consensuados",
        ],
        smokeThresholdWords: 30,
      },
    ],
  },
  {
    id: "defense-law-tesis",
    title: "Tribunal de Tesis de Grado en Responsabilidad Civil",
    career: "Abogacía & Derecho de Daños",
    thesisOrTopic: "Factores de Atribución y Fractura del Nexo Causal en Sistemas Autónomos",
    context: "Defensa oral de tesis sobre la aplicabilidad del artículo 1757 del Código Civil y Comercial de la Nación a daños causados por software con algoritmos de aprendizaje de caja negra.",
    timeLimitMinutes: 25,
    jury: [
      {
        id: "jury-law-1",
        name: "Dr. Horacio Rosatti Soria",
        academicTitle: "Profesor Titular de Obligaciones y Contratos",
        archetype: "dogmatic",
        archetypeTitle: "El Dogmático / Jurisprudencia y Código",
        focusDescription: "Férreo defensor de la tradición civilista; confronta cualquier intento de crear figuras exóticas sin sustento normativo positivo.",
        avatarColor: "from-amber-600 to-yellow-800",
      },
      {
        id: "jury-law-2",
        name: "Dra. Marcela Trigo",
        academicTitle: "Especialista en Derecho Comercial y Tecnológico",
        archetype: "practical",
        archetypeTitle: "La Práctica / Impacto Económico y Mercado",
        focusDescription: "Pregunta sobre quién paga el seguro, el fabricante vs el operador y la inviabilidad económica de la responsabilidad subjetiva.",
        avatarColor: "from-cyan-600 to-blue-800",
      },
      {
        id: "jury-law-3",
        name: "Dr. Ernesto Galvis",
        academicTitle: "Presidente del Tribunal & Director del Doctorado",
        archetype: "methodological",
        archetypeTitle: "El Metodólogo / Rigor Argumentativo",
        focusDescription: "Audita la coherencia lógica de la hipótesis, el principio de no contradicción y el manejo del tiempo expositivo.",
        avatarColor: "from-purple-600 to-indigo-900",
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        juryMemberId: "jury-law-1",
        questionText: "¿Cómo encuadra dogmáticamente el software predictivo no programado por reglas en la categoría de 'cosa riesgosa o viciosa' del art. 1757, y qué opina de quienes niegan que sea una 'cosa' corpórea?",
        rubricCriteria: [
          "Interpretación extensiva del art. 1757 CCCN a actividades riesgosas incorporadas a bienes",
          "Aplicación analógica de la teoría del riesgo creado y provecho",
          "Inoponibilidad de la falta de corporeidad estricta cuando opera en el tráfico jurídico",
        ],
        trapOrPitfall: "Confundir culpa con factor objetivo de atribución o dudar sobre si el software genera responsabilidad.",
        modelAnswerKeyPoints: [
          "Artículo 1757 Código Civil y Comercial: actividad riesgosa por su naturaleza o medios empleados",
          "Riesgo creado objetivo con abstracción de la corporeidad",
          "Responsabilidad concurrente del dueño y guardián",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 2,
        juryMemberId: "jury-law-2",
        questionText: "Si el algoritmo tomó una decisión que estadísticamente era la óptima pero causó un daño puntual, ¿puede el fabricante alegar con éxito la 'eximente de caso fortuito o hecho imprevisible' del art. 1730?",
        rubricCriteria: [
          "Inadmisibilidad del riesgo del desarrollo como caso fortuito en materia consumeril y objetiva",
          "El error probabilístico forma parte del riesgo intrínseco de la actividad",
          "Exigencia de ajenidad absoluta y exterioridad para fracturar el nexo causal",
        ],
        trapOrPitfall: "Aceptar que porque el algoritmo es 'complejo e impredecible' se trata de un caso fortuito que exime.",
        modelAnswerKeyPoints: [
          "Falta de ajenidad: es un riesgo interno y propio del sistema",
          "El caso fortuito exige ser extraño al riesgo propio de la cosa",
          "La imprevisibilidad técnica no equivale a eximente legal",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 3,
        juryMemberId: "jury-law-3",
        questionText: "Concluya en un minuto: ¿su tesis postula mantener la estructura del CCCN o recomienda una ley especial de seguro obligatorio? Justifique sin ambigüedades.",
        rubricCriteria: [
          "Postura nítida sin titubear ni contradecir el marco dogmático planteado",
          "Ponderación entre suficiencia del régimen objetivo actual y necesidad de garantía de solvencia",
          "Cierre sintético y asertivo con terminología jurídica precisa",
        ],
        trapOrPitfall: "Dar una respuesta ambivalente diciendo 'depende' sin fijar postura concluyente.",
        modelAnswerKeyPoints: [
          "Suficiencia del art. 1757 y 1758 para la imputación jurídica",
          "Complementariedad indispensable con seguro obligatorio para efectivizar la reparación",
          "Principio pro damnato como faro de interpretación",
        ],
        smokeThresholdWords: 30,
      },
    ],
  },
  {
    id: "defense-eng-proyecto",
    title: "Defensa Oral de Proyecto Integrador de Ingeniería",
    career: "Ingeniería de Software & Computación",
    thesisOrTopic: "Diseño de un Motor de Base de Datos Distribuida con Consenso Raft Multi-Grupo",
    context: "Defensa técnica del diseño arquitectural, pruebas de partición de red con chaos engineering y latencias de commit distribuido bajo alta contención.",
    timeLimitMinutes: 20,
    jury: [
      {
        id: "jury-eng-1",
        name: "Ing. Guillermo Krapovickas",
        academicTitle: "Profesor Titular de Sistemas Distribuidos y Redes",
        archetype: "dogmatic",
        archetypeTitle: "El Dogmático / Protocolos Formales y TLA+",
        focusDescription: "Examina con lupa las pruebas de seguridad lógica (Safety), invariantes de quórum y correctitud formal del log replication.",
        avatarColor: "from-emerald-600 to-cyan-800",
      },
      {
        id: "jury-eng-2",
        name: "Ing. Laura Santander",
        academicTitle: "Especialista en Infraestructura Cloud y SRE",
        archetype: "practical",
        archetypeTitle: "La Práctica / Caídas Reales y Cuellos de Botella",
        focusDescription: "Desafía con tormentas de split-brain asimétrico, saturación de disco NVMe y latencia de red跨región.",
        avatarColor: "from-violet-600 to-fuchsia-800",
      },
      {
        id: "jury-eng-3",
        name: "Dr. Fernando Sica",
        academicTitle: "Director de Carrera y Presidente del Tribunal",
        archetype: "methodological",
        archetypeTitle: "El Metodólogo / Arquitectura y Trade-offs",
        focusDescription: "Pregunta sobre el costo-beneficio de la solución, trade-offs del Teorema CAP y justificación de la complejidad introducida.",
        avatarColor: "from-blue-700 to-slate-800",
      },
    ],
    rounds: [
      {
        roundNumber: 1,
        juryMemberId: "jury-eng-1",
        questionText: "Demuestre formalmente por qué la regla de elección del log más actualizado de Raft (Leader Election Restriction) previene que un candidato electo sobreescriba entradas de log previamente confirmadas (Committed).",
        rubricCriteria: [
          "Definición de log completeness: el candidato debe tener un último término mayor, o a igual término, un log más largo",
          "Intersección obligatoria entre la mayoría que confirmó el log previo y la mayoría que vota al nuevo líder",
          "Garantía de la invariante Leader Completeness Property",
        ],
        trapOrPitfall: "Confundir el índice de log con el término electoral (term) o no mencionar la intersección de quórums.",
        modelAnswerKeyPoints: [
          "Regla de comparación: (lastLogTerm, lastLogIndex)",
          "Propiedad de intersección de quórums de mayoría estricta (N/2 + 1)",
          "Invariante Leader Completeness y State Machine Safety",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 2,
        juryMemberId: "jury-eng-2",
        questionText: "Durante un particionamiento asimétrico donde el líder viejo puede comunicarse con el cliente pero no con sus seguidores, ¿cómo evita lecturas inconsistentes (Stale Reads) sin penalizar cada GET con un round-trip de consenso completo?",
        rubricCriteria: [
          "Técnica de Read Index con verificación de quórum de latidos (heartbeat checks)",
          "Uso alternativo de Lease Reads sincronizados con reloj físico cauto",
          "Rechazo del líder sin quórum tras expiración del election timeout",
        ],
        trapOrPitfall: "Responder que 'el líder siempre responde al instante porque tiene el dato local', ignorando la lectura desactualizada.",
        modelAnswerKeyPoints: [
          "Read Index: chequear quórum de heartbeats antes de servir la lectura",
          "Leader Leases acotadas por tiempo de deriva de reloj",
          "Prevención de Stale Reads en presencia de partición",
        ],
        smokeThresholdWords: 35,
      },
      {
        roundNumber: 3,
        juryMemberId: "jury-eng-3",
        questionText: "En treinta segundos: ¿cuál es el principal trade-off por el cual un banco preferiría esta arquitectura frente a una replicación asíncrona estándar en PostgreSQL?",
        rubricCriteria: [
          "RPO = 0 garantizado ante fallas no correlacionadas de nodos sin pérdida de transacciones financieras",
          "Costo asumido: mayor latencia de escritura en percentil 99 y mayor complejidad operacional",
          "Síntesis certera sin titubeos técnicos",
        ],
        trapOrPitfall: "Afirmar que Raft es 'más rápido en todo', sin reconocer la penalización de latencia en escrituras.",
        modelAnswerKeyPoints: [
          "RPO cero y consistencia linearizable estricta",
          "Trade-off: incremento en latencia de consenso de red frente a replicación asíncrona",
          "Eliminación de la intervención humana en caso de failover",
        ],
        smokeThresholdWords: 30,
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// MOTOR DE EVALUACIÓN Y DETECCIÓN DE HUMO
// -----------------------------------------------------------------------------

export function detectOralSmoke(
  answerText: string,
  modelKeyPoints: string[],
  minWords: number,
): { isSmoke: boolean; reasons: string[]; confidence: number } {
  const text = answerText.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const reasons: string[] = [];

  if (words.length < minWords) {
    reasons.push(`Respuesta excesivamente telegráfica (${words.length} palabras de ${minWords} mínimas requeridas). Faltó desarrollo argumental.`);
  }

  // Comprobar presencia de muletillas de evasión ("humo")
  const smokePhrases = [
    "como todos sabemos",
    "en líneas generales",
    "básicamente digamos",
    "es todo un tema",
    "habría que ver",
    "depende del contexto en sí",
    "según la opinión de varios autores sin especificar",
    "por decirlo de alguna manera",
  ];

  let smokeHits = 0;
  for (const phrase of smokePhrases) {
    if (text.toLowerCase().includes(phrase)) {
      smokeHits++;
    }
  }

  if (smokeHits >= 2) {
    reasons.push("Uso reiterado de evasivas o muletillas genéricas sin precisión conceptual.");
  }

  // Evaluar presencia de palabras clave del modelo
  const lowerText = text.toLowerCase();
  const matchedPoints = modelKeyPoints.filter((kp) =>
    kp.toLowerCase().split(/\s+/).some((token) => token.length > 4 && lowerText.includes(token)),
  );

  const coverageRatio = matchedPoints.length / (modelKeyPoints.length || 1);

  if (coverageRatio < 0.35 && words.length >= minWords) {
    reasons.push("El discurso eludió los puntos nodales solicitados por el jurado (falta de anclaje técnico).");
  }

  const isSmoke = reasons.length > 0;
  const confidence = Math.min(1.0, (reasons.length * 0.35) + (1 - coverageRatio) * 0.5);

  return { isSmoke, reasons, confidence };
}

/**
 * Computa la calificación de cada uno de los 3 miembros del jurado y genera el Acta Oficial.
 */
export function evaluateBoardPerformance(
  scenario: DefenseScenario,
  answers: StudentBoardAnswer[],
  studentName: string = "Alumno Regular",
): BoardEvaluationRecord {
  const juryScores: BoardEvaluationRecord["juryScores"] = {};
  const strengths: string[] = [];
  const criticalDeficits: string[] = [];

  let totalWeighted = 0;

  for (const jury of scenario.jury) {
    const round = scenario.rounds.find((r) => r.juryMemberId === jury.id);
    const answer = answers.find((a) => a.juryMemberId === jury.id);

    const answerText = answer?.answerText || "";
    const keyPoints = round?.modelAnswerKeyPoints || [];
    const minWords = round?.smokeThresholdWords || 30;

    const smokeCheck = detectOralSmoke(answerText, keyPoints, minWords);

    let memberScore = 7.0; // Base neutra

    if (!answerText || answerText.trim().length === 0) {
      memberScore = 1.0;
      criticalDeficits.push(`Silencio o falta de respuesta ante la pregunta de ${jury.name}.`);
    } else {
      // Ponderar palabras clave
      const lower = answerText.toLowerCase();
      let matchedCount = 0;
      for (const kp of keyPoints) {
        const tokens = kp.toLowerCase().split(/\s+/).filter((t) => t.length > 4);
        if (tokens.some((t) => lower.includes(t))) {
          matchedCount++;
        }
      }

      const matchRatio = matchedCount / (keyPoints.length || 1);
      memberScore = 4.0 + matchRatio * 5.5;

      if (smokeCheck.isSmoke) {
        memberScore = Math.max(2.0, memberScore - 2.5);
        criticalDeficits.push(`${jury.archetypeTitle}: Detectó evasivas conceptuales (${smokeCheck.reasons[0]}).`);
      } else {
        memberScore = Math.min(10.0, memberScore + 0.5);
        strengths.push(`${jury.archetypeTitle}: Respuesta sólida orientada al foco de la pregunta.`);
      }
    }

    memberScore = Math.round(memberScore * 10) / 10;
    totalWeighted += memberScore;

    let dimensionLabel = "";
    if (jury.archetype === "dogmatic") dimensionLabel = "Rigor Teórico y Precisión de Fuentes";
    else if (jury.archetype === "practical") dimensionLabel = "Resolución en Escenarios Límite";
    else dimensionLabel = "Estructura Lógica y Síntesis";

    let comment = "";
    if (memberScore >= 8.5) {
      comment = "Excelente dominio. Respondió con solvencia, sin titubear y fundamentando desde los principios nucleares.";
    } else if (memberScore >= 6.0) {
      comment = "Aprobado. Conoce la materia aunque manifestó imprecisiones en aspectos de detalle o casos complejos.";
    } else {
      comment = "Insuficiente. No logró articular una respuesta coherente con el nivel de exigencia de la cátedra.";
    }

    juryScores[jury.id] = {
      juryName: jury.name,
      archetype: jury.archetype,
      score: memberScore,
      dimension: dimensionLabel,
      comment,
    };
  }

  const finalWeightedGrade = Math.round((totalWeighted / (scenario.jury.length || 1)) * 10) / 10;

  let verdict: BoardEvaluationRecord["verdict"];
  let verdictLabel: string;

  if (finalWeightedGrade >= 8.5) {
    verdict = "sobresaliente_distincion";
    verdictLabel = "Aprobado con Distinción / Sobresaliente (10/10)";
  } else if (finalWeightedGrade >= 4.0) {
    verdict = "aprobado";
    verdictLabel = "Aprobado (Defensa Válida)";
  } else {
    verdict = "insuficiente";
    verdictLabel = "Insuficiente / No Promovido (A Recursar o Rehacer)";
  }

  const actaNumber = `ACTA-COL-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

  return {
    scenarioId: scenario.id,
    scenarioTitle: scenario.title,
    actaNumber,
    studentName,
    juryScores,
    finalWeightedGrade,
    verdict,
    verdictLabel,
    strengths,
    criticalDeficits,
    timestamp: Date.now(),
  };
}

// -----------------------------------------------------------------------------
// HISTORIAL Y PERSISTENCIA DE SESIÓN
// -----------------------------------------------------------------------------

export async function saveFinalBoardSessionRecord(
  scenarioTitle: string,
  durationSec: number,
  finalGrade: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void scenarioTitle;
  void finalGrade;
  const recordId = `fboard_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "final-board",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
