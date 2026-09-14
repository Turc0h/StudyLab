import { clsx } from "clsx";
import { HelpCircle, Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navItems } from "../../config/nav";
import { useThemeStore } from "../../stores/useThemeStore";
import { useTutorialStore } from "../../stores/useTutorialStore";

export function Sidebar() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const openTutorial = useTutorialStore((s) => s.openTutorial);

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border-subtle bg-bg-surface/85 backdrop-blur-xl md:flex">
      <div className="flex flex-col gap-2 px-6 py-6 border-b border-border-subtle/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-md border border-accent/40 bg-accent-muted shadow-[var(--shadow-glow-sm)]">
              <span className="font-mono text-sm font-bold text-accent">SL</span>
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="hud-pulse-dot absolute inline-flex h-full w-full rounded-full bg-accent" />
              </span>
            </div>
            <div>
              <span className="font-display text-sm font-bold tracking-tight text-text-primary">
                StudyLab
              </span>
              <span className="block font-mono text-[9px] tracking-widest text-accent/80 uppercase">
                v2.4 // HUD Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="flex items-center justify-between rounded border border-border-subtle/60 bg-bg-surface-2/40 px-2.5 py-1.5 font-mono text-[10px] text-text-tertiary">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-success hud-pulse-dot" />
            LOCAL DB
          </span>
          <span className="text-text-secondary">INDEXED_OK</span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "border border-accent/30 bg-accent-muted/60 text-accent shadow-[0_0_15px_-4px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
                  : "text-text-secondary hover:border-border-subtle hover:bg-bg-surface-2/70 hover:text-text-primary",
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-r bg-accent shadow-[0_0_8px_var(--color-accent)]" />
                )}
                <Icon
                  size={18}
                  strokeWidth={1.75}
                  className={clsx(
                    "transition-transform duration-150 group-hover:scale-110",
                    isActive ? "text-accent" : "text-text-tertiary group-hover:text-text-primary",
                  )}
                />
                <span className="tracking-tight">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-subtle/50 px-3 py-3 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => openTutorial(0, "tour")}
          className="flex w-full items-center gap-3 rounded-md border border-cyan-500/20 bg-cyan-950/20 px-3 py-2 text-xs font-mono text-cyan-300 transition-colors duration-150 hover:bg-cyan-500/20 hover:text-cyan-200"
        >
          <HelpCircle size={16} className="text-cyan-400" />
          <span>GUÍA Y TUTORIALES</span>
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-md border border-transparent px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:border-border-subtle hover:bg-bg-surface-2 hover:text-text-primary"
        >
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={1.75} className="text-warning" />
          ) : (
            <Moon size={18} strokeWidth={1.75} className="text-accent" />
          )}
          <span className="font-mono text-xs">{theme === "dark" ? "MODO CLARO" : "MODO OSCURO"}</span>
        </button>
      </div>
    </aside>
  );
}
