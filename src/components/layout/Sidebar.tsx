import React from "react";
import { NavLink } from "react-router-dom";
import { motion } from "motion/react";
import {
  Home,
  BookOpen,
  Play,
  GraduationCap,
  BrainCircuit,
  Network,
  FolderOpen,
  FileText,
  ScanText,
  Library,
  Volume2,
  Settings,
  ShieldCheck,
  HelpCircle,
  PanelLeftClose,
  PanelLeft,
  Compass,
} from "lucide-react";
import { clsx } from "clsx";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useContextEngineStore } from "../../stores/useContextEngineStore";
import { DURATION, EASE_EXPO_OUT } from "../../lib/motion-tokens";

export const Sidebar: React.FC = () => {
  const openTutorial = useTutorialStore((s) => s.openTutorial);
  const isCollapsed = useThemeStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);
  const contextEngineEnabled = useContextEngineStore((s) => s.contextEngineEnabled);

  const academicItems = [
    { to: "/academic", label: "Academic Hub", icon: GraduationCap },
    { to: "/workspace", label: "Workspace OS", icon: BrainCircuit },
    { to: "/graph", label: "Grafo Causal", icon: Network },
  ];

  if (contextEngineEnabled) {
    academicItems.push({ to: "/context", label: "Motor Contexto", icon: Compass });
  }

  const navSections = [
    {
      title: "Principal",
      items: [
        { to: "/methods", label: "Métodos de Estudio", icon: BookOpen },
        { to: "/session", label: "Sesión Activa", icon: Play },
      ],
    },
    {
      title: "Académico & OS",
      items: academicItems,
    },
    {
      title: "Documentos & Audio",
      items: [
        { to: "/files", label: "Archivos Cátedras", icon: FolderOpen },
        { to: "/pdf", label: "Anotador PDF", icon: FileText },
        { to: "/ocr", label: "Extracción OCR", icon: ScanText },
        { to: "/books", label: "Escanear Libros", icon: Library },
        { to: "/ambient", label: "Sonido Ambiente", icon: Volume2 },
      ],
    },
    {
      title: "Sistema",
      items: [
        { to: "/settings", label: "Configuración", icon: Settings },
        { to: "/qa", label: "Consola QA", icon: ShieldCheck },
      ],
    },
  ];

  return (
    <aside
      className={clsx(
        "hidden md:flex shrink-0 flex-col border-r border-border-subtle bg-bg-secondary/70 h-screen sticky top-0 transition-[width] duration-200 ease-in-out select-none motion-layer",
        isCollapsed ? "w-16" : "w-64",
      )}
      aria-expanded={!isCollapsed}
      aria-label="Menú lateral principal"
    >
      {/* Header con Marca y Botón de Colapsar */}
      <div className="flex h-16 items-center border-b border-border-subtle px-3 justify-between">
        <div className="w-10 h-10 flex items-center justify-center shrink-0">
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors cursor-pointer"
            title={isCollapsed ? "Expandir menú lateral (Ctrl+B)" : "Colapsar menú lateral (Ctrl+B)"}
            aria-label={isCollapsed ? "Expandir menú lateral" : "Colapsar menú lateral"}
          >
            {isCollapsed ? <PanelLeft size={18} strokeWidth={1.75} /> : <PanelLeftClose size={18} strokeWidth={1.75} />}
          </button>
        </div>

        <motion.div
          initial={false}
          animate={{ width: !isCollapsed ? "auto" : 0, opacity: !isCollapsed ? 1 : 0 }}
          transition={{ duration: DURATION.base, ease: EASE_EXPO_OUT }}
          className="overflow-hidden whitespace-nowrap flex items-center gap-2 pr-2"
        >
          <span className="font-serif text-base font-semibold tracking-tight text-text-primary">
            StudyLab
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wider text-accent-ink bg-accent-ink/10 border border-accent-ink/20 px-1.5 py-0.5 rounded">
            Desktop
          </span>
        </motion.div>
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 space-y-3 p-3 overflow-y-auto overflow-x-hidden">
        {/* Botón Destacado HOME */}
        <NavLink
          to="/"
          end
          title="Inicio / Dashboard (Home)"
          aria-label="Inicio / Dashboard"
          className={({ isActive }) =>
            clsx(
              "group flex items-center h-10 rounded-md transition-all duration-150 font-sans cursor-pointer overflow-hidden",
              isActive
                ? "bg-accent-primary text-white shadow-2xs font-semibold"
                : "bg-bg-elevated/60 border border-border-subtle/60 text-text-primary hover:bg-bg-elevated hover:border-accent-primary/50 hover:text-accent-primary",
            )
          }
        >
          {({ isActive }) => (
            <>
              <div className="w-10 h-10 flex items-center justify-center shrink-0">
                <Home
                  className={clsx(
                    "h-4 w-4 transition-transform duration-150 group-hover:scale-105",
                    isActive ? "text-white" : "text-accent-primary",
                  )}
                />
              </div>
              <motion.span
                initial={false}
                animate={{ width: !isCollapsed ? "auto" : 0, opacity: !isCollapsed ? 1 : 0 }}
                transition={{ duration: DURATION.base, ease: EASE_EXPO_OUT }}
                className="overflow-hidden whitespace-nowrap tracking-wide uppercase text-[11px] font-bold"
              >
                HOME
              </motion.span>
            </>
          )}
        </NavLink>

        {/* Secciones de Navegación */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <motion.span
              initial={false}
              animate={{ opacity: !isCollapsed ? 1 : 0, height: !isCollapsed ? "auto" : 0 }}
              transition={{ duration: DURATION.fast, ease: EASE_EXPO_OUT }}
              className="block px-2 pt-1 font-sans text-[10px] font-semibold uppercase tracking-wider text-text-muted overflow-hidden"
            >
              {section.title}
            </motion.span>

            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center h-10 rounded-md transition-colors duration-150 text-xs font-sans font-medium cursor-pointer overflow-hidden",
                    isActive
                      ? "bg-bg-elevated text-accent-primary border border-border-subtle shadow-2xs font-semibold"
                      : "text-text-secondary hover:bg-bg-elevated/80 hover:text-text-primary",
                  )
                }
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>
                <motion.span
                  initial={false}
                  animate={{ width: !isCollapsed ? "auto" : 0, opacity: !isCollapsed ? 1 : 0 }}
                  transition={{ duration: DURATION.base, ease: EASE_EXPO_OUT }}
                  className="overflow-hidden whitespace-nowrap truncate pr-2 text-xs"
                >
                  {label}
                </motion.span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / Tutorial Trigger */}
      <div className="border-t border-border-subtle p-3 space-y-2">
        <button
          type="button"
          onClick={() => openTutorial(0, "tour")}
          title="Guía y Tutoriales (8 pasos)"
          aria-label="Guía y Tutoriales"
          className="flex items-center h-10 w-full rounded-md border border-accent-primary/30 bg-accent-primary/5 text-xs font-sans font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors duration-150 cursor-pointer overflow-hidden"
        >
          <div className="w-10 h-10 flex items-center justify-center shrink-0">
            <HelpCircle className="h-4 w-4 text-accent-primary" />
          </div>
          <motion.span
            initial={false}
            animate={{ width: !isCollapsed ? "auto" : 0, opacity: !isCollapsed ? 1 : 0 }}
            transition={{ duration: DURATION.base, ease: EASE_EXPO_OUT }}
            className="overflow-hidden whitespace-nowrap truncate pr-2 text-xs"
          >
            Guía (8 pasos)
          </motion.span>
        </button>

        <div className="flex items-center h-8 rounded-md border border-border-subtle bg-bg-primary/50 overflow-hidden">
          <div className="w-10 h-8 flex items-center justify-center shrink-0" title="100% Local-First">
            <span className="h-2 w-2 rounded-full bg-signal-ok inline-block" />
          </div>
          <motion.div
            initial={false}
            animate={{ width: !isCollapsed ? "auto" : 0, opacity: !isCollapsed ? 1 : 0 }}
            transition={{ duration: DURATION.base, ease: EASE_EXPO_OUT }}
            className="overflow-hidden whitespace-nowrap text-[11px] text-text-secondary font-mono truncate pr-2"
          >
            Local-First (SQLite)
          </motion.div>
        </div>
      </div>
    </aside>
  );
};
