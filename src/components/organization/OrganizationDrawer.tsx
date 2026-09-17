import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  X,
  Clock,
  Pin,
  Plus,
  Trash2,
  BookOpen,
  CalendarClock,
  GraduationCap,
} from "lucide-react";
import { db } from "../../db/db";
import { generateId } from "../../features/files/fileHelpers";
import { formatDueDate } from "../../features/dashboard/stats";
import { useGoogleCalendarEvents } from "../../features/google-calendar/useGoogleCalendar";
import { useOrganizationStore, type OrganizationFilter } from "../../stores/useOrganizationStore";
import { useNotificationStore } from "../../stores/useNotificationStore";
import { useDelayedRender } from "../../hooks/useDelayedRender";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { clsx } from "clsx";

export const OrganizationDrawer: React.FC = () => {
  const isOpen = useOrganizationStore((s) => s.isOpen);
  const closeOrganization = useOrganizationStore((s) => s.closeOrganization);
  const activeFilter = useOrganizationStore((s) => s.activeFilter);
  const setActiveFilter = useOrganizationStore((s) => s.setActiveFilter);

  // Queries reactivas a IndexedDB / SQLite
  const deadlines = useLiveQuery(() => db.deadlines.orderBy("dueDate").toArray(), []) ?? [];
  const folders = useLiveQuery(() => db.folders.where("type").equals("subject").toArray(), []) ?? [];
  const reviewSchedules = useLiveQuery(() => db.reviewSchedule.orderBy("dueDate").toArray(), []) ?? [];
  const calendarEvents = useGoogleCalendarEvents(isOpen);

  // Estados locales para el formulario de nuevo vencimiento
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [itemType, setItemType] = useState<"Parcial" | "Final" | "Entrega" | "Recordatorio">("Parcial");
  const [isAdding, setIsAdding] = useState(false);

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);

  // Consolidación de items
  const allItems = useMemo(() => {
    const manualAndSyncedDeadlines = deadlines.map((d) => {
      const lower = d.title.toLowerCase();
      let category: "exam" | "delivery" | "review" = "delivery";
      if (lower.includes("parcial") || lower.includes("final") || lower.includes("examen") || lower.includes("recuperatorio")) {
        category = "exam";
      } else if (lower.includes("repaso") || lower.includes("leer") || lower.includes("estudiar")) {
        category = "review";
      }

      return {
        id: d.id,
        title: d.title,
        dueDate: d.dueDate,
        subjectFolderId: d.subjectFolderId,
        subjectName: d.subjectFolderId ? folderMap.get(d.subjectFolderId) ?? null : null,
        source: d.source,
        category,
        isReviewSchedule: false,
      };
    });

    const googleItems = calendarEvents
      .filter((e) => e.start)
      .map((e) => {
        const lower = (e.title ?? "").toLowerCase();
        let category: "exam" | "delivery" | "review" = "delivery";
        if (lower.includes("parcial") || lower.includes("final") || lower.includes("examen")) {
          category = "exam";
        }
        return {
          id: `gcal-${e.id}`,
          title: e.title || "Evento Google Calendar",
          dueDate: new Date(e.start as string).getTime(),
          subjectFolderId: null,
          subjectName: null,
          source: "google_calendar" as const,
          category,
          isReviewSchedule: false,
        };
      });

    const reviews = reviewSchedules.map((r) => ({
      id: `rev-${r.id}`,
      title: `Repaso: ${r.topic}`,
      dueDate: r.dueDate,
      subjectFolderId: r.subjectFolderId,
      subjectName: r.subjectFolderId ? folderMap.get(r.subjectFolderId) ?? null : null,
      source: "manual" as const,
      category: "review" as const,
      isReviewSchedule: true,
      originalScheduleId: r.id,
    }));

    const combined = [...manualAndSyncedDeadlines, ...googleItems, ...reviews];

    // Orden cronológico
    return combined.sort((a, b) => a.dueDate - b.dueDate);
  }, [deadlines, calendarEvents, reviewSchedules, folderMap]);

  // Filtrado según la pestaña activa
  const filteredItems = useMemo(() => {
    if (activeFilter === "exams") return allItems.filter((i) => i.category === "exam");
    if (activeFilter === "deliveries") return allItems.filter((i) => i.category === "delivery");
    if (activeFilter === "reviews") return allItems.filter((i) => i.category === "review");
    return allItems;
  }, [allItems, activeFilter]);

  // Contadores para insignias
  const counts = useMemo(() => {
    return {
      all: allItems.length,
      exams: allItems.filter((i) => i.category === "exam").length,
      deliveries: allItems.filter((i) => i.category === "delivery").length,
      reviews: allItems.filter((i) => i.category === "review").length,
    };
  }, [allItems]);

  async function handleAdd() {
    if (!newTitle.trim() || !newDate) return;
    const [y, m, d] = newDate.split("-").map(Number);
    const dueDate = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();

    const fullTitle = `${itemType}: ${newTitle.trim()}`;

    await db.deadlines.add({
      id: generateId(),
      title: fullTitle,
      dueDate,
      subjectFolderId: selectedFolderId || null,
      source: "manual",
    });

    setNewTitle("");
    setNewDate("");
    setIsAdding(false);
  }

  async function handleDelete(item: (typeof allItems)[number]) {
    if (item.source === "google_calendar") return;
    if (item.isReviewSchedule && "originalScheduleId" in item) {
      await db.reviewSchedule.delete(item.originalScheduleId as string);
    } else {
      await db.deadlines.delete(item.id);
    }
  }

  const isNotifOpen = useNotificationStore((s) => s.isOpen);
  const shouldRender = useDelayedRender(isOpen, 300);

  if (!shouldRender) return null;

  return (
    <>
      {/* Telón de fondo (solo activo si las notificaciones no están ya activas con el suyo) */}
      {!isNotifOpen && (
        <div
          className={clsx(
            "fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300 ease-out",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          )}
          onClick={closeOrganization}
          aria-hidden="true"
        />
      )}

      {/* Contenedor del Drawer en paralelo */}
      <div
        className={clsx(
          "fixed inset-y-0 z-50 flex w-full max-w-[90vw] sm:w-[380px] desktop-drawer-panel",
          isNotifOpen ? "sm:right-[380px] right-0" : "right-0",
          isOpen ? "translate-x-0 opacity-100 pointer-events-auto" : "translate-x-full opacity-0 pointer-events-none",
        )}
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        role="dialog"
        aria-labelledby="org-panel-title"
      >
        <div className="w-full border-l border-border-subtle bg-bg-surface p-6 shadow-2xl flex flex-col justify-between h-full overflow-hidden">
          {/* Header del Panel */}
          <div className="flex flex-col gap-4 border-b border-border-subtle pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
                  <Pin size={16} strokeWidth={2} />
                </span>
                <div>
                  <h2 id="org-panel-title" className="font-serif text-base font-semibold text-text-primary">
                    Centro de Organización
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    Fechas límite, exámenes y calendario
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeOrganization}
                aria-label="Cerrar panel de organización"
                className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-surface-2 hover:text-text-primary transition-colors cursor-pointer"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            {/* Selector de Filtros */}
            <div className="flex rounded-lg border border-border-subtle bg-bg-surface-2 p-1 text-xs">
              {(
                [
                  { key: "all", label: "Todos", count: counts.all },
                  { key: "exams", label: "Exámenes", count: counts.exams },
                  { key: "deliveries", label: "Entregas", count: counts.deliveries },
                  { key: "reviews", label: "Repasos", count: counts.reviews },
                ] as { key: OrganizationFilter; label: string; count: number }[]
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={clsx(
                    "flex-1 py-1.5 rounded-md text-center font-medium transition-all cursor-pointer flex items-center justify-center gap-1",
                    activeFilter === tab.key
                      ? "bg-bg-elevated text-text-primary shadow-xs border border-border-subtle"
                      : "text-text-secondary hover:text-text-primary",
                  )}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={clsx(
                        "rounded-full px-1.5 py-0.2 text-[10px] font-mono",
                        activeFilter === tab.key
                          ? "bg-accent-primary text-white"
                          : "bg-bg-surface text-text-tertiary",
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Eventos y Vencimientos */}
          <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-2.5">
            {filteredItems.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center text-center p-6 text-text-tertiary">
                <CalendarClock size={36} strokeWidth={1.25} className="mb-2 text-text-muted opacity-60" />
                <p className="text-sm font-medium text-text-secondary">No hay fechas pendientes</p>
                <p className="text-xs text-text-tertiary mt-1">
                  Agregá un parcial, entrega o examen con el botón inferior.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => {
                const isExam = item.category === "exam";
                const isReview = item.category === "review";
                const dueText = formatDueDate(item.dueDate);
                const isOverdue = dueText === "Vencido";
                const isToday = dueText === "Hoy";

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "group relative flex flex-col gap-1.5 rounded-lg border p-3 text-xs transition-all",
                      isExam
                        ? "border-accent-primary/40 bg-accent-primary/5 hover:border-accent-primary"
                        : "border-border-subtle bg-bg-elevated/70 hover:border-border-subtle/80 hover:bg-bg-elevated",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isExam ? (
                          <GraduationCap size={14} className="shrink-0 text-accent-primary" />
                        ) : isReview ? (
                          <BookOpen size={14} className="shrink-0 text-accent-secondary" />
                        ) : (
                          <Clock size={14} className="shrink-0 text-text-tertiary" />
                        )}
                        <span className="truncate font-medium text-text-primary">
                          {item.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={clsx(
                            "font-mono text-[11px] font-semibold px-2 py-0.5 rounded-sm",
                            isOverdue
                              ? "bg-danger/10 text-danger"
                              : isToday
                              ? "bg-warning/15 text-warning"
                              : "bg-bg-surface-2 text-text-secondary",
                          )}
                        >
                          {dueText}
                        </span>
                        {item.source !== "google_calendar" && (
                          <button
                            type="button"
                            title="Eliminar registro"
                            onClick={() => handleDelete(item)}
                            className="opacity-0 group-hover:opacity-100 text-text-tertiary hover:text-danger p-0.5 transition-opacity cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-text-tertiary pt-1 border-t border-border-subtle/30">
                      <span className="truncate">
                        {item.subjectName ? `Materia: ${item.subjectName}` : "General"}
                      </span>
                      {item.source === "google_calendar" ? (
                        <span className="font-mono text-[10px] text-accent flex items-center gap-1">
                          Google Calendar
                        </span>
                      ) : (
                        <span className="font-mono text-[10px]">
                          {new Date(item.dueDate).toLocaleDateString("es-AR", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Formulario de Entrada Rápida */}
          <div className="border-t border-border-subtle pt-4 flex flex-col gap-3">
            {!isAdding ? (
              <Button
                variant="secondary"
                size="sm"
                className="w-full flex items-center justify-center gap-2 cursor-pointer"
                onClick={() => setIsAdding(true)}
              >
                <Plus size={14} strokeWidth={2} />
                <span>Agregar nueva fecha académica</span>
              </Button>
            ) : (
              <div className="flex flex-col gap-2.5 rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-xs animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-text-primary">Nuevo vencimiento</span>
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="text-text-tertiary hover:text-text-primary text-[11px] cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="flex gap-1.5">
                  {(["Parcial", "Final", "Entrega", "Recordatorio"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setItemType(t)}
                      className={clsx(
                        "flex-1 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
                        itemType === t
                          ? "border-accent-primary bg-accent-primary text-white"
                          : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Unidad 3 a 5, Guía práctica..."
                  className="text-xs"
                />

                <div className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  {folders.length > 0 && (
                    <select
                      value={selectedFolderId}
                      onChange={(e) => setSelectedFolderId(e.target.value)}
                      className="flex-1 rounded-md border border-border-subtle bg-bg-elevated px-2 py-1 text-xs text-text-secondary focus:border-accent-primary focus:outline-hidden"
                    >
                      <option value="">Sin cátedra</option>
                      {folders.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || !newDate}
                  className="w-full mt-1 cursor-pointer"
                >
                  Confirmar y Guardar
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
