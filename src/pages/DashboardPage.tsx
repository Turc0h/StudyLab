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
} from "lucide-react";
import { StudyTipsWidget } from "../components/study-tips/StudyTipsWidget";
import { CourseProgressCard } from "../components/progress/CourseProgressCard";
import { DailyStudyRecommendationCard } from "../features/study-engine/components/DailyStudyRecommendationCard";

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

export const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    let cancelled = false;
    getStudySessions().then((data) => {
      if (!cancelled) setSessions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const targetWeeklyHours = 20;
  const progressRatio = Math.min(100, Math.round((Number(totalHours) / targetWeeklyHours) * 100));

  const todayString = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex flex-col gap-6 pb-12 w-full">
      {/* Header Ejecutivo del HUB */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-sans text-text-muted capitalize">
            <Calendar className="h-3.5 w-3.5" />
            <span>{todayString}</span>
            <span>•</span>
            <span className="text-accent-secondary font-medium">Entorno Académico Activo</span>
          </div>
          <h2 className="mt-1 font-serif text-2xl md:text-3xl font-semibold text-text-primary tracking-tight">
            Hub de Estudio y Gestión de Cátedras
          </h2>
          <p className="mt-1 font-sans text-xs md:text-sm text-text-secondary max-w-3xl">
            Espacio de trabajo unificado para lectura profunda, digitalización de apuntes físicos y aplicación de técnicas cognitivas sin fatiga visual.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/session">
            <Button variant="primary" size="md" className="gap-2 text-xs font-semibold shadow-xs">
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Iniciar Sesión de Estudio</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Fila Superior: Métricas Clave Limpias (Sin gráficos pesados) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Horas de Estudio</span>
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
            <span className="font-sans text-xs text-text-muted">Sesiones Totales</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          </div>
          <div className="mt-2">
            <span className="font-serif text-2xl md:text-3xl font-semibold text-text-primary">
              {sessions.length}
            </span>
            <span className="ml-1 text-xs font-sans text-text-muted">bloques</span>
          </div>
          <div className="mt-2 text-[11px] font-sans text-text-muted">
            Guardado localmente en IndexedDB
          </div>
        </Card>

        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Objetivo Semanal</span>
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

        <Card elevated className="p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-muted">Métodos con Respaldo</span>
            <BookOpen className="h-3.5 w-3.5 text-accent-secondary" />
          </div>
          <div className="mt-2">
            <span className="font-serif text-2xl md:text-3xl font-semibold text-text-primary">
              8
            </span>
            <span className="ml-1 text-xs font-sans text-text-muted">técnicas</span>
          </div>
          <div className="mt-2 text-[11px] font-sans text-text-muted">
            Feynman, Active Recall, Pomodoro...
          </div>
        </Card>
      </div>

      {/* Cognitive OS v5.0: Recomendación Diaria Adaptativa "¿Qué debería estudiar hoy y por qué?" */}
      <DailyStudyRecommendationCard />

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
              <Link to="/methods">
                <Button variant="outline" size="sm" className="gap-1 text-xs">
                  <span>Ver las 8 técnicas</span>
                  <ArrowRight className="h-3 w-3" />
                </Button>
              </Link>
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
            <CardTitle className="text-sm border-b border-border-subtle pb-2.5">
              Herramientas de Estudio Rápido
            </CardTitle>

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
    </div>
  );
};
