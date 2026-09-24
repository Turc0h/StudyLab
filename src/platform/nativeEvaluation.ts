/**
 * StudyLab Native Academic Evaluation & Smoke Detector Bridge
 * Connects React Final Board & Socratic Oral Defense with Rust native detection engine.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";
import { detectOralSmoke } from "../features/oral-defense/finalBoardEngine.ts";

export interface DetectSmokeRequest {
  text: string;
  modelKeyPoints: string[];
  minWords: number;
}

export interface DetectSmokeResponse {
  isSmoke: boolean;
  reasons: string[];
  confidence: number;
  wordCount: number;
  coverageRatio: number;
  sourceEngine: "rust" | "typescript-fallback";
}

export async function detectOralSmokeNative(
  request: DetectSmokeRequest,
): Promise<DetectSmokeResponse> {
  const { text, modelKeyPoints, minWords } = request;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<Omit<DetectSmokeResponse, "sourceEngine">>(
        "detect_oral_smoke",
        {
          request: {
            text,
            modelKeyPoints,
            minWords,
          },
        },
      );

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn(
        "[nativeEvaluation] Fallback a motor TypeScript debido a error o contexto IPC:",
        err,
      );
    }
  }

  // TypeScript fallback
  const fallback = detectOralSmoke(text, modelKeyPoints, minWords);
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lowerText = text.toLowerCase();
  const matchedPoints = modelKeyPoints.filter((kp) =>
    kp.toLowerCase().split(/\s+/).some((token) => token.length > 4 && lowerText.includes(token)),
  );
  const coverageRatio = matchedPoints.length / (modelKeyPoints.length || 1);

  return {
    isSmoke: fallback.isSmoke,
    reasons: fallback.reasons,
    confidence: fallback.confidence,
    wordCount: words.length,
    coverageRatio,
    sourceEngine: "typescript-fallback",
  };
}
