import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { db } from "../../../db/db";
import { createFsrsCard } from "../../fsrs/scheduler";
import { logSession } from "../logSession";
import {
  CheckCircle2,
  Clock,
  Flame,
  Plus,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface BlurtingCategory {
  category: "green" | "yellow" | "red" | "gray";
  concept: string;
  notes: string;
}

const DEFAULT_TOPIC_TARGETS: Record<string, string[]> = {
  "neurociencia-memoria": [
    "Memoria de Trabajo",
    "Hipocampo",
    "Potenciación a Largo Plazo (LTP)",
    "Receptores NMDA y AMPA",
    "Curva de Ebbinghaus",
    "Consolidación en Sueño NREM",
    "Buffer Fonológico",
  ],
  "algoritmos-fsrs": [
    "Retrievability R(t, S)",
    "Estabilidad S",
    "Dificultad D",
    "Vida Media t_1/2",
    "Intervalo Programado",
    "Mean Reversion",
    "Lapse / Olvido",
  ],
};

export function QuantitativeBlurtingRunner({
  methodId = "blurting",
  subjectFolderId,
}: {
  methodId?: string;
  subjectFolderId: string | null;
}) {
  const [topic, setTopic] = useState("neurociencia-memoria");
  const [customTopic, setCustomTopic] = useState("");
  const [timerDurationSec] = useState(300); // 5 min
  const [remainingSec, setRemainingSec] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [blurtText, setBlurtText] = useState("");
  const [evaluated, setEvaluated] = useState(false);
  const [categories, setCategories] = useState<BlurtingCategory[]>([]);
  const [convertedCardsCount, setConvertedCardsCount] = useState<number | null>(null);

  const sessionStartRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        setRemainingSec((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            handleAudit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setEvaluated(false);
    setConvertedCardsCount(null);
    sessionStartRef.current = Date.now();
  };

  const handleReset = () => {
    setIsRunning(false);
    setRemainingSec(timerDurationSec);
    setEvaluated(false);
    setBlurtText("");
    setConvertedCardsCount(null);
  };

  const handleAudit = () => {
    setIsRunning(false);
    setEvaluated(true);

    const targets = DEFAULT_TOPIC_TARGETS[topic] || [
      "Definición Fundamental",
      "Mecanismo Causal",
      "Propiedades Principales",
      "Casos de Borde",
      "Aplicación Práctica",
    ];

    const textLower = blurtText.toLowerCase();

    const results: BlurtingCategory[] = [];

    for (const target of targets) {
      const keywords = target.toLowerCase().split(/\s+/).filter((k) => k.length > 3);
      const matchCount = keywords.filter((k) => textLower.includes(k)).length;

      if (matchCount >= keywords.length) {
        // High fidelity match
        results.push({
          category: "green",
          concept: target,
          notes: "Evocado con precisión y alta fidelidad en el volcado mental.",
        });
      } else if (matchCount > 0) {
        // Partial vague match
        results.push({
          category: "yellow",
          concept: target,
          notes: "Mencionado parcialmente o de forma imprecisa.",
        });
      } else {
        // Complete omission
        results.push({
          category: "gray",
          concept: target,
          notes: "Concepto clave omitido completamente durante el recuerdo activo.",
        });
      }
    }

    // Check for common misconceptions / distortions
    if (textLower.includes("lineal") || textLower.includes("ilimitad") || textLower.includes("instantane")) {
      results.push({
        category: "red",
        concept: "Aserción Distorsionada",
        notes: "Se detectó afirmación potencialmente contradictoria con la evidencia empírica.",
      });
    }

    setCategories(results);

    // Log study session
    const duration = Math.max(30, Math.round((Date.now() - sessionStartRef.current) / 1000));
    logSession(methodId, subjectFolderId, sessionStartRef.current, duration).catch(console.error);
  };

  // Metrics
  const greenCount = categories.filter((c) => c.category === "green").length;
  const yellowCount = categories.filter((c) => c.category === "yellow").length;
  const redCount = categories.filter((c) => c.category === "red").length;
  const grayCount = categories.filter((c) => c.category === "gray").length;
  const totalTargetCount = Math.max(1, greenCount + yellowCount + grayCount);

  const recallCompletenessPct = Math.round(((greenCount + yellowCount * 0.5) / totalTargetCount) * 100);
  const precisionPct = Math.max(0, Math.round(((greenCount) / Math.max(1, greenCount + redCount)) * 100));

  const handleConvertToFsrs = async () => {
    // Collect all gray and red items
    const itemsToConvert = categories.filter(
      (c) => c.category === "gray" || c.category === "red" || c.category === "yellow",
    );
    if (itemsToConvert.length === 0) return;

    let defaultDeck = await db.flashcardDecks.where({ subjectFolderId }).first();
    if (!defaultDeck) {
      defaultDeck = {
        id: crypto.randomUUID(),
        name: "Mazo Blurting FSRS",
        subjectFolderId,
        createdAt: Date.now(),
      };
      await db.flashcardDecks.add(defaultDeck);
    }

    let created = 0;
    for (const item of itemsToConvert) {
      await createFsrsCard({
        deckId: defaultDeck.id,
        front: `[Blurting ${item.category.toUpperCase()}] ¿Qué define y cómo opera "${item.concept}"?`,
        back: `Refuerzo de concepto clave detectado con déficit en volcado mental (${item.notes}).`,
      });
      created++;
    }

    setConvertedCardsCount(created);
  };

  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header HUD */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle/80 pb-4">
        <div className="flex items-center gap-2.5">
          <Flame className="h-5 w-5 text-warning animate-pulse" />
          <div>
            <h3 className="font-display font-bold text-base text-text-primary">
              Quantitative Blurting &amp; Categorización Cromática
            </h3>
            <span className="text-xs text-text-secondary">
              Volcado mental sin restricciones con auditoría cromática automatizada (Verde / Amarillo / Rojo / Gris).
            </span>
          </div>
        </div>

        {/* Timer HUD */}
        <div className="flex items-center gap-2 font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-surface-1 border border-border-subtle">
            <Clock className="h-4 w-4 text-accent-primary" />
            <span className="text-sm font-bold text-text-primary">{formattedTime}</span>
          </div>
          {!isRunning && !evaluated && (
            <Button size="sm" variant="primary" onClick={handleStart}>
              Comenzar
            </Button>
          )}
          {isRunning && (
            <Button size="sm" variant="danger" onClick={handleAudit}>
              Auditar Volcado
            </Button>
          )}
          <Button size="sm" variant="secondary" onClick={handleReset}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Target Subject Selector */}
      {!isRunning && !evaluated && (
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex-1 w-full">
            <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
              Seleccionar Dominio o Tema de Auditoría:
            </label>
            <select
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-bg-surface-1 p-2 text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent-primary"
            >
              <option value="neurociencia-memoria">Neurociencia de la Memoria (LTP, FSRS, Hipocampo)</option>
              <option value="algoritmos-fsrs">Algoritmos FSRS v4.5 (R, S, D, Intervalos)</option>
              <option value="custom">Tema Personalizado Libre</option>
            </select>
          </div>
          {topic === "custom" && (
            <div className="flex-1 w-full">
              <label className="text-xs font-mono font-medium text-text-secondary block mb-1">
                Nombre del Tema:
              </label>
              <Input
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                placeholder="Ej: Biología Celular, Álgebra Lineal..."
              />
            </div>
          )}
        </div>
      )}

      {/* Main Dump Canvas */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-text-tertiary">
          <span>
            {isRunning
              ? "¡Escribe todo lo que recuerdes sin parar ni juzgarte!"
              : "Lienzo de Volcado Mental:"}
          </span>
          <span>{blurtText.split(/\s+/).filter(Boolean).length} palabras</span>
        </div>
        <textarea
          value={blurtText}
          onChange={(e) => setBlurtText(e.target.value)}
          disabled={!isRunning && evaluated}
          placeholder="Volcá aquí de memoria fórmulas, mecanismos, definiciones, relaciones y excepciones..."
          rows={8}
          className="w-full resize-none rounded-xl border border-border-subtle bg-bg-surface-1 p-4 text-sm font-sans text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent-primary leading-relaxed shadow-inner"
        />
      </div>

      {/* Chromatic Categorization Results */}
      {evaluated && (
        <div className="flex flex-col gap-5 pt-2 animate-in fade-in duration-300">
          {/* Quantitative Score Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="rounded-xl border border-success/30 bg-success/10 p-3.5 text-center">
              <span className="text-[10px] uppercase text-text-tertiary block">Exhaustividad</span>
              <strong className="text-xl font-bold text-success">{recallCompletenessPct}%</strong>
            </div>
            <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/10 p-3.5 text-center">
              <span className="text-[10px] uppercase text-text-tertiary block">Precisión</span>
              <strong className="text-xl font-bold text-accent-primary">{precisionPct}%</strong>
            </div>
            <div className="rounded-xl border border-warning/30 bg-warning/10 p-3.5 text-center">
              <span className="text-[10px] uppercase text-text-tertiary block">Imprecisiones</span>
              <strong className="text-xl font-bold text-warning">{yellowCount}</strong>
            </div>
            <div className="rounded-xl border border-danger/30 bg-danger/10 p-3.5 text-center">
              <span className="text-[10px] uppercase text-text-tertiary block">Omisiones (Gris)</span>
              <strong className="text-xl font-bold text-text-secondary">{grayCount}</strong>
            </div>
          </div>

          {/* Categorized Concept Matrix */}
          <div className="flex flex-col gap-2">
            <h4 className="font-display font-semibold text-xs text-text-primary uppercase tracking-wider">
              Desglose Cromático de Evocación:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {categories.map((item, idx) => {
                const colorConfig =
                  item.category === "green"
                    ? "border-success/40 bg-success/10 text-success"
                    : item.category === "yellow"
                      ? "border-warning/40 bg-warning/10 text-warning"
                      : item.category === "red"
                        ? "border-danger/40 bg-danger/10 text-danger"
                        : "border-border-subtle bg-bg-surface-1 text-text-tertiary";

                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-2.5 p-3 rounded-lg border text-xs ${colorConfig}`}
                  >
                    <div className="font-mono font-bold text-[10px] shrink-0 mt-0.5">
                      {item.category === "green"
                        ? "🟢 VERDE"
                        : item.category === "yellow"
                          ? "🟡 AMARILLO"
                          : item.category === "red"
                            ? "🔴 ROJO"
                            : "⚪ GRIS"}
                    </div>
                    <div>
                      <strong className="block text-text-primary font-semibold font-display">
                        {item.concept}
                      </strong>
                      <span className="text-[11px] opacity-85 block mt-0.5">{item.notes}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action: Convert Gaps to FSRS */}
          <div className="flex items-center justify-between p-4 rounded-xl border border-accent-primary/20 bg-bg-surface-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <span className="text-xs text-text-secondary">
                {convertedCardsCount !== null
                  ? `Se generaron ${convertedCardsCount} tarjetas FSRS automáticas a partir de tus omisiones.`
                  : "Convierte tus omisiones y dudas en tarjetas espaciadas inmediatas."}
              </span>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={handleConvertToFsrs}
              disabled={convertedCardsCount !== null || grayCount + redCount === 0}
              className="flex items-center gap-1.5 text-xs font-mono"
            >
              {convertedCardsCount !== null ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" /> FSRS Creadas
                </>
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" /> Generar Tarjetas FSRS
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
