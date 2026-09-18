import React from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { StudyMethod } from "../../db/db";
import { BookOpen, Play, ArrowRight, CheckCircle2, Layers, Cpu, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface MethodPreviewModalProps {
  method: StudyMethod | null;
  onClose: () => void;
  onStartMethod: (methodId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  memorizacion: "Memorización & Evocación",
  comprension: "Comprensión & Síntesis",
  "gestion-tiempo": "Gestión del Tiempo",
  escritura: "Toma de Notas & Escritura",
  evaluacion: "Evaluación & Desafío",
  metacognicion: "Metacognición & Estrategia",
};

export const MethodPreviewModal: React.FC<MethodPreviewModalProps> = ({
  method,
  onClose,
  onStartMethod,
}) => {
  const navigate = useNavigate();
  if (!method) return null;

  const categoryLabel = CATEGORY_LABELS[method.category] || method.category;

  const handleContextualAction = (target: "fsrs" | "pomodoro-timer" | "session-engine" | "knowledge-graph") => {
    onClose();
    switch (target) {
      case "fsrs":
        navigate("/session?deck=default");
        break;
      case "knowledge-graph":
        navigate("/graph");
        break;
      case "pomodoro-timer":
        onStartMethod("pomodoro");
        break;
      case "session-engine":
        onStartMethod(method.id);
        break;
    }
  };

  return (
    <Dialog open={!!method} onClose={onClose} title={method.name} className="max-w-2xl">
      <div className="flex flex-col gap-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
        {/* Metatags */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
          <Badge variant="accent">{categoryLabel}</Badge>
          {method.nameEn && (
            <span className="text-xs text-text-muted italic">({method.nameEn})</span>
          )}
          {method.implemented ? (
            <Badge variant="success">Listo para Usar</Badge>
          ) : (
            <Badge variant="neutral">Ficha Informativa / Próximamente</Badge>
          )}
        </div>

        {/* Respaldo empírico */}
        {method.scientificBasis && (
          <div className="rounded border border-accent-primary/20 bg-accent-primary/5 p-3">
            <div className="flex items-center gap-1.5 text-xs font-medium text-accent-primary">
              <BookOpen className="h-3.5 w-3.5 shrink-0" />
              <span>Respaldo Neurocognitivo</span>
            </div>
            <p className="mt-1 font-sans text-xs text-text-secondary leading-relaxed">
              {method.scientificBasis}
            </p>
          </div>
        )}

        {/* Descripción / Qué es */}
        <div>
          <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Fundamento y Mecanismo
          </h4>
          <p className="text-text-primary leading-relaxed text-sm">{method.description}</p>
        </div>

        {/* Protocolo Paso a Paso (howTo) */}
        <div>
          <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Protocolo de Aplicación ({method.howTo.length} pasos)
          </h4>
          <div className="space-y-2">
            {method.howTo.map((stepDesc, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded border border-border-subtle bg-bg-secondary/40 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary font-mono text-[11px] font-bold">
                  {idx + 1}
                </span>
                <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{stepDesc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Idóneo para (bestFor) */}
        {method.bestFor && method.bestFor.length > 0 && (
          <div>
            <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
              Idóneo para
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {method.bestFor.map((item, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 rounded bg-bg-secondary px-2.5 py-1 text-xs text-text-secondary border border-border-subtle"
                >
                  <CheckCircle2 className="h-3 w-3 text-accent-secondary" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Integraciones contextuales */}
        {method.integratesWith && method.integratesWith.length > 0 && (
          <div className="rounded border border-border-subtle bg-bg-secondary/30 p-3">
            <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-accent-primary" />
              <span>Conexión con el Sistema StudyLab</span>
            </h4>
            <div className="flex flex-wrap gap-2">
              {method.integratesWith.includes("fsrs") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleContextualAction("fsrs")}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Cpu className="h-3 w-3 text-accent-primary" />
                  <span>Usar con FSRS v4.5</span>
                </Button>
              )}
              {method.integratesWith.includes("knowledge-graph") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleContextualAction("knowledge-graph")}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Layers className="h-3 w-3 text-accent-primary" />
                  <span>Ver en Grafo de Conceptos</span>
                </Button>
              )}
              {method.integratesWith.includes("pomodoro-timer") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleContextualAction("pomodoro-timer")}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Clock className="h-3 w-3 text-accent-primary" />
                  <span>Lanzar Temporizador</span>
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-border-subtle">
          <Button variant="ghost" onClick={onClose}>
            Volver al Catálogo
          </Button>

          {method.implemented ? (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onStartMethod(method.id);
              }}
              className="flex items-center gap-2"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Iniciar Sesión con este Método</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <span className="text-xs text-text-muted italic">
              Ficha teórica completa cargada en el sistema
            </span>
          )}
        </div>
      </div>
    </Dialog>
  );
};
