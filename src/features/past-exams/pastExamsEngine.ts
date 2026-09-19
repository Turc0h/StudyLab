import { db } from "../../db/db";

export type ExamQuestionType = "multiple_choice" | "essay" | "practical_case";

export interface PastExamQuestion {
  id: string;
  questionText: string;
  topic: string;
  type: ExamQuestionType;
  points: number;
  options?: string[];
  correctAnswer?: number | string; // Index for MCQ or model solution for essay
  rubricCriteria?: string[]; // Checklist for self-evaluation in essays/cases
  modelAnswer?: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
}

export type ExamType = "parcial_1" | "parcial_2" | "recuperatorio" | "final";

export interface PastExamPaper {
  id: string;
  title: string;
  subject: string;
  chairOrProfessor: string;
  term: string; // e.g., "1° Cuatrimestre 2024"
  examType: ExamType;
  year: number;
  totalMaxPoints: number;
  passingScore: number;
  timeLimitMinutes: number;
  questions: PastExamQuestion[];
  sourceNotes?: string;
  isCustom?: boolean;
}

export type YieldCategory = "CRITICAL_HIGH_YIELD" | "HIGH_YIELD" | "MEDIUM_YIELD" | "LOW_YIELD";

export interface TopicParetoAnalysis {
  topic: string;
  totalOccurrences: number;
  paperCount: number;
  paperPercentage: number; // e.g. 75 (%)
  totalPointsAssigned: number;
  averagePointsPerAppearance: number;
  yieldCategory: YieldCategory;
  paretoTier: "top_20_percent" | "remaining_80_percent";
}

export interface ParetoSummary {
  totalTopics: number;
  top20PercentCount: number;
  pointsShareTop20: number; // e.g. 78.4 (%)
  highYieldTopics: TopicParetoAnalysis[];
  allRankedTopics: TopicParetoAnalysis[];
}

export interface QuestionAnswerState {
  selectedOption?: number;
  essayText?: string;
  rubricChecks?: boolean[];
  selfAssessedScore?: number;
}

export interface MockExamSubmission {
  examId: string;
  answers: Record<string, QuestionAnswerState>;
  elapsedSeconds: number;
}

export interface TopicScoreBreakdown {
  topic: string;
  score: number;
  maxScore: number;
  percentage: number;
  status: "mastered" | "needs_review" | "critical_gap";
}

export interface MockExamResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  topicBreakdown: TopicScoreBreakdown[];
  criticalHighYieldMissed: string[];
  feedback: string[];
}

// -----------------------------------------------------------------------------
// PRESET PAST EXAMS DATABASE (Medicina, Derecho, Ingeniería)
// -----------------------------------------------------------------------------

