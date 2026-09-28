import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db.ts";
import {
  selectCramDeck,
  saveCramSessionSummary,
  type CramItem,
} from "../../features/cram/cramSelector.ts";
import {
  Flame,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Sparkles,
  Eye,
} from "lucide-react";

export interface CramMethodProps {
  onSessionFinished?: () => void;
}

type TimerSetting = 30 | 60 | 90 | 0; // 0 = unlimited

export const CramMethod: React.FC<CramMethodProps> = ({ onSessionFinished }) => {
  // Estado de flujo: setup -> blitz -> summary
  const [phase, setPhase] = useState<"setup" | "blitz" | "summary">("setup");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [timerSeconds, setTimerSeconds] = useState<TimerSetting>(45 as any);
  const [onlyWeak, setOnlyWeak] = useState<boolean>(true);
  const [maxCount, setMaxCount] = useState<number>(20);

  // Estado del mazo y ejecución
  const [queue, setQueue] = useState<CramItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(45);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);

  // Estadísticas de la sesión actual
  const [correctItems, setCorrectItems] = useState<CramItem[]>([]);
  const [doubtItems, setDoubtItems] = useState<CramItem[]>([]);
  const [failedItems, setFailedItems] = useState<CramItem[]>([]);
  const [requeuedCount, setRequeuedCount] = useState<number>(0);

  // Carpetas de Dexie
  const folders = useLiveQuery(() => db.folders.toArray(), []) ?? [];

  // Fallback items pre-cargados si la BD está vacía
  const DEFAULT_CRAM_ITEMS: CramItem[] = [
    {
      id: "demo-1",
      originalRefId: "demo-1",
      type: "fsrs",
      prompt: "¿Qué relación describe la fórmula de Retrievability en FSRS: R(t, S) = (1 + 19 * t / S)^(-0.5)?",
      answer: "Indica la probabilidad de recordar un concepto tras transcurrir 't' días dado un valor de Estabilidad 'S'. Cuando t = S, la probabilidad cae exactamente al 90%.",
      hint: "Analiza qué pasa cuando t = 0 vs cuando t = S.",
      category: "Algoritmos de Memoria",
      urgencyScore: 92,
    },
    {
      id: "demo-2",
      originalRefId: "demo-2",
      type: "error",
      prompt: "[Fallo Previo] Cálculo Integral: ¿Por qué la integral de sec(x) dx requiere multiplicar por (sec x + tan x)?",
      answer: "Porque la derivada del numerador (sec x * tan x + sec^2 x) resulta ser idéntica a la expresión completa, transformándola en la forma estándar du/u que integra a ln|sec x + tan x| + C.",
      hint: "Es un artificio algebraico para transformar la función en du/u.",
      category: "Cálculo",
      isUnresolvedError: true,
      urgencyScore: 95,
    },
    {
      id: "demo-3",
      originalRefId: "demo-3",
      type: "fsrs",
      prompt: "¿Cuál es la diferencia fundamental entre el efecto de reconocimiento visual y el efecto de generación?",
      answer: "El reconocimiento visual crea familiaridad superficial sin esfuerzo sináptico; el efecto de generación obliga al cerebro a reconstruir activamente la red conceptual desde cero, fijándola en la memoria a largo plazo.",
      hint: "Piensa en 'elegir una opción en un multiple choice' vs 'escribir la respuesta en blanco'.",
      category: "Neurociencia del Aprendizaje",
      urgencyScore: 88,
    },
  ];

  // Iniciar la sesión Blitz
  const handleStartBlitz = async () => {
    let items = await selectCramDeck({
      folderId: selectedFolderId || undefined,
      maxItems: maxCount,
      onlyWeak,
      includeErrors: true,
      includeFsrs: true,
      includeLeitner: true,
    });

    if (items.length === 0) {
      items = DEFAULT_CRAM_ITEMS;
    }

    setQueue(items);
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrectItems([]);
    setDoubtItems([]);
    setFailedItems([]);
    setRequeuedCount(0);
    setStartTime(Date.now());
    setTimeRemaining(timerSeconds > 0 ? timerSeconds : 999);
    setTimerActive(timerSeconds > 0);
    setPhase("blitz");
  };

  const currentItem = queue[currentIndex];

  // Manejo del temporizador regresivo
  useEffect(() => {
    if (phase !== "blitz" || !timerActive || timerSeconds === 0) return;

    if (timeRemaining <= 0) {
      // Tiempo agotado: revelar automáticamente
      setIsFlipped(true);
      return;
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [phase, timerActive, timeRemaining, timerSeconds]);

  // Avanzar o calificar
  const handleRate = useCallback(
    (rating: "correct" | "doubt" | "fail") => {
      if (!currentItem) return;

      if (rating === "correct") {
        setCorrectItems((prev) => [...prev, currentItem]);
      } else if (rating === "doubt") {
        setDoubtItems((prev) => [...prev, currentItem]);
      } else {
        // En modo Blitz de Emergencia: los fallos se reinsertan al final para garantizar dominio antes del examen
        setFailedItems((prev) => [...prev, currentItem]);
        setQueue((prev) => [...prev, currentItem]);
        setRequeuedCount((prev) => prev + 1);
      }

      // Siguiente tarjeta
      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((prev) => prev + 1);
        setIsFlipped(false);
        setTimeRemaining(timerSeconds > 0 ? timerSeconds : 999);
      } else {
        // Fin del Blitz
        finishSession();
      }
    },
    [currentItem, currentIndex, queue.length, timerSeconds],
  );

  const finishSession = async () => {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - startTime) / 1000));
    setTimerActive(false);
    setPhase("summary");

    await saveCramSessionSummary({
      totalReviewed: queue.length,
      correctCount: correctItems.length,
      doubtCount: doubtItems.length,
      failedCount: failedItems.length,
      durationSeconds: elapsedSeconds,
      failedItems,
    });
  };

  // Atajos de teclado en el Blitz
  useEffect(() => {
    if (phase !== "blitz") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // No disparar si el usuario está escribiendo en un input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === "Space") {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === "1") {
          e.preventDefault();
          handleRate("fail");
        } else if (e.key === "2") {
          e.preventDefault();
          handleRate("doubt");
        } else if (e.key === "3") {
          e.preventDefault();
          handleRate("correct");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, isFlipped, handleRate]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4">
      {/* 1. PANTALLA DE CONFIGURACIÓN PRE-BLITZ — TRIAJE DE EMERGENCIA */}
      {phase === "setup" && (
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader className="border-b border-border-hairline pb-4 bg-bg-surface-2/40 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-hairline bg-bg-surface-2 text-text-primary">
                  <Flame className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-serif font-bold text-text-primary flex items-center gap-2.5">
                    Modo Repaso Rápido de Emergencia (Cram Blitz)
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary font-normal">
                      Pre-Examen &lt; 24h
                    </span>
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5 font-sans">
                    Evocación acelerada de alta intensidad. Pone a prueba únicamente tus puntos más vulnerables sin distorsionar los intervalos FSRS a largo plazo.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Alerta de Aislamiento de Memoria — Tono institucional sobrio */}
            <div className="flex items-start gap-3 rounded-lg border border-border-hairline bg-bg-surface-2/60 p-4 text-text-primary">
              <ShieldCheck className="h-5 w-5 shrink-0 text-text-secondary mt-0.5" />
              <div className="text-xs font-sans leading-relaxed">
                <span className="font-semibold font-mono text-text-primary">Garantía de Aislamiento FSRS:</span> Esta sesión está aislada de tu curva matemática de retención. Puedes repasar tantas veces como necesites antes del examen sin corromper tu matriz de estabilidad ni atrasar repasos futuros.
              </div>
            </div>

            {/* Selector de Materia / Carpeta */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-text-secondary">Cátedra o Asignatura a evaluar:</label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3.5 py-2 text-xs text-text-primary focus:border-border-active focus:outline-hidden"
              >
                <option value="">Todo el repositorio (Repaso general)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Temporizador por Tarjeta */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono font-medium text-text-secondary">Pauta temporal por concepto:</label>
              <div className="grid grid-cols-4 gap-3">
                {[
                  { sec: 30, label: "30s (Sprint)", desc: "Presión máxima" },
                  { sec: 45, label: "45s (Blitz)", desc: "Equilibrado" },
                  { sec: 60, label: "60s (Táctico)", desc: "Explicaciones" },
                  { sec: 0, label: "Sin Límite", desc: "A tu propio ritmo" },
                ].map((t) => (
                  <button
                    key={t.sec}
                    type="button"
                    onClick={() => setTimerSeconds(t.sec as any)}
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-colors cursor-pointer ${
                      timerSeconds === t.sec
                        ? "border-border-active bg-bg-surface-3 text-text-primary font-medium"
                        : "border-border-hairline bg-bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-bg-surface-3"
                    }`}
                  >
                    <span className="text-xs font-bold font-mono">{t.label}</span>
                    <span className="text-[10px] text-text-tertiary mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              <div
                onClick={() => setOnlyWeak(!onlyWeak)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3.5 transition-colors ${
                  onlyWeak
                    ? "border-border-active bg-bg-surface-2 text-text-primary"
                    : "border-border-hairline bg-bg-surface-2/40 text-text-secondary"
                }`}
              >
                <div>
                  <div className="text-xs font-semibold font-mono">Priorizar Solo Conceptos Débiles</div>
                  <div className="text-[11px] text-text-tertiary">Filtra tarjetas con R &lt; 75% y errores pedagógicos previos</div>
                </div>
                <input
                  type="checkbox"
                  checked={onlyWeak}
                  onChange={() => {}}
                  className="h-4 w-4 rounded accent-text-primary"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border-hairline bg-bg-surface-2/40 p-3.5">
                <div>
                  <div className="text-xs font-semibold font-mono text-text-primary">Límite de Conceptos</div>
                  <div className="text-[11px] text-text-tertiary">Cantidad máxima por sesión de choque</div>
                </div>
                <select
                  value={maxCount}
                  onChange={(e) => setMaxCount(Number(e.target.value))}
                  className="rounded border border-border-hairline bg-bg-surface-1 px-2.5 py-1 text-xs font-mono text-text-primary focus:outline-hidden"
                >
                  <option value={10}>10 tarjetas</option>
                  <option value={20}>20 tarjetas</option>
                  <option value={35}>35 tarjetas</option>
                  <option value={50}>50 tarjetas</option>
                </select>
              </div>
            </div>

            {/* Botón de Inicio */}
            <div className="pt-2 flex items-center justify-between border-t border-border-hairline">
              <Button
                variant="ghost"
                onClick={onSessionFinished}
                className="text-xs text-text-secondary hover:text-text-primary"
              >
                Volver al catálogo
              </Button>
              <Button
                onClick={handleStartBlitz}
                variant="primary"
                className="text-xs font-mono px-5 py-2 flex items-center gap-2"
              >
                <Flame className="h-3.5 w-3.5" />
                Iniciar Sesión Blitz de Emergencia
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 2. PANTALLA DE REPASO BLITZ */}
      {phase === "blitz" && currentItem && (
        <div className="space-y-4">
          {/* Header de telemetría del Blitz */}
          <div className="flex items-center justify-between rounded-lg border border-border-hairline bg-bg-surface-1 p-3.5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 font-mono text-xs px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-primary font-medium">
                <Flame className="h-3.5 w-3.5 text-text-secondary" />
                BLITZ PRE-EXAMEN
              </span>
              <span className="text-xs font-mono text-text-secondary">
                Tarjeta <span className="font-bold text-text-primary">{currentIndex + 1}</span> de{" "}
                <span>{queue.length}</span>
              </span>
              {requeuedCount > 0 && (
                <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-tertiary">
                  +{requeuedCount} reinsertadas
                </span>
              )}
            </div>

            {/* Temporizador regresivo sobrio */}
            {timerSeconds > 0 && (
              <div
                className={`flex items-center gap-1.5 font-mono text-xs font-bold px-2.5 py-1 rounded border ${
                  timeRemaining <= 10
                    ? "border-red-800/40 bg-red-950/20 text-red-400"
                    : "border-border-hairline bg-bg-surface-2 text-text-primary"
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-text-tertiary" />
                <span>{timeRemaining}s</span>
              </div>
            )}
          </div>

          {/* Tarjeta de Estudio Blitz */}
          <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm min-h-[340px] flex flex-col justify-between">
            <div className="p-6 space-y-4">
              {/* Metadatos de la tarjeta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentItem.type === "error" ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-red-800/40 bg-red-950/20 text-red-400 font-semibold">
                      Fallo Previo No Resuelto
                    </span>
                  ) : currentItem.type === "fsrs" ? (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary font-medium">
                      Retención {Math.round(((currentItem.retrievability || 0.5) * 100))}%
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded border border-border-hairline bg-bg-surface-2 text-text-secondary">
                      Leitner
                    </span>
                  )}
                  {currentItem.category && (
                    <span className="text-xs font-mono text-text-tertiary">{currentItem.category}</span>
                  )}
                </div>
                <span className="text-[10px] font-mono text-text-tertiary">
                  Urgencia: {currentItem.urgencyScore}/100
                </span>
              </div>

              {/* Anverso / Pregunta */}
              <div className="pt-1">
                <div className="text-[11px] font-mono text-text-tertiary mb-1.5">
                  Evocación Rápida:
                </div>
                <div className="text-base font-serif font-bold text-text-primary whitespace-pre-line leading-relaxed">
                  {currentItem.prompt}
                </div>
              </div>

              {/* Pistas si existen */}
              {currentItem.hint && !isFlipped && (
                <div className="rounded-lg border border-border-hairline bg-bg-surface-2/60 p-3 text-xs font-serif text-text-secondary italic">
                  Pista de cátedra: {currentItem.hint}
                </div>
              )}

              {/* Reverso / Solución revelada */}
              {isFlipped && (
                <div className="rounded-lg border border-border-hairline bg-bg-surface-2 p-4 mt-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-text-secondary">
                    <Sparkles className="h-3.5 w-3.5 text-text-tertiary" />
                    Respuesta Canónica de Cátedra:
                  </div>
                  <div className="text-sm font-serif text-text-primary whitespace-pre-line leading-relaxed">
                    {currentItem.answer}
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Acciones y Calificación */}
            <div className="border-t border-border-hairline p-4 bg-bg-surface-2/40 rounded-b-xl">
              {!isFlipped ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-tertiary font-mono">
                    Presiona <kbd className="px-1.5 py-0.5 bg-bg-surface-2 border border-border-hairline rounded text-text-secondary">Espacio</kbd> para voltear
                  </span>
                  <Button
                    onClick={() => setIsFlipped(true)}
                    variant="primary"
                    className="text-xs font-mono flex items-center gap-1.5 px-4 py-2"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Revelar Solución
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-text-tertiary font-mono">
                    Calificación: <kbd className="px-1.5 py-0.5 bg-bg-surface-2 border border-border-hairline rounded">1</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-bg-surface-2 border border-border-hairline rounded">2</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-bg-surface-2 border border-border-hairline rounded">3</kbd>
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="danger"
                      onClick={() => handleRate("fail")}
                      className="flex-1 sm:flex-none text-xs font-mono py-2 flex items-center gap-1.5"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      [1] Fallo (Reinsertar)
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleRate("doubt")}
                      className="flex-1 sm:flex-none text-xs font-mono py-2 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                      [2] Dudoso
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleRate("correct")}
                      className="flex-1 sm:flex-none text-xs font-mono py-2 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      [3] Dominado
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* 3. PANTALLA DE RESUMEN TÁCTICO FINAL */}
      {phase === "summary" && (
        <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
          <CardHeader className="border-b border-border-hairline pb-4 bg-bg-surface-2/40 px-6 py-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-hairline bg-bg-surface-2 text-text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg font-serif font-bold text-text-primary">
                    Diagnóstico de Sesión Blitz Completada
                  </CardTitle>
                  <p className="text-xs text-text-secondary mt-0.5 font-sans">
                    Evaluación de impacto pre-examen. Tu cronograma FSRS de largo plazo permanece protegido.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Métricas clave */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border-hairline bg-bg-surface-2/40 p-3.5 text-center">
                <div className="text-2xl font-bold font-mono text-text-primary">{correctItems.length}</div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">Aciertos Inmediatos</div>
              </div>
              <div className="rounded-lg border border-border-hairline bg-bg-surface-2/40 p-3.5 text-center">
                <div className="text-2xl font-bold font-mono text-text-primary">{doubtItems.length}</div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">Dudosos / Esfuerzo</div>
              </div>
              <div className="rounded-lg border border-border-hairline bg-bg-surface-2/40 p-3.5 text-center">
                <div className="text-2xl font-bold font-mono text-red-500">{failedItems.length}</div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">Fallos Reinsertados</div>
              </div>
              <div className="rounded-lg border border-border-hairline bg-bg-surface-2/40 p-3.5 text-center">
                <div className="text-2xl font-bold font-mono text-text-primary">
                  {queue.length > 0 ? Math.round((correctItems.length / queue.length) * 100) : 100}%
                </div>
                <div className="text-[11px] font-mono text-text-secondary mt-0.5">Efectividad de Evocación</div>
              </div>
            </div>

            {/* Conceptos Críticos a vigilar */}
            {failedItems.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-mono font-medium text-text-primary">
                  <AlertTriangle className="h-4 w-4 text-text-tertiary" />
                  Conceptos Vulnerables para Repasar antes de Rendir:
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {failedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-border-hairline bg-bg-surface-2/60 p-3 text-xs"
                    >
                      <div className="font-serif font-bold text-text-primary">{item.prompt}</div>
                      <div className="text-text-secondary mt-1 font-sans line-clamp-2">{item.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border-hairline bg-bg-surface-2/40 p-4 text-center text-text-primary text-xs font-serif">
                Consolidación completa: no registraste fallos persistentes en esta ronda. Tus conceptos evaluados quedaron listos para la mesa examinadora.
              </div>
            )}

            {/* Recomendación Pedagógica Pre-Examen */}
            <div className="rounded-lg border border-border-hairline bg-bg-surface-2 p-4 text-xs text-text-secondary leading-relaxed font-sans">
              <span className="font-mono font-semibold text-text-primary">Pauta Cognitiva de Cátedra:</span> Si el examen es en menos de 6 horas, suspende el estudio masivo continuo y asegura descanso reparador. La consolidación sináptica en fase REM es indispensable para fijar lo repasado antes de rendir.
            </div>

            {/* Acciones Finales */}
            <div className="flex items-center justify-between pt-2 border-t border-border-hairline">
              <Button
                variant="outline"
                onClick={() => setPhase("setup")}
                className="text-xs font-mono border-border-hairline text-text-secondary hover:text-text-primary flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Nueva Sesión Blitz
              </Button>
              <Button
                onClick={onSessionFinished}
                variant="primary"
                className="text-xs font-mono px-5 py-2 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Finalizar y Salir
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
