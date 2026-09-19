import React, { useMemo } from "react";
import { Moon, Sun, HardDrive, Maximize2, Sparkles, PanelLeft, Pin, Bell, Search } from "lucide-react";
import { Badge } from "../ui/Badge";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useGuideModeStore } from "../../stores/useGuideModeStore";
import { useThemeStore } from "../../stores/useThemeStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useCommandPaletteStore } from "../../stores/useCommandPaletteStore";
import { clsx } from "clsx";

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
  const enterFocusMode = useFocusModeStore((s) => s.enterFocusMode);
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const toggleGuideMode = useGuideModeStore((s) => s.toggleGuideMode);
  const isSidebarCollapsed = useThemeStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useThemeStore((s) => s.toggleSidebar);
  const isOrganizationOpen = useOrganizationStore((s) => s.isOpen);
  const toggleOrganization = useOrganizationStore((s) => s.toggleOrganization);
  const isNotifOpen = useNotificationStore((s) => s.isOpen);
  const toggleNotif = useNotificationStore((s) => s.toggleOpen);
  const notifications = useNotificationStore((s) => s.notifications);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-primary/95 px-6 backdrop-blur-xs md:px-10">
      <div className="flex items-center gap-3">
        {isSidebarCollapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors cursor-pointer shadow-2xs"
            title="Expandir menú lateral (Ctrl+B)"
            aria-label="Expandir menú lateral"
          >
            <PanelLeft size={16} strokeWidth={1.75} />
          </button>
        )}
        <div>
          <h1 className="font-serif text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="text-xs text-text-muted">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Botón Paleta de Comandos Universal (Ctrl+K) */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border-subtle bg-bg-elevated text-xs font-sans text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors shadow-2xs cursor-pointer"
          title="Buscar técnicas, apuntes o comandos (Ctrl+K)"
          aria-label="Abrir paleta de comandos"
        >
          <Search className="h-3.5 w-3.5 text-accent-primary" />
          <span className="hidden md:inline">Buscar...</span>
          <kbd className="hidden sm:inline-block rounded bg-bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-text-muted border border-border-subtle">
            ⌘K
          </kbd>
        </button>

        {/* Botón Modo Guía Interactivo */}
        <button
          type="button"
          onClick={toggleGuideMode}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-all duration-200 cursor-pointer shadow-2xs",
            isGuideMode
              ? "bg-accent-primary text-white border border-accent-primary shadow-[0_0_15px_rgba(47,93,124,0.4)]"
              : "border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary",
          )}
          title="Activa o desactiva la explicación directa sobre cada panel en pantalla"
        >
          <Sparkles className={clsx("h-3.5 w-3.5", isGuideMode ? "text-white" : "text-accent-primary")} />
          <span className="hidden sm:inline">
            {isGuideMode ? "Modo Guía: ON" : "Modo Guía"}
          </span>
        </button>

        {/* Botón Modo Enfoque */}
        <button
          type="button"
          onClick={enterFocusMode}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border-subtle bg-bg-elevated text-xs font-sans text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors shadow-2xs cursor-pointer"
          title="Ocultar paneles y distracciones para lectura y estudio profundo"
        >
          <Maximize2 className="h-3.5 w-3.5 text-accent-primary" />
          <span className="hidden sm:inline">Modo Enfoque</span>
        </button>

        {/* Botón Centro de Organización */}
        <button
          type="button"
          onClick={toggleOrganization}
          className={clsx(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-all duration-200 cursor-pointer shadow-2xs",
            isOrganizationOpen
              ? "bg-accent-primary text-white border border-accent-primary shadow-[0_0_15px_rgba(47,93,124,0.4)]"
              : "border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary",
          )}
          title="Centro de Organización: Vencimientos, Exámenes y Fechas Límite (Ctrl+O)"
          aria-label="Abrir centro de organización"
        >
          <Pin className={clsx("h-3.5 w-3.5", isOrganizationOpen ? "text-white" : "text-accent-primary")} />
          <span className="hidden sm:inline">Organización</span>
        </button>

        {/* Botón Notificaciones */}
        <button
          type="button"
          onClick={toggleNotif}
          className={clsx(
            "relative flex h-8 w-8 items-center justify-center rounded-md border text-xs font-sans transition-all duration-200 cursor-pointer shadow-2xs",
            isNotifOpen
              ? "bg-accent-primary text-white border-accent-primary shadow-[0_0_15px_rgba(47,93,124,0.4)]"
              : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary",
          )}
          title="Bandeja de Notificaciones (Ctrl+N)"
          aria-label="Bandeja de Notificaciones"
        >
          <Bell className={clsx("h-4 w-4", isNotifOpen ? "text-white" : "text-text-secondary")} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-primary px-1 text-[10px] font-mono font-bold text-white shadow-xs">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <SyncStatusIndicator />

        <Badge variant="secondary" className="hidden sm:inline-flex items-center gap-1.5 py-1">
          <HardDrive className="h-3 w-3 text-accent-secondary" />
          <span>Local-First</span>
        </Badge>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className="rounded-md border border-border-subtle p-2 text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors"
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </header>
  );
};
