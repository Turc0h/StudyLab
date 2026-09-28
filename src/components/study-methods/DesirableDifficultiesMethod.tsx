import React, { useState, useEffect, useRef } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { db } from "../../db/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DEFAULT_BARRIERS,
  DEFAULT_DESIRABLE_TOPIC,
  DEFAULT_DESIRABLE_NOTES,
  getDesirableDifficultiesConfig,
  saveDesirableDifficultiesConfig,
  type FrictionBarrier,
} from "../../features/study-methods/desirableDifficultiesStorage";
import { 
  Zap, 
  CheckCircle2, 
  Gauge, 
  ShieldAlert, 
  ArrowRight,
  BrainCircuit,
  Check,
  FolderOpen
} from "lucide-react";

export interface DesirableDifficultiesMethodProps {
  onSessionFinished?: () => void;
}

export const DesirableDifficultiesMethod: React.FC<DesirableDifficultiesMethodProps> = ({ onSessionFinished }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [topic, setTopic] = useState<string>(DEFAULT_DESIRABLE_TOPIC);
  const [barriers, setBarriers] = useState<FrictionBarrier[]>(DEFAULT_BARRIERS);

  // Calificación del sesgo cognitivo (Ilusión de Competencia)
  const [perceivedFluency, setPerceivedFluency] = useState<number>(2); // 1 = Fricción máxima, 5 = Muy fluido
  const [testedRetention, setTestedRetention] = useState<number>(4); // 1 = Olvidado, 5 = Retención total
  const [sessionNotes, setSessionNotes] = useState<string>(DEFAULT_DESIRABLE_NOTES);

  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Carpetas disponibles
  const folders = useLiveQuery(() => db.folders.toArray(), []) || [];
  const subjectFolders = folders.filter((f) => f.type === "subject" || !f.type);

  // 1. Rehidratación reactiva al cambiar de materia o montar
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoaded(false);
      try {
        const saved = await getDesirableDifficultiesConfig(selectedFolderId || null);
        if (isCancelled) return;
        if (saved) {
          setTopic(saved.topic || DEFAULT_DESIRABLE_TOPIC);
          setBarriers(saved.barriers && saved.barriers.length > 0 ? saved.barriers : DEFAULT_BARRIERS);
          setPerceivedFluency(saved.perceivedFluency ?? 2);
          setTestedRetention(saved.testedRetention ?? 4);
          setSessionNotes(saved.sessionNotes ?? DEFAULT_DESIRABLE_NOTES);
        } else {
          setTopic(DEFAULT_DESIRABLE_TOPIC);
          setBarriers(DEFAULT_BARRIERS);
          setPerceivedFluency(2);
          setTestedRetention(4);
          setSessionNotes(DEFAULT_DESIRABLE_NOTES);
        }
      } catch (err) {
        console.error("Error cargando Dificultades Deseables de Dexie:", err);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [selectedFolderId]);

  // 2. Auto-guardado con debounce de 800ms
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!isLoaded) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await saveDesirableDifficultiesConfig({
          subjectFolderId: selectedFolderId || null,
          topic,
          barriers,
          perceivedFluency,
          testedRetention,
          sessionNotes,
        });
        setSaveStatus("saved");
        const hideTimer = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
        return () => clearTimeout(hideTimer);
      } catch (err) {
        console.error("Error auto-guardando Dificultades Deseables en Dexie:", err);
        setSaveStatus("idle");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [barriers, topic, perceivedFluency, testedRetention, sessionNotes, selectedFolderId, isLoaded]);

  const toggleBarrier = (id: string) => {
    setBarriers(
      barriers.map((b) => (b.id === id ? { ...b, enabled: !b.enabled } : b))
    );
  };

  const activeBarriersCount = barriers.filter((b) => b.enabled).length;

  const handleFinishSession = async () => {
    // Asegurar guardado en Dexie
    await saveDesirableDifficultiesConfig({
      subjectFolderId: selectedFolderId || null,
      topic,
      barriers,
      perceivedFluency,
      testedRetention,
      sessionNotes,
    });

    const folderName = subjectFolders.find((f) => f.id === selectedFolderId)?.name;

    await saveStudySession({
      id: `desirable_diff_${Date.now()}`,
      methodId: "desirable-difficulties",
      subject: folderName ? `Dificultades Deseables • ${folderName}` : "Dificultades Deseables (Fricción Cognitiva)",
      topic: topic || "Diseño de Barreras de Aprendizaje",
      durationMinutes: 30,
      notes: `Materia: ${folderName || "General"}\nTema: ${topic}\nBarreras Cognitivas Activadas (${activeBarriersCount}):\n${barriers
        .filter((b) => b.enabled)
        .map((b) => `• [${b.title}]: ${b.practicalAction}`)
        .join("\n")}\n\nAuditoría Metacognitiva:\n• Fluidez Subjetiva Sentida: ${perceivedFluency}/5\n• Retención Medida Posterior: ${testedRetention}/5\n• Notas de Sesión:\n${sessionNotes}`,
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
            <CardTitle>Marco de Dificultades Deseables</CardTitle>
            <Badge variant="accent">Fricción Cognitiva (Robert Bjork, 1994)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Introduce deliberadamente barreras de esfuerzo que generan lentitud aparente para inducir una retención a largo plazo y transferencia superiores.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-text-muted flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Guardando...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={handleFinishSession}
            disabled={!topic.trim()}
            className="text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Guardar Sesión ({activeBarriersCount} Barreras)</span>
          </Button>
        </div>
      </div>

      {/* Selector de Materia y Tema */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-accent-primary" />
            <span>Materia / Carpeta de Cátedra</span>
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full text-xs rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">(Sin carpeta / General)</option>
            {subjectFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Materia o Tarea de Estudio</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Análisis de Casos de Derecho de Familia"
          />
        </div>
      </div>

      {/* Selector de Barreras Cognitivas */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-accent-primary" />
            <span>Palancas de Dificultad Deseable (Activa las que aplicarás hoy)</span>
          </span>
          <span className="text-[10px] text-text-muted">{activeBarriersCount} de {barriers.length} activas</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {barriers.map((barrier) => (
            <div
              key={barrier.id}
              onClick={() => toggleBarrier(barrier.id)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                barrier.enabled
                  ? "border-accent-primary bg-accent-primary/10 ring-1 ring-accent-primary/30"
                  : "border-border-subtle bg-bg-secondary/40 opacity-70 hover:opacity-100"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-text-primary">
                  {barrier.title}
                </span>
                <Badge variant={barrier.enabled ? "accent" : "neutral"} className="text-[10px]">
                  {barrier.enabled ? "Activa" : "Desactivada"}
                </Badge>
              </div>

              <p className="text-[11px] text-text-secondary leading-relaxed">
                {barrier.scientificMechanism}
              </p>

              <div className="p-2 rounded-lg bg-bg-tertiary/70 border border-border-subtle text-[11px] text-text-primary flex items-start gap-1.5 font-mono">
                <ArrowRight className="h-3 w-3 text-accent-primary shrink-0 mt-0.5" />
                <span>{barrier.practicalAction}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz de Contraste: Fluidez vs Retención */}
      <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-amber-400" />
          <span className="text-xs font-semibold text-text-primary">
            Desmontar la Ilusión de Competencia (Contraste Bjork)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Fluidez Subjetiva Sentida (Facilidad)</span>
              <span className="font-bold text-amber-400">{perceivedFluency} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={perceivedFluency}
              onChange={(e) => setPerceivedFluency(Number(e.target.value))}
              className="w-full accent-amber-400"
            />
            <span className="text-[10px] text-text-muted block">
              1 = Muy difícil / fricción &bull; 5 = Fluido y sin esfuerzo
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-text-secondary">Retención Real Comprobada</span>
              <span className="font-bold text-emerald-400">{testedRetention} / 5</span>
            </div>
            <input
              type="range"
              min={1}
              max={5}
              value={testedRetention}
              onChange={(e) => setTestedRetention(Number(e.target.value))}
              className="w-full accent-emerald-400"
            />
            <span className="text-[10px] text-text-muted block">
              1 = Olvido total &bull; 5 = Recuperación perfecta
            </span>
          </div>
        </div>

        {/* Paradoja de Bjork */}
        {perceivedFluency <= 2 && testedRetention >= 4 && (
          <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-300 flex items-start gap-2">
            <BrainCircuit className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              <strong>Efecto Bjork confirmado:</strong> La alta fricción y frustración inicial se tradujeron directamente en una retención consolidada. La lentitud aparente fue la señal biológica de fijación duradera.
            </p>
          </div>
        )}
      </div>

      {/* Registro de Notas de Fricción */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5 text-accent-primary" />
          <span>Registro de la Experiencia y Aprendizaje bajo Fricción</span>
        </label>
        <Textarea
          rows={3}
          value={sessionNotes}
          onChange={(e) => setSessionNotes(e.target.value)}
          placeholder="Anota qué barreras aplicaste y qué errores identificaste..."
          className="text-xs leading-relaxed"
        />
      </div>
    </Card>
  );
};
