import { db } from "../../db/db";

export interface FrictionPoint {
  id: string;
  title: string;
  explanation: string;
  entitiesInvolved: string[];
}

export interface ComparativeMatrix {
  id: string;
  title: string;
  discipline: "Psicología & Educación" | "Medicina & Fisiopatología" | "Economía & Finanzas" | "Derecho & Jurídico" | "General";
  description: string;
  entities: string[]; // Columns (e.g., Theories, Authors, Pathologies)
  dimensions: string[]; // Rows (e.g., Object of study, Mechanism, Main authors, Pitfalls)
  cells: Record<string, string>; // Key: `${entityIdx}_${dimensionIdx}`
  frictionPoints: FrictionPoint[]; // Clashes that professors ask in exams
}

export interface BlindCellItem {
  cellKey: string;
  entityIndex: number;
  dimensionIndex: number;
  entityName: string;
  dimensionName: string;
  canonicalContent: string;
  isHidden: boolean;
  userAnswer?: string;
  masteryStatus: "untested" | "mastered" | "doubtful" | "failed";
}

export const PRESET_COMPARATIVE_MATRICES: ComparativeMatrix[] = [
  {
    id: "learning-theories",
    title: "Corrientes Epistemológicas del Aprendizaje",
    discipline: "Psicología & Educación",
    description: "Comparativa entre las tres grandes escuelas del siglo XX: conductismo radical, cognitivismo computacional y constructivismo histórico-cultural.",
    entities: ["Conductismo (Skinner)", "Cognitivismo (Piaget)", "Constructivismo (Vygotsky)"],
    dimensions: [
      "Objeto Central",
      "Rol del Sujeto",
      "Mecanismo Clave",
      "Papel del Lenguaje",
      "Pregunta Clásica de Cátedra",
    ],
    cells: {
      "0_0": "Conducta observable y medible; rechazo de constructos mentalistas o cajas negras.",
      "1_0": "Estructuras mentales internas, esquemas cognitivos y etapas del desarrollo psicogenético.",
      "2_0": "Funciones psicológicas superiores mediadas culturalmente y praxis histórica intersubjetiva.",

      "0_1": "Pasivo y reactivo; responde a contingencias de refuerzo y estímulos del ambiente.",
      "1_1": "Activo y constructor individual; interactúa con el objeto físico en solitario.",
      "2_1": "Social e histórico; co-construye significado mediante interacción con el otro más capaz.",

      "0_2": "Condicionamiento operante (refuerzos positivos/negativos y castigos).",
      "1_2": "Equilibración dialéctica entre asimilación de esquemas y acomodación al medio.",
      "2_2": "Internalización dialéctica a través de la Zona de Desarrollo Próximo (ZDP) y andamiaje.",

      "0_3": "Conducta verbal secundaria aprendida por imitación y moldeamiento de contingencias.",
      "1_3": "Reflejo del pensamiento prelógico que gradualmente se socializa (lenguaje egocéntrico primero).",
      "2_3": "Herramienta semiótica principal; el lenguaje social se internaliza como pensamiento reflexivo.",

      "0_4": "¿Por qué el castigo solo extingue temporalmente la respuesta sin erradicarla?",
      "1_4": "¿Por qué no se puede acelerar artificialmente el paso del estadio preoperacional al formal?",
      "2_4": "¿Cómo opera la doble formación: primero en el plano interpsicológico y luego intrapsicológico?",
    },
    frictionPoints: [
      {
        id: "fric-1",
        title: "Génesis del Lenguaje: Piaget vs Vygotsky",
        explanation: "Para Piaget el lenguaje nace del pensamiento egocéntrico y se socializa después; para Vygotsky es social desde su origen y luego se hace pensamiento interno.",
        entitiesInvolved: ["Cognitivismo (Piaget)", "Constructivismo (Vygotsky)"],
      },
      {
        id: "fric-2",
        title: "Sujeto Solitario vs Mediación Cultural",
        explanation: "Skinner reduce al sujeto a contingencias físicas directas; Piaget añade esquemas lógicos pero en aislamiento; Vygotsky coloca al adulto/cultura como mediador indispensable.",
        entitiesInvolved: ["Conductismo (Skinner)", "Cognitivismo (Piaget)", "Constructivismo (Vygotsky)"],
      },
    ],
  },
  {
    id: "cardio-failure",
    title: "Diagnóstico Diferencial: Insuficiencia Cardíaca",
    discipline: "Medicina & Fisiopatología",
    description: "Despiece hemodinámico y ecocardiográfico entre IC con fracción de eyección reducida (ICFEr) vs preservada (ICFEp).",
    entities: ["IC Sistólica (ICFEr)", "IC Diastólica (ICFEp)"],
    dimensions: [
      "Fracción de Eyección (FEVI)",
      "Mecanismo Fisiopatológico",
      "Remodelado Ventricular",
      "Presiones de Llenado",
      "Pilar Farmacológico de Cátedra",
    ],
    cells: {
      "0_0": "FEVI < 40% (contractilidad miocárdica gravemente comprometida).",
      "1_0": "FEVI >= 50% (función contráctil conservada con rigidez de cámara).",

      "0_1": "Falla de bomba anterógrada por pérdida o lesión de cardiomiocitos.",
      "1_1": "Falla de relajación y distensibilidad ventricular; aumento de rigidez parietal.",

      "0_2": "Hipertrofia excéntrica con dilatación marcada de cavidad ventricular izquierda.",
      "1_2": "Hipertrofia concéntrica sin dilatación significativa de la cavidad.",

      "0_3": "Presión de fin de diástole muy elevada secundaria a sobrecarga de volumen.",
      "1_3": "Presión de fin de diástole elevada por escasa distensibilidad con volumen normal o bajo.",

      "0_4": "Cuádruple terapia: iSGLT2, ARNI/IECA, Beta-bloqueantes y ARM (Espironolactona).",
      "1_4": "iSGLT2 (Empagliflozina/Dapagliflozina) y control diurético cuidadoso de la volemia.",
    },
    frictionPoints: [
      {
        id: "fric-ic-1",
        title: "Trampa de Examen: Fracción de Eyección Normal no Descarta IC",
        explanation: "Una FEVI del 55% en presencia de disnea, edema pulmonar y congestión venosa orienta a falla diastólica (ICFEp), no a ausencia de patología cardíaca.",
        entitiesInvolved: ["IC Sistólica (ICFEr)", "IC Diastólica (ICFEp)"],
      },
    ],
  },
  {
    id: "macro-schools",
    title: "Macroeconomía: Keynesianismo vs Monetarismo",
    discipline: "Economía & Finanzas",
    description: "Contraste paradigmático sobre la neutralidad del dinero, rigidez de precios y papel de la política fiscal anticíclica.",
    entities: ["Keynesianismo (Keynes)", "Monetarismo (Friedman)", "Escuela Austríaca (Hayek)"],
    dimensions: [
      "Causa de las Crisis",
      "Velocidad del Dinero (V)",
      "Flexibilidad de Precios",
      "Rol del Gasto Público",
      "Postura ante la Curva de Phillips",
    ],
    cells: {
      "0_0": "Colapso de la demanda agregada e incertidumbre radical en la inversión privada.",
      "1_0": "Manejo errático de la oferta monetaria por parte del Banco Central.",
      "2_0": "Distorsión de tasas de interés por crédito artificial que genera malas inversiones (malinvestment).",

      "0_1": "Inestable y pro-cíclica; depende de la preferencia por la liquidez.",
      "1_1": "Relativamente constante y predecible en el largo plazo.",
      "2_1": "Subjetiva y dependiente del tiempo y expectativas individuales de ahorro.",

      "0_2": "Precios y salarios rígidos a la baja en el corto plazo; mercados no se vacían rápido.",
      "1_2": "Precios flexibles en mediano plazo; ajustes por expectativas adaptativas.",
      "2_2": "Precios como señales dinámicas de información que se distorsionan con la intervención estatal.",

      "0_3": "Herramienta activa anticíclica (multiplicador del gasto) para sostener empleo.",
      "1_3": "Genera crowding-out (desplazamiento de inversión privada) e ineficiencia asignativa.",
      "2_3": "Destructivo; confisca ahorro real y retrasa la liquidación de proyectos no viables.",

      "0_4": "Trade-off estable: mayor inflación permite menor desempleo.",
      "1_4": "Vertical a largo plazo en la Tasa Natural de Desempleo; ilusión monetaria temporal.",
      "2_4": "Construcción espuria agregada que ignora la estructura temporal del capital.",
    },
    frictionPoints: [
      {
        id: "fric-macro-1",
        title: "Efecto Desplazamiento (Crowding Out)",
        explanation: "Keynes sostiene que con capacidad ociosa el gasto público no desplaza sino que tracciona; Friedman y Hayek demuestran que compite por ahorro encareciendo la tasa.",
        entitiesInvolved: ["Keynesianismo (Keynes)", "Monetarismo (Friedman)"],
      },
    ],
  },
  {
    id: "civil-liability",
    title: "Derecho de Daños: Responsabilidad Civil",
    discipline: "Derecho & Jurídico",
    description: "Comparativa analítica entre la responsabilidad civil contractual y extracontractual (aquiliana).",
    entities: ["Responsabilidad Contractual", "Responsabilidad Extracontractual"],
    dimensions: [
      "Origen del Vínculo",
      "Factor de Atribución Típico",
      "Extensión del Resarcimiento",
      "Carga de la Prueba",
      "Plazo de Prescripción",
    ],
    cells: {
      "0_0": "Incumplimiento de una obligación preexistente pactada entre partes.",
      "1_0": "Violación del deber genérico de no dañar a otro (alterum non laedere).",

      "0_1": "Subjetivo (culpa/dolo) u objetivo si la obligación es de resultado garantizado.",
      "1_1": "Frecuentemente objetivo (riesgo creado, cosas riesgosas, vicio) o subjetivo residual.",

      "0_2": "Consecuencias inmediatas y necesarias; mediatas previsibles al momento de contratar.",
      "1_2": "Consecuencias inmediatas y mediatas previsibles según el curso normal y ordinario.",

      "0_3": "El acreedor prueba el contrato y el incumplimiento; el deudor debe probar caso fortuito.",
      "1_3": "La víctima debe probar el daño y el nexo causal con la cosa o actividad riesgosa.",

      "0_4": "Plazo genérico de prescripción civil (habitualmente 5 años salvo ley especial).",
      "1_4": "Plazo abreviado de daños extracontractuales (habitualmente 3 años).",
    },
    frictionPoints: [
      {
        id: "fric-civ-1",
        title: "Unificación de Esferas y Previsibilidad Contractual",
        explanation: "En la esfera contractual el límite indemnizatorio lo marca la previsibilidad al momento del contrato, protegiendo la asignación de riesgos entre las partes.",
        entitiesInvolved: ["Responsabilidad Contractual", "Responsabilidad Extracontractual"],
      },
    ],
  },
];

