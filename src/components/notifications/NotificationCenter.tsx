import React, { useMemo, useState } from "react";
import {
  Bell,
  X,
  Check,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Info,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useOrganizationStore } from "../../stores/useOrganizationStore";
import { useDelayedRender } from "../../hooks/useDelayedRender";
import { clsx } from "clsx";

export const NotificationCenter: React.FC = () => {
  const isOpen = useNotificationStore((s) => s.isOpen);
  const setIsOpen = useNotificationStore((s) => s.setIsOpen);
  const notifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useNotificationStore((s) => s.markAllAsRead);
  const removeNotification = useNotificationStore((s) => s.removeNotification);
  const clearAll = useNotificationStore((s) => s.clearAll);
  const closeOrganization = useOrganizationStore((s) => s.closeOrganization);
  const shouldRender = useDelayedRender(isOpen, 300);

  const [activeFilter, setActiveFilter] = useState<"all" | "unread" | "important">("all");

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(() => {
    if (activeFilter === "unread") return notifications.filter((n) => !n.read);
    if (activeFilter === "important") {
      return notifications.filter((n) => n.level === "important" || n.level === "urgent");
    }
    return notifications;
  }, [notifications, activeFilter]);

  if (!shouldRender) return null;

  return (
    <>
      {/* Telón de fondo */}
      <div
        className={clsx(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => {
          setIsOpen(false);
          closeOrganization();
        }}
        aria-hidden="true"
      />

      {/* Panel de Notificaciones fijo a la derecha */}
      <div
        className={clsx(
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-[90vw] sm:w-[380px] desktop-drawer-panel",
          isOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="notif-center-title"
      >
        <div className="w-full border-l border-border-subtle bg-bg-surface p-6 shadow-2xl flex flex-col justify-between h-full overflow-hidden">
          {/* Header */}
          <div className="flex flex-col gap-3 border-b border-border-subtle pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                  <Bell size={16} strokeWidth={2} />
                </span>
                <div>
                  <h2 id="notif-center-title" className="font-serif text-base font-semibold text-text-primary">
                    Bandeja de Notificaciones
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    {unreadCount > 0
                      ? `${unreadCount} ${unreadCount === 1 ? "aviso sin leer" : "avisos sin leer"}`
                      : "Al día. No hay avisos pendientes"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar notificaciones"
                className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Filtros y acciones rápidas */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex rounded-md border border-border-subtle bg-bg-surface-2 p-0.5 text-xs">
                {(
                  [
                    { key: "all", label: "Todas" },
                    { key: "unread", label: "No leídas" },
                    { key: "important", label: "Importantes" },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setActiveFilter(t.key)}
                    className={clsx(
                      "px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer",
                      activeFilter === t.key
                        ? "bg-bg-elevated text-text-primary shadow-2xs border border-border-subtle"
                        : "text-text-secondary hover:text-text-primary",
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    title="Marcar todo como leído"
                    className="flex items-center gap-1 text-[11px] text-accent-primary hover:underline px-1.5 py-1 cursor-pointer"
                  >
                    <CheckCheck size={13} />
                    <span>Marcar leídas</span>
                  </button>
                )}
                {notifications.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAll}
                    title="Limpiar historial"
                    className="p-1 text-text-tertiary hover:text-danger rounded hover:bg-bg-surface-2 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Lista de Notificaciones */}
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2.5">
            {filteredNotifications.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
                <Sparkles size={32} strokeWidth={1.25} className="mb-2 text-text-muted opacity-50" />
                <p className="text-sm font-medium text-text-secondary">Sin notificaciones</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Los avisos académicos y del sistema se mostrarán acá.
                </p>
              </div>
            ) : (
              filteredNotifications.map((notif) => {
                const isUrgent = notif.level === "urgent";
                const isImportant = notif.level === "important";
                const isWarning = notif.level === "warning";

                return (
                  <div
                    key={notif.id}
                    className={clsx(
                      "group relative flex flex-col gap-1.5 rounded-lg border p-3 text-xs transition-all",
                      !notif.read
                        ? "bg-bg-surface-2/90 border-accent-primary/40 shadow-2xs"
                        : "bg-bg-elevated/50 border-border-subtle hover:bg-bg-elevated/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isUrgent ? (
                          <AlertCircle size={15} className="shrink-0 text-danger" />
                        ) : isImportant ? (
                          <AlertTriangle size={15} className="shrink-0 text-warning" />
                        ) : isWarning ? (
                          <Clock size={15} className="shrink-0 text-accent-secondary" />
                        ) : (
                          <Info size={15} className="shrink-0 text-accent-primary" />
                        )}
                        <span
                          className={clsx(
                            "truncate font-medium",
                            !notif.read ? "text-text-primary font-semibold" : "text-text-secondary",
                          )}
                        >
                          {notif.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {!notif.read && (
                          <button
                            type="button"
                            title="Marcar como leída"
                            onClick={() => markAsRead(notif.id)}
                            className="p-1 text-text-tertiary hover:text-accent-primary rounded transition-colors cursor-pointer"
                          >
                            <Check size={13} />
                          </button>
                        )}
                        <button
                          type="button"
                          title="Eliminar notificación"
                          onClick={() => removeNotification(notif.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-text-tertiary hover:text-danger rounded transition-opacity cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p className="text-text-secondary text-[11px] leading-relaxed">
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary pt-1 border-t border-border-subtle/30">
                      <span>
                        {new Date(notif.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="uppercase tracking-wider">
                        {notif.category ?? "SISTEMA"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Informativo */}
          <div className="border-t border-border-subtle pt-3 text-center">
            <span className="font-mono text-[10px] text-text-tertiary">
              STUDYLAB COGNITIVE NOTIFICATIONS · LOCAL-FIRST
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
