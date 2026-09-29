import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BookOpen,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  FileText,
  FolderOpen,
  GraduationCap,
  HelpCircle,
  Home,
  Library,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Play,
  ScanText,
  Settings,
  Volume2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { useTutorialStore } from "../../stores/useTutorialStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useContextEngineStore } from "../../stores/useContextEngineStore";

type SidebarLink = { to: string; label: string; icon: LucideIcon };

const mainLinks: SidebarLink[] = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/methods", label: "Estudiar", icon: GraduationCap },
  { to: "/academic", label: "Espacio de estudio", icon: BrainCircuit },
  { to: "/calendar", label: "Agenda", icon: CalendarDays },
  { to: "/files", label: "Biblioteca", icon: FolderOpen },
  { to: "/blackboard", label: "Pizarra", icon: PenTool },
  { to: "/graph", label: "Progreso", icon: Activity },
];

const baseTools: SidebarLink[] = [
  { to: "/session", label: "Sesión de estudio", icon: Play },
  { to: "/pdf", label: "Lector PDF", icon: FileText },
  { to: "/ocr", label: "Digitalizar apuntes", icon: ScanText },
  { to: "/books", label: "Separar capítulos", icon: Library },
  { to: "/ambient", label: "Sonido de concentración", icon: Volume2 },
];

function SidebarItem({ item, collapsed }: { item: SidebarLink; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      className={({ isActive }) => clsx(
        "group relative flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
        collapsed && "justify-center px-0",
        isActive
          ? "bg-accent-primary/10 text-accent-primary"
          : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
      )}
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-accent-primary" aria-hidden="true" />}
          <Icon size={18} strokeWidth={1.8} className="shrink-0" aria-hidden="true" />
          {!collapsed && <span className="truncate">{item.label}</span>}
        </>
      )}
    </NavLink>
  );
}

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const openTutorial = useTutorialStore((s) => s.openTutorial);
  const isCollapsed = useThemeStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);
  const contextEngineEnabled = useContextEngineStore((s) => s.contextEngineEnabled);
  const tools = useMemo(() => contextEngineEnabled
    ? [...baseTools, { to: "/context", label: "Asistente de planificación", icon: BrainCircuit }]
    : baseTools, [contextEngineEnabled]);
  const isToolRoute = tools.some((item) => location.pathname.startsWith(item.to));
  const [toolsOpen, setToolsOpen] = useState(isToolRoute);

  useEffect(() => {
    if (isToolRoute) setToolsOpen(true);
  }, [isToolRoute]);

  return (
    <aside
      className={clsx(
        "hidden h-screen shrink-0 flex-col border-r border-border-subtle bg-bg-elevated/80 transition-[width] duration-200 ease-out md:flex",
        isCollapsed ? "w-[76px]" : "w-[264px]",
      )}
      aria-label="Navegación principal"
    >
      <div className={clsx("flex h-[72px] shrink-0 items-center border-b border-border-subtle", isCollapsed ? "justify-center px-2" : "justify-between px-4")}>
        {!isCollapsed && (
          <NavLink to="/" className="flex min-w-0 items-center gap-3" aria-label="StudyLab, inicio">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-primary text-white shadow-sm">
              <BookOpen size={19} strokeWidth={1.8} />
            </span>
            <span className="min-w-0">
              <span className="block font-serif text-[17px] font-semibold leading-5 tracking-tight text-text-primary">StudyLab</span>
              <span className="mt-0.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-text-muted">Campus personal</span>
            </span>
          </NavLink>
        )}
        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-text-muted hover:bg-bg-secondary hover:text-text-primary"
          title={isCollapsed ? "Expandir navegación (Ctrl+B)" : "Contraer navegación (Ctrl+B)"}
          aria-label={isCollapsed ? "Expandir navegación" : "Contraer navegación"}
        >
          {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden px-3 py-5">
        {!isCollapsed && <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-text-tertiary">Tu universidad</p>}
        {mainLinks.map((item) => <SidebarItem key={item.to} item={item} collapsed={isCollapsed} />)}

        <div className="pt-4">
          {!isCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setToolsOpen((open) => !open)}
                className="flex h-9 w-full items-center justify-between rounded-lg px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-tertiary hover:bg-bg-secondary hover:text-text-secondary"
                aria-expanded={toolsOpen}
              >
                <span>Más herramientas</span>
                <ChevronDown size={14} className={clsx("transition-transform duration-150", toolsOpen && "rotate-180")} />
              </button>
              {toolsOpen && <div className="mt-1 space-y-1">{tools.map((item) => <SidebarItem key={item.to} item={item} collapsed={false} />)}</div>}
            </>
          ) : (
            <div className="space-y-1 border-t border-border-subtle pt-3" aria-label="Más herramientas">
              {tools.map((item) => <SidebarItem key={item.to} item={item} collapsed />)}
            </div>
          )}
        </div>
      </nav>

      <div className={clsx("shrink-0 border-t border-border-subtle p-3", isCollapsed && "flex flex-col items-center gap-1")}>
        <SidebarItem item={{ to: "/settings", label: "Configuración", icon: Settings }} collapsed={isCollapsed} />
        <button
          type="button"
          onClick={() => openTutorial(0, "tour")}
          title={isCollapsed ? "Guía de inicio" : undefined}
          aria-label="Abrir guía de inicio"
          className={clsx(
            "mt-1 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-medium text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
            isCollapsed && "w-10 justify-center px-0",
          )}
        >
          <HelpCircle size={18} strokeWidth={1.8} />
          {!isCollapsed && <span>Guía de inicio</span>}
        </button>
        {!isCollapsed && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-bg-secondary/70 px-3 py-2 text-[11px] text-text-muted">
            <span className="h-2 w-2 rounded-full bg-success" />
            <span>Datos guardados en este equipo</span>
          </div>
        )}
      </div>
    </aside>
  );
};
