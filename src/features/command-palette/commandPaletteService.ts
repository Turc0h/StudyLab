import { db } from "../../db/db.ts";
import { STUDY_METHODS_30_SEEDS } from "../../data/studyMethodsSeed.ts";

export type CommandPaletteCategory =
  | "methods"
  | "files"
  | "projects"
  | "concepts"
  | "actions";

export interface CommandPaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: CommandPaletteCategory;
  categoryLabel: string;
  iconName: string;
  badge?: string;
  keywords?: string[];
  score?: number;
  onSelect: () => void;
}

export interface CommandPaletteActions {
  navigate: (to: string) => void;
  toggleTheme?: () => void;
  toggleOrg?: () => void;
  toggleNotif?: () => void;
  enterFocusMode?: () => void;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export async function searchCommandPalette(
  query: string,
  actions: CommandPaletteActions,
): Promise<CommandPaletteItem[]> {
  const normQuery = normalize(query);
  const items: CommandPaletteItem[] = [];

  // 1. Acciones del Sistema
  const SYSTEM_ACTIONS: Array<{
    id: string;
    title: string;
    subtitle: string;
    iconName: string;
    badge: string;
    keywords: string[];
    onSelect: () => void;
  }> = [
    {
      id: "action-triage",
      title: "Asistente de Triaje Cognitivo (Diagnóstico 30 Métodos)",
      subtitle: "Diagnostica urgencia, material y energía para prescribir tu técnica ideal",
      iconName: "Sparkles",
      badge: "Triaje",
      keywords: ["triaje", "triage", "diagnostico", "asistente", "recomendar", "metodo", "examen"],
      onSelect: () => actions.navigate("/methods?triage=true"),
    },
    {
      id: "action-backup",
      title: "Respaldo y Migración Portable (.studylab-bundle)",
      subtitle: "Exportar o restaurar tu biblioteca universitaria completa con firma SHA-256",
      iconName: "Download",
      badge: "Portabilidad",
      keywords: ["backup", "respaldo", "bundle", "exportar", "restaurar", "zip", "sha256", "migracion"],
      onSelect: () => actions.navigate("/settings"),
    },
    {
      id: "action-dossier",
      title: "Exportar Dossier Universitario Imprimible (PDF/Markdown)",
      subtitle: "Compendio de cátedra con grafo conceptual, fórmulas KaTeX, notas y autoevaluación",
      iconName: "Printer",
      badge: "Dossier",
      keywords: ["dossier", "imprimir", "pdf", "resumen", "compendio", "sintesis", "apuntes", "materia"],
      onSelect: () => actions.navigate("/files?dossier=true"),
    },
    {
      id: "action-qa",
      title: "Consola de Diagnóstico y Verificación QA (/qa)",
      subtitle: "Auditoría en vivo de los 31 subsistemas, algoritmos FSRS y GraphRAG",
      iconName: "ShieldCheck",
      badge: "QA Hub",
      keywords: ["qa", "diagnostico", "verificacion", "auditoria", "test", "sistema"],
      onSelect: () => actions.navigate("/qa"),
    },
    {
      id: "action-ambient",
      title: "Generador de Sonido Ambiente y Ruido Blanco",
      subtitle: "Aislamiento acústico sintetizado con ondas alfa/theta en Web Audio",
      iconName: "Volume2",
      badge: "Audio",
      keywords: ["ambiente", "ambient", "sonido", "ruido blanco", "lluvia", "binaural", "foco"],
      onSelect: () => actions.navigate("/ambient"),
    },
    {
      id: "action-focus",
      title: "Modo Enfoque / Distraction-Free",
      subtitle: "Oculta barras laterales y menús para inmersión profunda de lectura",
      iconName: "Maximize2",
      badge: "Focus",
      keywords: ["enfoque", "focus", "distraction free", "pantalla completa", "lectura"],
      onSelect: () => actions.enterFocusMode?.(),
    },
    {
      id: "action-org",
      title: "Centro de Organización y Fechas Límite",
      subtitle: "Monitoreo de parciales, entregas, exámenes y agenda semanal",
      iconName: "Pin",
      badge: "Organización",
      keywords: ["organizacion", "fechas", "parciales", "examenes", "calendario", "vencimientos"],
      onSelect: () => actions.toggleOrg?.(),
    },
    {
      id: "action-notif",
      title: "Bandeja de Notificaciones y Alertas Académicas",
      subtitle: "Alertas de fatiga cognitiva, repasos pendientes y descansos biológicos",
      iconName: "Bell",
      badge: "Alertas",
      keywords: ["notificaciones", "alertas", "avisos", "campana"],
      onSelect: () => actions.toggleNotif?.(),
    },
    {
      id: "action-theme",
      title: "Alternar Tema Visual (Modo Oscuro / Claro)",
      subtitle: "Cambia la paleta de color y contraste para lectura diurna o nocturna",
      iconName: "Moon",
      badge: "Apariencia",
      keywords: ["tema", "oscuro", "claro", "dark", "light", "modo", "color"],
      onSelect: () => actions.toggleTheme?.(),
    },
    {
      id: "action-session",
      title: "Iniciar Sesión Activa de Estudio",
      subtitle: "Cronómetro pomodoro integrado con telemetría de fatiga y FSRS",
      iconName: "Play",
      badge: "Sesión",
      keywords: ["sesion", "estudiar", "repaso", "pomodoro", "cronometro", "timer"],
      onSelect: () => actions.navigate("/session"),
    },
    {
      id: "action-academic",
      title: "Academic Workspace & Tutor Socrático",
      subtitle: "Ingesta de PDFs universitarios, visor con citas exactas y evaluación conceptual",
      iconName: "GraduationCap",
      badge: "Workspace",
      keywords: ["academic", "tutor", "socratico", "pdf", "citas", "ingesta"],
      onSelect: () => actions.navigate("/academic"),
    },
    {
      id: "action-ocr",
      title: "Digitalización de Apuntes OCR",
      subtitle: "Reconocimiento óptico de caracteres en imágenes y PDFs escaneados",
      iconName: "ScanText",
      badge: "Herramientas",
      keywords: ["ocr", "escanear", "digitalizar", "apuntes", "fotos", "texto"],
      onSelect: () => actions.navigate("/ocr"),
    },
    {
      id: "action-books",
      title: "Escanear Libros y Separación de Capítulos",
      subtitle: "Identificación automática de índices y segmentación de tomos",
      iconName: "Library",
      badge: "Herramientas",
      keywords: ["libros", "books", "capitulos", "separar", "indice", "tomos"],
      onSelect: () => actions.navigate("/books"),
    },
    {
      id: "action-dossier",
      title: "Exportar Dossier Universitario Imprimible (A4 / MD / HTML)",
      subtitle: "Compila apuntes, conceptos, subrayados, post-its y banco de errores por materia",
      iconName: "Printer",
      badge: "Dossier",
      keywords: ["dossier", "imprimir", "pdf", "resumen", "compendio", "sintesis", "apuntes", "materia"],
      onSelect: () => actions.navigate("/files?dossier=true"),
    },
    {
      id: "action-cram",
      title: "Modo Repaso Rápido de Emergencia (Cram Blitz Pre-Examen)",
      subtitle: "Evocación acelerada de conceptos vulnerables y errores sin alterar intervalos FSRS",
      iconName: "Flame",
      badge: "Emergencia",
      keywords: ["cram", "emergencia", "blitz", "repaso rapido", "examen", "parcial", "manana", "urgente", "prueba"],
      onSelect: () => actions.navigate("/methods?run=cram"),
    },
    {
      id: "action-oral-defense",
      title: "Simulador de Coloquios y Exámenes Orales",
      subtitle: "Entrena exposiciones de cátedra con contra-preguntas docentes y rúbrica sobre 10",
      iconName: "Mic",
      badge: "Coloquio",
      keywords: ["oral", "coloquio", "defensa", "tesis", "examen final", "tribunal", "discurso", "presentacion", "hablar"],
      onSelect: () => actions.navigate("/methods?run=oral-defense"),
    },
    {
      id: "action-biometrics",
      title: "Telemetría Biométrica & Pulso Cardíaco BLE",
      subtitle: "Monitoreo en vivo de BPM y HRV para detectar fatiga cognitiva y estrés pre-examen",
      iconName: "Heart",
      badge: "Biometría",
      keywords: ["biometria", "pulso", "corazon", "cardiaco", "hrv", "ble", "bluetooth", "estres", "box breathing", "respiracion"],
      onSelect: () => actions.navigate("/context"),
    },
    {
      id: "action-consistency-heatmap",
      title: "Matriz Anual de Consistencia Cognitiva",
      subtitle: "Mapa de calor de 52 semanas (365 días) con densidad de horas, rachas y repasos",
      iconName: "Calendar",
      badge: "Métricas",
      keywords: ["heatmap", "consistencia", "racha", "365", "mapa de calor", "anual", "calendario", "habito"],
      onSelect: () => actions.navigate("/"),
    },
    {
      id: "action-retention-forecast",
      title: "Pronóstico de Retención a 365 Días (FSRS)",
      subtitle: "Simulación de curva de olvido R(t, S), umbrales de seguridad y fecha de refuerzo",
      iconName: "TrendingUp",
      badge: "FSRS",
      keywords: ["retencion", "pronostico", "curva de olvido", "forecast", "memoria", "estabilidad", "examen final", "365"],
      onSelect: () => actions.navigate("/"),
    },
    {
      id: "action-essay-exam",
      title: "Simulador de Exámenes a Desarrollo y Ensayos",
      subtitle: "Redacción bajo tiempo con rúbrica universitaria de 4 dimensiones y detector de humo",
      iconName: "FileText",
      badge: "Ensayo",
      keywords: ["desarrollo", "ensayo", "escrito", "parcial", "redaccion", "rubrica", "humo", "tesis", "consigna"],
      onSelect: () => actions.navigate("/methods?run=essay-exam"),
    },
    {
      id: "action-comparative-matrix",
      title: "Matriz Comparativa y Despiece Teórico",
      subtitle: "Despiece multidimensional de escuelas/autores con active recall a celdas ciegas",
      iconName: "Columns3",
      badge: "Matriz",
      keywords: ["comparativa", "matriz", "autores", "teorias", "diferencial", "cuadro", "ciegas", "despiece"],
      onSelect: () => actions.navigate("/methods?run=comparative-matrix"),
    },
    {
      id: "action-case-study",
      title: "Simulador de Casos Prácticos y Viñetas Clínicas / Legales",
      subtitle: "Resolución progresiva de viñetas con costo de pruebas (Navaja de Ockham) y gold standard",
      iconName: "Briefcase",
      badge: "Casos",
      keywords: ["caso", "clinico", "vinetas", "medicina", "derecho", "ingenieria", "ockham", "diagnostico", "juicio"],
      onSelect: () => actions.navigate("/methods?run=case-study"),
    },
    {
      id: "action-semester-gantt",
      title: "Cronograma Dinámico de Cuatrimestre y Diagrama de Gantt",
      subtitle: "Planificación de 16 semanas, balance de horas de estudio y alerta de semanas de colapso",
      iconName: "CalendarDays",
      badge: "Gantt",
      keywords: ["cronograma", "gantt", "cuatrimestre", "parciales", "fechas", "calendario", "recuperatorios", "colapso", "semanas"],
      onSelect: () => actions.navigate("/methods?run=semester-gantt"),
    },
    {
      id: "action-past-exams",
      title: "Banco de Parciales Anteriores & Predictor Pareto High-Yield",
      subtitle: "Analizar exámenes de cátedra, recurrencia 80/20 y simulacros",
      iconName: "GraduationCap",
      badge: "Parciales",
      keywords: ["parciales", "examenes", "pareto", "high yield", "simulacro", "banco", "catedra", "preguntas"],
      onSelect: () => actions.navigate("/methods?run=past-exams"),
    },
    {
      id: "action-local-ai",
      title: "Tutor IA Local & Puente Ollama",
      subtitle: "Tutor socrático, generador de parciales y evaluación con modelos locales",
      iconName: "Bot",
      badge: "IA Local",
      keywords: ["ollama", "ia", "ai", "local", "socratico", "llama", "mistral", "gemma", "tutor", "offline"],
      onSelect: () => actions.navigate("/methods?run=local-ai"),
    },
    {
      id: "action-audio-flashcards",
      title: "Audio Flashcards & Podcast Universitario",
      subtitle: "Evocación activa manos libres, pausas de reflexión y modo caminata",
      iconName: "Headphones",
      badge: "Audio",
      keywords: ["audio", "flashcards", "podcast", "caminata", "walking", "recall", "voz", "manos libres", "bluetooth"],
      onSelect: () => actions.navigate("/methods?run=audio-flashcards"),
    },
    {
      id: "action-final-board",
      title: "Tribunal de Examen Final & Defensa de Tesis",
      subtitle: "Simulador de jurado colegiado multidocente y emisión de Acta Oficial",
      iconName: "Scale",
      badge: "Tribunal",
      keywords: ["tribunal", "coloquio", "final", "tesis", "defensa", "jurado", "catedra", "acta", "oral"],
      onSelect: () => actions.navigate("/methods?run=final-board"),
    },
    {
      id: "action-math-blackboard",
      title: "Pizarra Matemática & Demostración Paso a Paso",
      subtitle: "Evocación ciega de deducciones teóricas, justificación formal y render KaTeX",
      iconName: "Binary",
      badge: "Matemática",
      keywords: ["matematica", "pizarra", "teoremas", "demostracion", "katex", "latex", "formulas", "nyquist", "calculo", "euler", "svd"],
      onSelect: () => actions.navigate("/methods?run=math-blackboard"),
    },
  ];

  // Evaluar Acciones del Sistema
  for (const act of SYSTEM_ACTIONS) {
    let score = 0;
    if (!normQuery) {
      score = 50;
    } else {
      const normTitle = normalize(act.title);
      const normSub = normalize(act.subtitle);
      if (normTitle.startsWith(normQuery)) score = 100;
      else if (normTitle.includes(normQuery)) score = 80;
      else if (act.keywords.some((kw) => normalize(kw).includes(normQuery))) score = 70;
      else if (normSub.includes(normQuery)) score = 40;
    }

    if (score > 0) {
      items.push({
        id: act.id,
        title: act.title,
        subtitle: act.subtitle,
        category: "actions",
        categoryLabel: "Acción",
        iconName: act.iconName,
        badge: act.badge,
        score,
        onSelect: act.onSelect,
      });
    }
  }

  // 2. Métodos de Estudio del Catálogo (30 Métodos)
  for (const method of STUDY_METHODS_30_SEEDS) {
    let score = 0;
    const normName = normalize(method.name);
    const normEn = method.nameEn ? normalize(method.nameEn) : "";
    const normDesc = normalize(method.description);
    const normCat = normalize(method.category);
    const bestForJoined = method.bestFor.map(normalize).join(" ");

    if (!normQuery) {
      // Métodos principales en consulta vacía
      if (["feynman", "active-recall", "spaced-repetition", "pomodoro", "blurting", "leitner"].includes(method.id)) {
        score = 60;
      }
    } else {
      if (normName.startsWith(normQuery)) score = 120;
      else if (normName.includes(normQuery)) score = 95;
      else if (normEn.includes(normQuery)) score = 85;
      else if (normCat.includes(normQuery)) score = 75;
      else if (bestForJoined.includes(normQuery)) score = 65;
      else if (normDesc.includes(normQuery)) score = 45;
    }

    if (score > 0) {
      items.push({
        id: `method-${method.id}`,
        title: method.name,
        subtitle: method.nameEn ? `${method.nameEn} • ${method.description.slice(0, 75)}...` : method.description.slice(0, 90),
        category: "methods",
        categoryLabel: "Método",
        iconName: "BookOpen",
        badge: method.category.toUpperCase(),
        score,
        onSelect: () => actions.navigate(`/methods?run=${method.id}`),
      });
    }
  }

  // 3. Documentos y Archivos PDF en Dexie
  if (typeof indexedDB !== "undefined") {
    try {
      const files = await db.files.toArray();
      for (const file of files) {
        let score = 0;
        const normFileName = normalize(file.name);

        if (!normQuery) {
          score = 20;
        } else {
          if (normFileName.startsWith(normQuery)) score = 110;
          else if (normFileName.includes(normQuery)) score = 85;
        }

        if (score > 0) {
          items.push({
            id: `file-${file.id}`,
            title: file.name,
            subtitle: `Documento PDF • ${Math.round((file.size || 0) / 1024)} KB`,
            category: "files",
            categoryLabel: "Archivo",
            iconName: "FileText",
            badge: file.ocrStatus ? `OCR:${file.ocrStatus}` : "PDF",
            score,
            onSelect: () => actions.navigate(`/pdf?fileId=${file.id}`),
          });
        }
      }
    } catch (err) {
      console.warn("No se pudieron cargar archivos para la paleta de comandos:", err);
    }

    // 4. Proyectos del Motor de Contexto
    try {
      if (db.contextProjects) {
        const projects = await db.contextProjects.toArray();
        for (const proj of projects) {
          let score = 0;
          const normProjName = normalize(proj.name);
          const normProjDesc = proj.description ? normalize(proj.description) : "";

          if (!normQuery) {
            score = 30;
          } else {
            if (normProjName.startsWith(normQuery)) score = 115;
            else if (normProjName.includes(normQuery)) score = 90;
            else if (normProjDesc.includes(normQuery)) score = 50;
          }

          if (score > 0) {
            items.push({
              id: `proj-${proj.id}`,
              title: proj.name,
              subtitle: `Proyecto de Contexto • ${proj.unitCount} unidades • ${proj.totalEstimatedHours}h estimadas`,
              category: "projects",
              categoryLabel: "Proyecto",
              iconName: "Compass",
              badge: proj.status.toUpperCase(),
              score,
              onSelect: () => actions.navigate(`/context?project=${proj.id}`),
            });
          }
        }
      }
    } catch (err) {
      console.warn("No se pudieron cargar proyectos para la paleta de comandos:", err);
    }

    // 5. Conceptos del Grafo de Conocimiento
    try {
      if (db.concepts) {
        const concepts = await db.concepts.toArray();
        for (const c of concepts) {
          let score = 0;
          const normCName = normalize(c.name);
          const normCDesc = normalize(c.description || "");

          if (!normQuery) {
            // No saturar con todos los conceptos cuando no hay query
            score = 0;
          } else {
            if (normCName.startsWith(normQuery)) score = 105;
            else if (normCName.includes(normQuery)) score = 80;
            else if (normCDesc.includes(normQuery)) score = 40;
          }

          if (score > 0) {
            items.push({
              id: `concept-${c.id}`,
              title: c.name,
              subtitle: `Concepto Grafo • Dominio: ${Math.round((c.masteryScore || 0) * 100)}%`,
              category: "concepts",
              categoryLabel: "Concepto",
              iconName: "Network",
              badge: c.status?.toUpperCase() || "GRAFO",
              score,
              onSelect: () => actions.navigate(`/graph?concept=${c.id}`),
            });
          }
        }
      }
    } catch (err) {
      console.warn("No se pudieron cargar conceptos para la paleta de comandos:", err);
    }
  }

  // Ordenar por score descendente y limitar a los 25 mejores resultados
  items.sort((a, b) => (b.score || 0) - (a.score || 0));
  return items.slice(0, 25);
}
