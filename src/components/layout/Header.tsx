import React from "react";
import { Moon, Sun, HardDrive } from "lucide-react";
import { Badge } from "../ui/Badge";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  isDark,
  onToggleTheme,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-primary/95 px-6 backdrop-blur-xs md:px-10">
      <div>
        <h1 className="font-serif text-xl font-semibold text-text-primary">{title}</h1>
        {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1.5 py-1">
          <HardDrive className="h-3 w-3 text-accent-secondary" />
          <span>Local-First</span>
        </Badge>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded border border-border-subtle p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
