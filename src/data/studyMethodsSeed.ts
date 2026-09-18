import type { StudyMethod } from "../db/db";

export const STUDY_METHODS_30_SEEDS: StudyMethod[] = [
  // 1. Recuerdo Activo
  {
    id: "active-recall",
    name: "Recuerdo Activo",
    nameEn: "Active Recall / Testing Effect",
    category: "memorizacion",
    bestFor: ["Definiciones rigurosas", "Anatomía y medicina", "Listados de leyes y requisitos", "Fórmulas matemáticas"],
    description:
      "Técnica fundamental que consiste en forzar la recuperación de la información desde la memoria a largo plazo sin consultar los apuntes. En lugar de reconocer el texto al releerlo, se entrena el camino neuronal de evocación voluntaria.",
    howTo: [
      "Oculta el material de lectura o cierra tus apuntes.",
      "Plantea una pregunta clave sobre el concepto a evaluar.",
      "Escribe o recita la respuesta completa exclusivamente de memoria.",
      "Coteja con la fuente original y califica tu nivel de precisión.",
      "Repite el ciclo sobre las lagunas identificadas hasta lograr fluidez.",
    ],
    scientificBasis: "Roediger & Karpicke (2006) • The Power of Testing Memory: Basic Research and Implications for Educational Practice.",
    integratesWith: ["fsrs", "session-engine"],
    implemented: true,
  },

  // 2. Repaso Espaciado
  {
    id: "spaced-repetition",
    name: "Repaso Espaciado",
    nameEn: "Spaced Repetition (FSRS)",
    category: "memorizacion",
    bestFor: ["Vocabulario e idiomas", "Farmacología", "Constantes físicas y fórmulas", "Artículos de códigos normativos"],
    description:
      "Distribución matemática de las sesiones de revisión en intervalos temporales crecientes calculados justo antes del instante estimado de olvido. Aplica el modelo biofísico FSRS-4.5 de estabilidad y dificultad mnemónica.",
    howTo: [
      "Descompón el conocimiento en tarjetas o ítems atómicos con anverso y reverso.",
      "Examina el estímulo del anverso e intenta evocar la respuesta antes de voltearla.",
      "Califica con honestidad la dificultad percibida (Otra vez, Difícil, Bueno, Fácil).",
      "Deja que el algoritmo reprograme la próxima fecha óptima de repaso.",
      "Completa los repasos pendientes cada día para aplanar la curva del olvido.",
    ],
    scientificBasis: "Hermann Ebbinghaus (1885) / Wozniak & Ye (FSRS v4.5) • Curva del Olvido y Estabilidad de Huella Mnemónica.",
    integratesWith: ["fsrs"],
    implemented: true,
  },

  // 3. Técnica Feynman
  {
    id: "feynman",
    name: "Técnica Feynman",
    nameEn: "Feynman Technique",
    category: "comprension",
    bestFor: ["Teoremas abstractos", "Fisiología y bioquímica", "Modelos económicos", "Preparación de exámenes orales"],
    description:
      "Método de asimilación activa que consiste en explicar una idea abstracta en lenguaje llano y sin jerga técnica, simulando enseñársela a un estudiante novato. Destapa de inmediato las lagunas de comprensión enmascaradas por la familiaridad visual.",
    howTo: [
      "Selecciona con precisión el concepto o teorema que deseas dominar.",
      "Desarrolla la explicación en un lienzo en blanco usando tus propias palabras sencillas.",
      "Identifica los puntos donde titubeaste, recurriste a tecnicismos vacíos o quedaste trabado.",
      "Regresa a los textos de cátedra para clarificar la causa exacta del bloqueo.",
      "Crea una analogía tangible de la vida cotidiana para consolidar la estructura lógica.",
    ],
    scientificBasis: "Craik & Lockhart (1972) • Niveles de Procesamiento y Efecto de Generación en Comprensión Conceptual.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 4. Técnica Pomodoro
  {
    id: "pomodoro",
    name: "Técnica Pomodoro",
    nameEn: "Pomodoro Technique",
    category: "gestion-tiempo",
    bestFor: ["Lectura densa de cátedra", "Redacción de tesis o informes", "Resolución de guías prácticas", "Superación de procrastinación"],
    description:
      "Estructura temporal que fracciona la jornada académica en bloques de concentración focalizada de 25 minutos intercalados con pausas fisiológicas breves de 5 minutos, protegiendo la corteza prefrontal del agotamiento atencional agudo.",
    howTo: [
      "Fija una única tarea académica para abordar durante el intervalo de trabajo.",
      "Inicia el temporizador de 25 minutos y elimina toda notificación o distracción periférica.",
      "Trabaja con inmersión sostenida hasta la señal sonora de finalización.",
      "Toma una pausa de 5 minutos lejos de pantallas (hidratación, estiramiento visual).",
      "Tras acumular 4 pomodoros, realiza un descanso reconstituyente de 15 a 20 minutos.",
    ],
    scientificBasis: "Francesco Cirillo / Baumeister et al. • Conservación de Recursos Atencionales y Autocontrol Prefrontal.",
    integratesWith: ["pomodoro-timer"],
    implemented: true,
  },

  // 5. Práctica Intercalada (Interleaving)
  {
    id: "interleaving",
    name: "Práctica Intercalada",
    nameEn: "Interleaved Practice",
    category: "metacognicion",
    bestFor: ["Matemáticas y cálculo", "Química orgánica", "Estructuras de datos y algoritmos", "Diagnóstico diferencial clínico"],
    description:
      "Alternancia intencional entre dos o más disciplinas afines o distintas tipologías de ejercicios durante una misma sesión. Entrena a la mente no solo en cómo resolver un problema, sino en discernir qué modelo teórico corresponde aplicar.",
    howTo: [
      "Selecciona dos o tres materias o categorías de problemas afines (ej. Integrales vs Derivadas).",
      "Establece un bloque de 20 minutos de práctica focalizada en el Tema A.",
      "Haz una breve transición de 2 minutos para desenganchar el foco cognitivo.",
      "Cambia de inmediato a resolver problemas del Tema B durante los siguientes 20 minutos.",
      "Analiza las diferencias estructurales y condiciones de frontera entre ambos dominios.",
    ],
    scientificBasis: "Rohrer & Taylor (2007) • The Shuffling of Mathematics Problems Improves Learning.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 6. Método Cornell
  {
    id: "cornell",
    name: "Método Cornell",
    nameEn: "Cornell Note-Taking System",
    category: "escritura",
    bestFor: ["Clases magistrales presenciales", "Lectura de manuales extensos", "Preparación de guías de estudio rápido"],
    description:
      "Estructura de toma de apuntes en tres zonas diferenciadas: columna derecha amplia para notas de clase, columna izquierda para preguntas e indicios clave, y franja inferior para un resumen de síntesis de 2 líneas.",
    howTo: [
      "Divide la página en columna derecha (70%), columna izquierda (30%) y franja inferior (5 cm).",
      "Registra ideas nucleares, datos y esquemas en la columna derecha durante la lectura o clase.",
      "Inmediatamente después, formula preguntas clave o palabras estímulo en la columna izquierda.",
      "Tapa la columna de notas y utiliza las preguntas de la izquierda para autoevaluarte.",
      "Redacta una síntesis integradora de 2 o 3 oraciones en la franja inferior.",
    ],
    scientificBasis: "Walter Pauk (1940s, Cornell University) • Organización Espacial y Procesamiento Profundo en Apuntes.",
    integratesWith: ["session-engine", "fsrs"],
    implemented: true,
  },

  // 7. Blurting (Vaciado Mental)
  {
    id: "blurting",
    name: "Blurting (Vaciado Mental)",
    nameEn: "Blurting Method",
    category: "evaluacion",
    bestFor: ["Auditoría rápida pre-examen", "Revisión de temas extensos", "Medición de retención en blanco"],
    description:
      "Prueba de esfuerzo mnemónico en la que, tras una lectura preliminar concentrada, se cierran todos los textos y se vuelca en un folio en blanco todo lo recordado de forma caótica y sin filtros, para luego contrastar faltantes con tinta roja.",
    howTo: [
      "Lee y estudia en profundidad una sección temática durante 15 a 20 minutos.",
      "Oculta por completo apuntes, diapositivas y libros.",
      "En una hoja o lienzo digital en blanco, escribe a toda velocidad todo lo que recuerdes sin frenarte.",
      "Abre el texto de cátedra y coteja con otro color de tinta todo lo omitido o inexacto.",
      "Enfoca tu siguiente sesión de repaso exclusivamente en las lagunas descubiertas.",
    ],
    scientificBasis: "Karpicke & Blunt (2011) • Retrieval Practice Produces More Learning than Elaborative Studying with Concept Mapping.",
    integratesWith: ["session-engine", "fsrs"],
    implemented: true,
  },

  // 8. Mapas Mentales
  {
    id: "mind-maps",
    name: "Mapas Mentales",
    nameEn: "Mind Mapping",
    category: "comprension",
    bestFor: ["Planificación de materias completas", "Historia causal y doctrina", "Brainstorming de proyectos de investigación"],
    description:
      "Diagramación visual radial que sitúa la idea central en el núcleo del espacio y desglosa ramificaciones orgánicas de conceptos jerárquicos hacia la periferia, alineándose con la arquitectura cerebral de redes semánticas asociativas.",
    howTo: [
      "Coloca el concepto central nuclear en el centro de la pantalla o página.",
      "Traza las ramas principales gruesas que correspondan a los ejes temáticos primarios.",
      "Deriva ramas secundarias y terciarias con palabras clave precisas y fórmulas breves.",
      "Utiliza contrastes cromáticos y pequeñas señales visuales para delimitar familias de ideas.",
      "Revisa la topología general para asegurar coherencia y equilibrio estructural.",
    ],
    scientificBasis: "Allan Paivio (1971) • Dual Coding Theory and Associative Semantic Networks.",
    integratesWith: ["knowledge-graph", "session-engine"],
    implemented: true,
  },

  // 9. Método Leitner (Cajas de Flashcards)
  {
    id: "leitner",
    name: "Método Leitner",
    nameEn: "Leitner Box System",
    category: "memorizacion",
    bestFor: ["Memorización progresiva de fichas", "Tarjetas analógicas o digitales", "Separación física de dominios"],
    description:
      "Algoritmo mecánico de repetición espaciada basado en compartimentos progresivos (Cajas 1 a 5). Las tarjetas acertadas avanzan a cajas con revisiones más distanciadas en el tiempo, mientras que cualquier fallo las devuelve a la Caja 1.",
    howTo: [
      "Coloca todas las tarjetas nuevas o no dominadas en el Compartimento 1.",
      "Repasa el Compartimento 1 diariamente, respondiendo activamente a cada ficha.",
      "Si aciertas la respuesta, avanza la tarjeta al Compartimento 2 (repaso cada 3 días).",
      "Si fallas una tarjeta de cualquier compartimento avanzado, devuélvela de inmediato al Compartimento 1.",
      "Gradúa las tarjetas que superen el Compartimento 5 como material consolidado a largo plazo.",
    ],
    scientificBasis: "Sebastian Leitner (1972) • So lernt man lernen: Der Weg zum Erfolg.",
    integratesWith: ["fsrs", "session-engine"],
    implemented: true,
  },

  // 10. Autoexplicación
  {
    id: "self-explanation",
    name: "Autoexplicación",
    nameEn: "Self-Explanation Effect",
    category: "comprension",
    bestFor: ["Demostraciones lógicas", "Lectura de código y algoritmos", "Resolución de ejercicios de física y química"],
    description:
      "Proceso metacognitivo en el que el estudiante se detiene voluntariamente en cada paso de un razonamiento o resolución modelo y se explica a sí mismo en voz baja por qué esa acción es válida y qué regla general la fundamenta.",
    howTo: [
      "Toma un ejercicio o demostración resuelta paso a paso por la cátedra.",
      "En cada línea de cálculo o deducción, pregúntate: '¿Por qué el autor realiza este paso específico?'.",
      "Explicita las condiciones de validez y teoremas que justifican la transformación.",
      "Formula cómo cambiaría la resolución si variara alguna de las premisas iniciales.",
      "Escribe una nota marginal sintetizando el principio subyacente que gobierna el paso.",
    ],
    scientificBasis: "Chi, Bassok, Lewis, Reimann & Glaser (1989) • Self-Explanations: How Students Study and Use Examples in Learning to Solve Problems.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 11. Práctica Distribuida
  {
    id: "distributed-practice",
    name: "Práctica Distribuida",
    nameEn: "Distributed Practice / Spacing Effect",
    category: "gestion-tiempo",
    bestFor: ["Planificación cuatrimestral", "Preparación de finales con meses de anticipación", "Evitar el atracón pre-examen (cramming)"],
    description:
      "Distribución intencional de una masa fija de horas de estudio a lo largo de múltiples días o semanas en fracciones moderadas, en lugar de agruparlas en maratones concentradas e ineficientes antes de la fecha de evaluación.",
    howTo: [
      "Calcula las horas totales estimadas para una asignatura o unidad temaria.",
      "Divide ese tiempo en bloques regulares de 60 a 90 minutos repartidos en la semana.",
      "Reserva intencionalmente días intercalados de descanso entre sesiones del mismo tema.",
      "Comienza cada bloque nuevo con 5 minutos de recapitulación de lo visto en el anterior.",
      "Monitorea el progreso constante sin ceder a la tentación de acumular tareas para el fin de semana.",
    ],
    scientificBasis: "Cepeda, Pashler, Vul, Wixted & Rohrer (2006) • Distributed Practice in Verbal Recall Tasks: A Review and Quantitative Synthesis.",
    implemented: false,
  },

  // 12. Método SQ3R
  {
    id: "sq3r",
    name: "Método SQ3R",
    nameEn: "SQ3R (Survey, Question, Read, Recite, Review)",
    category: "metacognicion",
    bestFor: ["Tratados y manuales de cátedra", "Papers científicos densos", "Capítulos de doctrina jurídica e histórica"],
    description:
      "Protocolo clásico de lectura analítica universitaria en 5 etapas secuenciales que transforma la lectura pasiva en un proceso activo guiado por interrogantes que dirigen selectivamente la atención.",
    howTo: [
      "Survey (Inspeccionar): Ojea títulos, subtítulos, conclusiones y esquemas en 3 minutos.",
      "Question (Preguntar): Convierte los encabezados en preguntas concretas que necesitas responder.",
      "Read (Leer): Lee buscando de forma activa y focalizada las respuestas a tus interrogantes.",
      "Recite (Recitar): Parafrasea de memoria el argumento nuclear sin mirar el texto.",
      "Review (Revisar): Integra la visión de conjunto repasando las relaciones entre las partes.",
    ],
    scientificBasis: "Francis P. Robinson (1946) • Effective Study (Harper & Brothers).",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 13. Codificación Dual
  {
    id: "dual-coding",
    name: "Codificación Dual",
    nameEn: "Dual Coding Theory",
    category: "memorizacion",
    bestFor: ["Fisiología y anatomía", "Circuitos y sistemas físicos", "Diagramas de flujo y arquitectura de software"],
    description:
      "Asociación simultánea y coordinada de dos canales de representación cognitiva para la misma información: el código verbal/proposicional (texto o palabras) y el código visual/no verbal (gráficos, esquemas o diagramas espaciales).",
    howTo: [
      "Toma una definición o proceso abstracto formulado exclusivamente en texto.",
      "Diseña un diagrama, flujo o esquema visual que traduzca las relaciones lógicas.",
      "Etiqueta con precisión cada componente gráfico con la terminología técnica adecuada.",
      "Describe en voz alta el diagrama recorriendo con la mirada las trayectorias de conexión.",
      "Reconstruye el esquema visual de memoria para verificar la solidez del anclaje dual.",
    ],
    scientificBasis: "Allan Paivio (1986) • Mental Representations: A Dual Coding Approach (Oxford University Press).",
    integratesWith: ["knowledge-graph", "session-engine"],
    implemented: true,
  },

  // 14. Mnemotecnias
  {
    id: "mnemonics",
    name: "Técnicas Mnemotécnicas",
    nameEn: "Mnemonics (Acronyms & Acrostics)",
    category: "memorizacion",
    bestFor: ["Listados ordenados de taxonomías", "Huesos y pares craneales", "Clasificaciones de tipos penales o contratos"],
    description:
      "Construcción deliberada de puentes asociativos artificiales (acrónimos, acrósticos fonéticos o palabras clave) que permiten recordar secuencias arbitrarias de elementos que carecen de una lógica causal inherente.",
    howTo: [
      "Aísla la lista de elementos o conceptos que debes memorizar en orden específico.",
      "Extrae la letra o sílaba inicial de cada concepto.",
      "Construye una palabra memorable (acrónimo) o una frase absurda y sonora (acróstico).",
      "Asocia visualmente la frase o palabra con una imagen mental vívida y exagerada.",
      "Practica la decodificación activa: de la mnemotecnia a los términos técnicos reales.",
    ],
    scientificBasis: "Bellezza (1981) • Mnemonic Devices: Classification, Characteristics, and Criteria.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 15. Agrupación (Chunking)
  {
    id: "chunking",
    name: "Agrupación (Chunking)",
    nameEn: "Information Chunking",
    category: "memorizacion",
    bestFor: ["Conjuntos de datos numéricos", "Requisitos legales heterogéneos", "Taxonomías moleculares complejas"],
    description:
      "Compresión de unidades atómicas de información dispersas en grupos conceptuales de orden superior más reducidos, respetando el límite biofísico de la memoria de trabajo humana (aproximadamente 4 ± 1 bloques cognitivos).",
    howTo: [
      "Examina la totalidad de elementos individuales que componen el material a asimilar.",
      "Identifica similitudes funcionales, temporales, causales o formales entre ellos.",
      "Agrupa los elementos en 3 a 5 paquetes coherentes con una etiqueta representativa única.",
      "Memoriza en primer término la jerarquía de etiquetas de grupo.",
      "Expande posteriormente el contenido interno de cada bloque en sesiones de recuerdo activo.",
    ],
    scientificBasis: "George A. Miller (1956) • The Magical Number Seven, Plus or Minus Two: Some Limits on Our Capacity for Processing Information.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 16. Aprendizaje Basado en Problemas
  {
    id: "problem-based-learning",
    name: "Aprendizaje Basado en Problemas",
    nameEn: "Problem-Based Learning (PBL)",
    category: "evaluacion",
    bestFor: ["Casos clínicos en medicina", "Litigación y jurisprudencia", "Diseño en ingeniería y desarrollo de software"],
    description:
      "Metodología inductiva que coloca un caso o problema práctico complejo del mundo real al comienzo del ciclo de estudio, obligando al estudiante a diagnosticar qué conocimientos teóricos necesita adquirir para formular la solución.",
    howTo: [
      "Plantea un caso práctico o dilema técnico realista sin proporcionar la respuesta de antemano.",
      "Desglosa qué hechos del caso se conocen y cuáles constituyen incógnitas críticas.",
      "Identifica las lagunas teóricas y acude a las fuentes bibliográficas con preguntas precisas.",
      "Construye y fundamenta una propuesta de resolución integrando los conceptos aprendidos.",
      "Contrasta la solución con casos similares y discute alternativas con pares o docentes.",
    ],
    scientificBasis: "Barrows & Tamblyn (1980) • Problem-Based Learning: An Approach to Medical Education.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 17. Simulacros de Examen
  {
    id: "practice-testing",
    name: "Simulacros de Examen",
    nameEn: "Practice Testing / Mock Exams",
    category: "evaluacion",
    bestFor: ["Finales de opción múltiple", "Exámenes con restricción estricta de tiempo", "Control de ansiedad evaluativa"],
    description:
      "Recreación de las condiciones ambientales, temporales y cognitivas de la evaluación formal (mismo número de consignas, cronómetro implacable, cero acceso a fuentes de consulta y corrección basada en rúbricas reales).",
    howTo: [
      "Reúne ejercicios de exámenes de años anteriores o genera un set con consignas inéditas.",
      "Configura una alarma estricta acorde a los minutos reales que otorgará la cátedra.",
      "Aísla tu entorno de estudio y responde la totalidad de la prueba sin pausas intermedias.",
      "Al finalizar el tiempo, contrasta las respuestas contra las soluciones modelo oficiales.",
      "Categoriza cada equivocación: ¿error conceptual, omisión de lectura o falta de tiempo?",
    ],
    scientificBasis: "Dunlosky, Rawson, Marsh, Nathan & Willingham (2013) • Improving Students' Learning With Effective Learning Techniques.",
    integratesWith: ["session-engine", "fsrs"],
    implemented: true,
  },

  // 18. Método del Relato (Cadena)
  {
    id: "story-method",
    name: "Método del Relato (Cadena)",
    nameEn: "Story / Narrative Linking Method",
    category: "memorizacion",
    bestFor: ["Cronologías históricas", "Etapas secuenciales de procesos biológicos o legales", "Listas de conceptos desprovistos de nexo obvio"],
    description:
      "Técnica asociativa que encadena una lista de conceptos inconexos integrándolos como elementos dramáticos en una narración imaginaria vivaz, disparatada o con alta carga de acción visual secuencial.",
    howTo: [
      "Ordena con precisión la secuencia de conceptos o hitos que necesitas recordar.",
      "Crea un personaje o punto de partida visual nítido para el primer término.",
      "Conecta el primer elemento con el segundo mediante una interacción física o dramática exagerada.",
      "Continúa enhebrando cada elemento sucesivo con el anterior formando una historia fluida.",
      "Visualiza la historia de principio a fin dos veces y luego traduce las escenas a los conceptos técnicos.",
    ],
    scientificBasis: "Bower & Clark (1969) • Narrative Stories as Mediators for Serial Learning.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 19. Enseñar a Otros
  {
    id: "protege-effect",
    name: "Enseñar a Otros (Efecto Protegido)",
    nameEn: "The Protégé Effect",
    category: "metacognicion",
    bestFor: ["Estudio en grupos de pares", "Preparación de exposiciones y defensas de tesis", "Consolidación de temas controvertidos"],
    description:
      "Principio cognitivo que demuestra que los estudiantes que se preparan con el objetivo explícito de instruir a otra persona procesan la información de manera significativamente más profunda y estructurada que quienes estudian solo para aprobar.",
    howTo: [
      "Acuerda con un compañero de estudio un rol de instrucción recíproca sobre temas distintos.",
      "Prepara una exposición estructurada de 15 minutos anticipando las posibles dudas del oyente.",
      "Enseña el tema fomentando que tu interlocutor te interrumpa con preguntas inquisitivas.",
      "Registra cada consulta que no pudiste responder con fluidez o claridad absoluta.",
      "Revisa la bibliografía en conjunto para resolver las dudas mutuas planteadas.",
    ],
    scientificBasis: "Chase, Chin, Oppezzo & Schwartz (2009) • Teachable Agents and the Protégé Effect.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 20. Estudio Multisensorial
  {
    id: "multisensory-learning",
    name: "Estudio Multisensorial",
    nameEn: "Multisensory Learning",
    category: "comprension",
    bestFor: ["Anatomía funcional", "Química estereoscópica", "Fonética y fonología", "Instrumentación quirúrgica y de laboratorio"],
    description:
      "Estimulación concurrente de múltiples vías sensoriales (visual, auditiva y háptico-motora) al abordar un mismo contenido, enriqueciendo la huella de memoria con anclajes corticales complementarios.",
    howTo: [
      "Lee la definición teórica mientras escuchas su pronunciación o explicación en audio.",
      "Dibuja o modela físicamente la estructura o el proceso con tus propias manos.",
      "Pronuncia en voz alta el funcionamiento mientras señalas las partes sobre el esquema.",
      "Asocia texturas, colores o ritmos a propiedades diferenciales de los componentes.",
      "Reconstruye mentalmente la experiencia sensorial completa durante las sesiones de recuerdo.",
    ],
    scientificBasis: "Shams & Seitz (2008) • Benefits of Multisensory Learning: Neural Mechanisms and Behavioral Correlates.",
    implemented: false,
  },

  // 21. Palacio de la Memoria (Método de Loci)
  {
    id: "method-of-loci",
    name: "Palacio de la Memoria",
    nameEn: "Method of Loci / Memory Palace",
    category: "memorizacion",
    bestFor: ["Discursos extensos sin notas", "Enumeraciones de decenas de preceptos o elementos", "Estructura de tratados complejos"],
    description:
      "Técnica nemotécnica milenaria que aprovecha el circuito cerebral de orientación espacial y parahipocampal para almacenar conceptos anclándolos visualmente en rincones y objetos específicos de un recorrido físico conocido.",
    howTo: [
      "Elige un espacio físico que conozcas al detalle (tu casa, tu facultad o una ruta habitual).",
      "Define una secuencia ordenada y fija de 10 a 20 estaciones o puntos de anclaje espaciales.",
      "Transforma cada concepto abstracto que deseas recordar en una imagen visual vívida e insólita.",
      "Deposita mentalmente cada imagen en su estación correspondiente a lo largo de la ruta.",
      "Recorre mentalmente el palacio en orden para evocar con precisión matemática cada elemento.",
    ],
    scientificBasis: "Yates (1966) / Maguire et al. (2003) • Routes to Remembering: The Brains Behind Superior Memory.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 22. Interrogación Elaborativa
  {
    id: "elaborative-interrogation",
    name: "Interrogación Elaborativa",
    nameEn: "Elaborative Interrogation",
    category: "comprension",
    bestFor: ["Mecanismos fisiopatológicos", "Leyes físicas y termodinámica", "Derecho constitucional y garantías", "Causalidad histórica"],
    description:
      "Cuestionamiento sistemático del '¿por qué es verdad esto?' ante cada premisa o teorema presentado por los textos, forzando al estudiante a tejer vínculos de causa-efecto con sus esquemas de conocimiento previo.",
    howTo: [
      "Aísla una afirmación fáctica o principio central enunciado en el apunte.",
      "Pregúntate con rigurosidad: '¿Por qué ocurre este fenómeno exactamente de esta forma y no de otra?'.",
      "Redacta una justificación lógica que explique la causa profunda que sostiene al hecho.",
      "Contrasta: '¿Qué contradicción o fallo ocurriría en el sistema si este principio no fuera válido?'.",
      "Integra la respuesta elaborada en una nota concisa al margen del material.",
    ],
    scientificBasis: "Pressley, McDaniel, Turnure, Wood & Ahmad (1987) • Generation and Precision of Elaboration: Effects on Intentional and Incidental Learning.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 23. Mapas Conceptuales
  {
    id: "concept-maps",
    name: "Mapas Conceptuales",
    nameEn: "Concept Mapping (Novakian)",
    category: "comprension",
    bestFor: ["Teorías científicas interconectadas", "Redes de conceptos ontológicos", "Representación de relaciones causales"],
    description:
      "Representación gráfica formal consistente en nodos (conceptos encerrados en recuadros) conectados por aristas dirigidas que contienen palabras de enlace obligatorias (verbos o preposiciones), formando proposiciones lógicas completas.",
    howTo: [
      "Identifica los conceptos clave de la materia y ordénalos en una jerarquía de inclusión.",
      "Ubica los conceptos más generales e inclusivos en la cúspide del diagrama.",
      "Traza líneas con flechas entre conceptos que guarden una relación semántica directa.",
      "Escribe sobre cada arista la frase conectora obligatoria (ej. 'produce', 'es causado por', 'inhibe').",
      "Lee las ternas (Concepto A &rarr; Conector &rarr; Concepto B) para validar que formen oraciones verdaderas.",
    ],
    scientificBasis: "Joseph D. Novak (1984) • Learning How to Learn (Cambridge University Press).",
    integratesWith: ["knowledge-graph", "session-engine"],
    implemented: true,
  },

  // 24. Dificultades Deseables
  {
    id: "desirable-difficulties",
    name: "Dificultades Deseables",
    nameEn: "Desirable Difficulties Framework",
    category: "metacognicion",
    bestFor: ["Diseño de rutinas de estudio", "Superar la ilusión de competencia", "Retención ultra duradera"],
    description:
      "Marco psicopedagógico que postula que las condiciones de estudio que generan esfuerzo cognitivo inmediato, fricción y lentitud aparente inducen una retención a largo plazo y una transferencia significativamente superiores a los métodos fáciles.",
    howTo: [
      "Identifica tus prácticas de estudio pasivas y fluidas (releer, subrayar, ver clases grabadas).",
      "Introduce deliberadamente barreras de esfuerzo: oculta respuestas, mezcla temas y distancia repasos.",
      "Toma la frustración o lentitud inicial no como un fracaso, sino como la señal de consolidación sináptica.",
      "Evita evaluar tu dominio inmediatamente después de estudiar: ponte a prueba tras un intervalo de descanso.",
      "Mide tus resultados en pruebas de transferencia a problemas inéditos, no en familiaridad con el texto.",
    ],
    scientificBasis: "Robert A. Bjork (1994) • Memory and Metamemory Considerations in the Training of Human Beings.",
    implemented: false,
  },

  // 25. Zettelkasten (Notas Enlazadas)
  {
    id: "zettelkasten",
    name: "Zettelkasten (Notas Enlazadas)",
    nameEn: "Zettelkasten / Slip-Box Method",
    category: "escritura",
    bestFor: ["Investigación académica y tesis", "Conexión interdisciplinaria de lecturas", "Producción de monografías complejas"],
    description:
      "Sistema no jerárquico de gestión de conocimiento basado en fichas atómicas (una sola idea por nota) densamente interconectadas mediante enlaces bidireccionales, creando una red emergente de pensamiento orgánico.",
    howTo: [
      "Toma notas fugaces durante la lectura capturando citas o reflexiones provisionales.",
      "Redacta notas permanentes atómicas con tus propias palabras, limitadas a una sola tesis.",
      "Busca conexiones no triviales con notas ya existentes en tu archivo y añade los enlaces correspondientes.",
      "Asigna etiquetas temáticas amplias para facilitar el descubrimiento fortuito.",
      "Navega la red de notas para detectar patrones y redactar artículos a partir de las agrupaciones naturales.",
    ],
    scientificBasis: "Niklas Luhmann / Sönke Ahrens (2017) • How to Take Smart Notes: One Simple Technique to Boost Your Writing.",
    integratesWith: ["knowledge-graph", "session-engine"],
    implemented: true,
  },

  // 26. Método PQ4R
  {
    id: "pq4r",
    name: "Método PQ4R",
    nameEn: "PQ4R (Preview, Question, Read, Reflect, Recite, Review)",
    category: "metacognicion",
    bestFor: ["Textos técnicos densos", "Capítulos de ciencias exactas", "Lectura crítica de papers científicos"],
    description:
      "Evolución avanzada del método SQ3R que introduce una etapa explícita de 'Reflexión' (Reflect) orientada a conectar el material con conocimientos previos, analizar implicancias y formular ejemplos propios antes de recitar.",
    howTo: [
      "Preview: Realiza una inspección preliminar de la estructura del documento.",
      "Question: Formula interrogantes específicos para cada sección temática.",
      "Read: Lee con exhaustividad procurando responder las preguntas formuladas.",
      "Reflect: Medita sobre el significado, busca ejemplos propios y piensa cómo se vincula con tu experiencia.",
      "Recite & Review: Parafrasea de memoria los conceptos clave y repasa la totalidad del capítulo para subsanar lagunas.",
    ],
    scientificBasis: "Thomas & Robinson (1972) • Improving Reading in Every Class: A Sourcebook for Teachers.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 27. Método KWL
  {
    id: "kwl-method",
    name: "Método KWL",
    nameEn: "KWL Chart (Know, Want to know, Learned)",
    category: "metacognicion",
    bestFor: ["Inicio de materias nuevas", "Unidades temáticas desconocidas", "Proyectos de investigación guiada"],
    description:
      "Matriz de tres columnas que organiza el ciclo de aprendizaje: 'Lo que sé' (K - activación de esquemas previos), 'Lo que quiero saber' (W - establecimiento de metas y preguntas) y 'Lo que aprendí' (L - consolidación y evaluación final).",
    howTo: [
      "Dibuja una tabla con tres columnas: K (Qué sé), W (Qué quiero saber) y L (Qué aprendí).",
      "Antes de abrir el libro, completa la columna K con todo tu conocimiento previo sobre el tema.",
      "Rellena la columna W con interrogantes, curiosidades y vacíos que necesitas resolver.",
      "Estudia el material de cátedra enfocado en responder los interrogantes de W.",
      "Al finalizar la sesión, resume en la columna L todos los hallazgos y conocimientos adquiridos.",
    ],
    scientificBasis: "Donna Ogle (1986) • K-W-L: A Teaching Model That Develops Active Reading of Expository Text.",
    integratesWith: ["session-engine"],
    implemented: true,
  },

  // 28. Principio de Segmentación (Mayer)
  {
    id: "segmentation-principle",
    name: "Principio de Segmentación",
    nameEn: "Mayer's Segmenting Principle",
    category: "comprension",
    bestFor: ["Videos de clases grabadas", "Animaciones de procesos dinámicos", "Explicaciones de sistemas complejos"],
    description:
      "Principio de diseño multimedia de Richard Mayer que estipula que las personas aprenden mejor cuando una lección multimedia continua se divide en segmentos breves controlados por el estudiante, en lugar de una exposición ininterrumpida.",
    howTo: [
      "Pausa intencionalmente cada 3 a 5 minutos al mirar una clase grabada o animación.",
      "Dedica 60 segundos a procesar mentalmente la información y escribir una frase resumen.",
      "No avances al siguiente segmento hasta haber consolidado la comprensión del actual.",
      "Si el ritmo de la explicación te abruma, reduce la velocidad de reproducción o repite el fragmento.",
      "Al final del conjunto de segmentos, sintetiza la transición lógica entre cada uno de ellos.",
    ],
    scientificBasis: "Richard E. Mayer (2001, 2009) • Multimedia Learning (Cambridge University Press).",
    implemented: false,
  },

  // 29. Bloques de Trabajo Profundo (Deep Work)
  {
    id: "deep-work",
    name: "Bloques de Trabajo Profundo",
    nameEn: "Deep Work Blocks",
    category: "gestion-tiempo",
    bestFor: ["Demostraciones matemáticas complejas", "Escritura de monografías o tesis", "Programación y depuración de software"],
    description:
      "Inmersión sostenida en bloques prolongados de 90 a 120 minutos sin cortes ni interrupciones cada 25 minutos, aprovechando los ciclos ultradianos cerebrales para alcanzar y sostener el estado de flujo cognitivo máximo.",
    howTo: [
      "Define una meta cognitiva monumental y unitaria para el bloque de trabajo.",
      "Cierra absolutamente todas las pestañas irrelevantes, silencia teléfonos y aísla tu espacio físico.",
      "Permite un período de calentamiento de 10 a 15 minutos hasta entrar en concentración profunda.",
      "Sostén el trabajo ininterrumpido durante 90 a 120 minutos sin cambiar de contexto.",
      "Al concluir, tómate una desconexión prolongada de 30 minutos sin consumir contenido digital denso.",
    ],
    scientificBasis: "Cal Newport (2016) / Kleitman (Basic Rest-Activity Cycle) • Deep Work: Rules for Focused Success in a Distracted World.",
    integratesWith: ["pomodoro-timer", "session-engine"],
    implemented: true,
  },

  // 30. Consolidación por Sueño
  {
    id: "sleep-consolidation",
    name: "Consolidación por Sueño",
    nameEn: "Sleep-Dependent Memory Consolidation",
    category: "memorizacion",
    bestFor: ["Noches previas a exámenes", "Asimilación de habilidades motoras y procedimentales", "Prevención de saturación sináptica"],
    description:
      "Protocolo biofisiológico que concibe el descanso nocturno (fases NREM de ondas lentas y REM) como la etapa biológica indispensable donde el hipocampo reproduce y transfiere las memorias del día hacia la corteza para su fijación definitiva.",
    howTo: [
      "Realiza un repaso ligero de conceptos clave 30 a 45 minutos antes de disponerse a dormir.",
      "Evita pantallas con luz azul intensa y cafeína en las horas previas al reposo.",
      "Asegura entre 7 y 8.5 horas de sueño continuo para no interrumpir los ciclos NREM y REM.",
      "No sacrifiques horas de descanso para realizar atracones nocturnos de estudio (el beneficio es nulo).",
      "Al despertar, realiza una breve sesión de recuerdo activo para verificar la consolidación nocturna.",
    ],
    scientificBasis: "Diekelmann & Born (2010) • The Memory Function of Sleep (Nature Reviews Neuroscience).",
    implemented: false,
  },
];

/**
 * Función de sembrado idempotente: si la tabla `studyMethods` está vacía,
 * inserta los 30 métodos canónicos.
 */
export async function seedStudyMethods(dbInstance: any): Promise<number> {
  try {
    const count = await dbInstance.studyMethods.count();
    if (count === 0) {
      await dbInstance.studyMethods.bulkAdd(STUDY_METHODS_30_SEEDS);
      return STUDY_METHODS_30_SEEDS.length;
    }
    return count;
  } catch (err) {
    console.warn("[StudyLab] Advertencia al verificar/sembrar métodos de estudio:", err);
    return 0;
  }
}
