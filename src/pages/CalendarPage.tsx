import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ListFilter,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Clock,
  GraduationCap,
  BookOpen,
  X,
} from "lucide-react";
import { db } from "../db/db";
import { generateId } from "../features/files/fileHelpers";
import { formatDueDate } from "../features/dashboard/stats";
import { useGoogleCalendarEvents } from "../features/google-calendar/useGoogleCalendar";
import { useNotificationStore } from "../stores/useNotificationStore";
import { useDateFormatStore, formatDateWithPattern, parseDateFromPattern } from "../stores/useDateFormatStore";
import { clsx } from "clsx";

export type CalendarEventCategory = "exam" | "delivery" | "review" | "google";

export interface UnifiedCalendarItem {
  id: string;
  title: string;
  dueDate: number;
  subjectFolderId: string | null;
  subjectName: string | null;
  source: "manual" | "google_calendar";
  category: CalendarEventCategory;
  isReviewSchedule: boolean;
  originalId?: string;
}

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export const CalendarPage: React.FC = () => {
  const addNotification = useNotificationStore((s) => s.addNotification);
  const dateFormat = useDateFormatStore((s) => s.dateFormat);

  // Queries reactivas a Dexie
  const deadlines = useLiveQuery(() => db.deadlines.orderBy("dueDate").toArray(), []) ?? [];
  const folders = useLiveQuery(() => db.folders.where("type").equals("subject").toArray(), []) ?? [];
  const reviewSchedules = useLiveQuery(() => db.reviewSchedule.orderBy("dueDate").toArray(), []) ?? [];
  const calendarEvents = useGoogleCalendarEvents(true);

  // Estado de Navegación del Calendario
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<"month" | "agenda">("month");
  const [selectedDayTimestamp, setSelectedDayTimestamp] = useState<number | null>(null);

  // Filtros
  const [selectedCategory, setSelectedCategory] = useState<"all" | CalendarEventCategory>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("all");

  // Modal de Creación Rápida
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [inputDateText, setInputDateText] = useState("");
  const [newTime, setNewTime] = useState("18:00");
  const [newSubjectId, setNewSubjectId] = useState<string>("");
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [isCreatingSubject, setIsCreatingSubject] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [newType, setNewType] = useState<"Parcial" | "Final" | "Recuperatorio" | "Entrega" | "Repaso" | "Recordatorio">("Parcial");

  const openModalWithDate = (d: Date) => {
    setNewDate(formatLocalDate(d));
    setInputDateText(formatDateWithPattern(d, dateFormat));
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f.name])), [folders]);

  // Consolidación de todos los items
  const allItems: UnifiedCalendarItem[] = useMemo(() => {
    const manualItems: UnifiedCalendarItem[] = deadlines.map((d) => {
      const lower = d.title.toLowerCase();
      let category: CalendarEventCategory = "delivery";
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

    const googleItems: UnifiedCalendarItem[] = calendarEvents
      .filter((e) => e.start)
      .map((e) => ({
        id: `gcal-${e.id}`,
        title: e.title || "Evento Google Calendar",
        dueDate: new Date(e.start as string).getTime(),
        subjectFolderId: null,
        subjectName: null,
        source: "google_calendar" as const,
        category: "google" as const,
        isReviewSchedule: false,
      }));

    const reviewItems: UnifiedCalendarItem[] = reviewSchedules.map((r) => ({
      id: `rev-${r.id}`,
      title: `Repaso: ${r.topic}`,
      dueDate: r.dueDate,
      subjectFolderId: r.subjectFolderId,
      subjectName: r.subjectFolderId ? folderMap.get(r.subjectFolderId) ?? null : null,
      source: "manual" as const,
      category: "review" as const,
      isReviewSchedule: true,
      originalId: r.id,
    }));

    return [...manualItems, ...googleItems, ...reviewItems].sort((a, b) => a.dueDate - b.dueDate);
  }, [deadlines, calendarEvents, reviewSchedules, folderMap]);

  // Items filtrados
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (selectedCategory !== "all" && item.category !== selectedCategory) return false;
      if (selectedSubjectId !== "all" && item.subjectFolderId !== selectedSubjectId) return false;
      return true;
    });
  }, [allItems, selectedCategory, selectedSubjectId]);

  // Cálculos de grilla mensual
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const monthGrid = useMemo(() => {
    const firstDay = new Date(currentYear, currentMonth, 1);
    const lastDay = new Date(currentYear, currentMonth + 1, 0);

    // Ajuste a Lunes como día 0 (en JS 0 es domingo)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDay.getDate();

    // Días del mes anterior para rellenar
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      isToday: boolean;
      items: UnifiedCalendarItem[];
    }> = [];

    const todayStr = new Date().toDateString();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthLastDay - i);
      days.push({
        date: d,
        isCurrentMonth: false,
        isToday: d.toDateString() === todayStr,
        items: [],
      });
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(currentYear, currentMonth, i);
      const dStr = d.toDateString();
      const dayItems = filteredItems.filter((item) => new Date(item.dueDate).toDateString() === dStr);
      days.push({
        date: d,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        items: dayItems,
      });
    }

    // Completar última semana hasta múltiplo de 7
    const remaining = 7 - (days.length % 7);
    if (remaining < 7) {
      for (let i = 1; i <= remaining; i++) {
        const d = new Date(currentYear, currentMonth + 1, i);
        days.push({
          date: d,
          isCurrentMonth: false,
          isToday: d.toDateString() === todayStr,
          items: [],
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredItems]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleGoToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDayTimestamp(now.setHours(0, 0, 0, 0));
  };

  // Crear nuevo vencimiento
  const handleCreateDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!newTitle.trim()) {
      setErrorMessage("Por favor ingresa un título o descripción para el vencimiento.");
      return;
    }

    if (!newDate) {
      setErrorMessage("Por favor selecciona una fecha válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Resolver o registrar la materia/cátedra (si el estudiante ingresó una nueva)
      let resolvedSubjectFolderId: string | null = newSubjectId || null;

      if (!resolvedSubjectFolderId && customSubjectName.trim()) {
        const cleanName = customSubjectName.trim();
        const existingFolder = folders.find(
          (f) => f.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (existingFolder) {
          resolvedSubjectFolderId = existingFolder.id;
        } else {
          resolvedSubjectFolderId = generateId();
          await db.folders.add({
            id: resolvedSubjectFolderId,
            name: cleanName,
            type: "subject",
            parentId: null,
            createdAt: Date.now(),
          });
        }
      }

      // 2. Parsear fecha y hora usando el formato configurado
      let dateObj: Date | null = parseDateFromPattern(inputDateText, dateFormat);
      if (!dateObj && newDate) {
        const [y, m, d] = newDate.split("-").map(Number);
        dateObj = new Date(y, m - 1, d);
      }

      if (!dateObj || isNaN(dateObj.getTime())) {
        setErrorMessage(`Fecha inválida. Usa el formato ${dateFormat} (ej. ${formatDateWithPattern(Date.now(), dateFormat)})`);
        setIsSubmitting(false);
        return;
      }

      const year = dateObj.getFullYear();
      const month = dateObj.getMonth() + 1;
      const day = dateObj.getDate();

      const [hours, minutes] = (newTime || "18:00").split(":").map(Number);
      const safeHours = isNaN(hours) ? 18 : hours;
      const safeMinutes = isNaN(minutes) ? 0 : minutes;

      dateObj.setHours(safeHours, safeMinutes, 0, 0);
      const timestamp = dateObj.getTime();

      const titlePrefix = newType !== "Recordatorio" ? `[${newType}] ` : "";
      const finalTitle = `${titlePrefix}${newTitle.trim()}`;

      // 3. Persistir directamente en Dexie / SQLite
      await db.deadlines.add({
        id: generateId(),
        title: finalTitle,
        dueDate: timestamp,
        subjectFolderId: resolvedSubjectFolderId,
        source: "manual",
      });

      // 4. Notificación al centro de avisos
      addNotification({
        title: "Vencimiento Agendado",
        message: `"${finalTitle}" programado para el ${formatDateWithPattern(timestamp, dateFormat)}`,
        category: "academic",
        level: newType === "Parcial" || newType === "Final" ? "important" : "info",
      });

      // 5. Navegar automáticamente el calendario al mes y seleccionar el día creado
      setCurrentDate(new Date(year, month - 1, 1));
      setSelectedDayTimestamp(new Date(year, month - 1, day).setHours(0, 0, 0, 0));

      // 6. Limpiar y cerrar modal
      setNewTitle("");
      setCustomSubjectName("");
      setNewSubjectId("");
      setInputDateText("");
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Error al guardar vencimiento:", err);
      setErrorMessage(err?.message || "No se pudo guardar el vencimiento en la base de datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteItem = async (item: UnifiedCalendarItem) => {
    if (item.source === "google_calendar") return;
    if (item.isReviewSchedule && item.originalId) {
      await db.reviewSchedule.delete(item.originalId);
    } else {
      await db.deadlines.delete(item.id);
    }
  };

  // Eventos del día seleccionado
  const selectedDayItems = useMemo(() => {
    if (!selectedDayTimestamp) return null;
    const targetDateStr = new Date(selectedDayTimestamp).toDateString();
    return filteredItems.filter((i) => new Date(i.dueDate).toDateString() === targetDateStr);
  }, [selectedDayTimestamp, filteredItems]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]">
      {/* Barra Superior con Controles */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <CalendarIcon size={20} strokeWidth={2} />
            </span>
            <div>
              <h1 className="font-serif text-2xl font-semibold text-text-primary">
                Organización & Calendario
              </h1>
              <p className="text-xs text-text-muted">
                Planificación académica integral: exámenes, entregas, repasos y Google Calendar
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Switcher de Vista */}
          <div className="flex items-center rounded-lg border border-border-subtle bg-bg-elevated/80 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-all cursor-pointer",
                viewMode === "month"
                  ? "bg-accent-primary text-white font-medium shadow-2xs"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <CalendarDays size={14} />
              <span>Mes</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-sans transition-all cursor-pointer",
                viewMode === "agenda"
                  ? "bg-accent-primary text-white font-medium shadow-2xs"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              <ListFilter size={14} />
              <span>Agenda ({filteredItems.length})</span>
            </button>
          </div>

          {/* Botón Nuevo Evento */}
          <button
            type="button"
            onClick={() => openModalWithDate(new Date())}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md bg-accent-primary text-white text-xs font-sans font-medium hover:bg-accent-primary/90 transition-colors shadow-2xs cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.2} />
            <span>Nuevo Vencimiento</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Navegación de Mes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-bg-elevated/40 border border-border-subtle/80 rounded-xl p-3">
        {/* Navegación Mes */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg-surface text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors cursor-pointer shadow-2xs"
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="font-serif text-base font-semibold text-text-primary min-w-[170px] text-center">
            {MONTH_NAMES[currentMonth]} {currentYear}
          </span>
          <button
            type="button"
            onClick={handleNextMonth}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg-surface text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors cursor-pointer shadow-2xs"
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={handleGoToday}
            className="px-2.5 py-1 rounded-md border border-border-subtle bg-bg-surface text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:border-accent-primary transition-colors cursor-pointer ml-1"
          >
            Hoy
          </button>
        </div>

        {/* Filtros por Categoría y Cátedra */}
        <div className="flex items-center flex-wrap gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as any)}
            className="h-8 px-2.5 rounded-md border border-border-subtle bg-bg-surface text-xs font-sans text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer"
          >
            <option value="all">Todas las categorías</option>
            <option value="exam">🔴 Exámenes / Parciales</option>
            <option value="delivery">🟡 Entregas / TPs</option>
            <option value="review">🔵 Repasos programados</option>
            <option value="google">🟢 Google Calendar</option>
          </select>

          {folders.length > 0 && (
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="h-8 px-2.5 rounded-md border border-border-subtle bg-bg-surface text-xs font-sans text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer max-w-[180px] truncate"
            >
              <option value="all">Todas las materias</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* VISTA 1: GRILLA MENSUAL */}
      {viewMode === "month" && (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 bg-bg-surface border border-border-subtle rounded-xl overflow-hidden shadow-2xs">
            {/* Cabecera de Días de la Semana */}
            <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-elevated/40 text-center text-xs font-semibold uppercase tracking-wider text-text-muted py-2.5">
              {DAY_NAMES.map((name) => (
                <div key={name}>{name}</div>
              ))}
            </div>

            {/* Días del Mes */}
            <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-border-subtle/50">
              {monthGrid.map((cell, idx) => {
                const isSelected = selectedDayTimestamp === new Date(cell.date).setHours(0, 0, 0, 0);

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedDayTimestamp(new Date(cell.date).setHours(0, 0, 0, 0))}
                    className={clsx(
                      "min-h-[105px] p-1.5 transition-colors cursor-pointer flex flex-col justify-between group",
                      !cell.isCurrentMonth && "bg-bg-primary/30 opacity-40",
                      cell.isToday && "bg-accent-primary/5",
                      isSelected && "ring-2 ring-accent-primary ring-inset bg-accent-primary/10",
                      "hover:bg-bg-elevated/60"
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={clsx(
                          "flex h-6 w-6 items-center justify-center rounded-full text-xs font-sans font-medium",
                          cell.isToday
                            ? "bg-accent-primary text-white font-bold"
                            : "text-text-secondary group-hover:text-text-primary"
                        )}
                      >
                        {cell.date.getDate()}
                      </span>

                      {cell.items.length > 0 && (
                        <span className="text-[10px] font-mono text-text-muted px-1">
                          {cell.items.length}
                        </span>
                      )}
                    </div>

                    {/* Badges de Eventos en el día (máximo 3 visibles) */}
                    <div className="flex flex-col gap-1 overflow-hidden">
                      {cell.items.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          title={`${item.title} ${item.subjectName ? `(${item.subjectName})` : ""}`}
                          className={clsx(
                            "truncate text-[10px] px-1.5 py-0.5 rounded font-sans font-medium border leading-tight flex items-center gap-1",
                            item.category === "exam" && "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/30",
                            item.category === "delivery" && "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
                            item.category === "review" && "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/30",
                            item.category === "google" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                          )}
                        >
                          <span
                            className={clsx(
                              "h-1.5 w-1.5 rounded-full shrink-0",
                              item.category === "exam" && "bg-red-500",
                              item.category === "delivery" && "bg-amber-500",
                              item.category === "review" && "bg-indigo-500",
                              item.category === "google" && "bg-emerald-500"
                            )}
                          />
                          <span className="truncate">{item.title}</span>
                        </div>
                      ))}

                      {cell.items.length > 3 && (
                        <span className="text-[9px] text-text-muted text-center font-mono">
                          +{cell.items.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Panel Lateral: Detalle del Día Seleccionado */}
          <div className="w-full lg:w-80 flex flex-col gap-4">
            <div className="border border-border-subtle bg-bg-surface rounded-xl p-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-3">
                <div>
                  <h2 className="font-serif text-base font-semibold text-text-primary">
                    {selectedDayTimestamp
                      ? new Date(selectedDayTimestamp).toLocaleDateString("es-ES", {
                          weekday: "long",
                          day: "numeric",
                          month: "long",
                        })
                      : "Selecciona un día"}
                  </h2>
                  <p className="text-xs text-text-muted">
                    {selectedDayItems ? `${selectedDayItems.length} eventos agendados` : "Haz clic en una fecha"}
                  </p>
                </div>
                {selectedDayTimestamp && (
                  <button
                    type="button"
                    onClick={() => openModalWithDate(new Date(selectedDayTimestamp))}
                    className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-primary/10 text-accent-primary hover:bg-accent-primary hover:text-white transition-colors cursor-pointer"
                    title="Añadir evento a este día"
                  >
                    <Plus size={14} />
                  </button>
                )}
              </div>

              {selectedDayItems && selectedDayItems.length === 0 && (
                <div className="text-center py-8 text-text-muted">
                  <p className="text-xs">No hay eventos ni exámenes agendados para este día.</p>
                  <button
                    type="button"
                    onClick={() => openModalWithDate(new Date(selectedDayTimestamp!))}
                    className="mt-3 text-xs text-accent-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus size={13} /> Añadir vencimiento
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-2.5 max-h-[420px] overflow-y-auto pr-1">
                {selectedDayItems?.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-lg border border-border-subtle bg-bg-elevated/40 hover:bg-bg-elevated transition-colors flex items-start justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span
                          className={clsx(
                            "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                            item.category === "exam" && "bg-red-500/15 text-red-700 dark:text-red-300",
                            item.category === "delivery" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                            item.category === "review" && "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                            item.category === "google" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                          )}
                        >
                          {item.category === "exam" ? "Examen" : item.category === "delivery" ? "Entrega" : item.category === "review" ? "Repaso" : "G-Calendar"}
                        </span>
                        {item.subjectName && (
                          <span className="text-[10px] text-text-muted truncate">
                            {item.subjectName}
                          </span>
                        )}
                      </div>
                      <h3 className="text-xs font-medium text-text-primary break-words">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-text-muted mt-1 flex items-center gap-1 font-mono">
                        <Clock size={11} />
                        <span>{formatDateWithPattern(item.dueDate, dateFormat)} • {new Date(item.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </p>
                    </div>

                    {item.source !== "google_calendar" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        className="text-text-muted hover:text-red-500 p-1 rounded transition-colors cursor-pointer"
                        title="Eliminar evento"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VISTA 2: AGENDA CRONOLÓGICA */}
      {viewMode === "agenda" && (
        <div className="border border-border-subtle bg-bg-surface rounded-xl p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4 mb-4">
            <div>
              <h2 className="font-serif text-lg font-semibold text-text-primary">
                Próximos Vencimientos & Hitos
              </h2>
              <p className="text-xs text-text-muted">
                Listado ordenado cronológicamente con cuenta regresiva
              </p>
            </div>
            <span className="text-xs font-mono bg-bg-elevated px-2 py-1 rounded text-text-secondary border border-border-subtle">
              Total: {filteredItems.length}
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-16 text-text-muted">
              <CalendarDays className="h-10 w-10 mx-auto text-text-muted/40 mb-3" />
              <p className="text-sm font-medium">No hay vencimientos programados con los filtros actuales.</p>
              <button
                type="button"
                onClick={() => openModalWithDate(new Date())}
                className="mt-3 text-xs text-accent-primary hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus size={14} /> Crear primer vencimiento
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => {
                const now = Date.now();
                const isOverdue = item.dueDate < now;
                const formatted = formatDueDate(item.dueDate);

                return (
                  <div
                    key={item.id}
                    className={clsx(
                      "p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                      isOverdue
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-border-subtle bg-bg-elevated/40 hover:bg-bg-elevated/80"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={clsx(
                          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                          item.category === "exam" && "bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400",
                          item.category === "delivery" && "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
                          item.category === "review" && "bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400",
                          item.category === "google" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        )}
                      >
                        {item.category === "exam" ? (
                          <GraduationCap size={20} />
                        ) : item.category === "review" ? (
                          <BookOpen size={20} />
                        ) : (
                          <CalendarIcon size={20} />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span
                            className={clsx(
                              "px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
                              item.category === "exam" && "bg-red-500/15 text-red-700 dark:text-red-300",
                              item.category === "delivery" && "bg-amber-500/15 text-amber-700 dark:text-amber-300",
                              item.category === "review" && "bg-indigo-500/15 text-indigo-700 dark:text-indigo-300",
                              item.category === "google" && "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            )}
                          >
                            {item.category === "exam" ? "Examen" : item.category === "delivery" ? "Entrega" : item.category === "review" ? "Repaso" : "Google Calendar"}
                          </span>

                          {item.subjectName && (
                            <span className="text-xs text-text-secondary font-medium">
                              • {item.subjectName}
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-semibold text-text-primary">
                          {item.title}
                        </h3>

                        <p className="text-xs text-text-muted mt-1 flex items-center gap-1 font-mono">
                          <Clock size={12} />
                          <span>{formatDateWithPattern(item.dueDate, dateFormat)} • {new Date(item.dueDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span
                        className={clsx(
                          "px-2.5 py-1 rounded-md text-xs font-sans font-medium border",
                          isOverdue
                            ? "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20"
                            : "bg-bg-surface text-text-secondary border-border-subtle"
                        )}
                      >
                        {isOverdue ? `Venció: ${formatted}` : `Plazo: ${formatted}`}
                      </span>

                      {item.source !== "google_calendar" && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle bg-bg-surface text-text-muted hover:text-red-500 hover:border-red-500/40 transition-colors cursor-pointer"
                          title="Eliminar vencimiento"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR NUEVO VENCIMIENTO */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <CalendarIcon size={18} className="text-accent-primary" />
                <h3 className="font-serif text-base font-semibold text-text-primary">
                  Agendar Vencimiento / Examen
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-muted hover:text-text-primary cursor-pointer p-1 rounded"
              >
                <X size={18} />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-600 dark:text-red-400 text-xs">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleCreateDeadline} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Título / Descripción
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Primer Parcial de Química Orgánica"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-9 px-3 rounded-md border border-border-subtle bg-bg-elevated text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-text-secondary">
                    Cátedra / Materia <span className="text-text-muted font-normal">(Opcional)</span>
                  </label>
                  {folders.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setIsCreatingSubject(!isCreatingSubject)}
                      className="text-[11px] text-accent-primary hover:underline cursor-pointer"
                    >
                      {isCreatingSubject ? "Elegir existente" : "+ Escribir otra"}
                    </button>
                  )}
                </div>

                {folders.length === 0 || isCreatingSubject ? (
                  <input
                    type="text"
                    placeholder="Ej: Biología Celular, Química (opcional)"
                    value={customSubjectName}
                    onChange={(e) => setCustomSubjectName(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border-subtle bg-bg-elevated text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
                  />
                ) : (
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-md border border-border-subtle bg-bg-elevated text-xs text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer truncate"
                  >
                    <option value="">(Opcional) Sin cátedra asignada</option>
                    {folders.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-text-muted mt-1">
                  No es obligatorio. Puedes vincular una materia existente o escribir una nueva.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Tipo de Hito
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full h-9 px-2.5 rounded-md border border-border-subtle bg-bg-elevated text-xs text-text-primary focus:outline-hidden focus:border-accent-primary cursor-pointer"
                  >
                    <option value="Parcial">Parcial</option>
                    <option value="Final">Examen Final</option>
                    <option value="Recuperatorio">Recuperatorio</option>
                    <option value="Entrega">Entrega / TP</option>
                    <option value="Repaso">Sesión de Repaso</option>
                    <option value="Recordatorio">Recordatorio</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full h-9 px-3 rounded-md border border-border-subtle bg-bg-elevated text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-text-secondary">
                    Fecha ({dateFormat})
                  </label>
                  {inputDateText && (
                    <span className="text-[11px] font-mono text-accent-primary font-semibold">
                      {inputDateText}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder={
                      dateFormat === "DD/MM/YYYY"
                        ? "DD/MM/AAAA (ej. 25/09/2026)"
                        : dateFormat === "MM/DD/YYYY"
                        ? "MM/DD/AAAA (ej. 09/25/2026)"
                        : "AAAA-MM-DD (ej. 2026-09-25)"
                    }
                    value={inputDateText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInputDateText(val);
                      const parsed = parseDateFromPattern(val, dateFormat);
                      if (parsed) {
                        setNewDate(formatLocalDate(parsed));
                      }
                    }}
                    className="flex-1 h-9 px-3 rounded-md border border-border-subtle bg-bg-elevated text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent-primary"
                  />
                  <div className="relative">
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => {
                        const isoVal = e.target.value;
                        if (!isoVal) return;
                        setNewDate(isoVal);
                        const [y, m, d] = isoVal.split("-").map(Number);
                        const dateObj = new Date(y, m - 1, d);
                        setInputDateText(formatDateWithPattern(dateObj, dateFormat));
                      }}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                      title="Seleccionar fecha en calendario gráfico"
                    />
                    <button
                      type="button"
                      className="h-9 px-3 rounded-md border border-border-subtle bg-bg-elevated hover:bg-bg-surface-2 text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1.5 text-xs font-sans cursor-pointer"
                    >
                      <CalendarIcon size={14} className="text-accent-primary" />
                      <span className="hidden sm:inline">Elegir</span>
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Formato activo: <span className="font-mono text-accent-primary font-semibold">{dateFormat}</span>. Puedes cambiarlo en Configuración.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md border border-border-subtle bg-bg-elevated text-xs font-sans text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newTitle.trim() || (!newDate && !inputDateText.trim())}
                  className="px-4 py-1.5 rounded-md bg-accent-primary text-white text-xs font-sans font-medium hover:bg-accent-primary/90 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? "Guardando..." : "Guardar Vencimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
