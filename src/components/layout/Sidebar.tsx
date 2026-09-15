import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
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
  HelpCircle,
} from "lucide-react";
import { clsx } from "clsx";
import { useTutorialStore } from "../../stores/useTutorialStore";

export const Sidebar: React.FC = () => {
  const openTutorial = useTutorialStore((s) => s.openTutorial);

  const navSections = [
    {
      title: "Principal",
      items: [
        { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
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
      ],
    },
  ];

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-secondary/70 h-screen sticky top-0">
      {/* Brand / Logo */}
      <div className="flex h-16 items-center justify-between px-6 border-b border-border-subtle">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold tracking-tight text-text-primary">
            StudyLab
          </span>
          <span className="font-sans text-[10px] uppercase tracking-wider text-accent-primary bg-accent-primary/10 border border-accent-primary/20 px-1.5 py-0.5 rounded">
            Académico
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 space-y-4 p-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <span className="block px-3 font-sans text-[10px] font-semibold uppercase tracking-wider text-text-muted">
              {section.title}
            </span>
            {section.items.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    "flex items-center gap-2.5 rounded px-3 py-2 text-xs font-sans font-medium transition-colors duration-150",
                    isActive
                      ? "bg-bg-elevated text-accent-primary border border-border-subtle shadow-2xs font-semibold"
                      : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary",
                  )
                }
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{label}</span>
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
          className="flex w-full items-center gap-2.5 rounded border border-accent-primary/30 bg-accent-primary/5 px-3 py-2 text-xs font-sans font-medium text-accent-primary hover:bg-accent-primary/10 transition-colors duration-150"
        >
          <HelpCircle className="h-3.5 w-3.5 shrink-0 text-accent-primary" />
          <span>Guía y Tutoriales (8 pasos)</span>
        </button>

        <div className="rounded border border-border-subtle bg-bg-primary px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[11px] font-medium text-text-primary">
              100% Local-First
            </span>
            <span className="h-1.5 w-1.5 rounded-full bg-success inline-block" />
          </div>
          <span className="block font-sans text-[10px] text-text-muted mt-0.5">
            IndexedDB + Web Workers
          </span>
        </div>
      </div>
    </aside>
  );
};
