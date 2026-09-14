import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TutorialStep {
  id: string;
  route: string;
  title: string;
  subtitle: string;
  category: "Core" | "Académico" | "Cognitivo" | "Productividad";
  description: string;
  keyFeatures: string[];
  cognitiveBenefit: string;
  howToUse: string[];
  shortcutOrTip?: string;
  accent: "cyan" | "purple" | "emerald" | "amber";
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: "dashboard",
    route: "/",
    title: "1. Dashboard de Control Cognitivo",
    subtitle: "Telemetría de retención en tiempo real y racha de hábitos",
    category: "Core",
    description:
      "Tu centro de operaciones unificado. Monitorea tu retención media calculada por el algoritmo FSRS v4.5, tus horas de estudio acumuladas, tu racha activa y el acceso directo a los módulos más críticos.",
    keyFeatures: [
      "Barómetro de retención global R(t) basado en tu historial de repasos.",
      "Contador de fuentes académicas indexadas y tarjetas FSRS activas.",
      "Acceso de un solo clic hacia el Academic Hub, Workspace y Sesión de Estudio.",
    ],
    cognitiveBenefit:
      "Principio de retroalimentación inmediata: visualizar el progreso y la retención cuantificada reduce la procrastinación e incrementa la autoeficacia según la Teoría de la Autodeterminación (Ryan & Deci).",
    howToUse: [
      "Revisa cada mañana tu porcentaje de retención para priorizar repasos atrasados.",
      "Haz clic en 'Academic Hub' para consultar o subir apuntes universitarios.",
      "Utiliza el botón 'Iniciar Sesión' para comenzar tu bloque de estudio diario.",
    ],
    shortcutOrTip: "Tip: Mantener una retención meta de R ≥ 85% minimiza el tiempo total de repaso.",
    accent: "cyan",
  },
  {
    id: "academic",
    route: "/academic",
    title: "2. Personal Academic Knowledge Engine",
    subtitle: "Ingesta de PDFs universitarios, visor ejecutable y chat socrático RAG",
    category: "Académico",
    description:
      "Un entorno de trabajo universitario citation-first superior a NotebookLM. Arrastra documentos PDF, Markdown o textos; el motor local extrae fórmulas LaTeX, jerarquía AST y fragmentos atómicos.",
    keyFeatures: [
      "Visor PDF.js interactivo con menú contextual al seleccionar texto.",
      "Generación instantánea de flashcards FSRS y auditoría NLI con la Técnica Feynman.",
      "Modo '⚡ Ejecutar Simulacro' en cada párrafo para autoevaluarte bloque a bloque.",
      "Chat Socrático con citas obligatorias auditables que iluminan el pasaje en neón cian.",
    ],
    cognitiveBenefit:
      "Práctica de recuperación activa (Active Recall) y formulación precisa (SuperMemo 20 Rules): fragmentar teoremas y evaluarlos de inmediato consolida la memoria de trabajo hacia la memoria a largo plazo.",
    howToUse: [
      "Arrastra tu apunte en el Panel 1 y espera la confirmación de ingesta.",
      "Selecciona cualquier párrafo en el visor para generar una flashcard FSRS automática.",
      "Escribe tus dudas en la terminal inferior para recibir explicaciones fundamentadas con citas.",
    ],
    shortcutOrTip: "Tip: Al hacer clic en cualquier píldora [Pág X], el visor salta y dibuja un marco cian sobre el párrafo.",
    accent: "cyan",
  },
  {
    id: "workspace",
    route: "/workspace",
    title: "3. Workspace OS de Alto Rendimiento",
    subtitle: "Terminal LaTeX, sintetizador de ondas binaurales y medidor de fatiga",
    category: "Productividad",
    description:
      "Un espacio de trabajo modular diseñado para sesiones de estudio exigentes sin distracciones. Integra herramientas matemáticas, acústicas y telemétricas en un solo lienzo.",
    keyFeatures: [
      "Terminal LaTeX con renderizado KaTeX en tiempo real y teclado matemático rápido.",
      "Sintetizador de audio binaural nativo Web Audio (Alfa 10Hz, Theta 6Hz, Gamma 40Hz).",
      "Medidor de fatiga cognitiva en vivo con recomendaciones de pausas biológicas.",
      "Scratchpad efímero para cálculo rápido y notas borradores.",
    ],
    cognitiveBenefit:
      "Entrenamiento de ondas cerebrales (Entrainment) y gestión de la carga extrínseca (Sweller): las frecuencias Alfa (8–12 Hz) inducen alerta relajada óptima para asimilar conceptos densos.",
    howToUse: [
      "Activa las ondas Alfa en el sintetizador para entrar en estado de flujo.",
      "Escribe fórmulas complejas en la terminal LaTeX para verificar su sintaxis.",
      "Monitorea el barómetro de fatiga: si supera el 75%, programa una pausa de 5 minutos.",
    ],
    shortcutOrTip: "Tip: Puedes ocultar o colapsar widgets para maximizar tu área de trabajo.",
    accent: "purple",
  },
  {
    id: "graph",
    route: "/graph",
    title: "4. Grafo Causal & Árbol de Prerrequisitos",
    subtitle: "Mecánica RPG de desbloqueo, ruta crítica y cuellos de botella",
    category: "Cognitivo",
    description:
      "Visualiza tu carrera o materia como un grafo dirigido acíclico (DAG). Cada concepto depende de bases que debes dominar antes de avanzar a temas más abstractos.",
    keyFeatures: [
      "Lienzo interactivo con física de fuerzas (partículas Canvas 2D) y zoom.",
      "Código de colores RPG: Verde (R ≥ 80%), Cian (50–79%) y Rojo (< 50%).",
      "Candado causal 🔒: si un prerrequisito está en rojo, los temas avanzados se bloquean.",
      "Detección algorítmica de cuellos de botella y botón 'Estudiar este nodo ahora (Sesión FSRS)'.",
    ],
    cognitiveBenefit:
      "Andamiaje cognitivo (Scaffolding de Bruner): adquirir conocimientos nuevos sobre esquemas previos frágiles genera lagunas estructurales; el grafo garantiza bases sólidas.",
    howToUse: [
      "Identifica los nodos en rojo (críticos) para reforzar sus tarjetas asociadas.",
      "Haz clic en cualquier nodo para abrir su tarjeta técnica y lanzar una sesión exprés.",
      "Añade nuevos conceptos y dependencias con el botón '+ Nuevo Concepto'.",
    ],
    shortcutOrTip: "Tip: Usa la rueda del ratón para hacer zoom y arrastra el fondo para navegar el mapa.",
    accent: "purple",
  },
  {
    id: "files",
    route: "/files",
    title: "5. Gestor de Archivos & Anotador PDF",
    subtitle: "Organización académica jerárquica, subrayado espacial y OCR",
    category: "Académico",
    description:
      "Organiza todos tus materiales universitarios organizados por carrera, año y materia. Cuenta con un visor completo de documentos PDF con herramientas de marcado profesional.",
    keyFeatures: [
      "Estructura en árbol de carpetas con metadatos universitarios.",
      "Subrayado persistente normalizado (0.0 a 1.0) que mantiene la posición en cualquier zoom.",
      "Notas adhesivas espaciales (Post-its) ancladas a coordenadas exactas.",
      "Capa OCR sintética que permite seleccionar y copiar texto de PDFs escaneados.",
    ],
    cognitiveBenefit:
      "Efecto de generación y procesamiento profundo (Craik & Lockhart): seleccionar ideas principales y anotar reflexiones marginales mejora sustancialmente la retención diferida.",
    howToUse: [
      "Crea carpetas para cada materia de tu cuatrimestre.",
      "Abre cualquier archivo para visualizarlo con el visor de alta fidelidad.",
      "Activa el modo subrayado o post-it para resaltar fórmulas clave.",
    ],
    shortcutOrTip: "Tip: Los archivos subidos se guardan 100% en tu navegador mediante IndexedDB.",
    accent: "emerald",
  },
  {
    id: "methods",
    route: "/methods",
    title: "6. Laboratorio de Métodos Cognitivos",
    subtitle: "Catálogo de técnicas activas con mayor respaldo neurocientífico",
    category: "Cognitivo",
    description:
      "Explora y selecciona el método de estudio ideal para el tipo de material que enfrentas. Desde deducción analítica hasta memorización espacial y síntesis conceptual.",
    keyFeatures: [
      "Técnica Feynman: Explicación socrática en lenguaje simple para detectar lagunas.",
      "Sistema Leitner & FSRS: Repetición espaciada algorítmica con intervalos predictivos.",
      "Notas Cornell: División analítica en notas, pistas y resumen sintetizado.",
      "Blurting Cuantitativo: Vaciado libre de memoria bajo presión de tiempo.",
      "Palacio de la Memoria (Loci): Asociación visual en habitaciones espaciales.",
    ],
    cognitiveBenefit:
      "Práctica intercalada y variabilidad contextual: alternar métodos según el dominio de conocimiento estimula redes neuronales complementarias y combate la habituación.",
    howToUse: [
      "Selecciona una materia y lee las recomendaciones de método.",
      "Haz clic en 'Iniciar Sesión con este Método' para entrar al runner guiado.",
    ],
    shortcutOrTip: "Tip: Para fórmulas o teoremas, combina Feynman con Leitner/FSRS.",
    accent: "emerald",
  },
  {
    id: "session",
    route: "/session",
    title: "7. Entorno de Sesión de Estudio Inmersiva",
    subtitle: "Ejecución guiada, temporizador Deep Work y reducción de fatiga",
    category: "Productividad",
    description:
      "El espacio donde ocurre el estudio real. Te aísla de distracciones mientras guía el protocolo paso a paso del método que seleccionaste.",
    keyFeatures: [
      "Temporizador de enfoque profundo configurable (Pomodoro, Ultra-focus 50/10).",
      "Runner adaptativo con pasos específicos para el método seleccionado.",
      "Reproductor de audio ambiental integrado (Lluvia, Ruido Blanco, Cafetería, Lofi).",
      "Registro de fatiga y telemetría de rendimiento al concluir el bloque.",
    ],
    cognitiveBenefit:
      "Estados de flujo (Csikszentmihalyi) y control de atención ejecutiva: minimizar la conmutación de contexto protege la capacidad de la memoria operativa prefrontal.",
    howToUse: [
      "Inicia el temporizador y sigue las instrucciones del runner en pantalla.",
      "Activa un sonido ambiental en la barra inferior para amortiguar ruidos externos.",
      "Completa la autoevaluación al final para nutrir los algoritmos predictivos.",
    ],
    shortcutOrTip: "Tip: Si sientes cansancio antes de terminar, activa una pausa breve de respiración.",
    accent: "amber",
  },
  {
    id: "settings",
    route: "/settings",
    title: "8. Configuración & Calibración de Memoria",
    subtitle: "Ajuste de parámetros FSRS v4.5, tema visual y privacidad local",
    category: "Core",
    description:
      "Control total sobre el comportamiento de la plataforma. Calibra la velocidad del algoritmo de repetición espaciada, alterna temas y gestiona la base de datos.",
    keyFeatures: [
      "Conmutador de tema HUD Oscuro / Claro con persistencia.",
      "Control de fondo ambiental animado y reducción de movimiento.",
      "Visualización y calibración de los pesos canónicos del algoritmo FSRS.",
      "Gestión de almacenamiento local y botón de reinicio de datos.",
    ],
    cognitiveBenefit:
      "Alineación ergonómica y comodidad visual: adaptar el contraste y reducir la fatiga ocular fotópica previene cefaleas tensionales durante sesiones nocturnas.",
    howToUse: [
      "Ajusta tu retención meta FSRS (recomendado 85–90%).",
      "Activa o desactiva las animaciones de fondo según tu preferencia o potencia del equipo.",
    ],
    shortcutOrTip: "Tip: Toda tu información reside en tu disco local, asegurando privacidad total.",
    accent: "amber",
  },
];

