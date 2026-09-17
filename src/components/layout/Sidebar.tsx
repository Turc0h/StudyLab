import React from "react";
import { NavLink } from "react-router-dom";
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
} from "lucide-react";
import { clsx } from "clsx";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useThemeStore } from "../../stores/useThemeStore";

export const Sidebar: React.FC = () => {
  const openTutorial = useTutorialStore((s) => s.openTutorial);
  const isCollapsed = useThemeStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);

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
      items: [
        { to: "/academic", label: "Academic Hub", icon: GraduationCap },
        { to: "/workspace", label: "Workspace OS", icon: BrainCircuit },
        { to: "/graph", label: "Grafo Causal", icon: Network },
      ],
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
        "hidden md:flex shrink-0 flex-col border-r border-border-subtle bg-bg-secondary/70 h-screen sticky top-0 transition-[width] duration-200 ease-in-out select-none",
        isCollapsed ? "w-16" : "w-64",
      )}
      aria-expanded={!isCollapsed}
      aria-label="Menú lateral principal"
    >
      {/* Header con Marca y Botón de Colapsar */}
      <div
        className={clsx(
          "flex h-16 items-center border-b border-border-subtle transition-all duration-200",
          isCollapsed ? "justify-center px-2" : "justify-between px-5",
        )}
      >
        {!isCollapsed ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-serif text-lg font-semibold tracking-tight text-text-primary">
                StudyLab
              </span>
              <span className="font-sans text-[10px] uppercase tracking-wider text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-1.5 py-0.5 rounded">
                Desktop
              </span>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-text-muted hover:text-text-primary hover:bg-bg-elevated hover:border-border-subtle transition-colors cursor-pointer"
              title="Colapsar menú lateral (Ctrl+B)"
              aria-label="Colapsar menú lateral"
            >
              <PanelLeftClose size={16} strokeWidth={1.75} />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-md border border-border-subtle/50 bg-bg-elevated/80 text-accent-primary hover:bg-bg-elevated hover:text-accent-hover hover:border-accent-primary/40 transition-colors shadow-2xs cursor-pointer"
            title="Expandir menú lateral (Ctrl+B)"
            aria-label="Expandir menú lateral"
          >
            <PanelLeft size={17} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Navegación Principal */}
      <nav className="flex-1 space-y-4 p-2.5 overflow-y-auto overflow-x-hidden">
        {/* Botón Destacado HOME */}
        <div className="px-1">
          <NavLink
            to="/"
            end
            title="Inicio / Dashboard (Home)"
            aria-label="Inicio / Dashboard"
            className={({ isActive }) =>
              clsx(
                "group flex items-center rounded-md transition-all duration-150 font-sans cursor-pointer",
                isCollapsed
                  ? "h-10 w-10 justify-center mx-auto"
                  : "gap-3 px-3 py-2 text-xs font-semibold",
                isActive
                  ? "bg-accent-primary text-white shadow-2xs"
                  : "bg-bg-elevated/60 border border-border-subtle/60 text-text-primary hover:bg-bg-elevated hover:border-accent-primary/50 hover:text-accent-primary",
              )
            }
          >
            {({ isActive }) => (
              <>
                <Home
                  className={clsx(
                    "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-105",
                    isActive ? "text-white" : "text-accent-primary",
                  )}
                />
                {!isCollapsed && (
                  <span className="tracking-wide uppercase text-[11px] font-bold">
                    HOME
                  </span>
                )}
              </>
            )}
          </NavLink>
        </div>

        {/* Secciones de Navegación Existentes */}
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed ? (
              <span className="block px-3 pt-2 font-sans text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                {section.title}
              </span>
            ) : (
              <div className="my-2 border-b border-border-subtle/50 mx-2" />
            )}
            {section.items.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                aria-label={label}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center rounded-md transition-colors duration-150 text-xs font-sans font-medium cursor-pointer",
                    isCollapsed
                      ? "h-9 w-9 justify-center mx-auto"
                      : "gap-2.5 px-3 py-1.5",
                    isActive
                      ? "bg-bg-elevated text-accent-primary border border-border-subtle shadow-2xs font-semibold"
                      : "text-text-secondary hover:bg-bg-elevated/80 hover:text-text-primary",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {!isCollapsed && <span className="truncate">{label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer / Tutorial Trigger */}
      <div className="border-t border-border-subtle p-2.5 space-y-2">
        <button
          type="button"
          onClick={() => openTutorial(0, "tour")}
          title="Guía y Tutoriales (8 pasos)"
          aria-label="Guía y Tutoriales"
          className={clsx(
            "flex items-center rounded-md border border-accent-primary/30 bg-accent-primary/5 text-xs font-sans font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors duration-150 cursor-pointer",
            isCollapsed ? "h-9 w-9 justify-center mx-auto" : "w-full gap-2 px-3 py-1.5",
          )}
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
          {!isCollapsed && <span className="truncate">Guía (8 pasos)</span>}
        </button>

        {!isCollapsed ? (
          <div className="rounded-md border border-border-subtle bg-bg-primary px-3 py-1.5">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] font-medium text-text-primary">
                100% Local-First
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
            </div>
            <span className="block font-sans text-[10px] text-text-muted">
              SQLite + Filesystem
            </span>
          </div>
        ) : (
          <div
            className="flex h-7 w-7 items-center justify-center mx-auto"
            title="100% Local-First (SQLite + Filesystem)"
          >
            <span className="h-2 w-2 rounded-full bg-success ring-2 ring-success/20 inline-block" />
          </div>
        )}
      </div>
    </aside>
  );
};
