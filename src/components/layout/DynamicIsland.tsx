import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Gamepad2,
  Bell,
  ChevronUp,
  Calendar,
  BookOpen,
  AlertTriangle,
  X,
  Eye,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { useDynamicIslandStore } from "../../stores/useDynamicIslandStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { useDateFormatStore, formatDateWithPattern } from "../../stores/useDateFormatStore";
import { openFloatingIslandWindow } from "../../platform/islandWindow";
import { clsx } from "clsx";

export const DynamicIsland: React.FC = () => {
  const navigate = useNavigate();
  const dateFormat = useDateFormatStore((s) => s.dateFormat);

  const {
    enabled,
    gameMode,
    showClock,
    showTimer,
    showReminders,
    reminderFrequency,
    isExpanded,
    activeAlert,
    timerSeconds,
    timerTotal,
    isTimerRunning,
    timerMode,
    toggleExpanded,
    setExpanded,
    startTimer,
    pauseTimer,
    resetTimer,
    tickTimer,
    setTimerMode,
    toggleGameMode,
    dismissAlert,
    triggerAlert,
  } = useDynamicIslandStore();

  // Reloj digital en vivo (HH:MM:SS)
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // Tick del temporizador si está corriendo
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  // Auto-dismiss de alertas normales tras 6 segundos (las urgentes se quedan 8 segundos)
  useEffect(() => {
    if (!activeAlert) return;
    const timeout = setTimeout(() => {
      dismissAlert();
    }, activeAlert.level === "urgent" ? 8000 : 6000);
    return () => clearTimeout(timeout);
  }, [activeAlert, dismissAlert]);

  // Chequeo de recordatorios periódicos inteligentes
  useEffect(() => {
    if (!enabled || !showReminders || reminderFrequency <= 0 || gameMode) return;

    const intervalMs = reminderFrequency * 60 * 1000;
    const smartTips = [
      { title: "Pausa activa recomendada", subtitle: "Llevás un buen bloque de estudio. Levantate y estirá 1 minuto." },
      { title: "Regla 20-20-20 para tu vista", subtitle: "Mirá un objeto a 6 metros durante 20 segundos para descansar los ojos." },
      { title: "Momento de hidratación", subtitle: "Tomá un vaso de agua para mantener el rendimiento cerebral óptimo." },
      { title: "Postura y respiración", subtitle: "Alineá la espalda con la silla y hacé 3 respiraciones profundas." },
    ];

    const interval = setInterval(() => {
      const randomTip = smartTips[Math.floor(Math.random() * smartTips.length)];
      triggerAlert({
        title: randomTip.title,
        subtitle: randomTip.subtitle,
        level: "info",
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, showReminders, reminderFrequency, gameMode, triggerAlert]);

  // Consultar próximo vencimiento pendiente
  const upcomingDeadlines = useLiveQuery(
    async () => {
      try {
        const now = Date.now();
        const list = await db.deadlines
          .filter((d) => d.dueDate >= now)
          .toArray();
        return list.sort((a, b) => a.dueDate - b.dueDate);
      } catch {
        return [];
      }
    },
    [],
    []
  );

  const nextDeadline = useMemo(() => {
    return upcomingDeadlines && upcomingDeadlines.length > 0 ? upcomingDeadlines[0] : null;
  }, [upcomingDeadlines]);

  // Formato de tiempo temporizador MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Formato reloj HH:MM
  const formattedClock = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Cálculo de visibilidad:
  // Si está deshabilitada: no se muestra.
  // Si está en Modo Juego: solo se muestra si hay una alerta de nivel 'urgent'.
  if (!enabled) return null;
  if (gameMode && (!activeAlert || activeAlert.level !== "urgent")) {
    return null;
  }

  // Estado visual
  const islandState = activeAlert ? "alert" : isExpanded ? "expanded" : "pill";

  const progressPercent = Math.max(
    0,
    Math.min(100, ((timerTotal - timerSeconds) / (timerTotal || 1)) * 100)
  );

  return (
    <aside
      aria-label="Isla Dinámica Estudiantil"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-40 select-none pointer-events-auto"
    >
      <motion.div
        animate={{
          width: islandState === "alert" ? 360 : isExpanded ? 384 : 240,
          height: islandState === "alert" ? 46 : isExpanded ? 165 : 36,
        }}
        transition={{
          type: "spring",
          stiffness: 420,
          damping: 30,
          mass: 0.6,
        }}
        className={clsx(
          "relative overflow-hidden bg-neutral-950/98 text-white",
          "border border-white/15 shadow-lg",
          "will-change-[width,height,transform]"
        )}
        style={{
          borderRadius: islandState === "pill" ? 9999 : 22,
        }}
      >

        <AnimatePresence>
          {/* ================= ESTADO 1: ALERTA / RECORDATORIO ================= */}
          {islandState === "alert" && activeAlert && (
            <motion.div
              key="island-alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-3 px-4 py-2 min-w-[320px] max-w-[420px]"
            >
              <div
                className={clsx(
                  "p-1.5 rounded-full shrink-0 flex items-center justify-center",
                  activeAlert.level === "urgent"
                    ? "bg-rose-500/20 text-rose-400 animate-pulse"
                    : activeAlert.level === "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-cyan-500/20 text-cyan-400"
                )}
              >
                {activeAlert.level === "urgent" ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : activeAlert.level === "warning" ? (
                  <Bell className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-medium text-white truncate leading-tight">
                  {activeAlert.title}
                </p>
                {activeAlert.subtitle && (
                  <p className="text-[11px] text-neutral-400 truncate leading-tight mt-0.5">
                    {activeAlert.subtitle}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  dismissAlert();
                }}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Descartar aviso"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}

          {/* ================= ESTADO 2: EXPANDIDO (CONTROLES COMPLETOS) ================= */}
          {islandState === "expanded" && (
            <motion.div
              key="island-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="w-[384px] p-4 flex flex-col gap-3.5"
            >
              {/* Header de la Isla */}
              <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded-md bg-accent-primary/20 text-accent-primary">
                    <BookOpen className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-xs font-semibold text-neutral-200 tracking-wide">
                    StudyLab Focus Island
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  {/* Botón Desprender al Escritorio */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void openFloatingIslandWindow();
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Desprender isla al escritorio (permanece visible aún al minimizar la app)"
                  >
                    <ExternalLink className="h-3 w-3 text-cyan-400" />
                    <span>Desprender</span>
                  </button>

                  {/* Botón rápido Modo Juego */}
                  <button
                    type="button"
                    onClick={toggleGameMode}
                    className={clsx(
                      "flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors",
                      gameMode
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : "bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10"
                    )}
                    title="Modo Juego: silencia la isla salvo alertas urgentes"
                  >
                    <Gamepad2 className="h-3 w-3" />
                    <span>{gameMode ? "Juego ON" : "Juego"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Colapsar isla"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Sección Temporizador Pomodoro */}
              {showTimer && (
                <div className="bg-white/5 rounded-xl p-3 border border-white/5 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-2xl font-bold tracking-wider text-white">
                        {formatTimer(timerSeconds)}
                      </span>
                      <span
                        className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider",
                          timerMode === "work"
                            ? "bg-accent-primary/20 text-accent-primary"
                            : "bg-emerald-500/20 text-emerald-400"
                        )}
                      >
                        {timerMode === "work" ? "Estudio" : "Pausa"}
                      </span>
                    </div>

                    {/* Controles de reproducción */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          if (isTimerRunning) pauseTimer();
                          else startTimer();
                        }}
                        className={clsx(
                          "p-2 rounded-full transition-all shadow-sm",
                          isTimerRunning
                            ? "bg-amber-500 text-black hover:bg-amber-400"
                            : "bg-accent-primary text-white hover:bg-accent-hover"
                        )}
                        title={isTimerRunning ? "Pausar sesión" : "Iniciar sesión"}
                      >
                        {isTimerRunning ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => resetTimer()}
                        className="p-2 rounded-full bg-white/10 text-neutral-300 hover:text-white hover:bg-white/20 transition-colors"
                        title="Reiniciar temporizador"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        "h-full transition-all duration-300 rounded-full",
                        timerMode === "work" ? "bg-accent-primary" : "bg-emerald-500"
                      )}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Selector rápido de bloques */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setTimerMode("work")}
                      className={clsx(
                        "flex-1 py-1 rounded text-[11px] font-medium transition-colors",
                        timerMode === "work"
                          ? "bg-white/15 text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      25m Foco
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimerMode("break")}
                      className={clsx(
                        "flex-1 py-1 rounded text-[11px] font-medium transition-colors",
                        timerMode === "break"
                          ? "bg-white/15 text-white"
                          : "text-neutral-400 hover:text-white hover:bg-white/5"
                      )}
                    >
                      5m Descanso
                    </button>
                  </div>
                </div>
              )}

              {/* Próximo vencimiento o acceso al calendario */}
              <div
                onClick={() => {
                  setExpanded(false);
                  navigate("/calendar");
                }}
                className="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition-colors"
                title="Abrir Calendario Académico"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Calendar className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-neutral-200 truncate">
                      {nextDeadline ? nextDeadline.title : "Sin vencimientos hoy"}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {nextDeadline
                        ? `Entrega: ${formatDateWithPattern(nextDeadline.dueDate, dateFormat)}`
                        : "Ver calendario y repasos"}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] text-cyan-400 hover:underline shrink-0">
                  Ver agenda →
                </span>
              </div>
            </motion.div>
          )}

          {/* ================= ESTADO 3: PÍLDORA COMPACTA (ESTADO HABITUAL) ================= */}
          {islandState === "pill" && (
            <motion.div
              key="island-pill"
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.18 }}
              onClick={toggleExpanded}
              className="group flex items-center gap-2.5 px-3.5 py-1.5 cursor-pointer hover:bg-neutral-900 transition-colors"
              title="Clic para expandir controles de la Isla Dinámica (Ctrl+I)"
            >
              {/* Indicador de temporizador o reloj */}
              {showTimer && isTimerRunning ? (
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-primary" />
                  </span>
                  <span className="font-mono text-xs font-bold text-neutral-100 tracking-wide">
                    {formatTimer(timerSeconds)}
                  </span>
                </div>
              ) : showClock ? (
                <div className="flex items-center gap-1.5 text-neutral-300">
                  <Clock className="h-3 w-3 text-neutral-400" />
                  <span className="font-mono text-xs font-semibold tracking-wide text-neutral-200">
                    {formattedClock}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-neutral-300">
                  <BookOpen className="h-3 w-3 text-accent-primary" />
                  <span className="text-xs font-semibold">StudyLab</span>
                </div>
              )}

              {/* Separador sutil */}
              <span className="text-neutral-600 text-xs select-none">·</span>

              {/* Indicador de estado / próximo evento */}
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 max-w-[150px] truncate">
                {isTimerRunning ? (
                  <span className="text-accent-primary truncate">
                    {timerMode === "work" ? "Enfoque" : "Pausa"}
                  </span>
                ) : nextDeadline ? (
                  <span className="truncate group-hover:text-neutral-200 transition-colors">
                    {nextDeadline.title}
                  </span>
                ) : (
                  <span className="text-neutral-400 group-hover:text-neutral-200 transition-colors">
                    Día al día
                  </span>
                )}
              </div>

              {/* Icono discreto de acción / hover hint */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 flex items-center gap-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void openFloatingIslandWindow();
                  }}
                  className="p-0.5 rounded text-neutral-400 hover:text-cyan-400"
                  title="Desprender isla al escritorio (permanece visible al minimizar)"
                >
                  <ExternalLink className="h-3 w-3" />
                </button>
                <Eye className="h-3 w-3 text-neutral-400" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </aside>
  );
};
