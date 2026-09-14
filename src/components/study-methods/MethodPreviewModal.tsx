import React from "react";
import { Dialog } from "../ui/Dialog";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import type { MethodCatalogItem } from "../../data/studyMethodsData";
import { Clock, BookOpen, Lightbulb, Play, ArrowRight, CheckCircle2 } from "lucide-react";

export interface MethodPreviewModalProps {
  method: MethodCatalogItem | null;
  onClose: () => void;
  onStartMethod: (methodId: MethodCatalogItem["id"]) => void;
}

export const MethodPreviewModal: React.FC<MethodPreviewModalProps> = ({
  method,
  onClose,
  onStartMethod,
}) => {
  if (!method) return null;

  return (
    <Dialog open={!!method} onClose={onClose} title={method.name} className="max-w-2xl">
      <div className="flex flex-col gap-5 text-sm max-h-[75vh] overflow-y-auto pr-1">
        {/* Metatags */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
          <Badge variant="accent">{method.categoryLabel}</Badge>
          <span className="flex items-center gap-1 text-xs text-text-muted">
            <Clock className="h-3 w-3" />
            {method.duration}
          </span>
          <span className="text-xs text-text-muted">• {method.structure}</span>
        </div>

        {/* Respaldo empírico */}
        <div className="rounded border border-accent-primary/20 bg-accent-primary/5 p-3">
          <div className="flex items-center gap-1.5 text-xs font-medium text-accent-primary">
            <BookOpen className="h-3.5 w-3.5 shrink-0" />
            <span>Respaldo Neurocognitivo</span>
          </div>
          <p className="mt-1 font-sans text-xs text-text-secondary leading-relaxed">
            {method.scientificBasis}
          </p>
        </div>

        {/* Qué es */}
        <div>
          <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-1">
            Fundamento y Mecanismo
          </h4>
          <p className="text-text-primary leading-relaxed">{method.whatItIs}</p>
          <p className="mt-2 text-text-secondary text-xs leading-relaxed">{method.whyItWorks}</p>
        </div>

        {/* Protocolo Paso a Paso */}
        <div>
          <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
            Protocolo de la Sesión
          </h4>
          <div className="space-y-2">
            {method.protocolSteps.map((step) => (
              <div
                key={step.step}
                className="flex items-start gap-3 rounded border border-border-subtle bg-bg-secondary/40 p-2.5"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary font-mono text-[11px] font-bold">
                  {step.step}
                </span>
                <div>
                  <h5 className="font-sans text-xs font-medium text-text-primary">{step.title}</h5>
                  <p className="text-[11px] text-text-secondary mt-0.5">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cuándo usar */}
        <div>
          <h4 className="font-serif text-xs font-semibold uppercase tracking-wider text-text-muted mb-1.5">
            Idóneo para
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {method.bestSuitedFor.map((item, idx) => (
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

        {/* Consejo Pro */}
        <div className="rounded border border-warning/20 bg-warning/5 p-3 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <p className="text-xs text-text-secondary leading-relaxed">
            <span className="font-medium text-text-primary">Clave de eficacia:</span> {method.proTip}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
          <Button variant="ghost" onClick={onClose}>
            Volver al Catálogo
          </Button>
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
        </div>
      </div>
    </Dialog>
  );
};
