import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalTutorialModal } from "../tutorial/GlobalTutorialModal";
import { useThemeStore } from "../../stores/useThemeStore";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { Minimize2 } from "lucide-react";
import { clsx } from "clsx";

export const Shell: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const isFocusMode = useFocusModeStore((s) => s.isFocusMode);
  const exitFocusMode = useFocusModeStore((s) => s.exitFocusMode);
  const hasSeenTour = useTutorialStore((s) => s.hasSeenTour);
  const openTutorial = useTutorialStore((s) => s.openTutorial);
  const location = useLocation();

  // Auto-abrir la guía la primera vez que el usuario entra a la app
  useEffect(() => {
    if (!hasSeenTour) {
      const timer = setTimeout(() => openTutorial(0, "tour"), 800);
      return () => clearTimeout(timer);
    }
  }, [hasSeenTour, openTutorial]);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Manejo de tecla Escape para salir de Modo Enfoque
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFocusMode) {
        exitFocusMode();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFocusMode, exitFocusMode]);

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

  const meta = getPageMeta();

  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary overflow-hidden relative">
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
      {!isFocusMode && <Sidebar />}

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header (oculto en Modo Enfoque) */}
        {!isFocusMode && (
          <Header
            title={meta.title}
            subtitle={meta.subtitle}
            isDark={theme === "dark"}
            onToggleTheme={toggleTheme}
          />
        )}

        {/* Contenido Principal con Fluid Layout Responsivo */}
        <main className={clsx("flex-1 overflow-y-auto transition-all", isFocusMode ? "p-4 md:p-8" : "p-4 md:p-6 lg:p-8")}>
          <div
            className={clsx(
              "mx-auto w-full transition-all",
              isFocusMode ? "max-w-4xl" : "max-w-[1600px]",
            )}
          >
            <Outlet />
          </div>
        </main>
      </div>

      <GlobalTutorialModal />
    </div>
  );
};
