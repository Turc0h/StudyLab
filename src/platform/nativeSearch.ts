/**
 * StudyLab Native Academic Search & Tokenizer Bridge
 * Connects Frontend with Rust high-speed FTS & BM25 ranking.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";

export interface AcademicChunkInput {
  id: string;
  title?: string;
  raw_content: string;
  hierarchy_path?: string;
  page_number?: number;
}

export interface SearchResultChunkDto {
  id: string;
  title: string;
  snippet: string;
  hierarchy_path: string;
  page_number: number;
  score: number;
  matched_terms: string[];
}

export async function searchAcademicChunksNative(
  query: string,
  chunks: AcademicChunkInput[],
  limit: number = 20,
): Promise<SearchResultChunkDto[]> {
  if (!query.trim() || chunks.length === 0) return [];

  if (isDesktop()) {
    try {
      return await invoke<SearchResultChunkDto[]>("search_academic_chunks", {
        query,
        chunks,
        limit,
      });
    } catch (err) {
      console.warn("[nativeSearch] Fallback a motor TypeScript:", err);
    }
  }

  // Fallback determinista en TypeScript
  const qTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  const results: SearchResultChunkDto[] = [];

  for (const c of chunks) {
    const text = c.raw_content.toLowerCase();
    const title = (c.title || "").toLowerCase();
    let score = 0;
    const matched: string[] = [];

    for (const t of qTokens) {
      if (title.includes(t)) {
        score += 15;
        matched.push(t);
      }
      if (text.includes(t)) {
        score += 5;
        if (!matched.includes(t)) matched.push(t);
      }
    }

    if (matched.length > 0) {
      results.push({
        id: c.id,
        title: c.title || "Fragmento Académico",
        snippet: c.raw_content.slice(0, 160) + (c.raw_content.length > 160 ? "..." : ""),
        hierarchy_path: c.hierarchy_path || "",
        page_number: c.page_number || 1,
        score,
        matched_terms: matched,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function tokenizeTextNative(text: string): Promise<string[]> {
  if (!text.trim()) return [];

  if (isDesktop()) {
    try {
      return await invoke<string[]>("tokenize_text_fast", { text });
    } catch (err) {
      console.warn("[nativeSearch] Fallback tokenizador:", err);
    }
  }

  return text
    .toLowerCase()
    .split(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_]+/)
    .filter((t) => t.length >= 2);
}