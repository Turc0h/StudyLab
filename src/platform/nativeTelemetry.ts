/**
 * StudyLab Native Biometrics & Fatigue Telemetry Bridge
 * Connects React UI to Rust autonomic stress evaluation and GATT parser.
 */

import { invoke } from "@tauri-apps/api/core";
import { isDesktop } from "./platform.ts";
import { evaluateStressLevel, parseGattHeartRate, type StressEvaluation } from "../features/biometrics/biometricsService.ts";

export interface EvaluateStressRequest {
  bpm: number;
  hrvRmssd?: number;
}

export interface EvaluateStressResponse extends StressEvaluation {
  sourceEngine: "rust" | "typescript-fallback";
}

export interface HeartRateReadingDto {
  bpm: number;
  contactDetected: boolean;
  energyExpendedJ?: number;
  rrIntervalsMs: number[];
  hrvRmssd?: number;
  timestampMs: number;
}

export async function evaluateStressNative(
  request: EvaluateStressRequest,
): Promise<EvaluateStressResponse> {
  const { bpm, hrvRmssd } = request;

  if (isDesktop()) {
    try {
      const rustResponse = await invoke<StressEvaluation>("evaluate_biometric_stress", {
        request: {
          bpm,
          hrvRmssd,
        },
      });

      return {
        ...rustResponse,
        sourceEngine: "rust",
      };
    } catch (err) {
      console.warn(
        "[nativeTelemetry] Fallback a motor TypeScript debido a error o contexto IPC:",
        err,
      );
    }
  }

  // TypeScript fallback
  const fallback = evaluateStressLevel(bpm, hrvRmssd);
  return {
    ...fallback,
    sourceEngine: "typescript-fallback",
  };
}

export async function parseGattHeartRateNative(
  rawBytes: Uint8Array,
): Promise<HeartRateReadingDto | null> {
  if (isDesktop()) {
    try {
      return await invoke<HeartRateReadingDto>("parse_gatt_heart_rate", {
        request: {
          rawBytes: Array.from(rawBytes),
        },
      });
    } catch (err) {
      console.warn("[nativeTelemetry] Fallback de parseo GATT:", err);
    }
  }

  // TypeScript fallback
  try {
    const dataView = new DataView(rawBytes.buffer, rawBytes.byteOffset, rawBytes.byteLength);
    const reading = parseGattHeartRate(dataView);
    return {
      bpm: reading.bpm,
      contactDetected: !!reading.contactDetected,
      energyExpendedJ: reading.energyExpendedJ,
      rrIntervalsMs: reading.rrIntervalsMs || [],
      hrvRmssd: reading.hrvRmssd,
      timestampMs: reading.timestamp,
    };
  } catch (err) {
    console.warn("[nativeTelemetry] Error en fallback GATT:", err);
    return null;
  }
}
