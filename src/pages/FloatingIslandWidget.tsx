import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Gamepad2,
  Bell,
  ChevronUp,
  ChevronDown,
  BookOpen,
  AlertTriangle,
  X,
  GripVertical,
  Maximize2,
  Sun,
  Moon,
} from "lucide-react";
import { useDynamicIslandStore } from "../stores/useDynamicIslandStore";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { useDateFormatStore, formatDateWithPattern } from "../stores/useDateFormatStore";
import {
  closeFloatingIslandWindow,
  showMainWindow,
  startIslandDrag,
  getIslandDockPosition,
  setIslandState,
  type IslandPlacement,
} from "../platform/islandWindow";
import { clsx } from "clsx";

export const FloatingIslandWidget: React.FC = () => {
  const dateFormat = useDateFormatStore((s) => s.dateFormat);

  const {
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

  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Posición de acople magnético: "top-center" | "top-left" | "top-right" | "bottom-center" | "free"
  const [dockPosition, setDockPosition] = useState<string>(() => {
    return localStorage.getItem("studylab-island-dock") || "top-center";
  });

  // Dirección dinámica de apertura: "up" (hacia arriba) o "down" (hacia abajo)
  const [openDirection, setOpenDirection] = useState<"up" | "down">(() => {
    return (localStorage.getItem("studylab-island-direction") as "up" | "down") || "down";
  });

  // Animación leve de acomodo / acople magnético
  const [isSettling, setIsSettling] = useState(false);
  const triggerSettleAnimation = useCallback(() => {
    setIsSettling(true);
    const timer = setTimeout(() => setIsSettling(false), 380);
    return () => clearTimeout(timer);
  }, []);

  // Horario dinámico: Día (07:00 a 19:00: blanco) vs Noche (19:00 a 07:00: negro)
  const currentHour = currentTime.getHours();
  const isDayTime = currentHour >= 7 && currentHour < 19;

  useEffect(() => {
    localStorage.setItem("studylab-island-dock", dockPosition);
    localStorage.setItem("studylab-island-direction", openDirection);
  }, [dockPosition, openDirection]);

  useEffect(() => {
    // Asegurar transparencia total de ventanas y contenedores para eliminar bordes de página
    const originalHtmlBg = document.documentElement.style.background;
    const originalBodyBg = document.body.style.background;

    document.documentElement.style.background = "transparent";
    document.documentElement.style.border = "none";
    document.documentElement.style.boxShadow = "none";
    document.documentElement.style.overflow = "hidden";

    document.body.style.background = "transparent";
    document.body.style.border = "none";
    document.body.style.boxShadow = "none";
    document.body.style.overflow = "hidden";

    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.style.background = "transparent";
      rootEl.style.border = "none";
      rootEl.style.boxShadow = "none";
    }

    const clockInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Consultar posición magnética inicial y escuchar cambios de acople desde Tauri
    void getIslandDockPosition().then((pos) => {
      if (pos && pos.dock !== "click") {
        setDockPosition(pos.dock);
        setOpenDirection(pos.openDirection);
      }
    });

    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/event")
      .then(({ listen }) => {
        listen<IslandPlacement>("island-dock-changed", (event) => {
          if (event.payload && event.payload.dock !== "click") {
            setDockPosition(event.payload.dock);
            setOpenDirection(event.payload.openDirection);
            triggerSettleAnimation();
          }
        }).then((fn) => {
          unlisten = fn;
        });
      })
      .catch(() => {});

    return () => {
      clearInterval(clockInterval);
      unlisten?.();
      document.documentElement.style.background = originalHtmlBg;
      document.body.style.background = originalBodyBg;
    };
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      tickTimer();
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning, tickTimer]);

  useEffect(() => {
    if (!activeAlert) return;
    const timeout = setTimeout(() => {
      dismissAlert();
    }, activeAlert.level === "urgent" ? 8000 : 6000);
    return () => clearTimeout(timeout);
  }, [activeAlert, dismissAlert]);

  useEffect(() => {
    if (!showReminders || reminderFrequency <= 0 || gameMode) return;

    const intervalMs = reminderFrequency * 60 * 1000;
    const smartTips = [
      { title: "Pausa activa", subtitle: "Levantate y estirá los brazos 1 minuto." },
      { title: "Regla 20-20-20", subtitle: "Mirá a lo lejos 20 segundos para descansar la vista." },
      { title: "Hidratación", subtitle: "Tomá un vaso de agua para tu concentración." },
    ];

    const interval = setInterval(() => {
      const tip = smartTips[Math.floor(Math.random() * smartTips.length)];
      triggerAlert({ title: tip.title, subtitle: tip.subtitle, level: "info" });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [showReminders, reminderFrequency, gameMode, triggerAlert]);

  const upcomingDeadlines = useLiveQuery(
    async () => {
      try {
        const now = Date.now();
        const list = await db.deadlines.filter((d) => d.dueDate >= now).toArray();
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

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formattedClock = currentTime.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const islandState = activeAlert ? "alert" : isExpanded ? "expanded" : "pill";

  const progressPercent = Math.max(
    0,
    Math.min(100, ((timerTotal - timerSeconds) / (timerTotal || 1)) * 100)
  );

  // Arrastre fluido nativo y auto-colocación magnética en los 4 puntos
  const handleStartDrag = useCallback((e: React.PointerEvent | React.MouseEvent) => {
    if (e.button !== 0) return; // Solo clic izquierdo
    const target = e.target as HTMLElement | null;
    // Si el usuario hace clic en botones, inputs o enlaces, no iniciar arrastre
    if (target?.closest("button") || target?.closest("input") || target?.closest("a")) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    void (async () => {
      const placement = await startIslandDrag();
      if (placement && placement.dock !== "click") {
        setDockPosition(placement.dock);
        setOpenDirection(placement.openDirection);
        triggerSettleAnimation();
      }
    })();
  }, [triggerSettleAnimation]);

  // Modo Juego: solo deja pasar alertas urgentes
  if (gameMode && (!activeAlert || activeAlert.level !== "urgent")) {
    return null;
  }

  // Tokens de tema según la hora (Día / Noche) - Sin degradados oscuros laterales
  const themeClasses = {
    container: isDayTime
      ? "bg-white/95 text-neutral-900 border border-neutral-300 shadow-sm"
      : "bg-neutral-950/98 text-white border border-white/20 shadow-sm",
    box: isDayTime
      ? "bg-neutral-100/95 border border-neutral-200/90 text-neutral-900"
      : "bg-white/5 border border-white/10 text-white",
    muted: isDayTime ? "text-neutral-500" : "text-neutral-400",
    body: isDayTime ? "text-neutral-800" : "text-neutral-200",
    pillHover: isDayTime ? "hover:bg-neutral-100/80" : "hover:bg-neutral-900/80",
    actionButton: isDayTime
      ? "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-200/70"
      : "text-neutral-400 hover:text-white hover:bg-white/10",
    dragHandle: isDayTime
      ? "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/60"
      : "text-neutral-500 hover:text-neutral-200 hover:bg-white/10",
    progressBg: isDayTime ? "bg-neutral-200" : "bg-white/10",
    progressFill: isDayTime ? "bg-sky-600" : "bg-accent-primary",
    borderDivider: isDayTime ? "border-neutral-200" : "border-white/10",
  };

  // Sincronizar dimensiones y anclaje de la ventana nativa de forma atómica
  useEffect(() => {
    if (islandState === "expanded") {
      void setIslandState("expanded", openDirection);
    } else if (islandState === "alert") {
      void setIslandState("alert", openDirection);
    } else {
      const timer = setTimeout(() => {
        void setIslandState("pill", openDirection);
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [islandState, openDirection]);

  // Determinar si la isla se abre hacia arriba según el cálculo dinámico
  const isUp = openDirection === "up";
  const isLeftDock = dockPosition === "top-left";
  const isRightDock = dockPosition === "top-right";

  const outerContainerClass = clsx(
    "w-full h-full flex p-0 m-0 bg-transparent select-none overflow-hidden border-none outline-none",
    isUp ? "items-end pb-1" : "items-start pt-1",
    isLeftDock && "justify-start pl-3",
    isRightDock && "justify-end pr-3",
    !isLeftDock && !isRightDock && "justify-center"
  );

  return (
    <div className={outerContainerClass}>
      <motion.div
        animate={{
          width: islandState === "alert" ? 350 : isExpanded ? 380 : 260,
          height: islandState === "alert" ? 48 : isExpanded ? 165 : 38,
          scale: isSettling ? [1, 1.05, 0.98, 1] : 1,
          y: isSettling ? [isUp ? 4 : -4, 0] : 0,
        }}
        transition={{ type: "spring", stiffness: 440, damping: 26 }}
        className={clsx(
          "relative overflow-hidden transition-colors duration-500",
          themeClasses.container,
          "will-change-transform will-change-[width,height]"
        )}
        style={{
          borderRadius: islandState === "pill" ? 9999 : 20,
        }}
      >
        <AnimatePresence>
          {/* 1. Estado de Alerta Dinámica */}
          {islandState === "alert" && activeAlert && (
            <motion.div
              key="widget-alert"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 w-full h-full"
            >
              {/* 6 puntitos de arrastre */}
              <div
                data-tauri-drag-region
                onMouseDown={handleStartDrag}
                onPointerDown={handleStartDrag}
                className={clsx(
                  "cursor-grab active:cursor-grabbing p-1 rounded transition-colors flex items-center justify-center shrink-0 select-none",
                  themeClasses.dragHandle
                )}
                title="Arrastrar isla flotante (6 puntos)"
                aria-label="Arrastrar isla flotante"
              >
                <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
              </div>

              <div
                className={clsx(
                  "p-1 rounded-full shrink-0",
                  activeAlert.level === "urgent"
                    ? "bg-rose-500/20 text-rose-500 animate-pulse"
                    : "bg-sky-500/20 text-sky-600"
                )}
              >
                {activeAlert.level === "urgent" ? (
                  <AlertTriangle className="h-3.5 w-3.5" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
              </div>
              <div className="flex-1 min-w-0" data-tauri-drag-region onMouseDown={handleStartDrag} onPointerDown={handleStartDrag}>
                <p className={clsx("text-xs font-semibold truncate pointer-events-none", themeClasses.body)}>{activeAlert.title}</p>
                {activeAlert.subtitle && (
                  <p className={clsx("text-[10px] truncate pointer-events-none", themeClasses.muted)}>{activeAlert.subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={dismissAlert}
                className={clsx("p-1 rounded transition-colors", themeClasses.actionButton)}
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}

          {/* 2. Estado Expandido - Se puede mover cómodamente desde los 6 puntos o el encabezado */}
          {islandState === "expanded" && (
            <motion.div
              key="widget-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onMouseDown={handleStartDrag}
              onPointerDown={handleStartDrag}
              className="w-full h-full p-3 flex flex-col justify-between"
            >
              {/* Encabezado con 6 puntitos, indicador de día/noche y controles */}
              <div
                data-tauri-drag-region
                onMouseDown={handleStartDrag}
                onPointerDown={handleStartDrag}
                className={clsx("flex items-center justify-between pb-1.5 border-b cursor-grab active:cursor-grabbing", themeClasses.borderDivider)}
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {/* 6 puntitos de arrastre prominentes */}
                  <div
                    data-tauri-drag-region
                    onMouseDown={handleStartDrag}
                    onPointerDown={handleStartDrag}
                    className={clsx(
                      "p-1 rounded transition-colors flex items-center justify-center shrink-0 select-none cursor-grab active:cursor-grabbing",
                      themeClasses.dragHandle
                    )}
                    title="Arrastrar isla flotante (6 puntos)"
                    aria-label="Arrastrar isla flotante"
                  >
                    <GripVertical className="h-4 w-4 pointer-events-none" />
                  </div>
                  <span className={clsx("text-[11px] font-semibold select-none pointer-events-none", themeClasses.body)}>
                    StudyLab Desktop
                  </span>
                  {isDayTime ? (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-600 bg-amber-100/80 px-1.5 py-0.5 rounded-full pointer-events-none">
                      <Sun className="h-2.5 w-2.5" /> Día
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[9px] font-medium text-indigo-300 bg-indigo-950/80 px-1.5 py-0.5 rounded-full border border-indigo-500/20 pointer-events-none">
                      <Moon className="h-2.5 w-2.5" /> Noche
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={toggleGameMode}
                    className={clsx(
                      "p-1 rounded text-[10px] transition-colors",
                      gameMode
                        ? "bg-rose-500/20 text-rose-500"
                        : themeClasses.actionButton
                    )}
                    title="Modo Juego: silenciar alertas no urgentes"
                  >
                    <Gamepad2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void showMainWindow()}
                    className={clsx("p-1 rounded transition-colors", themeClasses.actionButton)}
                    title="Abrir ventana principal de StudyLab"
                  >
                    <Maximize2 className="h-3 w-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpanded(false)}
                    className={clsx("p-1 rounded transition-colors", themeClasses.actionButton)}
                    title={isUp ? "Plegar isla hacia abajo" : "Plegar isla hacia arriba"}
                  >
                    {isUp ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => void closeFloatingIslandWindow()}
                    className={clsx("p-1 rounded transition-colors hover:text-rose-500", themeClasses.actionButton)}
                    title="Cerrar ventana flotante"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>

              {/* Controles del Temporizador Pomodoro */}
              {showTimer && (
                <div className={clsx("rounded-lg p-2 flex items-center justify-between", themeClasses.box)}>
                  <div>
                    <span className="font-mono text-xl font-bold tracking-wider">
                      {formatTimer(timerSeconds)}
                    </span>
                    <span
                      className={clsx(
                        "text-[9px] uppercase ml-1.5 font-bold",
                        isDayTime ? "text-sky-700" : "text-accent-primary"
                      )}
                    >
                      {timerMode === "work" ? "Foco" : "Pausa"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => (isTimerRunning ? pauseTimer() : startTimer())}
                      className={clsx(
                        "p-1.5 rounded-full transition-transform active:scale-95 shadow-2xs",
                        isTimerRunning
                          ? "bg-amber-500 text-black"
                          : isDayTime
                          ? "bg-sky-600 text-white hover:bg-sky-700"
                          : "bg-accent-primary text-white hover:bg-accent-hover"
                      )}
                      title={isTimerRunning ? "Pausar" : "Iniciar"}
                    >
                      {isTimerRunning ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => resetTimer()}
                      className={clsx(
                        "p-1.5 rounded-full transition-transform active:scale-95",
                        isDayTime
                          ? "bg-neutral-200 text-neutral-700 hover:bg-neutral-300"
                          : "bg-white/10 text-neutral-300 hover:text-white"
                      )}
                      title="Reiniciar temporizador"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}

              {/* Barra de Progreso */}
              <div className={clsx("w-full h-1 rounded-full overflow-hidden", themeClasses.progressBg)}>
                <div
                  className={clsx("h-full transition-all duration-300", themeClasses.progressFill)}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Próxima Entrega / Footer */}
              <div
                data-tauri-drag-region
                onMouseDown={handleStartDrag}
                onPointerDown={handleStartDrag}
                className={clsx("flex items-center justify-between text-[10px] pt-0.5 cursor-grab active:cursor-grabbing", themeClasses.muted)}
              >
                <span className="truncate max-w-[220px] pointer-events-none">
                  {nextDeadline
                    ? `📅 ${nextDeadline.title} (${formatDateWithPattern(nextDeadline.dueDate, dateFormat)})`
                    : "📅 Sin entregas urgentes"}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setTimerMode("work")}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors",
                      timerMode === "work"
                        ? isDayTime
                          ? "bg-neutral-200 text-neutral-900 font-bold"
                          : "bg-white/20 text-white font-bold"
                        : themeClasses.actionButton
                    )}
                  >
                    25m
                  </button>
                  <button
                    type="button"
                    onClick={() => setTimerMode("break")}
                    className={clsx(
                      "px-1.5 py-0.5 rounded text-[9px] font-medium transition-colors",
                      timerMode === "break"
                        ? isDayTime
                          ? "bg-neutral-200 text-neutral-900 font-bold"
                          : "bg-white/20 text-white font-bold"
                        : themeClasses.actionButton
                    )}
                  >
                    5m
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3. Estado Píldora Compacta (Default) */}
          {islandState === "pill" && (
            <motion.div
              key="widget-pill"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-between h-full w-full"
            >
              {/* 6 PUNTITOS DEL LADO IZQUIERDO para arrastre inmediato y fácil */}
              <div
                data-tauri-drag-region
                onMouseDown={handleStartDrag}
                onPointerDown={handleStartDrag}
                className={clsx(
                  "cursor-grab active:cursor-grabbing px-2.5 h-full flex items-center justify-center shrink-0 transition-colors rounded-l-full select-none",
                  themeClasses.dragHandle
                )}
                title="Arrastrar isla flotante (6 puntos)"
                aria-label="Arrastrar isla flotante"
              >
                <GripVertical className="h-4 w-4 pointer-events-none" />
              </div>

              {/* Área interactiva central y derecha para expandir o ver status */}
              <div
                onClick={toggleExpanded}
                className={clsx(
                  "flex-1 flex items-center justify-between pr-3 h-full cursor-pointer transition-colors rounded-r-full",
                  themeClasses.pillHover
                )}
                title="Clic para expandir / ver opciones"
              >
                <div className="flex items-center gap-1.5">
                  {showTimer && isTimerRunning ? (
                    <>
                      <span
                        className={clsx(
                          "h-2 w-2 rounded-full animate-ping",
                          isDayTime ? "bg-sky-600" : "bg-accent-primary"
                        )}
                      />
                      <span className="font-mono text-xs font-bold">{formatTimer(timerSeconds)}</span>
                    </>
                  ) : showClock ? (
                    <>
                      {isDayTime ? (
                        <Sun className="h-3 w-3 text-amber-500 shrink-0" />
                      ) : (
                        <Moon className="h-3 w-3 text-indigo-400 shrink-0" />
                      )}
                      <Clock className={clsx("h-3 w-3 shrink-0", themeClasses.muted)} />
                      <span className="font-mono text-xs font-semibold">{formattedClock}</span>
                    </>
                  ) : (
                    <>
                      <BookOpen
                        className={clsx("h-3 w-3 shrink-0", isDayTime ? "text-sky-600" : "text-accent-primary")}
                      />
                      <span className="text-xs font-semibold">StudyLab</span>
                    </>
                  )}
                </div>

                <span className={clsx("text-xs mx-1", themeClasses.muted)}>·</span>

                <div className={clsx("text-[11px] truncate max-w-[110px]", themeClasses.muted)}>
                  {isTimerRunning ? (
                    <span className={clsx("font-semibold", isDayTime ? "text-sky-700" : "text-accent-primary")}>
                      {timerMode === "work" ? "Foco" : "Pausa"}
                    </span>
                  ) : nextDeadline ? (
                    <span>{nextDeadline.title}</span>
                  ) : (
                    <span>Al día</span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};
