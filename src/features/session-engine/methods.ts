export type StructureType =
  | "pomodoro"
  | "recall"
  | "spaced"
  | "feynman"
  | "interleaving"
  | "cornell"
  | "sq3r"
  | "leitner";

export interface StudyMethod {
  id: string;
  name: string;
  shortDescription: string;
  whatItIs: string;
  whyItWorks: string;
  howItWorksHere: string;
  combinesWith: string[];
  structureType: StructureType;
  hasTimer: boolean;
  cyclic: boolean;
}

export const studyMethods: StudyMethod[] = [
  {
    id: "pomodoro",
    name: "Pomodoro",
    shortDescription: "Bloques de 25 minutos de foco con descansos cortos entre medio.",
    whatItIs:
      "Técnica de gestión del tiempo: se estudia en bloques de 25 minutos ('pomodoros') separados por descansos de 5, y cada 4 pomodoros se toma un descanso largo de 15-20 minutos.",
    whyItWorks:
      "Los bloques cortos con deadline reducen la procrastinación y mantienen el nivel de atención alto — el cerebro sostiene mejor el foco sabiendo que el esfuerzo tiene un final cercano.",
    howItWorksHere:
      "El motor corre 4 ciclos de Foco (25 min) + Descanso (5 min), y al terminar el cuarto ofrece un descanso largo. Podés pausar, saltar un bloque o terminar antes.",
    combinesWith: ["active-recall", "interleaving"],
    structureType: "pomodoro",
    hasTimer: true,
    cyclic: true,
  },
  {
    id: "active-recall",
    name: "Active Recall",
    shortDescription: "Cerrás el material y contestás de memoria antes de volver a mirarlo.",
    whatItIs:
      "En vez de releer, se intenta recordar activamente la información sin tener el material a la vista, generando las propias preguntas y respondiéndolas de memoria.",
    whyItWorks:
      "El esfuerzo de recuperar información de la memoria (en vez de solo reconocerla al releer) fortalece muchísimo más la retención a largo plazo — es el efecto de recuperación ('testing effect').",
    howItWorksHere:
      "El documento se oculta durante el bloque de recuerdo. Tenés un timer y un espacio para anotar preguntas propias y responderlas de memoria; al final podés volver a mostrar el material para revisar.",
    combinesWith: ["pomodoro", "cornell", "spaced-repetition"],
    structureType: "recall",
    hasTimer: true,
    cyclic: false,
  },
  {
    id: "spaced-repetition",
    name: "Spaced Repetition",
    shortDescription: "No es una sesión — reprograma tus repasos automáticamente según la fecha.",
    whatItIs:
      "Sistema de recordatorios espaciados: cada tema que marcás como repasado se reprograma más adelante en el tiempo, con intervalos que crecen si te acordaste bien.",
    whyItWorks:
      "La memoria retiene mejor cuando el repaso ocurre justo antes de olvidar, no antes ni después — repetir con intervalos crecientes es la forma más eficiente de fijar información a largo plazo.",
    howItWorksHere:
      "En vez de un timer, ves una lista de temas con repaso pendiente hoy o atrasado. Marcás 'repasado' y el sistema reprograma la próxima fecha automáticamente, duplicando el intervalo anterior.",
    combinesWith: ["leitner", "active-recall"],
    structureType: "spaced",
    hasTimer: false,
    cyclic: false,
  },
  {
    id: "feynman",
    name: "Técnica Feynman",
    shortDescription: "Explicás el tema con tus palabras, como si se lo enseñaras a alguien.",
    whatItIs:
      "Se elige un concepto y se lo explica por escrito con el vocabulario más simple posible, como si el que escucha no supiera nada del tema.",
    whyItWorks:
      "Explicar en simple obliga a exponer los huecos en la propia comprensión — donde te trabas al simplificar es exactamente lo que todavía no entendiste del todo.",
    howItWorksHere:
      "Bloque libre (sin timer estricto) con un campo de texto: 'Explicá esto como si...'. El documento queda al lado para consultar cuando te trabás, no para copiar.",
    combinesWith: ["cornell", "sq3r"],
    structureType: "feynman",
    hasTimer: true,
    cyclic: false,
  },
  {
    id: "interleaving",
    name: "Interleaving",
    shortDescription: "Rotás entre sub-temas en bloques cortos, en vez de agotar uno solo.",
    whatItIs:
      "En vez de estudiar un tema entero antes de pasar al siguiente, se alternan varios sub-temas en bloques cortos dentro de la misma sesión.",
    whyItWorks:
      "Alternar obliga a reactivar y distinguir conceptos constantemente, lo que mejora la capacidad de reconocer qué método o idea aplica a cada situación — más transferible que estudiar en bloques aislados.",
    howItWorksHere:
      "Cargás una lista corta de sub-temas y una duración de bloque (por defecto 10 min); el motor va rotando entre ellos mostrando de qué sub-tema toca ocuparse ahora.",
    combinesWith: ["pomodoro", "leitner"],
    structureType: "interleaving",
    hasTimer: true,
    cyclic: true,
  },
  {
    id: "cornell",
    name: "Cornell Notes",
    shortDescription: "Página dividida en tres zonas: preguntas, notas y resumen.",
    whatItIs:
      "Plantilla de toma de apuntes con tres zonas: una columna angosta de preguntas/palabras clave, una zona ancha de notas durante la clase o lectura, y una franja de resumen al pie.",
    whyItWorks:
      "Separar preguntas, notas y resumen obliga a procesar la información en distintos niveles de abstracción, lo que arma un mapa de repaso mucho más rápido de usar después.",
    howItWorksHere:
      "Se abre la plantilla de 3 zonas al lado del documento. Podés ir llenando notas mientras leés, y dejar preguntas/resumen para el final del bloque.",
    combinesWith: ["sq3r", "active-recall"],
    structureType: "cornell",
    hasTimer: false,
    cyclic: false,
  },
  {
    id: "sq3r",
    name: "SQ3R",
    shortDescription: "5 pasos guiados sobre una lectura: explorar, preguntar, leer, recitar, repasar.",
    whatItIs:
      "Método de lectura activa en 5 pasos: Survey (explorar por encima), Question (generar preguntas), Read (leer buscando responderlas), Recite (recitar de memoria) y Review (repasar).",
    whyItWorks:
      "Convertir la lectura pasiva en una secuencia con objetivos concretos en cada paso mejora la comprensión y la retención frente a simplemente leer de corrido.",
    howItWorksHere:
      "El motor te guía paso a paso con una instrucción breve y un espacio de notas por paso; avanzás cuando estés listo, no hay timer obligatorio.",
    combinesWith: ["cornell", "feynman"],
    structureType: "sq3r",
    hasTimer: false,
    cyclic: false,
  },
  {
    id: "leitner",
    name: "Sistema Leitner",
    shortDescription: "Flashcards organizadas en cajas — lo que fallás vuelve pronto.",
    whatItIs:
      "Sistema de repaso con flashcards organizadas en cajas de prioridad: las que se responden mal vuelven a la caja 1 (repaso frecuente), las que se saben bien avanzan a cajas con repaso más espaciado.",
    whyItWorks:
      "Concentra el tiempo de estudio en lo que todavía no sabés, en vez de repasar por igual todo el mazo — es una forma simple y muy eficiente de priorizar.",
    howItWorksHere:
      "Mostramos las flashcards con repaso pendiente hoy. Marcás 'Fallé' o 'Acerté' después de cada una y el sistema las mueve de caja automáticamente.",
    combinesWith: ["spaced-repetition", "interleaving"],
    structureType: "leitner",
    hasTimer: false,
    cyclic: false,
  },
];

export function getMethod(id: string | null): StudyMethod | undefined {
  return studyMethods.find((m) => m.id === id);
}
