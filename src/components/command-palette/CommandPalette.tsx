import React, { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  Sparkles,
  Download,
  ShieldCheck,
  Volume2,
  Maximize2,
  Pin,
  Bell,
  Moon,
  Play,
  GraduationCap,
  ScanText,
  Library,
  BookOpen,
  FileText,
  Compass,
  Network,
  CornerDownLeft,
  ArrowUpDown,
  Command,
  Printer,
  Flame,
  Mic,
  Heart,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { clsx } from "clsx";
import { useCommandPaletteStore } from "../../stores/useCommandPaletteStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import {
  searchCommandPalette,
  type CommandPaletteItem,
  type CommandPaletteCategory,
} from "../../features/command-palette/commandPaletteService";

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles,
  Download,
  ShieldCheck,
  Volume2,
  Maximize2,
  Pin,
  Bell,
  Moon,
  Play,
  GraduationCap,
  ScanText,
  Library,
  BookOpen,
  FileText,
  Compass,
  Network,
  Printer,
  Flame,
  Mic,
  Heart,
  Calendar,
  TrendingUp,
};

const CATEGORY_COLORS: Record<CommandPaletteCategory, { bg: string; text: string; border: string }> = {
  methods: {
    bg: "bg-amber-500/15",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  files: {
    bg: "bg-emerald-500/15",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  projects: {
    bg: "bg-purple-500/15",
    text: "text-purple-400",
    border: "border-purple-500/30",
  },
  concepts: {
    bg: "bg-cyan-500/15",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  actions: {
    bg: "bg-rose-500/15",
    text: "text-rose-400",
    border: "border-rose-500/30",
  },
};

export const CommandPalette: React.FC = () => {
  const isOpen = useCommandPaletteStore((s) => s.isOpen);
  const query = useCommandPaletteStore((s) => s.query);
  const setQuery = useCommandPaletteStore((s) => s.setQuery);
  const close = useCommandPaletteStore((s) => s.close);

  const navigate = useNavigate();
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const toggleOrg = useOrganizationStore((s) => s.toggleOrganization);
  const toggleNotif = useNotificationStore((s) => s.toggleOpen);
  const enterFocusMode = useFocusModeStore((s) => s.enterFocusMode);

  const [items, setItems] = useState<CommandPaletteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Ejecutar búsqueda cuando cambia la query o se abre la paleta
  const executeSearch = useCallback(async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const results = await searchCommandPalette(searchQuery, {
        navigate: (path) => {
          navigate(path);
          close();
        },
        toggleTheme: () => {
          toggleTheme();
          close();
        },
        toggleOrg: () => {
          toggleOrg();
          close();
        },
        toggleNotif: () => {
          toggleNotif();
          close();
        },
        enterFocusMode: () => {
          enterFocusMode();
          close();
        },
      });
      setItems(results);
      setSelectedIndex(0);
    } catch (e) {
      console.error("Error al buscar en command palette:", e);
    } finally {
      setIsLoading(false);
    }
  }, [navigate, toggleTheme, toggleOrg, toggleNotif, enterFocusMode, close]);

  useEffect(() => {
    if (isOpen) {
      void executeSearch(query);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen, query, executeSearch]);

  // Manejo de navegación por teclado dentro de la paleta
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length > 0) {
        setSelectedIndex((prev) => (prev + 1) % items.length);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0) {
        setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
      }
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (items[selectedIndex]) {
        items[selectedIndex].onSelect();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  // Mantener visible el elemento seleccionado en el scroll
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[selectedIndex] as HTMLElement | undefined;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Paleta de Comandos Global"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] sm:pt-[12vh] p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Barra de Entrada de Búsqueda */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-subtle bg-bg-secondary/70">
          <Search className="h-5 w-5 text-accent-primary shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un comando, técnica de estudio o nombre de archivo..."
            className="flex-1 bg-transparent text-sm sm:text-base font-sans text-text-primary placeholder:text-text-muted focus:outline-hidden"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-bg-surface-2 transition-colors cursor-pointer"
              title="Borrar búsqueda"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-1 rounded px-1.5 py-0.5 border border-border-subtle bg-bg-surface text-[10px] font-mono text-text-muted">
              ESC
            </kbd>
          )}
        </div>

        {/* Lista de Resultados */}
        <div
          ref={listRef}
          className="max-h-[55vh] overflow-y-auto p-2 space-y-1 divide-y-0"
        >
          {items.length > 0 ? (
            items.map((item, idx) => {
              const IconComponent = ICON_MAP[item.iconName] || BookOpen;
              const catStyle = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.methods;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={item.id}
                  onClick={() => item.onSelect()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    "flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-100",
                    isSelected
                      ? "bg-accent-primary/15 border border-accent-primary/30 shadow-xs"
                      : "border border-transparent hover:bg-bg-surface-2/60",
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={clsx(
                        "flex h-8 w-8 items-center justify-center rounded-lg shrink-0 border",
                        catStyle.bg,
                        catStyle.border,
                        catStyle.text,
                      )}
                    >
                      <IconComponent className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-text-primary truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span
                            className={clsx(
                              "text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.2 rounded shrink-0 border",
                              catStyle.bg,
                              catStyle.border,
                              catStyle.text,
                            )}
                          >
                            {item.badge}
                          </span>
                        )}
                      </div>
                      {item.subtitle && (
                        <p className="text-[11px] text-text-secondary truncate mt-0.5">
                          {item.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-1.5 text-text-muted">
                    {isSelected && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono text-accent-primary font-semibold">
                        <span>Ejecutar</span>
                        <CornerDownLeft className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          ) : !isLoading ? (
            <div className="py-12 px-6 text-center space-y-2">
              <Command className="h-8 w-8 text-text-muted mx-auto opacity-40" />
              <p className="text-sm font-medium text-text-secondary">
                No se encontraron resultados para &ldquo;{query}&rdquo;
              </p>
              <p className="text-xs text-text-muted">
                Probá buscando por nombre de método (&ldquo;feynman&rdquo;, &ldquo;pomodoro&rdquo;), apunte o acción de sistema.
              </p>
            </div>
          ) : null}
        </div>

        {/* Pie de Navegación Rápida */}
        <div className="flex items-center justify-between border-t border-border-subtle px-4 py-2 bg-bg-secondary/40 text-[11px] font-mono text-text-muted">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              <span>Navegar</span>
            </span>
            <span className="flex items-center gap-1">
              <CornerDownLeft className="h-3 w-3" />
              <span>Ejecutar</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="rounded bg-bg-surface px-1 border border-border-subtle text-[9px]">ESC</span>
              <span>Cerrar</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-accent-primary">
            <Sparkles className="h-3 w-3" />
            <span>StudyLab Cognitive OS v5.13</span>
          </div>
        </div>
      </div>
    </div>
  );
};
