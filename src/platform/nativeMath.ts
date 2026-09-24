/**
 * StudyLab Native Math Derivation Bridge
 * Connects React Math Blackboard with Rust native algebraic step evaluation.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";
import { validateStepDerivation, cleanMathFormula } from "../features/math-blackboard/mathBlackboardEngine.ts";

export interface ValidateDerivationRequest {
  userAttempt: string;
  expectedFormula: string;
  keyTokens: string[];
}

export interface ValidateDerivationResponse {
  isCorrect: boolean;
  score: number;
  tokenRatio: number;
  matchedTokens: string[];
  feedback: string;
  sourceEngine: "rust" | "typescript-fallback";
}

export async function validateMathDerivationNative(
  request: ValidateDerivationRequest,
): Promise<ValidateDerivationResponse> {
  const { userAttempt, expectedFormula, keyTokens } = request;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<Omit<ValidateDerivationResponse, "sourceEngine">>(
        "validate_math_derivation_step",
        {
          request: {
            userAttempt,
            expectedFormula,
            keyTokens,
          },
        },
      );

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn(
        "[nativeMath] Fallback a motor TypeScript debido a error o contexto IPC:",
        err,
      );
    }
  }

  // TypeScript fallback
  const fallback = validateStepDerivation(userAttempt, expectedFormula, keyTokens);
  const cleanUser = cleanMathFormula(userAttempt);
  const matchedTokens = keyTokens.filter((token) => {
    const cleanTok = cleanMathFormula(token);
    return cleanTok.length > 0 && cleanUser.includes(cleanTok);
  });
  const tokenRatio = matchedTokens.length / (keyTokens.length || 1);

  return {
    isCorrect: fallback.isCorrect,
    score: fallback.score,
    tokenRatio: fallback.score === 10 ? 1.0 : tokenRatio,
    matchedTokens: fallback.score === 10 ? keyTokens : matchedTokens,
    feedback: fallback.feedback,
    sourceEngine: "typescript-fallback",
  };
}
