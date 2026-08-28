import { clsx } from "clsx";
import { Moon, Sun } from "lucide-react";
import { NavLink } from "react-router-dom";
import { navItems } from "../../config/nav";
import { useThemeStore } from "../../stores/useThemeStore";

export function Sidebar() {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-border-subtle bg-bg-surface md:flex">
      <div className="flex items-center gap-2.5 px-6 py-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-muted">
          <span className="font-display text-sm font-semibold text-accent">S</span>
        </div>
        <span className="font-display text-sm font-semibold tracking-tight text-text-primary">
          StudyLab
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors duration-150",
                isActive
                  ? "bg-accent-muted text-accent"
                  : "text-text-secondary hover:bg-bg-surface-2 hover:text-text-primary",
              )
            }
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border-subtle px-3 py-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:bg-bg-surface-2 hover:text-text-primary"
        >
          {theme === "dark" ? (
            <Sun size={18} strokeWidth={1.75} />
          ) : (
            <Moon size={18} strokeWidth={1.75} />
          )}
          {theme === "dark" ? "Modo claro" : "Modo oscuro"}
        </button>
      </div>
    </aside>
  );
}
