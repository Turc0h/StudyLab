import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Clock, CheckCircle2, ArrowRight, Brain, EyeOff, Target } from "lucide-react";

export interface BlurtingMethodProps {
  onSessionFinished?: () => void;
}

export const BlurtingMethod: React.FC<BlurtingMethodProps> = ({ onSessionFinished }) => {
  const [phase, setPhase] = useState<"reading" | "blurting" | "audit">("reading");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [referenceText, setReferenceText] = useState("");
  const [blurtedText, setBlurtedText] = useState("");
  const [omittedPoints, setOmittedPoints] = useState<string>("");

  // Cronómetro regresivo
  const readingMinutes = 15;
  const blurtMinutes = 5;
  const [remainingSeconds, setRemainingSeconds] = useState(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isTimerRunning && (phase === "reading" || phase === "blurting")) {
      interval = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (phase === "reading") {
              startBlurtingPhase();
            } else if (phase === "blurting") {
              startAuditPhase();
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, phase]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const startBlurtingPhase = () => {
    setRemainingSeconds(blurtMinutes * 60);
    setIsTimerRunning(true);
    setPhase("blurting");
  };

  const startAuditPhase = () => {
    setIsTimerRunning(false);
    setPhase("audit");
  };

  const handleFinish = async () => {
    await saveStudySession({
      id: `blurting_${Date.now()}`,
      methodId: "blurting",
      subject: subject.trim() || "Estudio General",
      topic: topic.trim() || "Vaciado Mental Blurting",
      durationMinutes: readingMinutes + blurtMinutes,
      notes: `[TEMA]: ${topic}\n\n[LO RECORDADO]:\n${blurtedText}\n\n[LAGUNAS / CONCEPTOS OMITIDOS]:\n${omittedPoints}`,
      completedAt: Date.now(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      onSessionFinished?.();
    }, 1200);
  };

  // Fase 1: Lectura Concentrada de Asimilación
  if (phase === "reading") {
    return (
      <Card elevated className="p-6 max-w-3xl mx-auto flex flex-col gap-5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="font-serif text-xl">Método Blurting (Vaciado Mental)</CardTitle>
            <Badge variant="accent">Fase 1: Asimilación</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Leé y estudiá a fondo el apunte durante el tiempo fijado. Al pasar a la siguiente fase, todo el material quedará oculto para evaluar tu retención en blanco.
          </p>
        </CardHeader>

        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-text-secondary font-medium block mb-1">Materia:</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="ej: Bioquímica"
              />
            </div>
            <div>
              <label className="text-text-secondary font-medium block mb-1">Tema a Estudiar:</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="ej: Ciclo de Krebs y Fosforilación"
              />
            </div>
          </div>

          <div>
            <label className="text-text-secondary font-medium block mb-1">
              Material o Puntos Clave a Asimilar (pegá o resumí aquí lo que vas a estudiar):
            </label>
            <Textarea
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Pegá aquí el fragmento del apunte, fórmulas o teoremas que vas a leer con atención plena..."
              className="w-full text-xs font-sans min-h-[180px] p-3 resize-none bg-bg-primary"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface-2 p-3">
            <div className="flex items-center gap-2 font-mono text-xs">
              <Clock className="h-4 w-4 text-accent-primary" />
              <span>Tiempo de Lectura: <strong>{formatTimer(remainingSeconds)}</strong></span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="text-xs"
              >
                {isTimerRunning ? "Pausar" : "Reanudar"}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={startBlurtingPhase}
                disabled={!topic.trim() || !referenceText.trim()}
                className="text-xs flex items-center gap-1.5"
              >
                <span>Listo para Vaciar en Blanco</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Fase 2: Vaciado Mental a Contrarreloj (Lienzo en Blanco)
  if (phase === "blurting") {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 text-red-500 font-semibold">
            <EyeOff className="h-4 w-4" />
            <span>Fase 2: Vaciado a Contrarreloj (Sin Apuntes)</span>
          </div>
          <div className="flex items-center gap-2 font-mono font-bold text-red-600">
            <Clock className="h-4 w-4" />
            <span>{formatTimer(remainingSeconds)}</span>
          </div>
        </div>

        <Card elevated className="p-6 space-y-4">
          <div>
            <span className="text-xs font-mono text-text-muted">{subject} • {topic}</span>
            <h3 className="font-serif text-base font-semibold text-text-primary mt-1">
              Escribí a toda velocidad todo lo que recuerdes sin frenarte ni mirar los textos:
            </h3>
          </div>

          <Textarea
            value={blurtedText}
            onChange={(e) => setBlurtedText(e.target.value)}
            placeholder="Comenzá a escribir sin juzgar la redacción: nombres, fórmulas, listas, causas, consecuencias..."
            autoFocus
            className="w-full text-xs font-mono leading-relaxed p-4 min-h-[300px] resize-none bg-bg-primary"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-[11px] text-text-muted">
              {blurtedText.split(/\s+/).filter(Boolean).length} palabras evocadas
            </span>
            <Button variant="primary" size="sm" onClick={startAuditPhase} className="text-xs">
              Terminar Vaciado y Auditar
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Fase 3: Auditoría & Detección de Lagunas
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <Card elevated className="p-5 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <CardTitle className="font-serif text-lg">Fase 3: Auditoría de Lagunas (Contraste)</CardTitle>
          <Badge variant="warning">Diagnóstico de Olvido</Badge>
        </div>
        <p className="text-xs text-text-secondary">
          Compará lado a lado el material original con lo que evocaste de memoria. Anotá los conceptos que olvidaste o tergiversaste para focalizar tu siguiente repaso.
        </p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Columna Original */}
        <Card className="p-4 border-border-subtle bg-bg-surface-2 space-y-2">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            Texto Original de Cátedra
          </span>
          <div className="rounded bg-bg-primary p-3 text-xs text-text-secondary max-h-[320px] overflow-y-auto whitespace-pre-wrap font-sans border border-border-subtle leading-relaxed">
            {referenceText}
          </div>
        </Card>

        {/* Columna Evocada */}
        <Card className="p-4 border-border-subtle bg-bg-surface-2 space-y-2">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-accent-primary" />
            Lo que Evocaste de Memoria
          </span>
          <div className="rounded bg-bg-primary p-3 text-xs text-text-primary max-h-[320px] overflow-y-auto whitespace-pre-wrap font-mono border border-border-subtle leading-relaxed">
            {blurtedText || "(No se registró contenido)"}
          </div>
        </Card>
      </div>

      {/* Registro de Lagunas para FSRS */}
      <Card elevated className="p-5 space-y-3 border-amber-500/30 bg-amber-500/5">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-600">
          <Target className="h-4 w-4" />
          <span>Lagunas Identificadas (Conceptos a Reforzar)</span>
        </div>
        <p className="text-[11px] text-text-secondary">
          Anotá qué detalles omitiste (definiciones exactas, pasos intermedios, nombres propios):
        </p>

        <Textarea
          value={omittedPoints}
          onChange={(e) => setOmittedPoints(e.target.value)}
          placeholder="ej:&#10;• Olvidé la enzima limitante de la reacción 3&#10;• No recordaba el rendimiento neto de ATP"
          className="w-full text-xs font-sans p-3 min-h-[90px] resize-none bg-bg-primary border-amber-500/20"
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-amber-500/15">
          <Button
            variant="primary"
            size="sm"
            onClick={handleFinish}
            disabled={savedSuccess}
            className="text-xs flex items-center gap-1.5"
          >
            {savedSuccess ? "Guardado en Historial" : "Finalizar Sesión y Registrar Lagunas"}
          </Button>
        </div>
      </Card>
    </div>
  );
};
