import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Progress } from "../components/ui/Progress";
import { getStudySessions } from "../lib/db";
import type { StudySession, StudyMethodId } from "../types";
import {
  Clock,
  BookOpen,
  CheckCircle2,
  ArrowRight,
  Play,
  FileText,
  ScanText,
  Library,
  Volume2,
  Flame,
  Calendar,
  Activity,
  GraduationCap,
  CalendarDays,
  BrainCircuit,
  PenTool,
} from "lucide-react";
import { Dashboard as TelemetryDashboard } from "./Dashboard";
import { StudyTipsWidget } from "../components/study-tips/StudyTipsWidget";
import { CourseProgressCard } from "../components/progress/CourseProgressCard";
import { DailyStudyRecommendationCard } from "../features/study-engine/components/DailyStudyRecommendationCard";
import { PanelGuide } from "../components/guide/PanelGuide";
import { OnboardingWelcomeCard } from "../components/onboarding/OnboardingWelcomeCard";
import { Skeleton, SkeletonText } from "../components/ui/Skeleton";
import { motion, AnimatePresence } from "motion/react";
import { DURATION, EASE_EXPO_OUT } from "../lib/motion-tokens";

interface MethodPreview {
  id: StudyMethodId;
  name: string;
  basis: string;
  duration: string;
  tag: string;
}

