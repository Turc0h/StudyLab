import React, { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "motion/react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AnimatedOutlet } from "./AnimatedOutlet";
import { GuideStatusBar } from "../guide/GuideStatusBar";
import { OrganizationDrawer } from "../organization/OrganizationDrawer";
import { NotificationCenter } from "../notifications/NotificationCenter";
import { useThemeStore } from "../../stores/useThemeStore";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useCommandPaletteStore } from "../../stores/useCommandPaletteStore";
import { CommandPalette } from "../command-palette/CommandPalette";
import { EASE_EXPO_OUT, DURATION, STAGGER } from "../../lib/motion-tokens";
import { Minimize2 } from "lucide-react";
import { clsx } from "clsx";

const shellVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: STAGGER.base,
      delayChildren: 0.05,
    },
  },
};

const blockVariants = {
  hidden: { opacity: 0, y: 8 },
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

  // Manejo de atajos globales: Esc, Ctrl+K (Command Palette), Ctrl+B (Sidebar), Ctrl+O (Org), Ctrl+N (Notif)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar eventos generados por mantener pulsada la tecla repetidamente
      if (e.repeat) return;

      if (e.key === "Escape") {
        if (isCommandPaletteOpen) {
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isCommandPaletteOpen,
    closeCommandPalette,
    toggleCommandPalette,
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
      return { title: "Academic Hub", subtitle: "Ingesta PDF, visor interactivo con citas y tutor socrático" };
    }
    if (path.startsWith("/workspace")) {
      return { title: "Workspace OS", subtitle: "Terminal LaTeX, ondas binaurales y monitoreo de fatiga" };
    }
    if (path.startsWith("/graph")) {
      return { title: "Grafo Causal", subtitle: "Topología DAG de conceptos y barreras de retención FSRS" };
    }
    if (path.startsWith("/files")) {
      return { title: "Archivos Universitarios", subtitle: "Jerarquía de cátedras, documentos y notas marginales" };
    }
    if (path.startsWith("/methods")) {
      return { title: "Métodos de Estudio", subtitle: "Catálogo de técnicas con respaldo empírico y protocolos guiados" };
    }
    if (path.startsWith("/session")) {
      return { title: "Sesión de Estudio", subtitle: "Entorno Deep Work temporizado y registro cognitivo" };
    }
    if (path.startsWith("/pdf")) {
      return { title: "Anotador de PDF", subtitle: "Lectura pausada, zoom y notas marginales persistentes" };
    }
    if (path.startsWith("/ocr")) {
      return { title: "Extracción OCR", subtitle: "Digitalización de apuntes físicos 100% en el cliente" };
    }
    if (path.startsWith("/books")) {
      return { title: "Escanear Libros", subtitle: "Identificación de capítulos, separación en archivos y guardado en carpetas" };
    }
    if (path.startsWith("/ambient")) {
      return { title: "Sonido Ambiente", subtitle: "Aislamiento acústico sintetizado mediante Web Audio API" };
    }
    if (path.startsWith("/settings")) {
      return { title: "Configuración", subtitle: "Pesos del algoritmo FSRS v4.5 y gestión de IndexedDB" };
    }
    return { title: "Panel Principal", subtitle: "Registro de estudio, métricas cognitivas y progreso personal" };
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
        <main className={clsx("flex-1 overflow-y-auto transition-all", isFocusMode ? "p-4 md:p-8" : "p-4 md:p-6 lg:p-8")}>
          <motion.div
            variants={blockVariants}
            className={clsx(
              "mx-auto w-full transition-all",
              isFocusMode ? "max-w-4xl" : "max-w-[1600px]",
            )}
          >
            <AnimatedOutlet />
          </motion.div>
        </main>
      </div>

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
