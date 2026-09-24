import { create } from "zustand";
import { persist } from "zustand/middleware";

export type DateFormat = "DD/MM/YYYY" | "MM/DD/YYYY" | "YYYY-MM-DD";

/**
 * Formatea un timestamp o Date según el patrón elegido por el usuario.
 */
export function formatDateWithPattern(date: number | Date, format: DateFormat = "DD/MM/YYYY"): string {
  const d = typeof date === "number" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "MM/DD/YYYY") return `${month}/${day}/${year}`;
  return `${year}-${month}-${day}`;
}

/**
 * Parsea un string con formato DD/MM/YYYY, MM/DD/YYYY o YYYY-MM-DD a Date.
 */
export function parseDateFromPattern(str: string, format: DateFormat = "DD/MM/YYYY"): Date | null {
  if (!str || !str.trim()) return null;

  const parts = str.trim().split(/[/-]/).map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;

  let day: number;
  let month: number;
  let year: number;

  if (format === "DD/MM/YYYY") {
    [day, month, year] = parts;
  } else if (format === "MM/DD/YYYY") {
    [month, day, year] = parts;
  } else {
    [year, month, day] = parts;
  }

  // Ajuste para años de 2 dígitos si el usuario escribe ej. "26"
  if (year < 100) year += 2000;

  const dateObj = new Date(year, month - 1, day);
  return isNaN(dateObj.getTime()) ? null : dateObj;
}

interface DateFormatState {
  dateFormat: DateFormat;
  setDateFormat: (format: DateFormat) => void;
}

export const useDateFormatStore = create<DateFormatState>()(
  persist(
    (set) => ({
      dateFormat: "DD/MM/YYYY", // Por defecto formato hispanoamericano y argentino
      setDateFormat: (dateFormat) => set({ dateFormat }),
    }),
    {
      name: "studylab-date-format",
    }
  )
);