const FEATURED_METHODS: MethodPreview[] = [
  {
    id: "feynman",
    name: "Técnica Feynman",
    basis: "Explicación en lenguaje llano sin tecnicismos",
    duration: "30 min",
    tag: "Comprensión profunda",
  },
  {
    id: "active-recall",
    name: "Recuperación Activa",
    basis: "Autoevaluación deliberada sin mirar apuntes",
    duration: "25 min",
    tag: "Retención máxima",
  },
  {
    id: "pomodoro",
    name: "Pomodoro Tradicional",
    basis: "Bloques de 25 min y pausas fisiológicas",
    duration: "25 min",
    tag: "Resistencia a la fatiga",
  },
  {
    id: "interleaving",
    name: "Práctica Intercalada",
    basis: "Alternancia de temas afines en un mismo bloque",
    duration: "45 min",
    tag: "Razonamiento cruzado",
  },
];

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-12 w-full motion-layer">
      {/* Header Ejecutivo Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div className="flex flex-col gap-2 max-w-xl">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-8 w-80" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <Skeleton className="h-9 w-44 rounded-md" />
        </div>
      </div>

      {/* Métricas Header Skeleton */}
      <div className="flex items-center justify-between px-1">
        <Skeleton className="h-3 w-36" />
      </div>

      {/* Métricas Grid Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 flex flex-col gap-3 shadow-2xs">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 flex flex-col gap-3 shadow-2xs">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 flex flex-col gap-4 shadow-2xs">
            <Skeleton className="h-6 w-48" />
            <SkeletonText lines={3} />
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 flex flex-col gap-4 shadow-2xs">
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Skeleton className="h-24 rounded-lg" />
              <Skeleton className="h-24 rounded-lg" />
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <div className="rounded-lg border border-border-subtle bg-bg-elevated p-5 flex flex-col gap-4 shadow-2xs">
            <Skeleton className="h-6 w-36" />
            <SkeletonText lines={4} />
          </div>
        </div>
      </div>
    </div>
  );
}

export const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hub" | "telemetry">("hub");

  useEffect(() => {
    let cancelled = false;
    // Timeout de seguridad: nunca dejar la pantalla bloqueada en gris por más de 500ms
    const safetyTimer = setTimeout(() => {
      if (!cancelled) {
        setIsLoading(false);
      }
    }, 500);

    getStudySessions()
      .then((data) => {
        if (!cancelled) {
          setSessions(data || []);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        console.warn("[DashboardPage] Fallback por error al cargar sesiones:", err);
        if (!cancelled) {
          setSessions([]);
          setIsLoading(false);
        }
      })
      .finally(() => {
        clearTimeout(safetyTimer);
      });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
    };
  }, []);

  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weeklySessions = sessions.filter((session) => session.completedAt >= weekStart.getTime());
  const totalMinutes = weeklySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const targetWeeklyHours = 20;
  const progressRatio = Math.min(100, Math.round((Number(totalHours) / targetWeeklyHours) * 100));

  const todayString = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <motion.div
          key="skeleton"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: DURATION.fast, ease: EASE_EXPO_OUT }}
        >
          <DashboardSkeleton />
        </motion.div>
      ) : (
        <motion.div
          key="content"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: DURATION.fast, ease: EASE_EXPO_OUT }}
          className="flex flex-col gap-6 pb-12 w-full motion-layer"
        >
      {/* Header Ejecutivo del HUB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-sans text-text-muted capitalize">
            <Calendar className="h-3.5 w-3.5" />
            <span>{todayString}</span>
            <span>•</span>
            <span className="text-accent-secondary font-medium">Semana universitaria</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
            Tu vida universitaria, en orden.
          </h2>
          <p className="mt-1 font-sans text-xs md:text-sm text-text-secondary max-w-3xl">
            Materias, apuntes, estudio y fechas importantes. Todo empieza acá.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <PanelGuide
            id="dashboard-overview"
            title="Panel Principal (Dashboard)"
            whatItDoes="Tu inicio para revisar el estudio de la semana y abrir las herramientas principales."
            howToUse={[
              "Revisá el tiempo y las sesiones registradas esta semana.",
              "Usá los accesos rápidos para ir a tus materias, métodos, agenda o pizarra.",
              "Iniciá una sesión para registrar un bloque de estudio.",
            ]}
            tip="Todos los datos de sesiones se guardan localmente en IndexedDB: no dependés de internet para estudiar."
          />
          <Link to="/session">
            <Button variant="primary" size="md" className="gap-2 text-xs font-semibold shadow-xs">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Empezar una sesión</span>
            </Button>
          </Link>
        </div>
      </div>

      <section aria-label="Accesos rápidos" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { to: "/academic", icon: BrainCircuit, title: "Espacio de estudio", description: "Leer, anotar y trabajar con tus materiales" },
          { to: "/methods", icon: GraduationCap, title: "Encontrar un método", description: "Elegir cómo estudiar este tema" },
          { to: "/calendar", icon: CalendarDays, title: "Organizar la semana", description: "Clases, parciales y entregas" },
          { to: "/blackboard", icon: PenTool, title: "Abrir la pizarra", description: "Resolver y desarrollar ideas" },
        ].map(({ to, icon: Icon, title, description }) => (
          <Link key={to} to={to} className="group flex min-h-[94px] items-start gap-3 rounded-2xl border border-border-subtle/90 bg-bg-elevated/80 p-4 shadow-xs transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-accent-primary/40 hover:bg-bg-elevated">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary transition-colors group-hover:bg-accent-primary group-hover:text-bg-primary">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-text-primary">{title}</span>
              <span className="mt-1 block text-[11px] leading-4 text-text-muted">{description}</span>
            </span>
          </Link>
        ))}
      </section>

      {/* Selector de Pestañas Universitario */}
      <div className="flex items-center gap-1.5 p-1 rounded-lg border border-border-hairline bg-bg-surface-2 self-start">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-sans transition-colors cursor-pointer ${
            activeTab === "hub"
              ? "bg-bg-surface-1 text-text-primary shadow-xs font-medium"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Inicio</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("telemetry")}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-sans transition-colors cursor-pointer ${
            activeTab === "telemetry"
              ? "bg-bg-surface-1 text-text-primary shadow-xs font-medium"
              : "text-text-muted hover:text-text-primary"
          }`}
        >
          <Activity className="h-3.5 w-3.5" />
          <span>Progreso</span>
        </button>
      </div>

      {activeTab === "telemetry" ? (
        <TelemetryDashboard />
      ) : (
        <>
          {/* Onboarding para estudiantes nuevos sin datos */}
          <OnboardingWelcomeCard />

          <DailyStudyRecommendationCard />

          {/* Fila Superior: Métricas Clave Limpias (Sin gráficos pesados) */}
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-xs text-text-tertiary">
              Tu semana hasta ahora
            </span>
        <PanelGuide
          id="study-metrics"
          title="Resumen de estudio semanal"
          whatItDoes="Muestra el tiempo y las sesiones registradas durante esta semana."
          howToUse={[
            "Tiempo de estudio: duración acumulada de tus sesiones esta semana.",
            "Sesiones completadas: bloques de estudio registrados esta semana.",
              "Objetivo semanal: avance respecto de una meta de referencia de 20 horas.",
          ]}
          tip="Ajusta la meta semanal a tu carga real de cursada para que el progreso te resulte útil."
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Tiempo de estudio</span>
            <Clock className="h-3.5 w-3.5 text-accent-primary" />
          </div>
          <div className="mt-2">
            <span className="font-serif text-2xl md:text-3xl font-semibold text-text-primary">
              {totalHours}
            </span>
            <span className="ml-1 text-xs font-sans text-text-muted">horas</span>
          </div>
          <div className="mt-2 text-[11px] font-sans text-text-muted">
            Meta semanal: {targetWeeklyHours}h ({progressRatio}%)
          </div>
        </Card>

        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Sesiones completadas</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </div>
          <div className="mt-2">
            <span className="font-serif text-2xl md:text-3xl font-semibold text-text-primary">
              {weeklySessions.length}
            </span>
            <span className="ml-1 text-xs font-sans text-text-muted">bloques</span>
          </div>
          <div className="mt-2 text-[11px] font-sans text-text-muted">
            Esta semana
          </div>
        </Card>

        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Objetivo semanal</span>
            <Flame className="h-3.5 w-3.5 text-warning" />
          </div>
          <div className="mt-2">
            <span className="font-serif text-2xl md:text-3xl font-semibold text-text-primary">
              {progressRatio}%
            </span>
          </div>
          <div className="mt-2">
            <Progress value={progressRatio} />
          </div>
        </Card>

      </div>

      {/* Grid Principal Fluid: 2 Columnas Responsivas (Desktop: 7 col / 5 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda (7 cols): Cátedras y Métodos de Estudio */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Tracker de Progreso de Lectura de Cátedras */}
          <CourseProgressCard />

          {/* Métodos de Estudio Destacados */}
          <Card elevated className="p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <CardTitle className="text-base">Métodos de Estudio Guiados</CardTitle>
                <span className="font-sans text-xs text-text-muted">
                  Selecciona una técnica empírica para iniciar tu sesión
                </span>
              </div>
              <div className="flex items-center gap-2">
                <PanelGuide
                  id="featured-methods-guide"
                  title="Métodos de Estudio Guiados"
                  whatItDoes="Técnicas activas que estructuran tu estudio con temporizadores y protocolos específicos según el tipo de materia."
                  howToUse={[
                    "Técnica Feynman: Para conceptos difíciles; te pide explicarlos en palabras simples y detecta lagunas.",
                    "Active Recall: Oculta el documento y te fuerza a recuperar la información de memoria.",
                    "Pomodoro: 4 ciclos de 25 min de foco + 5 min de descanso para no agotarte.",
                    "Práctica Intercalada: Para alternar temas y mejorar la discriminación de problemas.",
                  ]}
          tip="Abrí el catálogo para explorar los métodos disponibles y encontrar uno adecuado para tu tarea."
                />
                <Link to="/methods">
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <span>Ver todos los métodos</span>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURED_METHODS.map((method) => (
                <Link
                  key={method.id}
                  to={`/session?method=${method.id}`}
                  className="group p-3.5 rounded-lg border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated hover:border-accent-primary/50 transition-all flex flex-col justify-between gap-2 shadow-2xs"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="font-serif text-sm font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                        {method.name}
                      </span>
                      <Badge variant="neutral" className="text-[10px] shrink-0">
                        {method.duration}
                      </Badge>
                    </div>
                    <p className="font-sans text-xs text-text-muted mt-1 line-clamp-2">
                      {method.basis}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border-subtle/60 text-[11px] font-sans">
                    <span className="text-accent-secondary font-medium">{method.tag}</span>
                    <span className="text-accent-primary flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Iniciar</span>
                      <ArrowRight className="h-2.5 w-2.5" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </Card>
        </div>

        {/* Columna Derecha (5 cols): Psicología del Estudio y Acciones Rápidas */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Widget de Tips y Curiosidades Pedagógicas */}
          <StudyTipsWidget />

          {/* Accesos Rápidos de Herramientas Académicas */}
          <Card elevated className="p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-border-subtle pb-2.5">
              <CardTitle className="text-sm">
                Herramientas de Estudio Rápido
              </CardTitle>
              <PanelGuide
                id="quick-tools-guide"
                title="Herramientas Especializadas"
                whatItDoes="Módulos dedicados para tareas específicas de procesamiento de textos y concentración."
                howToUse={[
                  "Escanear y Desglosar Libro (/books): Si tenés un PDF de 500+ páginas, lo divide en capítulos individuales para que no sea pesado.",
                  "Anotador de PDF (/pdf): Visor independiente para leer con post-its y subrayados.",
                  "Extracción OCR (/ocr): Convierte fotos o escaneos de apuntes en texto seleccionable.",
                  "Sonido Ambiente (/ambient): Genera ruido blanco o lluvia para aislarte del ruido del ambiente.",
                ]}
                tip="Podés acceder a estas herramientas en cualquier momento desde la barra lateral izquierda."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/books"
                className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-bg-elevated border border-border-subtle flex items-center justify-center text-accent-primary">
                    <Library className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-semibold text-text-primary block">
                      Escanear y Desglosar Libro
                    </span>
                    <span className="font-sans text-[11px] text-text-muted block">
                      Divide libros pesados en capítulos individuales
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-text-muted" />
              </Link>

              <Link
                to="/pdf"
                className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-bg-elevated border border-border-subtle flex items-center justify-center text-accent-primary">
                    <FileText className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-semibold text-text-primary block">
                      Anotador PDF y Lectura por Voz
                    </span>
                    <span className="font-sans text-[11px] text-text-muted block">
                      Subrayados, notas marginales con LaTeX y TTS
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-text-muted" />
              </Link>

              <Link
                to="/ocr"
                className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-bg-elevated border border-border-subtle flex items-center justify-center text-accent-primary">
                    <ScanText className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-semibold text-text-primary block">
                      Digitalización OCR con Fórmulas
                    </span>
                    <span className="font-sans text-[11px] text-text-muted block">
                      Reconoce fotos/escaneos con tipografía KaTeX
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-text-muted" />
              </Link>

              <Link
                to="/ambient"
                className="flex items-center justify-between p-2.5 rounded-md border border-border-subtle bg-bg-secondary/40 hover:bg-bg-elevated hover:border-accent-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded bg-bg-elevated border border-border-subtle flex items-center justify-center text-accent-primary">
                    <Volume2 className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="font-serif text-xs font-semibold text-text-primary block">
                      Sonido Ambiente Acústico
                    </span>
                    <span className="font-sans text-[11px] text-text-muted block">
                      Ruido marrón, lluvia y cafetería sintetizados
                    </span>
                  </div>
                </div>
                <ArrowRight className="h-3 w-3 text-text-muted" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
        </>
      )}
    </motion.div>
  )}
</AnimatePresence>
  );
};
