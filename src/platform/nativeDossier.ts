/**
 * StudyLab Native Academic Dossier Compiler Bridge
 * Connects Frontend with Rust deterministic A4 dossier generator.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";

export interface DossierConceptInput {
  name: string;
  mastery_score: number;
  status: string;
  description: string;
}

export interface DossierErrorInput {
  concept: string;
  category: string;
  explanation: string;
  fix: string;
}

export interface DossierProofInput {
  theorem: string;
  step_count: number;
  conclusion: string;
}

export interface AcademicDossierInput {
  subject_name: string;
  career?: string;
  student_name?: string;
  concepts: DossierConceptInput[];
  errors: DossierErrorInput[];
  proofs: DossierProofInput[];
}

export interface AcademicDossierOutput {
  title: string;
  html_content: string;
  byte_size: number;
  section_count: number;
  generated_at: string;
}

export async function compileAcademicDossierNative(
  payload: AcademicDossierInput,
): Promise<AcademicDossierOutput> {
  if (isDesktop()) {
    try {
      return await invoke<AcademicDossierOutput>("compile_academic_dossier", { payload });
    } catch (err) {
      console.warn("[nativeDossier] Fallback a motor TypeScript:", err);
    }
  }

  // Fallback TypeScript
  const dateStr = new Date().toISOString().split("T")[0];
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Dossier: ${payload.subject_name}</title></head><body><h1>${payload.subject_name}</h1><p>Fecha: ${dateStr}</p></body></html>`;

  return {
    title: `Dossier_${payload.subject_name.replace(/\s+/g, "_")}`,
    html_content: html,
    byte_size: html.length,
    section_count: 3,
    generated_at: dateStr,
  };
}