/**
 * Builds an active recall deck with specified ratio of hidden cells
 */
export function createBlindRecallDeck(
  matrix: ComparativeMatrix,
  blindRatio: number = 0.5,
): BlindCellItem[] {
  const items: BlindCellItem[] = [];

  matrix.entities.forEach((entity, eIdx) => {
    matrix.dimensions.forEach((dim, dIdx) => {
      const cellKey = `${eIdx}_${dIdx}`;
      const canonicalContent = matrix.cells[cellKey] || "Sin definición cargada.";
      const isHidden = Math.random() < blindRatio;

      items.push({
        cellKey,
        entityIndex: eIdx,
        dimensionIndex: dIdx,
        entityName: entity,
        dimensionName: dim,
        canonicalContent,
        isHidden,
        masteryStatus: "untested",
      });
    });
  });

  return items;
}

/**
 * Evaluates semantic and keyword similarity between student answer and canonical cell text
 */
export function evaluateRecallAnswer(
  userAnswer: string,
  canonical: string,
): { score: number; matchedKeywords: string[]; missingKeywords: string[] } {
  if (!userAnswer.trim()) {
    return { score: 0, matchedKeywords: [], missingKeywords: [] };
  }

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, " ");

  const normUser = normalize(userAnswer);
  const normCanonical = normalize(canonical);

  // Extract relevant keywords (> 4 characters and non-stopwords)
  const stopwords = new Set(["sobre", "entre", "donde", "desde", "hasta", "hacia", "tiene", "puede", "forma", "parte", "cuenta", "estos", "estas"]);
  const canonicalWords = Array.from(
    new Set(
      normCanonical
        .split(/\s+/)
        .filter((w) => w.length > 4 && !stopwords.has(w)),
    ),
  );

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];

  for (const w of canonicalWords) {
    if (normUser.includes(w)) {
      matchedKeywords.push(w);
    } else {
      missingKeywords.push(w);
    }
  }

  const keywordCoverage = canonicalWords.length > 0 ? matchedKeywords.length / canonicalWords.length : 0.5;
  const score = Math.round(Math.min(10, keywordCoverage * 10) * 10) / 10;

  return { score, matchedKeywords, missingKeywords };
}

/**
 * Saves a comparative matrix study session in db.sessions
 */
export async function saveMatrixSessionRecord(
  matrixTitle: string,
  durationSec: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void matrixTitle;
  const recordId = `matrix_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "comparative-matrix",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
