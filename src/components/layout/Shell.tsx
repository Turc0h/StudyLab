import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { MobileNav } from "../nav/MobileNav";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { GuideStatusBar } from "../guide/GuideStatusBar";
import { OrganizationDrawer } from "../organization/OrganizationDrawer";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { toggleFloatingIslandWindow, openFloatingIslandWindow } from "../../platform/islandWindow";
import { isDesktop } from "../../platform/platform";
import { useThemeStore } from "../../stores/useThemeStore";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useCommandPaletteStore } from "../../stores/useCommandPaletteStore";
import { useDynamicIslandStore } from "../../stores/useDynamicIslandStore";
import { CommandPalette } from "../command-palette/CommandPalette";
import { EASE_EXPO_OUT, DURATION, STAGGER } from "../../lib/motion-tokens";
import { Minimize2 } from "lucide-react";
import { clsx } from "clsx";

const shellVariants = {
  hidden: { opacity: 1 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: STAGGER.base,
      delayChildren: 0.05,
    },
  },
};

const blockVariants = {
  hidden: { opacity: 0.98, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: DURATION.slow,
      ease: EASE_EXPO_OUT,
    },
  },
};

let hasBooted = false;

export const Shell: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isFocusMode = useFocusModeStore((s) => s.isFocusMode);
  const exitFocusMode = useFocusModeStore((s) => s.exitFocusMode);
  const animationsEnabled = useThemeStore((s) => s.animationsEnabled);
  const reducedMotion = useThemeStore((s) => s.reducedMotion);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);
  const isOrgOpen = useOrganizationStore((s) => s.isOpen);
  const closeOrg = useOrganizationStore((s) => s.closeOrganization);
  const toggleOrg = useOrganizationStore((s) => s.toggleOrganization);
  const isNotifOpen = useNotificationStore((s) => s.isOpen);
  const setIsNotifOpen = useNotificationStore((s) => s.setIsOpen);
  const toggleNotif = useNotificationStore((s) => s.toggleOpen);
  const isCommandPaletteOpen = useCommandPaletteStore((s) => s.isOpen);
  const toggleCommandPalette = useCommandPaletteStore((s) => s.toggle);
  const closeCommandPalette = useCommandPaletteStore((s) => s.close);
  const isIslandExpanded = useDynamicIslandStore((s) => s.isExpanded);
  const setIslandExpanded = useDynamicIslandStore((s) => s.setExpanded);
  const toggleIslandExpanded = useDynamicIslandStore((s) => s.toggleExpanded);
  const location = useLocation();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Sincronizar clases de preferencias de movimiento y animaciones
  useEffect(() => {
    if (!animationsEnabled) {
      document.documentElement.classList.add("no-animations");
    } else {
      document.documentElement.classList.remove("no-animations");
    }

    if (reducedMotion) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }
  }, [animationsEnabled, reducedMotion]);

  // Inicializar ventana flotante de escritorio independiente tras First Paint de forma no bloqueante
  useEffect(() => {
    // En Web no abrir ventanas emergentes no solicitadas (evita bloqueo de navegador y carga doble)
    if (!isDesktop()) return;

    // En Desktop diferir tras First Paint para eliminar competencia de procesos y arranque pesado
    const timer = setTimeout(() => {
      void openFloatingIslandWindow();
    }, 1200);

    return () => clearTimeout(timer);
  }, []);

  // Manejo de atajos globales: Esc, Ctrl+K (Command Palette), Ctrl+B (Sidebar), Ctrl+O (Org), Ctrl+N (Notif), Ctrl+I (Island)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar eventos generados por mantener pulsada la tecla repetidamente
      if (e.repeat) return;

      if (e.key === "Escape") {
        if (isIslandExpanded) {
          setIslandExpanded(false);
        } else if (isCommandPaletteOpen) {
          closeCommandPalette();
        } else if (isNotifOpen) {
          setIsNotifOpen(false);
        } else if (isOrgOpen) {
          closeOrg();
        } else if (isFocusMode) {
          exitFocusMode();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        toggleCommandPalette();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "o") {
        e.preventDefault();
        toggleOrg();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        toggleNotif();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        void toggleFloatingIslandWindow();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCommandPaletteOpen,
    closeCommandPalette,
    toggleCommandPalette,
    isIslandExpanded,
    setIslandExpanded,
    toggleIslandExpanded,
    isFocusMode,
    exitFocusMode,
    toggleSidebar,
    isOrgOpen,
    closeOrg,
    toggleOrg,
    isNotifOpen,
    setIsNotifOpen,
    toggleNotif,
  ]);

  const getPageMeta = () => {
    const path = location.pathname;
    if (path.startsWith("/academic")) {
      return { title: "Espacio de estudio", subtitle: "Leé, anotá y trabajá con tus materiales" };
    }
    if (path.startsWith("/workspace") || path.startsWith("/methods")) {
      return { title: "Estudiar", subtitle: "Elegí qué aprender hoy y cómo encararlo" };
    }
    if (path.startsWith("/graph")) {
      return { title: "Progreso", subtitle: "Seguimiento de tus materias y temas" };
    }
    if (path.startsWith("/files")) {
      return { title: "Biblioteca", subtitle: "Materias, apuntes y documentos en un mismo lugar" };
    }
    if (path.startsWith("/session")) {
      return { title: "Sesión de estudio", subtitle: "Un bloque de concentración, a tu ritmo" };
    }
    if (path.startsWith("/pdf")) {
      return { title: "Lector PDF", subtitle: "Leé y anotá tus documentos" };
    }
    if (path.startsWith("/ocr")) {
      return { title: "Digitalizar apuntes", subtitle: "Convertí páginas escaneadas en texto" };
    }
    if (path.startsWith("/books")) {
      return { title: "Separar capítulos", subtitle: "Organizá libros extensos por capítulos" };
    }
    if (path.startsWith("/ambient")) {
      return { title: "Sonido de concentración", subtitle: "Elegí un ambiente para acompañar tu sesión" };
    }
    if (path.startsWith("/settings")) {
      return { title: "Configuración", subtitle: "Preferencias y datos de StudyLab" };
    }
    if (path.startsWith("/calendar") || path.startsWith("/organization")) {
      return { title: "Agenda", subtitle: "Clases, exámenes y fechas importantes" };
    }
    if (path.startsWith("/blackboard") || path.startsWith("/whiteboard")) {
      return { title: "Pizarra", subtitle: "Desarrollá ideas y resolvé ejercicios" };
    }
    return { title: "Inicio", subtitle: "Tu vida universitaria, en un solo lugar" };
  };

  const isColdBoot = !hasBooted;
  useEffect(() => {
    hasBooted = true;
  }, []);

  const meta = getPageMeta();
  const shouldAnimate = animationsEnabled && !reducedMotion;

  return (
    <motion.div
      initial={isColdBoot && shouldAnimate ? "hidden" : false}
      animate={shouldAnimate ? "visible" : false}
      variants={shellVariants}
      className="flex h-screen w-full bg-bg-primary text-text-primary overflow-hidden relative"
    >
      {/* Botón flotante para salir del Modo Enfoque */}
      {isFocusMode && (
        <button
          type="button"
          onClick={exitFocusMode}
          className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-border-subtle bg-bg-elevated/95 backdrop-blur-xs shadow-lg text-xs font-sans text-text-secondary hover:text-text-primary hover:border-accent-primary transition-all animate-in fade-in cursor-pointer"
          title="Salir del Modo Enfoque (o presiona Esc)"
        >
          <Minimize2 className="h-3.5 w-3.5 text-accent-primary" />
          <span>Salir de Modo Enfoque (Esc)</span>
        </button>
      )}

      {/* Sidebar (oculto en Modo Enfoque) */}
      {!isFocusMode && (
        <motion.div variants={blockVariants} className="shrink-0 flex h-screen">
          <Sidebar />
        </motion.div>
      )}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header (oculto en Modo Enfoque) */}
        {!isFocusMode && (
          <motion.div variants={blockVariants} className="shrink-0">
            <Header
              title={meta.title}
              subtitle={meta.subtitle}
              isDark={theme === "dark"}
              onToggleTheme={toggleTheme}
            />
          </motion.div>
        )}

        {/* Contenido Principal con Fluid Layout Responsivo */}
        <main className={clsx("flex-1 overflow-y-auto transition-all", isFocusMode ? "p-4 pb-8 md:p-8" : "px-4 pb-24 pt-5 md:px-6 md:pb-8 md:pt-6 xl:px-8")}>
          <motion.div
            variants={blockVariants}
            className={clsx(
              "mx-auto w-full transition-all",
              isFocusMode ? "max-w-4xl" : "max-w-[1440px]",
            )}
          >
            <AnimatedOutlet />
          </motion.div>
        </main>
      </div>

      {!isFocusMode && <MobileNav />}

      {/* Panel Lateral de Organización Discreto */}
      <OrganizationDrawer />

      {/* Bandeja de Notificaciones Interna */}
      <NotificationCenter />

      <GuideStatusBar />

      {/* Paleta de Comandos Unificada (Ctrl+K / Cmd+K) */}
      <CommandPalette />
    </motion.div>
  );
};
