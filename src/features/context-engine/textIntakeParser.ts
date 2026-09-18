import type { TextIntakeDraft } from "./types";

/**
 * Analizador determinista de texto por reglas para extraer intención, fechas y materias.
 * Cero llamadas a APIs externas.
 */
export function parseTextIntakeRules(text: string): TextIntakeDraft {
  const lower = text.toLowerCase();

  // Detección de tipo
  let detectedType: "calendar_event" | "task" | "quick_note" = "quick_note";
  if (
    lower.includes("parcial") ||
    lower.includes("examen") ||
    lower.includes("final") ||
    lower.includes("clase") ||
    lower.includes("reunión") ||
    lower.includes("horario")
  ) {
    detectedType = "calendar_event";
  } else if (
    lower.includes("entregar") ||
    lower.includes("hacer") ||
    lower.includes("resolver") ||
    lower.includes("tp") ||
    lower.includes("tarea") ||
    lower.includes("guía")
  ) {
    detectedType = "task";
  }

  // Detección de fecha aproximada
  let suggestedDate: string | undefined = undefined;
  const now = new Date();

  if (lower.includes("hoy")) {
    suggestedDate = now.toISOString().split("T")[0];
  } else if (lower.includes("mañana")) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    suggestedDate = tomorrow.toISOString().split("T")[0];
  } else {
    // Buscar patrón tipo DD/MM o DD-MM
    const dateMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})\b/);
    if (dateMatch) {
      const day = dateMatch[1].padStart(2, "0");
      const month = dateMatch[2].padStart(2, "0");
      const year = now.getFullYear();
      suggestedDate = `${year}-${month}-${day}`;
    }
  }

  // Detección de hora tipo 18:00 o 18hs o 18 hs
  let suggestedTime: string | undefined = undefined;
  const timeMatch = text.match(/\b(\d{1,2}):(\d{2})\b/) || text.match(/\b(\d{1,2})\s*(?:hs|horas)\b/);
  if (timeMatch) {
    const hour = timeMatch[1].padStart(2, "0");
    const min = timeMatch[2] || "00";
    suggestedTime = `${hour}:${min}`;
  }

  // Limpiar título preliminar
  const cleanTitle = text.length > 50 ? text.slice(0, 50) + "..." : text;

  return {
    id: `draft_${Date.now()}`,
    rawText: text,
    detectedType,
    title: cleanTitle,
    suggestedDate,
    suggestedTime,
    isConfirmed: false,
  };
}
