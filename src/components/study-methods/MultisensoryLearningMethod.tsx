import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Eye, 
  Ear, 
  Hand, 
  CheckCircle2, 
  Sparkles,
  Layers
} from "lucide-react";

export interface MultisensoryLearningMethodProps {
  onSessionFinished?: () => void;
}

export const MultisensoryLearningMethod: React.FC<MultisensoryLearningMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Anatomía del Corazón y Ciclo Cardíaco");

  // Tres canales sensoriales
  const [visualAnchor, setVisualAnchor] = useState<string>(
    "Diagrama a mano alzada con código de dos colores: azul para sangre desoxigenada (aurícula y ventrículo derecho) y rojo para sangre oxigenada (aurícula y ventrículo izquierdo)."
  );
  const [visualChecked, setVisualChecked] = useState<boolean>(true);

  const [auditoryAnchor, setAuditoryAnchor] = useState<string>(
    "Pronunciación rítmica en voz alta del ciclo: 'Lub-Dub' (cierre de válvulas AV primero, luego sigmoideas/aórtica). Grabación de 30 segundos explicando la sístole."
  );
  const [auditoryChecked, setAuditoryChecked] = useState<boolean>(true);

  const [hapticAnchor, setHapticAnchor] = useState<string>(
    "Gesto motor con ambas manos: apretar el puño al decir sístole (contracción ventricular) y abrir las palmas al decir diástole (llenado auricular)."
  );
  const [hapticChecked, setHapticChecked] = useState<boolean>(true);

  const activeSensoryChannels = [visualChecked, auditoryChecked, hapticChecked].filter(Boolean).length;

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `multisensory_${Date.now()}`,
      methodId: "multisensory-learning",
      subject: "Estudio Multisensorial (3 Canales Corticales)",
      topic: topic || "Anclaje Sensorial Concurrente",
      durationMinutes: 25,
      notes: `Tema: ${topic}\nCanales Activos: ${activeSensoryChannels} / 3\n\n[1. Canal Visual-Espacial]:\n${visualAnchor}\n\n[2. Canal Auditivo-Fonológico]:\n${auditoryAnchor}\n\n[3. Canal Háptico-Motor]:\n${hapticAnchor}`,
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
            <CardTitle>Estudio Multisensorial</CardTitle>
            <Badge variant="accent">Anclaje Cortical Múltiple (Shams & Seitz, 2008)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Activa concurrentemente las vías visual, auditiva y háptico-motora para forjar huellas de memoria robustas y redundantes.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={!topic.trim() || activeSensoryChannels === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Sesión ({activeSensoryChannels} / 3 Canales)</span>
        </Button>
      </div>

      {/* Tema */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Concepto o Proceso de Estudio</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Fisiología de la Sinapsis Neuronal"
        />
      </div>

      {/* Resumen de Canales */}
      <div className="p-3.5 rounded-xl border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-accent-primary" />
          <span className="text-xs font-medium text-text-primary">
            Huella Cortical Integrada:{" "}
            <strong className={`font-mono ${activeSensoryChannels === 3 ? "text-emerald-400" : "text-amber-400"}`}>
              {activeSensoryChannels === 3 ? "Trimodal Completa (100%)" : `${activeSensoryChannels} de 3 Vías`}
            </strong>
          </span>
        </div>

        {activeSensoryChannels === 3 && (
          <div className="flex items-center gap-1 text-xs font-mono text-emerald-400 font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Máxima Robustez Sináptica</span>
          </div>
        )}
      </div>

      {/* Matriz de Tres Canales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Canal Visual */}
        <div className={`p-4 rounded-xl border space-y-3 transition-all ${
          visualChecked ? "border-sky-500/40 bg-sky-500/5" : "border-border-subtle bg-bg-secondary/30 opacity-70"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-sky-400" />
              <span className="text-xs font-semibold text-text-primary">1. Canal Visual</span>
            </div>
            <input
              type="checkbox"
              checked={visualChecked}
              onChange={(e) => setVisualChecked(e.target.checked)}
              aria-label="Activar canal visual"
              className="accent-sky-400 rounded cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            Dibuja esquemas, asocia colores diferenciales y ubica la disposición espacial.
          </p>

          <Textarea
            rows={5}
            value={visualAnchor}
            onChange={(e) => setVisualAnchor(e.target.value)}
            placeholder="Describe el esquema visual, colores o diagrama..."
            className="text-xs"
          />
        </div>

        {/* Canal Auditivo */}
        <div className={`p-4 rounded-xl border space-y-3 transition-all ${
          auditoryChecked ? "border-amber-500/40 bg-amber-500/5" : "border-border-subtle bg-bg-secondary/30 opacity-70"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ear className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-semibold text-text-primary">2. Canal Auditivo</span>
            </div>
            <input
              type="checkbox"
              checked={auditoryChecked}
              onChange={(e) => setAuditoryChecked(e.target.checked)}
              aria-label="Activar canal auditivo"
              className="accent-amber-400 rounded cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            Pronuncia en voz alta, usa cadencia y graba audionotas explicativas.
          </p>

          <Textarea
            rows={5}
            value={auditoryAnchor}
            onChange={(e) => setAuditoryAnchor(e.target.value)}
            placeholder="Describe la pronunciación oral o cadencia fonética..."
            className="text-xs"
          />
        </div>

        {/* Canal Cinestésico */}
        <div className={`p-4 rounded-xl border space-y-3 transition-all ${
          hapticChecked ? "border-emerald-500/40 bg-emerald-500/5" : "border-border-subtle bg-bg-secondary/30 opacity-70"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Hand className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-text-primary">3. Canal Háptico</span>
            </div>
            <input
              type="checkbox"
              checked={hapticChecked}
              onChange={(e) => setHapticChecked(e.target.checked)}
              aria-label="Activar canal háptico"
              className="accent-emerald-400 rounded cursor-pointer"
            />
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            Utiliza gestos motores con las manos, escritura física o maquetas.
          </p>

          <Textarea
            rows={5}
            value={hapticAnchor}
            onChange={(e) => setHapticAnchor(e.target.value)}
            placeholder="Describe los gestos físicos o manipulación motora..."
            className="text-xs"
          />
        </div>
      </div>
    </Card>
  );
};
