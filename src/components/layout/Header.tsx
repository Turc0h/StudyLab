import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Ellipsis,
  EyeOff,
  Maximize2,
  Moon,
  Search,
  Sparkles,
  Sun,
  Play,
} from "lucide-react";
import { clsx } from "clsx";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { useFocusModeStore } from "../../stores/useFocusModeStore";
import { useGuideModeStore } from "../../stores/useGuideModeStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useCommandPaletteStore } from "../../stores/useCommandPaletteStore";
import { hideMainWindow } from "../../platform/islandWindow";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, isDark, onToggleTheme }) => {
  const enterFocusMode = useFocusModeStore((s) => s.enterFocusMode);
  const isGuideMode = useGuideModeStore((s) => s.isGuideMode);
  const toggleGuideMode = useGuideModeStore((s) => s.toggleGuideMode);
  const isOrganizationOpen = useOrganizationStore((s) => s.isOpen);
  const toggleOrganization = useOrganizationStore((s) => s.toggleOrganization);
  const isNotifOpen = useNotificationStore((s) => s.isOpen);
  const toggleNotif = useNotificationStore((s) => s.toggleOpen);
  const notifications = useNotificationStore((s) => s.notifications);
  const openCommandPalette = useCommandPaletteStore((s) => s.open);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);

  const iconButton = "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated/70 text-text-secondary transition-colors hover:border-accent-primary/40 hover:bg-bg-elevated hover:text-text-primary";

  return (
    <header className="sticky top-0 z-30 flex h-[72px] shrink-0 items-center justify-between gap-4 border-b border-border-subtle/80 bg-bg-primary/90 px-4 backdrop-blur-xl md:px-6 xl:px-8">
      <div className="min-w-0">
        <h1 className="truncate font-serif text-[18px] font-semibold leading-6 tracking-tight text-text-primary md:text-[20px]">{title}</h1>
        {subtitle && <p className="hidden max-w-[40rem] truncate text-[11px] leading-4 text-text-muted sm:block">{subtitle}</p>}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex h-10 items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated/70 px-3 text-text-muted transition-colors hover:border-accent-primary/40 hover:text-text-primary"
          title="Buscar en StudyLab (Ctrl+K)"
          aria-label="Buscar en StudyLab"
        >
          <Search size={17} />
          <span className="hidden text-xs lg:inline">Buscar</span>
          <kbd className="hidden rounded-md border border-border-subtle bg-bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-text-tertiary xl:inline">Ctrl K</kbd>
        </button>

        <button
          type="button"
          onClick={toggleOrganization}
          className={clsx("hidden sm:flex", iconButton, isOrganizationOpen && "border-accent-primary/40 bg-accent-primary/10 text-accent-primary")}
          title="Agenda y fechas importantes"
          aria-label="Abrir agenda y fechas importantes"
          aria-pressed={isOrganizationOpen}
        >
          <CalendarDays size={17} />
        </button>

        <Link
          to="/session"
          className="flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-primary px-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-hover md:px-4"
          title="Iniciar una sesión de estudio"
        >
          <Play size={15} fill="currentColor" />
          <span className="hidden lg:inline">Nueva sesión</span>
        </Link>

        <button
          type="button"
          onClick={toggleNotif}
          className={clsx(iconButton, isNotifOpen && "border-accent-primary/40 bg-accent-primary/10 text-accent-primary")}
          title="Notificaciones (Ctrl+N)"
          aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ""}`}
          aria-pressed={isNotifOpen}
        >
          <Bell size={17} />
          {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-error px-1 text-[9px] font-semibold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          className={clsx("hidden sm:flex", iconButton)}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="relative">
          <button
            type="button"
            onClick={() => setIsMoreOpen((open) => !open)}
            className={clsx(iconButton, isMoreOpen && "bg-bg-secondary text-text-primary")}
            aria-label="Más opciones"
            aria-expanded={isMoreOpen}
            title="Más opciones"
          >
            <Ellipsis size={19} />
          </button>
          {isMoreOpen && (
            <>
              <button className="fixed inset-0 z-30 cursor-default" aria-label="Cerrar menú" onClick={() => setIsMoreOpen(false)} />
              <div className="absolute right-0 top-12 z-40 w-60 rounded-2xl border border-border-subtle bg-bg-elevated p-2 shadow-xl">
                <button type="button" onClick={() => { toggleGuideMode(); setIsMoreOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary">
                  <Sparkles size={16} className={isGuideMode ? "text-accent-primary" : "text-text-muted"} />
                  <span className="flex-1">Guía en pantalla</span>
                  {isGuideMode && <span className="text-[10px] font-medium text-accent-primary">Activa</span>}
                </button>
                <button type="button" onClick={() => { onToggleTheme(); setIsMoreOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary sm:hidden">
                  {isDark ? <Sun size={16} className="text-text-muted" /> : <Moon size={16} className="text-text-muted" />}
                  <span>{isDark ? "Usar tema claro" : "Usar tema oscuro"}</span>
                </button>
                <button type="button" onClick={() => { enterFocusMode(); setIsMoreOpen(false); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary">
                  <Maximize2 size={16} className="text-text-muted" />
                  <span>Modo de concentración</span>
                </button>
                <button type="button" onClick={() => { setIsMoreOpen(false); void hideMainWindow(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary">
                  <EyeOff size={16} className="text-text-muted" />
                  <span>Dejar StudyLab en segundo plano</span>
                </button>
                <div className="mt-1 border-t border-border-subtle px-3 py-2.5">
                  <SyncStatusIndicator />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
