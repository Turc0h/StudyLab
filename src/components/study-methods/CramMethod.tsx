import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
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
  ArrowRight,
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
      {/* 1. PANTALLA DE CONFIGURACIÓN PRE-BLITZ */}
      {phase === "setup" && (
        <Card className="border-amber-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
                  <Flame className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                    Modo Repaso Rápido de Emergencia (Cram Blitz)
                    <Badge variant="warning" className="text-xs uppercase tracking-wider">
                      Pre-Examen &lt; 24h
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    Evocación acelerada de alta intensidad. Pone a prueba únicamente tus puntos más vulnerables sin distorsionar los intervalos FSRS a largo plazo.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Alerta de Aislamiento de Memoria */}
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-emerald-300">
              <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
              <div className="text-xs leading-relaxed">
                <span className="font-semibold text-emerald-200">Garantía de Aislamiento FSRS:</span> Esta sesión está aislada de tu curva matemática de retención. Puedes repasar tantas veces como necesites antes del examen sin corromper tu matriz de estabilidad ni atrasar repasos futuros.
              </div>
            </div>

            {/* Selector de Materia / Carpeta */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Materia o Cátedra a evaluar:</label>
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800/90 px-4 py-2.5 text-sm text-slate-100 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Todo el repositorio (Repaso general)</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Temporizador por Tarjeta */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-200">Tiempo límite por concepto:</label>
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
                    className={`flex flex-col items-center justify-center rounded-lg border p-3 text-center transition-all ${
                      timerSeconds === t.sec
                        ? "border-amber-500 bg-amber-500/10 text-amber-300 ring-1 ring-amber-500/50"
                        : "border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    <span className="text-sm font-bold">{t.label}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Opciones Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div
                onClick={() => setOnlyWeak(!onlyWeak)}
                className={`flex cursor-pointer items-center justify-between rounded-lg border p-3.5 transition-all ${
                  onlyWeak
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
                    : "border-slate-800 bg-slate-800/30 text-slate-400"
                }`}
              >
                <div>
                  <div className="text-sm font-semibold">Priorizar Solo Conceptos Débiles</div>
                  <div className="text-xs text-slate-400">Filtra tarjetas con R &lt; 75% y errores pedagógicos previos</div>
                </div>
                <input
                  type="checkbox"
                  checked={onlyWeak}
                  onChange={() => {}}
                  className="h-4 w-4 rounded accent-amber-500"
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 p-3.5">
                <div>
                  <div className="text-sm font-semibold text-slate-200">Límite de Tarjetas</div>
                  <div className="text-xs text-slate-400">Cantidad máxima por sesión de choque</div>
                </div>
                <select
                  value={maxCount}
                  onChange={(e) => setMaxCount(Number(e.target.value))}
                  className="rounded border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-200 focus:outline-none"
                >
                  <option value={10}>10 tarjetas</option>
                  <option value={20}>20 tarjetas</option>
                  <option value={35}>35 tarjetas</option>
                  <option value={50}>50 tarjetas</option>
                </select>
              </div>
            </div>

            {/* Botón de Inicio */}
            <div className="pt-4 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={onSessionFinished}
                className="text-slate-400 hover:text-white"
              >
                Volver al catálogo
              </Button>
              <Button
                onClick={handleStartBlitz}
                className="bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold px-6 py-2.5 shadow-lg shadow-amber-900/30 flex items-center gap-2"
              >
                <Flame className="h-5 w-5" />
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
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-4 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Badge variant="warning" className="flex items-center gap-1.5 font-mono">
                <Flame className="h-3.5 w-3.5" />
                BLITZ PRE-EXAMEN
              </Badge>
              <span className="text-xs text-slate-400">
                Tarjeta <span className="font-bold text-white">{currentIndex + 1}</span> de{" "}
                <span className="font-bold text-slate-300">{queue.length}</span>
              </span>
              {requeuedCount > 0 && (
                <Badge variant="danger" className="text-[10px]">
                  +{requeuedCount} reinsertadas
                </Badge>
              )}
            </div>

            {/* Temporizador regresivo */}
            {timerSeconds > 0 && (
              <div
                className={`flex items-center gap-2 font-mono text-sm font-bold px-3 py-1.5 rounded-lg border ${
                  timeRemaining <= 10
                    ? "border-red-500/60 bg-red-950/40 text-red-400 animate-pulse"
                    : "border-slate-700 bg-slate-800 text-amber-400"
                }`}
              >
                <Clock className="h-4 w-4" />
                <span>{timeRemaining}s</span>
              </div>
            )}
          </div>

          {/* Tarjeta de Estudio Blitz */}
          <Card className="border-slate-700/60 bg-slate-900/95 shadow-2xl min-h-[360px] flex flex-col justify-between">
            <div className="p-6 space-y-4">
              {/* Metadatos de la tarjeta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {currentItem.type === "error" ? (
                    <Badge variant="danger" className="text-xs">
                      🔴 ERROR PEDAGÓGICO PREVIO
                    </Badge>
                  ) : currentItem.type === "fsrs" ? (
                    <Badge variant="warning" className="text-xs">
                      🟡 FSRS VULNERABLE ({Math.round(((currentItem.retrievability || 0.5) * 100))}% Retención)
                    </Badge>
                  ) : (
                    <Badge variant="neutral" className="text-xs">
                      ⚪ LEITNER
                    </Badge>
                  )}
                  {currentItem.category && (
                    <span className="text-xs text-slate-400">{currentItem.category}</span>
                  )}
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Urgencia: {currentItem.urgencyScore}/100
                </span>
              </div>

              {/* Anverso / Pregunta */}
              <div className="pt-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Desafío de Evocación Rápida:
                </div>
                <div className="text-lg font-medium text-slate-100 whitespace-pre-line leading-relaxed">
                  {currentItem.prompt}
                </div>
              </div>

              {/* Pistas si existen */}
              {currentItem.hint && !isFlipped && (
                <div className="rounded-lg border border-slate-800 bg-slate-800/40 p-3 text-xs text-slate-400 italic">
                  💡 Pista: {currentItem.hint}
                </div>
              )}

              {/* Reverso / Solución revelada */}
              {isFlipped && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-5 mt-4 space-y-3 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles className="h-4 w-4" />
                    Respuesta y Criterio Pedagógico:
                  </div>
                  <div className="text-sm text-slate-100 whitespace-pre-line leading-relaxed">
                    {currentItem.answer}
                  </div>
                </div>
              )}
            </div>

            {/* Barra de Acciones y Calificación */}
            <div className="border-t border-slate-800/80 p-4 bg-slate-950/60 rounded-b-xl">
              {!isFlipped ? (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Presiona <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">Espacio</kbd> para revelar
                  </span>
                  <Button
                    onClick={() => setIsFlipped(true)}
                    className="bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Revelar Respuesta
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-xs text-slate-400 font-mono">
                    Califica tu respuesta: <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">1</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">2</kbd>{" "}
                    <kbd className="px-1.5 py-0.5 bg-slate-800 rounded">3</kbd>
                  </span>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      variant="danger"
                      onClick={() => handleRate("fail")}
                      className="flex-1 sm:flex-none text-xs font-bold py-2 flex items-center gap-1.5"
                    >
                      <XCircle className="h-4 w-4" />
                      [1] Fallo (Reinsertar)
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => handleRate("doubt")}
                      className="flex-1 sm:flex-none text-xs font-bold py-2 flex items-center gap-1.5"
                    >
                      <AlertTriangle className="h-4 w-4" />
                      [2] Dudoso
                    </Button>
                    <Button
                      variant="primary"
                      onClick={() => handleRate("correct")}
                      className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-500 text-xs font-bold py-2 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="h-4 w-4" />
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
        <Card className="border-amber-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-md">
          <CardHeader className="border-b border-slate-800 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl font-bold text-white">
                    Diagnóstico de Sesión Blitz Completada
                  </CardTitle>
                  <p className="text-xs text-slate-400 mt-1">
                    Evaluación de impacto pre-examen. Tu cronograma FSRS de largo plazo permanece protegido.
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>

          <div className="p-6 space-y-6">
            {/* Métricas clave */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-center">
                <div className="text-2xl font-black text-white">{correctItems.length}</div>
                <div className="text-xs text-slate-400 mt-1">Aciertos Inmediatos</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-center">
                <div className="text-2xl font-black text-amber-400">{doubtItems.length}</div>
                <div className="text-xs text-slate-400 mt-1">Dudosos / Esfuerzo</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-center">
                <div className="text-2xl font-black text-red-400">{failedItems.length}</div>
                <div className="text-xs text-slate-400 mt-1">Fallos Reinsertados</div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4 text-center">
                <div className="text-2xl font-black text-emerald-400">
                  {queue.length > 0 ? Math.round((correctItems.length / queue.length) * 100) : 100}%
                </div>
                <div className="text-xs text-slate-400 mt-1">Efectividad de Evocación</div>
              </div>
            </div>

            {/* Conceptos Críticos a vigilar */}
            {failedItems.length > 0 ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-red-300">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  Conceptos Vulnerables para Repasar antes de Rendir:
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {failedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-red-500/20 bg-red-950/20 p-3 text-xs text-slate-200"
                    >
                      <div className="font-semibold text-red-300">{item.prompt}</div>
                      <div className="text-slate-400 mt-1 line-clamp-2">{item.answer}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-4 text-center text-emerald-300 text-xs">
                🎉 ¡Excelente! No registraste fallos persistentes en esta ronda. Tus puntos débiles evaluados quedaron consolidados.
              </div>
            )}

            {/* Recomendación Pedagógica Pre-Examen */}
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400 leading-relaxed">
              <span className="font-bold text-amber-300">Recomendación Cognitiva Pre-Examen:</span> Si tu examen es dentro de menos de 6 a 8 horas, suspende el estudio masivo continuo y asegura un descanso mínimo de 90 a 180 minutos. El sueño de ondas lentas y fase REM es indispensable para transferir lo repasado desde el hipocampo hacia la neocorteza antes de la prueba.
            </div>

            {/* Acciones Finales */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setPhase("setup")}
                className="border-slate-700 text-slate-300 hover:text-white flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Nueva Sesión Blitz
              </Button>
              <Button
                onClick={onSessionFinished}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-2.5 flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Finalizar y Salir
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