interface TutorialState {
  isOpen: boolean;
  activeTab: "tour" | "docs";
  currentStepIndex: number;
  hasSeenTour: boolean;
  openTutorial: (stepIndex?: number, tab?: "tour" | "docs") => void;
  closeTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  setTab: (tab: "tour" | "docs") => void;
  setHasSeenTour: (seen: boolean) => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set, get) => ({
      isOpen: false,
      activeTab: "tour",
      currentStepIndex: 0,
      hasSeenTour: false,

      openTutorial: (stepIndex = 0, tab = "tour") =>
        set({
          isOpen: true,
          activeTab: tab,
          currentStepIndex: Math.max(0, Math.min(stepIndex, TUTORIAL_STEPS.length - 1)),
        }),

      closeTutorial: () =>
        set({
          isOpen: false,
          hasSeenTour: true,
        }),

      nextStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex < TUTORIAL_STEPS.length - 1) {
          set({ currentStepIndex: currentStepIndex + 1 });
        } else {
          set({ isOpen: false, hasSeenTour: true });
        }
      },

      prevStep: () => {
        const { currentStepIndex } = get();
        if (currentStepIndex > 0) {
          set({ currentStepIndex: currentStepIndex - 1 });
        }
      },

      goToStep: (index: number) => {
        set({
          currentStepIndex: Math.max(0, Math.min(index, TUTORIAL_STEPS.length - 1)),
        });
      },

      setTab: (tab: "tour" | "docs") => set({ activeTab: tab }),

      setHasSeenTour: (hasSeenTour) => set({ hasSeenTour }),
    }),
    {
      name: "studylab-tutorial-store",
      partialize: (state) => ({ hasSeenTour: state.hasSeenTour }),
    },
  ),
);
