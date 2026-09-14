import type { StudyMethodId } from "../types";

export interface MethodCatalogItem {
  id: StudyMethodId;
  name: string;
  category: "memoria" | "comprension" | "enfoque";
  categoryLabel: string;
  shortDescription: string;
  scientificBasis: string;
  duration: string;
  structure: string;
  whatItIs: string;
  whyItWorks: string;
  protocolSteps: { step: number; title: string; desc: string }[];
  bestSuitedFor: string[];
  proTip: string;
}

export const STUDY_METHODS_CATALOG: MethodCatalogItem[] = [
  {
    id: "feynman",
    name: "Técnica Feynman",
    category: "comprension",
    categoryLabel: "Comprensión & Síntesis",
    shortDescription: "Descompone y explica conceptos complejos en lenguaje llano para detectar lagunas.",
    scientificBasis: "Craik & Lockhart (1972) • Procesamiento Profundo y Efecto de Generación",
    duration: "30–45 min",
    structure: "4 fases reflexivas",
    whatItIs:
      "Método de aprendizaje activo atribuido al premio Nobel Richard Feynman. Consiste en explicar una idea abstracta como si se le hablara a un estudiante de 10 años, prescindiendo de tecnicismos para evidenciar qué partes se comprenden verdaderamente y cuáles solo se repiten mecánicamente.",
    whyItWorks:
      "La lectura pasiva genera una fuerte ilusión de competencia (creer que se entiende porque el texto suena familiar). Forzar al cerebro a reformular la idea sin jerga exige reconstruir el esquema conceptual en la corteza prefrontal, fortaleciendo la comprensión profunda.",
    protocolSteps: [
      { step: 1, title: "Elección del Concepto", desc: "Define con precisión el tema o principio que vas a dominar." },
      { step: 2, title: "Explicación en Lenguaje Llano", desc: "Redacta la explicación con tus propias palabras, sin tecnicismos ni fórmulas vacías." },
      { step: 3, title: "Identificación de Lagunas", desc: "Detecta dónde titubeaste o necesitaste mirar apuntes. Revisa la fuente original." },
      { step: 4, title: "Simplificación y Analogía", desc: "Condensa la explicación y crea una metáfora tangible de la vida cotidiana." },
    ],
    bestSuitedFor: ["Teoremas abstractos", "Fisiología y biología celular", "Modelos económicos", "Preparación de finales orales"],
    proTip: "Si utilizas una palabra técnica que no podrías explicarle a un niño sin otra palabra técnica, ahí reside tu laguna.",
  },
  {
    id: "active-recall",
    name: "Recuperación Activa",
    category: "memoria",
    categoryLabel: "Evocación & Memoria",
    shortDescription: "Respuesta a ciegas sin mirar el material antes de cotejar con la fuente original.",
    scientificBasis: "Karpicke & Roediger (2008) • Efecto de la Práctica de Evaluación",
    duration: "20–30 min",
    structure: "Evocación ciega + Autoevaluación",
    whatItIs:
      "En lugar de releer o subrayar pasivamente, el estudiante se autoformula preguntas desafiantes y se esfuerza por extraer la respuesta de su memoria a largo plazo antes de contrastarla con la solución real.",
    whyItWorks:
      "El acto deliberado de recuperar información consolida las vías de acceso mnemónico en el hipocampo y corteza temporal. Releer solo refuerza el reconocimiento visual superficial, mientras que la evocación activa previene el olvido permanente.",
    protocolSteps: [
      { step: 1, title: "Planteo de la Pregunta", desc: "Formula la pregunta sobre el concepto o problema clave a resolver." },
      { step: 2, title: "Evocación Ciega", desc: "Escribe tu respuesta completa con apuntes cerrados, tolerando la fricción cognitiva." },
      { step: 3, title: "Revelación y Contraste", desc: "Descubre la respuesta fuente y compara objetivamente cada detalle." },
      { step: 4, title: "Calificación de Precisión", desc: "Asigna una puntuación (1 a 5) para registrar tu grado de retención real." },
    ],
    bestSuitedFor: ["Definiciones rigurosas", "Anatomía y medicina", "Listados de requisitos legales", "Fórmulas matemáticas"],
    proTip: "La incomodidad o esfuerzo mental al intentar recordar no es síntoma de debilidad: es la señal biológica de consolidación sináptica.",
  },
  {
    id: "spaced-repetition",
    name: "Repetición Espaciada (FSRS)",
    category: "memoria",
    categoryLabel: "Evocación & Memoria",
    shortDescription: "Distribución algorítmica de repasos en intervalos crecientes antes del olvido.",
    scientificBasis: "Hermann Ebbinghaus (1885) • Curva del Olvido y Algoritmos FSRS v4.5",
    duration: "15–25 min",
    structure: "Tarjetas activas + Intervalo dinámico",
    whatItIs:
      "Sistema de estudio que aprovecha la curva matemática del olvido. Las tarjetas de conocimiento se repasan justo antes de que se desvanezcan de la memoria, expandiendo gradualmente el intervalo entre revisiones sucesivas.",
    whyItWorks:
      "Cada repaso espaciado reduce la tasa de desvanecimiento de la huella mnemónica, aplanando la curva del olvido. Esto permite retener miles de hechos a largo plazo con una fracción del tiempo de estudio habitual.",
    protocolSteps: [
      { step: 1, title: "Visualización del Anverso", desc: "Lee el estímulo o pregunta sin dar vuelta la tarjeta." },
      { step: 2, title: "Recuerdo Mental Consciente", desc: "Construye mentalmente la respuesta completa." },
      { step: 3, title: "Giro del Reverso", desc: "Comprueba si tu respuesta mental coincide con el contenido registrado." },
      { step: 4, title: "Calificación de Dificultad", desc: "Elige entre Difícil, Bueno o Fácil para reprogramar la fecha del próximo repaso." },
    ],
    bestSuitedFor: ["Farmacología", "Idiomas y vocabulario", "Códigos procesales", "Constantes físicas y fórmulas"],
    proTip: "Crea tarjetas atómicas: una sola idea o hecho por tarjeta en lugar de párrafos densos.",
  },
  {
    id: "pomodoro",
    name: "Pomodoro Tradicional",
    category: "enfoque",
    categoryLabel: "Enfoque & Estructuración",
    shortDescription: "Ciclos de concentración de 25 minutos alternados con pausas breves de 5 minutos.",
    scientificBasis: "Francesco Cirillo • Atenuación de la Fatiga Atencional Prefrontal",
    duration: "25 min por bloque",
    structure: "Temporizador guiado + Ciclos de pausa",
    whatItIs:
      "Estructura de productividad que divide la jornada de estudio en intervalos de atención focalizada estricta (pomodoros) intercalados con pausas breves de desconexión sin estímulos de alta dopamina.",
    whyItWorks:
      "La corteza prefrontal solo puede sostener un nivel óptimo de concentración ejecutiva durante 20 a 40 minutos seguidos. Las pausas programadas permiten recargar neurotransmisores y previenen el agotamiento cognitivo agudo.",
    protocolSteps: [
      { step: 1, title: "Definición de Meta Única", desc: "Elige una única tarea académica para abordar durante el bloque." },
      { step: 2, title: "Bloque de Foco (25 min)", desc: "Estudia con cero distracciones hasta que suene la alarma del sistema." },
      { step: 3, title: "Pausa Fisiológica (5 min)", desc: "Levántate, hidrátate y descansa la vista lejos de pantallas." },
      { step: 4, title: "Descanso Mayor", desc: "Tras 4 pomodoros completados, toma una pausa reconstituyente de 15 a 20 minutos." },
    ],
    bestSuitedFor: ["Lectura densa de cátedra", "Redacción de tesis o monografías", "Resolución de guías prácticas", "Jornadas con procrastinación"],
    proTip: "Durante los 5 minutos de pausa, evita mirar redes sociales o el teléfono; el descanso cerebral requiere ausencia de estímulos intensos.",
  },
  {
    id: "interleaving",
    name: "Práctica Intercalada",
    category: "enfoque",
    categoryLabel: "Enfoque & Estructuración",
    shortDescription: "Alternancia metódica entre dos o más disciplinas o tipos de problemas conexos.",
    scientificBasis: "Rohrer & Taylor (2007) • Discriminación de Patrones y Transferencia",
    duration: "40–60 min",
    structure: "Bloques alternados A/B",
    whatItIs:
      "Estrategia que desafía la práctica masiva en bloque (hacer 20 ejercicios del mismo tipo seguidos). En su lugar, se alternan temas o tipologías de problemas para aprender no solo cómo resolverlos, sino cómo clasificarlos.",
    whyItWorks:
      "En exámenes reales, los problemas no vienen etiquetados con el capítulo al que pertenecen. La alternancia entrena la corteza asociativa para seleccionar la estrategia correcta frente a la incertidumbre.",
    protocolSteps: [
      { step: 1, title: "Selección de Temas A y B", desc: "Elige dos áreas afines (ej. Álgebra Lineal y Cálculo, o Derecho Civil y Penal)." },
      { step: 2, title: "Bloque Activo Tema A (20 min)", desc: "Enfócate en la primera materia hasta la señal de rotación." },
      { step: 3, title: "Transición Cognitiva Consciente", desc: "Realiza una pausa de 2 minutos y cambia al contexto conceptual de B." },
      { step: 4, title: "Bloque Activo Tema B (20 min)", desc: "Resuelve problemas del segundo tema, comparando similitudes y contrastes." },
    ],
    bestSuitedFor: ["Matemáticas y física", "Química orgánica e inorgánica", "Programación (estructuras de datos)", "Diagnóstico diferencial clínico"],
    proTip: "La práctica intercalada se siente más difícil al principio que el estudio en bloque, pero produce retención hasta un 43% superior a largo plazo.",
  },
  {
    id: "mind-maps",
    name: "Mapas Mentales",
    category: "comprension",
    categoryLabel: "Comprensión & Síntesis",
    shortDescription: "Estructuración radial y jerárquica de conceptos interconectados.",
    scientificBasis: "Allan Paivio (1971) • Teoría de la Codificación Dual y Redes Semánticas",
    duration: "30–45 min",
    structure: "Nodo raíz + Ramificaciones anidadas",
    whatItIs:
      "Diagramación lógica que organiza la materia de lo general a lo particular mediante nodos conceptuales, permitiendo apreciar la jerarquía y vínculos entre unidades temáticas.",
    whyItWorks:
      "El cerebro almacena el conocimiento en redes semánticas interconectadas, no en secuencias lineales de texto. Visualizar la topología reduce la sobrecarga cognitiva de la memoria de trabajo.",
    protocolSteps: [
      { step: 1, title: "Concepto Central Raíz", desc: "Define el núcleo temático central de la unidad de estudio." },
      { step: 2, title: "Ramas Principales", desc: "Crea las categorías nodales de primer nivel que vertebran el tema." },
      { step: 3, title: "Subnodos de Detalle", desc: "Agrega argumentos, ejemplos, fórmulas y excepciones en cada rama." },
      { step: 4, title: "Revisión Panorámica", desc: "Verifica que el mapa cuente la historia lógica completa de la materia." },
    ],
    bestSuitedFor: ["Resumen de materias enteras", "Planificación de exposiciones", "Historia y evolución doctrinal", "Sistemas anatómicos"],
    proTip: "Mantén cada nodo conciso (una palabra clave o frase breve); no copies oraciones enteras.",
  },
  {
    id: "sq3r",
    name: "Método SQ3R",
    category: "comprension",
    categoryLabel: "Comprensión & Síntesis",
    shortDescription: "Protocolo sistemático de lectura comprensiva en 5 etapas para manuales y papers.",
    scientificBasis: "Francis P. Robinson (1946) • Procesamiento Metacognitivo de Textos",
    duration: "45–60 min",
    structure: "5 pasos: Survey, Question, Read, Recite, Review",
    whatItIs:
      "Uno de los métodos clásicos con mayor respaldo en educación superior para transformar la lectura pasiva de libros densos en una investigación activa orientada a resolver preguntas.",
    whyItWorks:
      "Al formular preguntas antes de leer, la mente activa esquemas previos y lee con un propósito selectivo, incrementando drásticamente la absorción de los pasajes críticos.",
    protocolSteps: [
      { step: 1, title: "Survey (Inspeccionar)", desc: "Revisa títulos, subtítulos, gráficos y resúmenes para obtener una visión global en 3 minutos." },
      { step: 2, title: "Question (Preguntar)", desc: "Convierte cada subtítulo en una pregunta concreta que necesitas responder." },
      { step: 3, title: "Read (Leer)", desc: "Lee buscando activamente la respuesta a tus preguntas planteadas." },
      { step: 4, title: "Recite (Recitar)", desc: "Parafrasea en voz alta o por escrito lo aprendido sin mirar el texto." },
      { step: 5, title: "Review (Revisar)", desc: "Repasa la estructura completa para consolidar la coherencia global." },
    ],
    bestSuitedFor: ["Tratados universitarios", "Artículos científicos (papers)", "Textos de doctrina jurídica", "Manuales de ingeniería"],
    proTip: "Nunca empieces a leer el primer párrafo sin haber ojeado primero el final del capítulo y las conclusiones del autor.",
  },
  {
    id: "elaborative-interrogation",
    name: "Interrogación Elaborativa",
    category: "comprension",
    categoryLabel: "Comprensión & Síntesis",
    shortDescription: "Cuestionamiento sistemático del porqué de cada afirmación para tejer causalidad.",
    scientificBasis: "Pressley et al. (1992) • Integración de Memoria Semántica y Causal",
    duration: "25–35 min",
    structure: "Afirmación + Indagación causal guiada",
    whatItIs:
      "Técnica que consiste en tomar hechos, fórmulas o premisas dadas por el texto y preguntarse reflexivamente: '¿Por qué esto es verdad?', '¿Por qué tiene sentido este mecanismo?', '¿Qué pasaría si esto no fuera así?'.",
    whyItWorks:
      "Conectar un hecho aislado con su causa lógica activa el conocimiento previo del estudiante, transformando un dato arbitrario difícil de recordar en una consecuencia predecible de una ley general.",
    protocolSteps: [
      { step: 1, title: "Registro del Hecho Clave", desc: "Anota la premisa, teorema o afirmación fáctica que deseas asimilar." },
      { step: 2, title: "Interrogación Causal", desc: "Pregúntate con rigor: ¿Por qué ocurre esto exactamente de esta manera?" },
      { step: 3, title: "Justificación Semántica", desc: "Redacta el razonamiento causal que conecta la causa con el efecto." },
      { step: 4, title: "Contraste con Casos Límite", desc: "¿Qué fallaría en el sistema si esta premisa no se cumpliera?" },
    ],
    bestSuitedFor: ["Mecanismos bioquímicos", "Principios de derecho constitucional", "Leyes de la termodinámica y física", "Historia causal"],
    proTip: "Evita explicaciones tautológicas (decir 'es así porque la ley lo dice'); busca siempre el principio subyacente de diseño o causalidad natural.",
  },
];
