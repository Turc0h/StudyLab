import React, { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { GlobalTutorialModal } from "../tutorial/GlobalTutorialModal";
import { useThemeStore } from "../../stores/useThemeStore";
import { clsx } from "clsx";

export const Shell: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const location = useLocation();

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

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
    if (path.startsWith("/ambient")) {
      return { title: "Sonido Ambiente", subtitle: "Aislamiento acústico sintetizado mediante Web Audio API" };
    }
    if (path.startsWith("/settings")) {
      return { title: "Configuración", subtitle: "Pesos del algoritmo FSRS v4.5 y gestión de IndexedDB" };
    }
    return { title: "Panel Principal", subtitle: "Registro de estudio, métricas cognitivas y progreso personal" };
  };

  const meta = getPageMeta();
  const isWide =
    location.pathname.startsWith("/academic") ||
    location.pathname.startsWith("/workspace") ||
    location.pathname.startsWith("/graph") ||
    location.pathname.startsWith("/session");

  return (
    <div className="flex h-screen w-full bg-bg-primary text-text-primary overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          title={meta.title}
          subtitle={meta.subtitle}
          isDark={theme === "dark"}
          onToggleTheme={toggleTheme}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className={clsx("mx-auto w-full", isWide ? "max-w-7xl" : "max-w-5xl")}>
            <Outlet />
          </div>
        </main>
      </div>
      <GlobalTutorialModal />
    </div>
  );
};