export const PRESET_PAST_EXAMS: PastExamPaper[] = [
  // --- MEDICINA: Farmacología & Cardiología (4 Parciales anteriores) ---
  {
    id: "med-cardio-2024-1c",
    title: "1° Parcial Ordinario - Cardiología & Farmacología",
    subject: "Farmacología & Cardiología Clínica",
    chairOrProfessor: "Cátedra Prof. Dr. Méndez",
    term: "1° Cuatrimestre 2024",
    examType: "parcial_1",
    year: 2024,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 60,
    sourceNotes: "Parcial tomado en Mayo 2024 - Reconstrucción oficial del centro de estudiantes.",
    questions: [
      {
        id: "med-q1",
        questionText: "¿Cuál es el mecanismo fisiopatológico y beneficio pronóstico primordial de los inhibidores de SGLT2 (Dapagliflozina/Empagliflozina) en la Insuficiencia Cardíaca con fracción de eyección reducida?",
        topic: "Insuficiencia Cardíaca: Inhibidores SGLT2 e Inotrópicos",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "Inhibición de la fosfodiesterasa 3 aumentando el inotropismo directo sin costo miocárdico.",
          "Reducción de precarga y poscarga mediante glucosuria/natriuresis osmótica, mejorando el metabolismo bioenergético mitocondrial y reduciendo hospitalizaciones.",
          "Bloqueo competitivo no selectivo de receptores beta 1 y beta 2 con vasodilatación por óxido nítrico.",
          "Disminución exclusiva de la frecuencia sinusal actuando sobre los canales If en el nódulo sinoauricular.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "med-q2",
        questionText: "Paciente de 67 años con FA de reciente comienzo. Se indica Amiodarona EV. Detalle los efectos adversos extracardíacos críticos a monitorear durante el tratamiento crónico y el mecanismo de acción electrofisiológico según Vaughan Williams.",
        topic: "Antiarrítmicos Clase I y III: Amiodarona y Vaughan Williams",
        type: "essay",
        points: 2.5,
        rubricCriteria: [
          "Identifica a la Amiodarona como antiarrítmico Clase III (bloqueo de canales de K+, prolongación del potencial de acción y período refractario).",
          "Menciona toxicidad pulmonar (alveolitis fibrosante/neumonitis intersticial).",
          "Menciona disfunción tiroidea (hipo o hipertiroidismo por sobrecarga de yodo).",
          "Menciona depósitos corneales y hepatotoxicidad con control enzimático.",
        ],
        modelAnswer: "Amiodarona es un agente de clase III preponderante que bloquea los canales de potasio prolongando la fase 3 del potencial de acción, con efectos adicionales alfa/beta-bloqueantes y bloqueante de canales de sodio. Requiere monitoreo de TSH/T4 libre, hepatograma, Rx/TC de tórax y examen oftalmológico.",
        difficulty: 4,
      },
      {
        id: "med-q3",
        questionText: "¿Qué conducta inicial está contraindicada en un paciente con Shock Cardiogénico por infarto ventricular derecho?",
        topic: "Manejo del Shock Cardiogénico vs Séptico",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "Expansión cuidadosa con solución fisiológica para optimizar la precarga derecha.",
          "Administración agresiva de diuréticos de asa (Furosemida) y vasodilatadores como Nitroglicerina.",
          "Inotrópicos como Dobutamina o soporte vasopresor con Noradrenalina.",
          "Reperfusión coronaria urgente mediante angioplastia transluminal percutánea.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "med-q4",
        questionText: "Varón de 72 años hipertenso con Fibrilación Auricular no valvular crónica. Su score CHA2DS2-VASc es de 4 puntos y HAS-BLED de 1. Justifique la elección entre Warfarina/Acenocumarol versus Anticoagulantes Orales Directos (DOACs).",
        topic: "Fibrilación Auricular y Anticoagulación Oral Directa",
        type: "practical_case",
        points: 2.5,
        rubricCriteria: [
          "Indica anticoagulación obligatoria por CHA2DS2-VASc >= 2.",
          "Prioriza DOACs (Apixaban, Rivaroxaban o Dabigatran) por sobre antagonistas de vitamina K por menor tasa de sangrado intracraneal y no requerir RIN regular.",
          "Verifica función renal (clearance de creatinina) para ajuste de dosis.",
        ],
        modelAnswer: "Con CHA2DS2-VASc de 4 y bajo riesgo hemorrágico (HAS-BLED 1), se indican DOACs como primera línea según guías AHA/ESC, dado su perfil de seguridad superior en prevención de ACV y menor incidencia de hemorragia intracraneal frente a la Warfarina.",
        difficulty: 3,
      },
    ],
  },
  {
    id: "med-cardio-2023-2c",
    title: "1° Parcial Ordinario - 2° Cuatrimestre 2023",
    subject: "Farmacología & Cardiología Clínica",
    chairOrProfessor: "Cátedra Prof. Dr. Méndez",
    term: "2° Cuatrimestre 2023",
    examType: "parcial_1",
    year: 2023,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 60,
    sourceNotes: "Examen regular de cátedra. Énfasis en farmacología de falla de bomba.",
    questions: [
      {
        id: "med-q5",
        questionText: "Explique los cuatro pilares farmacológicos ('Los 4 Fantásticos') que reducen mortalidad en Insuficiencia Cardíaca con FEy reducida.",
        topic: "Insuficiencia Cardíaca: Inhibidores SGLT2 e Inotrópicos",
        type: "essay",
        points: 3,
        rubricCriteria: [
          "ARNI (Sacubitril/Valsartán) o IECA/ARA-II.",
          "Betabloqueantes con evidencia (Bisoprolol, Carvedilol o Metoprolol succinato).",
          "Antagonistas del receptor mineralocorticoide (Espironolactona / Eplerenona).",
          "Inhibidores de SGLT2 (Dapagliflozina / Empagliflozina).",
        ],
        modelAnswer: "Los 4 pilares con reducción de mortalidad demostrada clase I-A son: ARNI (Sacubitril/Valsartán), Betabloqueantes cardioselectivos aprobados, ARM (Espironolactona/Eplerenona) e iSGLT2.",
        difficulty: 3,
      },
      {
        id: "med-q6",
        questionText: "Signos electrocardiográficos y clínicos patognomónicos de la Intoxicación Digitálica por Digoxina.",
        topic: "Intoxicación Digitálica y Glucósidos Cardíacos",
        type: "multiple_choice",
        points: 2,
        options: [
          "Cubeta digitálica (infradesnivel ST cóncavo), extrasístoles ventriculares bigeminadas, náuseas y xantopsia (visión amarilla).",
          "Elevación convexa del ST en todas las derivaciones con soplo piante mesocistólico.",
          "Bloqueo completo de rama izquierda sin alteraciones digestivas.",
          "Prolongación del intervalo QT con torsade de pointes inmediata.",
        ],
        correctAnswer: 0,
        difficulty: 4,
      },
      {
        id: "med-q7",
        questionText: "¿Cuál es el vasopresor de primera línea para restaurar la presión de perfusión tisular en Shock Séptico refractario a fluidoterapia?",
        topic: "Manejo del Shock Cardiogénico vs Séptico",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "Dopamina a dosis bajas renales.",
          "Noradrenalina en infusión continua titulada a PAM >= 65 mmHg.",
          "Fenilefrina en bolo intravenoso.",
          "Isoproterenol en bomba continua.",
        ],
        correctAnswer: 1,
        difficulty: 2,
      },
      {
        id: "med-q8",
        questionText: "Paciente con FA paroxística y Flutter típico: antiarrítmico de elección para control de ritmo vs control de frecuencia.",
        topic: "Antiarrítmicos Clase I y III: Amiodarona y Vaughan Williams",
        type: "essay",
        points: 2.5,
        rubricCriteria: [
          "Diferencia estrategia Rhythm Control vs Rate Control.",
          "Menciona betabloqueantes/diltiazem para frecuencia.",
          "Menciona Flecainida/Propafenona (sin cardiopatía estructural) o Amiodarona (con cardiopatía) para ritmo.",
        ],
        modelAnswer: "Para control de ritmo en corazones estructuralmente sanos se prefiere clase IC (Flecainida/Propafenona). En cardiopatía isquémica o hipertrófica se reserva Amiodarona. Para frecuencia, betabloqueantes o calcioantagonistas no dihidropiridínicos.",
        difficulty: 4,
      },
    ],
  },
  {
    id: "med-cardio-2023-recup",
    title: "Recuperatorio de 1° Parcial - Cardiología",
    subject: "Farmacología & Cardiología Clínica",
    chairOrProfessor: "Cátedra Prof. Dr. Méndez",
    term: "Recuperatorio Diciembre 2023",
    examType: "recuperatorio",
    year: 2023,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 60,
    sourceNotes: "Recuperatorio integrador con viñetas clínicas de guardia.",
    questions: [
      {
        id: "med-q9",
        questionText: "¿Por qué está contraindicada la Flecainida en pacientes con infarto de miocardio previo según el ensayo CAST?",
        topic: "Antiarrítmicos Clase I y III: Amiodarona y Vaughan Williams",
        type: "multiple_choice",
        points: 3,
        options: [
          "Porque genera toxicidad pulmonar fulminante aguda.",
          "Efecto proarrítmico letal por enlentecimiento excesivo de la conducción en miocardio isquémico/cicatrizal con aumento de mortalidad.",
          "Porque inhibe la acción antitrombótica de la aspirina.",
          "Porque produce bloqueo AV congénito irreversible.",
        ],
        correctAnswer: 1,
        difficulty: 4,
      },
      {
        id: "med-q10",
        questionText: "Paciente en Shock Cardiogénico secundario a IAM con PAM 55 mmHg y congestión pulmonar severa. Indique el esquema inotrópico y vasopresor prioritario.",
        topic: "Manejo del Shock Cardiogénico vs Séptico",
        type: "essay",
        points: 3.5,
        rubricCriteria: [
          "Noradrenalina para alcanzar PAM objetivo mínima (65 mmHg).",
          "Asociación de Dobutamina para restaurar gasto cardíaco e inotropismo.",
          "Reperfusión percutánea urgente y consideración de balón de contrapulsación / ECMO.",
        ],
        modelAnswer: "Se debe iniciar Noradrenalina de inmediato para restaurar la presión diastólica coronaria, asociando Dobutamina para optimizar el volumen minuto, evitando bolos de fluidos y enviando inmediatamente a hemodinamia.",
        difficulty: 4,
      },
      {
        id: "med-q11",
        questionText: "Cálculo del score CHA2DS2-VASc y conducta anticoagulante en mujer de 68 años con HTA y Diabetes.",
        topic: "Fibrilación Auricular y Anticoagulación Oral Directa",
        type: "multiple_choice",
        points: 3.5,
        options: [
          "Score: 1 punto (solo sexo femenino). No anticoagular.",
          "Score: 4 puntos (Edad 65-74 = 1, HTA = 1, Diabetes = 1, Sexo Femenino = 1). Indicación formal de DOAC.",
          "Score: 2 puntos. Indicar solo Aspirina 100 mg/día.",
          "Score: 5 puntos. Contraindicación para DOAC, usar Clopidogrel.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
    ],
  },
  {
    id: "med-cardio-2022-1c",
    title: "1° Parcial Ordinario - 1° Cuatrimestre 2022",
    subject: "Farmacología & Cardiología Clínica",
    chairOrProfessor: "Cátedra Prof. Dr. Méndez",
    term: "1° Cuatrimestre 2022",
    examType: "parcial_1",
    year: 2022,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 60,
    sourceNotes: "Parcial presencial histórico.",
    questions: [
      {
        id: "med-q12",
        questionText: "Efecto del Sacubitril en la degradación de péptidos natriuréticos y por qué debe coadministrarse con un ARA-II en vez de un IECA.",
        topic: "Insuficiencia Cardíaca: Inhibidores SGLT2 e Inotrópicos",
        type: "essay",
        points: 5,
        rubricCriteria: [
          "Sacubitril inhibe la Neprilisina impidiendo la degradación de BNP/ANP y bradicinina.",
          "No se puede asociar con IECA por riesgo gravísimo de angioedema severo por acumulación sinérgica de bradicinina.",
          "Requiere ventana de lavado de 36 horas si se cambia de IECA a Sacubitril/Valsartán.",
        ],
        modelAnswer: "El Sacubitril inhibe la neprilisina aumentando péptidos natriuréticos beneficiosos. Debe asociarse con Valsartán (ARA-II) y nunca con un IECA debido a que ambos inhiben vías de degradación de bradicinina, desencadenando angioedema potencialmente letal.",
        difficulty: 4,
      },
      {
        id: "med-q13",
        questionText: "¿Cuál es el antídoto específico para revertir la anticoagulación por Dabigatrán ante una urgencia quirúrgica o hemorragia crítica?",
        topic: "Fibrilación Auricular y Anticoagulación Oral Directa",
        type: "multiple_choice",
        points: 5,
        options: [
          "Sulfato de Protamina.",
          "Idarucizumab (anticuerpo monoclonal humanizado que liga dabigatrán con afinidad 350 veces mayor que trombina).",
          "Vitamina K intravenosa en altas dosis.",
          "Concentrado de complejo protrombínico únicamente.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
    ],
  },

  // --- DERECHO: Contratos Civiles y Comerciales (3 Parciales) ---
  {
    id: "law-contracts-2024-1c",
    title: "1° Parcial Ordinario - Contratos Civiles y Comerciales",
    subject: "Derecho Civil: Obligaciones y Contratos",
    chairOrProfessor: "Cátedra Prof. Alterini / Rivera",
    term: "1° Cuatrimestre 2024",
    examType: "parcial_1",
    year: 2024,
    totalMaxPoints: 10,
    passingScore: 4,
    timeLimitMinutes: 90,
    sourceNotes: "Parcial Cátedra Alterini. Tres preguntas doctrinales y un caso práctico.",
    questions: [
      {
        id: "law-q1",
        questionText: "Diferencie el régimen de la Seña en el Código Civil y Comercial (art. 1059 CCCN) respecto del derogado Código de Vélez Sarsfield.",
        topic: "Régimen de la Seña: Confirmatoria vs Penitencial",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "En el CCCN la seña es por regla penitencial (permite arrepentimiento) igual que en Vélez.",
          "En el CCCN la seña es por regla confirmatoria salvo pacto expreso en contrario; en Vélez era penitencial.",
          "En el CCCN la seña quedó derogada y se reemplazó por la reserva provisoria ad-referendum.",
          "En el CCCN no se permite pactar la facultad de arrepentimiento bajo pena de nulidad absoluta.",
        ],
        correctAnswer: 1,
        difficulty: 2,
      },
      {
        id: "law-q2",
        questionText: "Requisitos de procedencia para invocar la Teoría de la Imprevisión (art. 1091 CCCN) y diferencias con la Frustración de la Finalidad (art. 1090 CCCN).",
        topic: "Teoría de la Imprevisión y Frustración del Fin del Contrato",
        type: "essay",
        points: 2.5,
        rubricCriteria: [
          "Imprevisión: alteración extraordinaria de las circunstancias existentes al tiempo de su celebración, por causas ajenas a las partes y que torne la prestación excesivamente onerosa.",
          "Aplica a contratos conmutativos de ejecución diferida o permanente.",
          "Parte perjudicada no debe encontrarse en mora culpable.",
          "Frustración de la finalidad extingue el contrato por pérdida del móvil causal determinante y no por excesiva onerosidad.",
        ],
        modelAnswer: "El art. 1091 CCCN requiere un hecho sobreviniente extraordinario e imprevisible, ajeno a las partes y al riesgo asumido, que vuelva la prestación excesivamente onerosa. La frustración del fin (art. 1090) en cambio no exige onerosidad sino que el móvil determinante común quede vacío de sentido.",
        difficulty: 4,
      },
      {
        id: "law-q3",
        questionText: "Mecanismo del Pacto Comisorio o Cláusula Resolutoria Implícita (art. 1087 y 1088 CCCN). Plazos de intimación y excepciones.",
        topic: "Cláusula Resolutoria Implícita y Pacto Comisorio",
        type: "essay",
        points: 2.5,
        rubricCriteria: [
          "Exige intimación al deudor bajo apercibimiento de resolución por un plazo no menor a 15 días.",
          "El incumplimiento debe ser esencial y grave.",
          "La resolución opera de pleno derecho al vencimiento del plazo sin cumplimiento.",
          "No requiere interpelación previa si ha vencido un plazo esencial o la parte manifestó expresamente que no cumplirá.",
        ],
        modelAnswer: "La cláusula resolutoria implícita exige: 1) Incumplimiento esencial; 2) Mora del deudor; 3) Intimación al cumplimiento en un plazo no menor a 15 días bajo apercibimiento expreso. Vencido el plazo sin cumplimiento, la resolución opera de pleno derecho.",
        difficulty: 3,
      },
      {
        id: "law-q4",
        questionText: "Caso Práctico: Compraventa inmobiliaria donde el comprador entregó USD 10.000 como 'seña'. A los 20 días el vendedor manifiesta que prefiere devolver los USD 10.000 y cancelar la operación. Dictamine legalmente fundando en el art. 1059 CCCN.",
        topic: "Régimen de la Seña: Confirmatoria vs Penitencial",
        type: "practical_case",
        points: 2.5,
        rubricCriteria: [
          "Señala que al no haberse pactado la seña como penitencial, es confirmatoria por regla del art. 1059 CCCN.",
          "El vendedor no tiene facultad unilateral de arrepentirse.",
          "El comprador tiene derecho a exigir el cumplimiento forzado del contrato o la resolución con daños y perjuicios.",
        ],
        modelAnswer: "Al ser la seña confirmatoria por defecto legal en el CCCN, las partes quedan definitivamente obligadas y no existe ius poenitendi. El vendedor no puede liberarse restituyendo el dinero; el comprador puede intimar la escrituración por vía judicial.",
        difficulty: 3,
      },
    ],
  },
  {
    id: "law-contracts-2023-2c",
    title: "1° Parcial Ordinario - 2° Cuatrimestre 2023",
    subject: "Derecho Civil: Obligaciones y Contratos",
    chairOrProfessor: "Cátedra Prof. Alterini / Rivera",
    term: "2° Cuatrimestre 2023",
    examType: "parcial_1",
    year: 2023,
    totalMaxPoints: 10,
    passingScore: 4,
    timeLimitMinutes: 90,
    sourceNotes: "Examen con foco en ineficacia contractual y resolución.",
    questions: [
      {
        id: "law-q5",
        questionText: "¿Cuáles son las causales que configuran un 'incumplimiento esencial' según el art. 1084 CCCN?",
        topic: "Cláusula Resolutoria Implícita y Pacto Comisorio",
        type: "multiple_choice",
        points: 3,
        options: [
          "Cualquier retraso de más de 48 horas sin importar la gravedad.",
          "El cumplimiento estricto es fundamental para el acreedor, el retraso priva sustancialmente de lo que tenía derecho a esperar, o el incumplimiento es intencional.",
          "Solo cuando existe quiebra declarada en sede comercial.",
          "Cuando media daño moral probado mediante pericia psicológica.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "law-q6",
        questionText: "Análisis de la Teoría de la Imprevisión en contratos en moneda extranjera y cláusulas de renuncia a invocar el art. 1091 CCCN.",
        topic: "Teoría de la Imprevisión y Frustración del Fin del Contrato",
        type: "essay",
        points: 4,
        rubricCriteria: [
          "Explica el principio de autonomía de la voluntad y asunción deliberada del riesgo cambiario.",
          "Validez o nulidad de cláusulas de renuncia anticipada en contratos de adhesión vs paritarios.",
          "Facultad judicial de readecuación equitativa del contrato.",
        ],
        modelAnswer: "En contratos paritarios la renuncia a la imprevisión es admisible como asunción expresa de riesgo, salvo que configure una desnaturalización abusiva contraria al orden público o la buena fe (art. 9, 10 y 988 CCCN).",
        difficulty: 5,
      },
      {
        id: "law-q7",
        questionText: "Efectos de la resolución contractual respecto de terceros y prestaciones cumplidas (art. 1079 y 1080 CCCN).",
        topic: "Cláusula Resolutoria Implícita y Pacto Comisorio",
        type: "multiple_choice",
        points: 3,
        options: [
          "Efecto retroactivo absoluto que arrasa todos los derechos de terceros adquirentes a título oneroso y de buena fe.",
          "Tiene efecto retroactivo entre las partes salvo en contratos de tracto sucesivo donde las prestaciones cumplidas y equivalentes quedan firmes; no afecta a terceros adquirentes de buena fe y a título oneroso.",
          "La resolución solo tiene efectos hacia el futuro (ex nunc) en todos los tipos contractuales.",
          "Obliga a ambas partes a pagar una multa automática fijada por el juez.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
    ],
  },
  {
    id: "law-contracts-2022-1c",
    title: "1° Parcial Ordinario - 1° Cuatrimestre 2022",
    subject: "Derecho Civil: Obligaciones y Contratos",
    chairOrProfessor: "Cátedra Prof. Alterini / Rivera",
    term: "1° Cuatrimestre 2022",
    examType: "parcial_1",
    year: 2022,
    totalMaxPoints: 10,
    passingScore: 4,
    timeLimitMinutes: 90,
    sourceNotes: "Parcial presencial pospandemia.",
    questions: [
      {
        id: "law-q8",
        questionText: "La frustración definitiva de la finalidad del contrato por acontecimiento extraordinario (art. 1090 CCCN): ¿otorga a la contraparte derecho a reclamar daños y perjuicios?",
        topic: "Teoría de la Imprevisión y Frustración del Fin del Contrato",
        type: "multiple_choice",
        points: 5,
        options: [
          "Sí, indemnización integral por daño emergente y lucro cesante.",
          "No, autoriza a la parte perjudicada a declarar su resolución sin incurrir en responsabilidad civil por daños.",
          "Solo si medió acuerdo arbitral previo homologado.",
          "Sí, pero limitada únicamente al interés negativo.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "law-q9",
        questionText: "Diferencia entre pacto comisorio expreso (cláusula resolutoria expresa art. 1086 CCCN) y pacto comisorio tácito (art. 1087 CCCN).",
        topic: "Cláusula Resolutoria Implícita y Pacto Comisorio",
        type: "essay",
        points: 5,
        rubricCriteria: [
          "La expresa surte efectos desde que la parte interesada comunica fehacientemente a la incumplidora su voluntad de resolver.",
          "No requiere plazo de gracia ni intimación previa de 15 días.",
          "La tácita requiere interpelación con plazo mínimo de 15 días bajo apercibimiento.",
        ],
        modelAnswer: "En la cláusula resolutoria expresa las partes pactaron específicamente qué incumplimientos facultarán la resolución; opera por simple notificación recepticia. En la tácita o implícita, se requiere indefectiblemente el emplazamiento previo por 15 días.",
        difficulty: 3,
      },
    ],
  },

  // --- INGENIERÍA: Sistemas Distribuidos (3 Parciales) ---
  {
    id: "eng-dist-2024-1c",
    title: "1° Parcial - Sistemas Distribuidos & Arquitectura",
    subject: "Sistemas Distribuidos & Alta Disponibilidad",
    chairOrProfessor: "Cátedra Prof. Tanenbaum / Lamport",
    term: "1° Cuatrimestre 2024",
    examType: "parcial_1",
    year: 2024,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 90,
    sourceNotes: "Parcial teórico-práctico de algoritmos de consenso y consistencia.",
    questions: [
      {
        id: "eng-q1",
        questionText: "En el algoritmo de consenso Raft, ¿cómo garantiza el protocolo que no existan dos líderes simultáneos en el mismo 'term' (término)?",
        topic: "Algoritmos de Consenso: Raft vs Paxos",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "Mediante un servidor centralizado Zookeeper que asigna tokens mutex.",
          "Cada nodo vota por un único candidato por término; se requiere mayoría absoluta (quórum = floor(N/2)+1) y la intersección de dos quórums garantiza al menos un nodo en común.",
          "Mediante sincronización precisa de relojes físicos GPS (TrueTime).",
          "Por orden alfabético de la dirección IP de cada réplica.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "eng-q2",
        questionText: "Enuncie formalmente el Teorema CAP (Brewer / Lynch & Gilbert). ¿Por qué en una red asíncrona no es posible garantizar simultáneamente Consistencia Fuerte y Disponibilidad ante una partición?",
        topic: "Teorema CAP y Modelos de Consistencia",
        type: "essay",
        points: 2.5,
        rubricCriteria: [
          "Define C (Linearizabilidad / Consistencia estricta), A (Disponibilidad: toda petición no fallida recibe respuesta no errónea), P (Tolerancia a particiones).",
          "Explica que ante una partición P (pérdida de comunicación entre nodos), elegir responder (A) obliga a servir datos potencialmente desactualizados (violando C).",
          "Elegir consistencia (C) obliga a bloquear o retornar error hasta sanar la partición (violando A).",
        ],
        modelAnswer: "En presencia de una partición de red inevitable en sistemas distribuidos reales, si un cliente escribe en una partición aislada, el sistema debe decidir: o rechaza la operación para preservar consistencia (CP), o la acepta arriesgando lecturas divergentes (AP).",
        difficulty: 4,
      },
      {
        id: "eng-q3",
        questionText: "En el protocolo Two-Phase Commit (2PC), ¿cuál es el estado crítico de bloqueo (blocking state) si el Coordinador falla indefinidamente durante la fase de Commit?",
        topic: "Transacciones Distribuidas: 2PC y Patrón Saga",
        type: "multiple_choice",
        points: 2.5,
        options: [
          "Los participantes hacen rollback inmediato tras un timeout de 10 ms.",
          "Los participantes que votaron 'YES' en la fase de Prepare quedan bloqueados indefinidamente con locks adquiridos, sin saber si hacer commit o abort.",
          "El sistema elije un nuevo coordinador automáticamente usando bully election sin pérdida de locks.",
          "Se descartan todas las transacciones previas de la base de datos.",
        ],
        correctAnswer: 1,
        difficulty: 4,
      },
      {
        id: "eng-q4",
        questionText: "Caso de Arquitectura: Diseñe una estrategia de consistencia para el checkout de un e-commerce con inventario limitado y procesamiento de pagos externo. Justifique la elección entre 2PC versus Patrón Saga con transacciones compensatorias.",
        topic: "Transacciones Distribuidas: 2PC y Patrón Saga",
        type: "practical_case",
        points: 2.5,
        rubricCriteria: [
          "Desaconseja 2PC para servicios web externos por alta latencia y retención prolongada de bloqueos.",
          "Propone Patrón Saga orquestado o coreografiado con eventos.",
          "Define transacción compensatoria (ej: reponer stock si el cobro con tarjeta falla).",
          "Adopta consistencia eventual.",
        ],
        modelAnswer: "Para sistemas heterogéneos y servicios de pago externos se adopta el patrón Saga. 2PC degrada la escalabilidad por locks bloqueantes distribuidos. Con Saga, cada microservicio ejecuta su transacción local y, si el pago falla, se emite un evento compensatorio que cancela la reserva de stock.",
        difficulty: 4,
      },
    ],
  },
  {
    id: "eng-dist-2023-2c",
    title: "1° Parcial Ordinario - 2° Cuatrimestre 2023",
    subject: "Sistemas Distribuidos & Alta Disponibilidad",
    chairOrProfessor: "Cátedra Prof. Tanenbaum / Lamport",
    term: "2° Cuatrimestre 2023",
    examType: "parcial_1",
    year: 2023,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 90,
    sourceNotes: "Parcial con foco en sincronización temporal y replicación.",
    questions: [
      {
        id: "eng-q5",
        questionText: "Relojes Lógicos de Lamport versus Relojes Vectoriales: ¿Por qué los relojes de Lamport no permiten determinar causalidad estricta entre dos eventos concurrentes?",
        topic: "Relojes Lógicos y Causalidad de Lamport",
        type: "essay",
        points: 3.5,
        rubricCriteria: [
          "Lamport garantiza: Si a -> b entonces L(a) < L(b).",
          "Pero el recíproco NO se cumple: L(a) < L(b) no implica que 'a' causó a 'b' (pueden ser eventos concurrentes).",
          "Los relojes vectoriales sí proporcionan equivalencia estricta: V(a) < V(b) si y solo si a -> b.",
        ],
        modelAnswer: "Los relojes lógicos escalares de Lamport establecen un orden parcial consistente pero no pueden distinguir causalidad de concurrencia. Los relojes vectoriales almacenan el estado conocido de cada proceso, permitiendo saber si dos eventos son concurrentes o dependientes.",
        difficulty: 4,
      },
      {
        id: "eng-q6",
        questionText: "En el algoritmo Raft, si el líder recibe un mensaje AppendEntries de otro nodo con un término numéricamente superior (term > currentTerm):",
        topic: "Algoritmos de Consenso: Raft vs Paxos",
        type: "multiple_choice",
        points: 3,
        options: [
          "Ignora el mensaje y fuerza una nueva elección de inmediato.",
          "El líder actual actualiza inmediatamente su término al del nuevo nodo y transiciona al estado de Seguidor (Follower).",
          "Envía una señal de apagado forzado al nodo emisor.",
          "Pide confirmación manual al administrador del clúster.",
        ],
        correctAnswer: 1,
        difficulty: 3,
      },
      {
        id: "eng-q7",
        questionText: "Compare el modelo de consistencia Linealizable (Linearizability) versus Consistencia Secuencial (Sequential Consistency).",
        topic: "Teorema CAP y Modelos de Consistencia",
        type: "essay",
        points: 3.5,
        rubricCriteria: [
          "Linearizabilidad exige que las operaciones parezcan ejecutarse instantáneamente en un punto en el tiempo real entre su inicio y fin.",
          "La consistencia secuencial relaja el tiempo real: exige que todas las operaciones sigan un orden global único idéntico visto por todos los nodos, preservando el orden de cada programa.",
        ],
        modelAnswer: "Linearizability es el modelo más restrictivo: ata el orden lógico a la línea temporal física global. Sequential Consistency no requiere coincidencia con el reloj de pared global, siempre que todos los nodos coincidan en la misma secuencia total válida.",
        difficulty: 5,
      },
    ],
  },
  {
    id: "eng-dist-2022-1c",
    title: "1° Parcial Ordinario - 1° Cuatrimestre 2022",
    subject: "Sistemas Distribuidos & Alta Disponibilidad",
    chairOrProfessor: "Cátedra Prof. Tanenbaum / Lamport",
    term: "1° Cuatrimestre 2022",
    examType: "parcial_1",
    year: 2022,
    totalMaxPoints: 10,
    passingScore: 6,
    timeLimitMinutes: 90,
    sourceNotes: "Parcial clásico de cátedra.",
    questions: [
      {
        id: "eng-q8",
        questionText: "¿Cuál es la propiedad de seguridad (Safety) que distingue a Paxos/Raft frente a split-brain?",
        topic: "Algoritmos de Consenso: Raft vs Paxos",
        type: "multiple_choice",
        points: 5,
        options: [
          "Garantiza que nunca se tomarán dos decisiones de commit contradictorias para la misma entrada de log gracias al principio del quórum de mayoría.",
          "Garantiza que el sistema responderá en menos de 1 milisegundo ante cualquier caída.",
          "Permite que dos nodos escriban datos contradictorios y los resuelva con LWW (Last Write Wins).",
          "Evita totalmente las desconexiones de cables físicos.",
        ],
        correctAnswer: 0,
        difficulty: 3,
      },
      {
        id: "eng-q9",
        questionText: "Describa el principio de funcionamiento de un Filtro de Bloom y explique por qué no presenta falsos negativos pero sí posibles falsos positivos.",
        topic: "Estructuras de Datos Probabilísticas: Filtros de Bloom",
        type: "essay",
        points: 5,
        rubricCriteria: [
          "Estructura basada en vector de bits y k funciones hash independientes.",
          "Falso negativo imposible: si un elemento fue insertado, todos sus bits fueron puestos en 1; nunca responderá 0 si está presente.",
          "Falso positivo posible: colisiones de hashes de otros elementos pueden encender accidentalmente todos los bits del elemento consultado.",
        ],
        modelAnswer: "Un Filtro de Bloom utiliza un arreglo de m bits y k funciones hash. Al insertar un elemento se ponen en 1 los bits correspondientes. Al consultar, si algún bit es 0 se garantiza que el elemento nunca fue insertado (cero falsos negativos). Si todos son 1, puede deberse a colisiones acumuladas (falso positivo).",
        difficulty: 4,
      },
    ],
  },
];

// -----------------------------------------------------------------------------
// STORAGE & REPOSITORY FUNCTIONS
// -----------------------------------------------------------------------------

const LOCAL_STORAGE_KEY = "studylab_custom_past_exams";

export function loadCustomExams(): PastExamPaper[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomExam(exam: PastExamPaper): void {
  const current = loadCustomExams();
  const index = current.findIndex((e) => e.id === exam.id);
  const examWithFlag = { ...exam, isCustom: true };
  if (index >= 0) {
    current[index] = examWithFlag;
  } else {
    current.push(examWithFlag);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
}

export function deleteCustomExam(examId: string): void {
  const current = loadCustomExams();
  const filtered = current.filter((e) => e.id !== examId);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
}

export function getAllPastExams(customExams?: PastExamPaper[]): PastExamPaper[] {
  const custom = customExams || loadCustomExams();
  return [...PRESET_PAST_EXAMS, ...custom];
}

export function getAvailableSubjects(): string[] {
  const all = getAllPastExams();
  const subjects = new Set<string>();
  all.forEach((e) => subjects.add(e.subject));
  return Array.from(subjects);
}

export function getPastExamsBySubject(subject: string): PastExamPaper[] {
  const all = getAllPastExams();
  return all.filter((e) => e.subject.toLowerCase() === subject.toLowerCase());
}

// -----------------------------------------------------------------------------
// PARETO 80/20 HIGH-YIELD TOPIC FORECASTER ENGINE
// -----------------------------------------------------------------------------

/**
 * Calculates topic recurrence, points weighting, and Pareto 80/20 ranking across a set of exams.
 */
export function calculateParetoTopicAnalysis(exams: PastExamPaper[]): ParetoSummary {
  if (!exams || exams.length === 0) {
    return {
      totalTopics: 0,
      top20PercentCount: 0,
      pointsShareTop20: 0,
      highYieldTopics: [],
      allRankedTopics: [],
    };
  }

  const totalExamsCount = exams.length;
  const topicStatsMap = new Map<
    string,
    {
      occurrences: number;
      paperIds: Set<string>;
      totalPoints: number;
    }
  >();

  for (const exam of exams) {
    for (const q of exam.questions) {
      const topicName = q.topic.trim();
      const existing = topicStatsMap.get(topicName) || {
        occurrences: 0,
        paperIds: new Set<string>(),
        totalPoints: 0,
      };

      existing.occurrences += 1;
      existing.paperIds.add(exam.id);
      existing.totalPoints += q.points;
      topicStatsMap.set(topicName, existing);
    }
  }

  const allTopics: TopicParetoAnalysis[] = [];
  let cumulativePointsAll = 0;

  topicStatsMap.forEach((stats, topic) => {
    cumulativePointsAll += stats.totalPoints;
    const paperCount = stats.paperIds.size;
    const paperPercentage = Math.round((paperCount / totalExamsCount) * 100);

    let yieldCategory: YieldCategory = "LOW_YIELD";
    if (paperPercentage >= 70) {
      yieldCategory = "CRITICAL_HIGH_YIELD";
    } else if (paperPercentage >= 50) {
      yieldCategory = "HIGH_YIELD";
    } else if (paperPercentage >= 25) {
      yieldCategory = "MEDIUM_YIELD";
    }

    allTopics.push({
      topic,
      totalOccurrences: stats.occurrences,
      paperCount,
      paperPercentage,
      totalPointsAssigned: stats.totalPoints,
      averagePointsPerAppearance: Math.round((stats.totalPoints / stats.occurrences) * 10) / 10,
      yieldCategory,
      paretoTier: "remaining_80_percent", // Assigned below after ranking
    });
  });

  // Sort by paperPercentage DESC, then by totalPointsAssigned DESC
  allTopics.sort((a, b) => {
    if (b.paperPercentage !== a.paperPercentage) {
      return b.paperPercentage - a.paperPercentage;
    }
    return b.totalPointsAssigned - a.totalPointsAssigned;
  });

  // Determine top 20% by count (Pareto Cut)
  const top20Count = Math.max(1, Math.round(allTopics.length * 0.2));
  let top20Points = 0;

  for (let i = 0; i < allTopics.length; i++) {
    if (i < top20Count) {
      allTopics[i].paretoTier = "top_20_percent";
      top20Points += allTopics[i].totalPointsAssigned;
    } else {
      allTopics[i].paretoTier = "remaining_80_percent";
    }
  }

  const pointsShareTop20 = cumulativePointsAll > 0
    ? Math.round((top20Points / cumulativePointsAll) * 1000) / 10
    : 0;

  const highYieldTopics = allTopics.filter(
    (t) => t.yieldCategory === "CRITICAL_HIGH_YIELD" || t.yieldCategory === "HIGH_YIELD",
  );

  return {
    totalTopics: allTopics.length,
    top20PercentCount: top20Count,
    pointsShareTop20,
    highYieldTopics,
    allRankedTopics: allTopics,
  };
}

// -----------------------------------------------------------------------------
// COMPOSITE HIGH-YIELD MOCK EXAM GENERATOR
// -----------------------------------------------------------------------------

/**
 * Generates an optimized composite mock exam selecting questions weighted by topic recurrence.
 */
export function generateCompositeHighYieldExam(
  subject: string,
  targetQuestionsCount: number = 4,
): PastExamPaper {
  const subjectExams = getPastExamsBySubject(subject);
  if (subjectExams.length === 0) {
    throw new Error(`No se encontraron parciales anteriores para la materia: ${subject}`);
  }

  const pareto = calculateParetoTopicAnalysis(subjectExams);
  const allQuestions: PastExamQuestion[] = [];
  subjectExams.forEach((e) => allQuestions.push(...e.questions));

  // Score questions by the topic recurrence %
  const scoredQuestions = allQuestions.map((q) => {
    const topicStat = pareto.allRankedTopics.find((t) => t.topic === q.topic);
    const weight = topicStat ? topicStat.paperPercentage : 10;
    return { question: q, weight };
  });

  // Sort by weight descending
  scoredQuestions.sort((a, b) => b.weight - a.weight);

  // Pick unique topics first to avoid duplicates
  const selectedQuestions: PastExamQuestion[] = [];
  const pickedTopics = new Set<string>();

  for (const item of scoredQuestions) {
    if (!pickedTopics.has(item.question.topic) && selectedQuestions.length < targetQuestionsCount) {
      selectedQuestions.push(item.question);
      pickedTopics.add(item.question.topic);
    }
  }

  // If still need more to reach target, fill with highest remaining questions
  if (selectedQuestions.length < targetQuestionsCount) {
    for (const item of scoredQuestions) {
      if (!selectedQuestions.some((q) => q.id === item.question.id) && selectedQuestions.length < targetQuestionsCount) {
        selectedQuestions.push(item.question);
      }
    }
  }

  const totalPoints = selectedQuestions.reduce((acc, q) => acc + q.points, 0);

  return {
    id: `composite_${subject.toLowerCase().replace(/[^a-z0-9]/g, "_")}_${Date.now()}`,
    title: `Simulacro Compuesto High-Yield (${pareto.pointsShareTop20}% de Puntos Históricos)`,
    subject,
    chairOrProfessor: subjectExams[0]?.chairOrProfessor || "Cátedra Universitaria",
    term: "Simulacro Adaptativo High-Yield",
    examType: "parcial_1",
    year: new Date().getFullYear(),
    totalMaxPoints: totalPoints,
    passingScore: Math.round(totalPoints * 0.6 * 10) / 10,
    timeLimitMinutes: Math.min(120, selectedQuestions.length * 20),
    questions: selectedQuestions,
    sourceNotes: `Generado automáticamente combinando las preguntas con mayor probabilidad estadística de evaluación según la Ley de Pareto de la cátedra.`,
  };
}

// -----------------------------------------------------------------------------
// MOCK EXAM GRADING & EVALUATION ENGINE
// -----------------------------------------------------------------------------

export function gradeMockExamSubmission(
  exam: PastExamPaper,
  submission: MockExamSubmission,
): MockExamResult {
  let totalScore = 0;
  const topicBreakdownMap = new Map<
    string,
    { score: number; maxScore: number }
  >();

  const criticalHighYieldMissed: string[] = [];
  const feedback: string[] = [];

  for (const q of exam.questions) {
    const ans = submission.answers[q.id];
    let questionScore = 0;

    if (q.type === "multiple_choice") {
      if (ans && ans.selectedOption !== undefined && ans.selectedOption === q.correctAnswer) {
        questionScore = q.points;
      }
    } else {
      // Essay or practical_case
      if (ans) {
        if (ans.selfAssessedScore !== undefined) {
          questionScore = Math.min(q.points, Math.max(0, ans.selfAssessedScore));
        } else if (ans.rubricChecks && q.rubricCriteria && q.rubricCriteria.length > 0) {
          const checkedCount = ans.rubricChecks.filter(Boolean).length;
          const fraction = checkedCount / q.rubricCriteria.length;
          questionScore = Math.round(q.points * fraction * 10) / 10;
        } else if (ans.essayText && ans.essayText.trim().length > 40) {
          // Minimal baseline credit if written but unrubricked
          questionScore = Math.round(q.points * 0.5 * 10) / 10;
        }
      }
    }

    totalScore += questionScore;

    // Track topic performance
    const topicRecord = topicBreakdownMap.get(q.topic) || { score: 0, maxScore: 0 };
    topicRecord.score += questionScore;
    topicRecord.maxScore += q.points;
    topicBreakdownMap.set(q.topic, topicRecord);
  }

  const topicBreakdown: TopicScoreBreakdown[] = [];
  topicBreakdownMap.forEach((rec, topic) => {
    const pct = rec.maxScore > 0 ? Math.round((rec.score / rec.maxScore) * 100) : 0;
    let status: "mastered" | "needs_review" | "critical_gap" = "needs_review";
    if (pct >= 80) {
      status = "mastered";
    } else if (pct < 50) {
      status = "critical_gap";
      criticalHighYieldMissed.push(topic);
    }

    topicBreakdown.push({
      topic,
      score: Math.round(rec.score * 10) / 10,
      maxScore: rec.maxScore,
      percentage: pct,
      status,
    });
  });

  const percentage = exam.totalMaxPoints > 0
    ? Math.round((totalScore / exam.totalMaxPoints) * 100)
    : 0;
  const passed = totalScore >= exam.passingScore;

  if (passed) {
    feedback.push(`¡Aprobado! Obtuviste ${Math.round(totalScore * 10) / 10} / ${exam.totalMaxPoints} puntos (${percentage}%).`);
  } else {
    feedback.push(`Calificación por debajo del umbral de aprobación (${exam.passingScore} pts). Obtuviste ${Math.round(totalScore * 10) / 10} / ${exam.totalMaxPoints} pts.`);
  }

  if (criticalHighYieldMissed.length > 0) {
    feedback.push(
      `Alerta de Cátedra: Detectamos brechas en temas de alta recurrencia histórica: ${criticalHighYieldMissed.join(", ")}. Priorizá estos conceptos con Flashcards FSRS o repasos activos inmediatos.`,
    );
  } else {
    feedback.push("Dominio sólido de los temas centrales del parcial evaluados por la cátedra.");
  }

  return {
    totalScore: Math.round(totalScore * 10) / 10,
    maxScore: exam.totalMaxPoints,
    percentage,
    passed,
    topicBreakdown,
    criticalHighYieldMissed,
    feedback,
  };
}

/**
 * Persists a mock exam completion to db.sessions
 */
export async function saveMockExamSession(
  examTitle: string,
  durationSec: number,
  score: number,
  subjectFolderId: string | null = null,
): Promise<string> {
  void examTitle;
  void score;
  const recordId = `pastexam_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = Date.now();

  await db.sessions.add({
    id: recordId,
    methodId: "past-exams",
    subjectFolderId,
    startedAt: now - durationSec * 1000,
    endedAt: now,
    durationSec,
  });

  return recordId;
}
