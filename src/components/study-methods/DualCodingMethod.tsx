import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  ArrowRight, 
  CheckCircle2, 
  Plus, 
  Trash2
} from "lucide-react";

export interface DualCodingMethodProps {
  onSessionFinished?: () => void;
}

interface DiagramElement {
  id: string;
  label: string;
  relationToNext: string;
}

const DEFAULT_ELEMENTS: DiagramElement[] = [
  { id: "e1", label: "Estímulo Sensorial (Retina)", relationToNext: "Señales electroquímicas por N. Óptico" },
  { id: "e2", label: "Núcleo Geniculado Lateral (Tálamo)", relationToNext: "Radiación óptica cortical" },
  { id: "e3", label: "Corteza Visual Primaria (V1 / Estriada)", relationToNext: "Vía dorsal (dónde) y ventral (qué)" },
  { id: "e4", label: "Percepción Consciente y Significado", relationToNext: "" },
];

export const DualCodingMethod: React.FC<DualCodingMethodProps> = ({ onSessionFinished }) => {
  const [conceptTitle, setConceptTitle] = useState<string>("Procesamiento Visual en el Sistema Nervioso");
  
  // Canal Verbal
  const [verbalExplanation, setVerbalExplanation] = useState<string>(
    "La información luminosa incide sobre los fotorreceptores de la retina (conos y bastones), donde se transduce en impulsos nerviosos. Las células ganglionares proyectan sus axones formando el nervio óptico, que decusa parcialmente en el quiasma óptico y hace sinapsis en el núcleo geniculado lateral del tálamo antes de alcanzar el lóbulo occipital en el área 17 de Brodmann."
  );

  // Canal Visual / Espacial
  const [elements, setElements] = useState<DiagramElement[]>(DEFAULT_ELEMENTS);
  const [newElementLabel, setNewElementLabel] = useState<string>("");
  const [newRelation, setNewRelation] = useState<string>("");

  const handleAddElement = () => {
    if (!newElementLabel.trim()) return;
    setElements((prev) => [
      ...prev,
      {
        id: `el_${Date.now()}`,
        label: newElementLabel.trim(),
        relationToNext: newRelation.trim() || "Conecta con",
      },
    ]);
    setNewElementLabel("");
    setNewRelation("");
  };

  const handleRemoveElement = (id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `dualcoding_${Date.now()}`,
      methodId: "dual-coding",
      subject: "Codificación Dual (Paivio)",
      topic: conceptTitle || "Concepto Bimimodal",
      durationMinutes: 30,
      notes: `CONCEPTO: ${conceptTitle}\n\n[CÓDIGO VERBAL]:\n${verbalExplanation}\n\n[CÓDIGO VISUAL / FLUJO]:\n${elements
        .map((el, i) => `${i + 1}. [${el.label}] ${el.relationToNext ? `--> (${el.relationToNext}) -->` : ""}`)
        .join("\n")}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Codificación Dual (Dual Coding Theory)</CardTitle>
            <Badge variant="accent">Allan Paivio • Bi-Canal</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Articula en paralelo la representación verbal (proposicional) y la representación espacial (diagrama) para duplicar los anclajes corticales.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Codificación Dual</span>
        </Button>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-text-primary font-sans">
          Concepto, Sistema o Proceso a Codificar:
        </label>
        <Input
          value={conceptTitle}
          onChange={(e) => setConceptTitle(e.target.value)}
          placeholder="Ej: Cascada de Coagulación, Modelo IS-LM, Ciclo de Krebs..."
        />
      </div>

      {/* Dual Layout: Verbal on Left, Visual on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Columna Izquierda: Código Verbal */}
        <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
              <span className="font-serif text-sm font-bold text-sky-400">
                Canal Verbal (Texto & Proposiciones)
              </span>
              <span className="text-[10px] text-text-muted">Canal lingüístico</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Redacta con rigor la definición formal, relaciones lógicas y terminología exacta.
            </p>
            <Textarea
              rows={12}
              value={verbalExplanation}
              onChange={(e) => setVerbalExplanation(e.target.value)}
              placeholder="Desarrolla el texto explicativo completo..."
              className="mt-3 bg-bg-secondary/70 text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Columna Derecha: Código Visual / Diagrama */}
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 flex flex-col justify-between gap-3">
          <div>
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
              <span className="font-serif text-sm font-bold text-purple-400">
                Canal Visual (Diagrama de Flujo & Nodos)
              </span>
              <span className="text-[10px] text-text-muted">Canal visuoespacial</span>
            </div>
            <p className="text-[11px] text-text-secondary mt-2">
              Convierte las entidades en nodos secuenciales interconectados por trayectorias.
            </p>

            {/* Visual Canvas Rendering */}
            <div className="space-y-2 mt-3 max-h-[300px] overflow-y-auto pr-1">
              {elements.map((el, idx) => (
                <div key={el.id} className="space-y-1">
                  <div className="rounded-lg border border-purple-500/30 bg-bg-elevated p-3 flex items-center justify-between shadow-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 font-mono text-[10px] font-bold text-purple-400">
                        {idx + 1}
                      </span>
                      <strong className="text-xs font-semibold text-text-primary font-serif">
                        {el.label}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveElement(el.id)}
                      className="text-text-muted hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {el.relationToNext && (
                    <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-purple-400/80 py-0.5">
                      <ArrowRight className="h-3 w-3" />
                      <span className="italic">{el.relationToNext}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Add Visual Node form */}
          <div className="pt-2 border-t border-purple-500/20 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                placeholder="Nombre del nodo/caja..."
                value={newElementLabel}
                onChange={(e) => setNewElementLabel(e.target.value)}
                className="text-xs bg-bg-secondary"
              />
              <Input
                placeholder="Relación o flecha hacia siguiente..."
                value={newRelation}
                onChange={(e) => setNewRelation(e.target.value)}
                className="text-xs bg-bg-secondary"
              />
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddElement}
                disabled={!newElementLabel.trim()}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                <span>Agregar Nodo Visual</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
