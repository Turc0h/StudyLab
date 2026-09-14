import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Progress } from "../components/ui/Progress";
import { getStudySessions } from "../lib/db";
import type { StudySession, StudyMethodId } from "../types";
import { Clock, BookOpen, CheckCircle, ArrowRight } from "lucide-react";

interface MethodPreview {
  id: StudyMethodId;
  name: string;
  basis: string;
  duration: string;
}

const METHODS_LIST: MethodPreview[] = [
  { id: "feynman", name: "Técnica Feynman", basis: "Explicación en lenguaje llano", duration: "30 min" },
  { id: "active-recall", name: "Recuperación Activa", basis: "Autoevaluación sin apuntes", duration: "25 min" },
  { id: "spaced-repetition", name: "Repetición Espaciada", basis: "Curva del olvido de Ebbinghaus", duration: "20 min" },
  { id: "pomodoro", name: "Pomodoro Tradicional", basis: "Bloques de 25 min y pausas", duration: "25 min" },
  { id: "interleaving", name: "Práctica Intercalada", basis: "Alternancia de temas afines", duration: "45 min" },
  { id: "mind-maps", name: "Mapas Mentales", basis: "Estructuración jerárquica", duration: "35 min" },
  { id: "sq3r", name: "Método SQ3R", basis: "Survey, Question, Read, Recite, Review", duration: "50 min" },
  { id: "elaborative-interrogation", name: "Interrogación Elaborativa", basis: "Cuestionamiento del porqué", duration: "30 min" },
];

export const DashboardPage: React.FC = () => {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    getStudySessions()
      .then((data) => {
        if (!cancelled) setSessions(data);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalMinutes = sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const targetWeeklyHours = 20;
  const progressRatio = Math.min(100, Math.round((Number(totalHours) / targetWeeklyHours) * 100));

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Editorial Welcome Header */}
      <div className="border-b border-border-subtle pb-6">
        <span className="font-sans text-xs uppercase tracking-wider text-text-muted">
          Cuaderno de Trabajo
        </span>
        <h2 className="mt-1 font-serif text-2xl font-semibold text-text-primary">
          Bienvenido a tu espacio de lectura y estudio
        </h2>
        <p className="mt-2 font-sans text-sm text-text-secondary max-w-2xl leading-relaxed">
          Diseñado para sostener la concentración durante sesiones de 1 a 4 horas sin fatiga visual.
          Elige un método respaldado por evidencia científica para iniciar tu jornada.
        </p>
      </div>

      {/* Clean Metrics (Numbers + Thin Bars, Zero Heavy Charts) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card elevated>
          <span className="font-sans text-xs text-text-muted">Horas Registradas</span>
          <p className="mt-2 font-serif text-3xl font-semibold text-text-primary">
            {totalHours} <span className="text-base font-sans font-normal text-text-secondary">hrs</span>
          </p>
          <div className="mt-3">
            <div className="mb-1 flex justify-between text-[11px] font-sans text-text-muted">
              <span>Objetivo semanal</span>
              <span>{progressRatio}%</span>
            </div>
            <Progress value={progressRatio} />
          </div>
        </Card>

        <Card elevated>
          <span className="font-sans text-xs text-text-muted">Sesiones Realizadas</span>
          <p className="mt-2 font-serif text-3xl font-semibold text-text-primary">
            {sessions.length}
          </p>
          <div className="mt-3 flex items-center gap-1 text-[11px] font-sans text-text-muted">
            <CheckCircle className="h-3.5 w-3.5 text-accent-secondary" />
            <span>Persistido 100% en IndexedDB local</span>
          </div>
        </Card>

        <Card elevated>
          <span className="font-sans text-xs text-text-muted">Métodos Activos</span>
          <p className="mt-2 font-serif text-3xl font-semibold text-text-primary">8</p>
          <div className="mt-3 text-[11px] font-sans text-text-secondary">
            Protocolos con base empírica
          </div>
        </Card>
      </div>

      {/* Quick Access to Methods */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="font-serif text-lg font-semibold text-text-primary">
              Métodos de Estudio
            </h3>
            <p className="text-xs text-text-muted">Selecciona una técnica para iniciar una sesión guiada</p>
          </div>
          <Link to="/methods">
            <Button variant="outline" size="sm" className="gap-1 text-xs">
              <span>Ver catálogo</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {METHODS_LIST.map((m) => (
            <Link key={m.id} to={`/methods?run=${m.id}`} className="block group">
              <Card elevated className="h-full flex flex-col justify-between group-hover:border-accent-primary">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="accent">{m.duration}</Badge>
                    <Clock className="h-3.5 w-3.5 text-text-muted group-hover:text-accent-primary" />
                  </div>
                  <h4 className="font-serif text-base font-semibold text-text-primary mb-1">
                    {m.name}
                  </h4>
                  <p className="font-sans text-xs text-text-secondary leading-relaxed">
                    {m.basis}
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1 font-sans text-xs font-medium text-accent-primary group-hover:underline">
                  Iniciar sesión <ArrowRight className="h-3 w-3" />
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Study Sessions Table */}
      <div>
        <Card elevated>
          <CardHeader>
            <CardTitle>Historial Reciente</CardTitle>
            <span className="text-xs text-text-muted">Tus últimas sesiones de estudio registradas</span>
          </CardHeader>

          {loading ? (
            <p className="py-6 text-center font-sans text-xs text-text-muted">Cargando sesiones...</p>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center font-sans">
              <BookOpen className="mx-auto h-8 w-8 text-text-muted opacity-60 mb-2" />
              <p className="text-sm text-text-secondary">Aún no hay sesiones registradas.</p>
              <p className="text-xs text-text-muted mt-1">Inicia una sesión con cualquier método arriba.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-sans text-xs">
                <thead>
                  <tr className="border-b border-border-subtle text-text-muted">
                    <th className="py-2.5 font-medium">Método</th>
                    <th className="py-2.5 font-medium">Materia / Tema</th>
                    <th className="py-2.5 font-medium">Duración</th>
                    <th className="py-2.5 font-medium text-right">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {sessions.slice(0, 5).map((s) => (
                    <tr key={s.id} className="text-text-primary">
                      <td className="py-3 font-medium capitalize">
                        {s.methodId.replace("-", " ")}
                      </td>
                      <td className="py-3 text-text-secondary">
                        {s.subject} {s.topic ? `— ${s.topic}` : ""}
                      </td>
                      <td className="py-3">
                        <Badge variant="neutral">{s.durationMinutes} min</Badge>
                      </td>
                      <td className="py-3 text-right text-text-muted">
                        {new Date(s.completedAt).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
