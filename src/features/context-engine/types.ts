import type { ContextProjectRecord, ContextTimeBlockRecord } from "../../db/db";

export type { ContextProjectRecord, ContextTimeBlockRecord };

export interface TextIntakeDraft {
  id: string;
  rawText: string;
  detectedType: "calendar_event" | "task" | "quick_note";
  title: string;
  suggestedDate?: string; // YYYY-MM-DD
  suggestedTime?: string; // HH:mm
  subject?: string;
  details?: string;
  isConfirmed: boolean;
}

export interface EnergyStatsSummary {
  totalRecords: number;
  unlocked: boolean;
  bestBlock?: "Mañana (06:00 - 12:00)" | "Tarde (12:00 - 19:00)" | "Noche (19:00 - 06:00)";
  bestAverageScore?: number;
  morningCount: number;
  afternoonCount: number;
  nightCount: number;
  averageEnergy: number;
}
