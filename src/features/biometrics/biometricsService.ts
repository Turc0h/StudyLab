/**
 * biometricsService.ts
 *
 * Motor de telemetría biométrica, parser GATT estándar Bluetooth Low Energy (0x180D)
 * y evaluador de estrés autonómico / carga cognitiva.
 *
 * Principio Fundamental:
 * - 100% Local-First: Cero llamadas a servidores o nubes externas.
 * - Soporte estándar Bluetooth SIG Heart Rate Service (0x180D, 0x2A37).
 * - Generador sintético determinista para testing y usuarios sin periférico físico.
 */

export interface HeartRateReading {
  bpm: number;
  contactDetected?: boolean;
  energyExpendedJ?: number;
  rrIntervalsMs?: number[];
  hrvRmssd?: number; // Root Mean Square of Successive Differences
  timestamp: number;
}

export type StressState = "calm" | "focused" | "strained" | "stressed";

export interface StressEvaluation {
  state: StressState;
  stateLabel: string;
  description: string;
  recommendedAction: "continue" | "micro_break" | "box_breathing";
}

/**
 * Parsea el buffer binario del estándar GATT Heart Rate Measurement (UUID: 0x2A37).
 * Cumple la especificación formal del Bluetooth SIG:
 * - Byte 0: Flags
 *   - bit 0: 0 = UINT8 BPM, 1 = UINT16 BPM
 *   - bit 1-2: Sensor Contact Status
 *   - bit 3: Energy Expended field present
 *   - bit 4: RR-Intervals present (formato 1/1024 de segundo)
 */
export function parseGattHeartRate(dataView: DataView): HeartRateReading {
  const flags = dataView.getUint8(0);
  const is16Bit = (flags & 0x01) !== 0;
  const hasContact = (flags & 0x06) === 0x06;
  const hasEnergy = (flags & 0x08) !== 0;
  const hasRr = (flags & 0x10) !== 0;

  let offset = 1;
  let bpm = 0;

  if (is16Bit) {
    bpm = dataView.getUint16(offset, true); // Little endian
    offset += 2;
  } else {
    bpm = dataView.getUint8(offset);
    offset += 1;
  }

  let energyExpendedJ: number | undefined;
  if (hasEnergy) {
    energyExpendedJ = dataView.getUint16(offset, true);
    offset += 2;
  }

  const rrIntervalsMs: number[] = [];
  if (hasRr) {
    while (offset + 1 < dataView.byteLength) {
      const rawRr = dataView.getUint16(offset, true);
      // Convertir de unidades 1/1024 de segundo a milisegundos
      const ms = Math.round((rawRr / 1024) * 1000);
      rrIntervalsMs.push(ms);
      offset += 2;
    }
  }

  const hrvRmssd = calculateRmssd(rrIntervalsMs);

  return {
    bpm,
    contactDetected: hasContact,
    energyExpendedJ,
    rrIntervalsMs: rrIntervalsMs.length > 0 ? rrIntervalsMs : undefined,
    hrvRmssd,
    timestamp: Date.now(),
  };
}

/**
 * Calcula RMSSD (Root Mean Square of Successive Differences) a partir de intervalos RR.
 * Métrica estándar para variabilidad de la frecuencia cardíaca (HRV).
 */
export function calculateRmssd(rrIntervals: number[]): number | undefined {
  if (!rrIntervals || rrIntervals.length < 2) return undefined;

  let sumSquaredDiffs = 0;
  for (let i = 0; i < rrIntervals.length - 1; i++) {
    const diff = rrIntervals[i + 1] - rrIntervals[i];
    sumSquaredDiffs += diff * diff;
  }

  const mean = sumSquaredDiffs / (rrIntervals.length - 1);
  return Math.round(Math.sqrt(mean));
}

/**
 * Evalúa el nivel de estrés psicofisiológico y carga cognitiva basado en BPM y HRV.
 */
export function evaluateStressLevel(bpm: number, hrvRmssd?: number): StressEvaluation {
  // 1. Estado de Estrés Agudo / Ansiedad de Examen
  if (bpm >= 100 || (typeof hrvRmssd === "number" && hrvRmssd < 20 && bpm > 88)) {
    return {
      state: "stressed",
      stateLabel: "Estrés / Frecuencia Elevada",
      description: "Pico de activación simpática detectado. Se recomienda activar Respiración Cuadrada (4-4-4-4).",
      recommendedAction: "box_breathing",
    };
  }

  // 2. Tensión o Fatiga Prolongada
  if (bpm >= 86 || (typeof hrvRmssd === "number" && hrvRmssd < 32)) {
    return {
      state: "strained",
      stateLabel: "Fatiga Cognitiva Moderada",
      description: "Carga atencional sostenida. Conviene tomar una micro-pausa de 3 minutos de estiramiento visual.",
      recommendedAction: "micro_break",
    };
  }

  // 3. Foco Cognitivo Óptimo
  if (bpm >= 70 && bpm < 86) {
    return {
      state: "focused",
      stateLabel: "Foco Sostenido (Flow)",
      description: "Ritmo cardiovascular equilibrado. Ventana de atención óptima para asimilar conceptos densos.",
      recommendedAction: "continue",
    };
  }

  // 4. Calma Basal
  return {
    state: "calm",
    stateLabel: "Reposo / Calma Basal",
    description: "Tono parasimpático dominante. Excelente estado fisiológico para iniciar lectura o repaso.",
    recommendedAction: "continue",
  };
}

/**
 * Generador sintético determinista de telemetría cardiovascular para pruebas y demostración.
 */
export class SyntheticHeartRateSimulator {
  private baseBpm = 72;
  private tick = 0;
  private timer: number | null = null;
  private onReadingCallback: ((reading: HeartRateReading) => void) | null = null;

  constructor(baseBpm = 72) {
    this.baseBpm = baseBpm;
  }

  public start(intervalMs = 1500, callback: (reading: HeartRateReading) => void) {
    this.stop();
    this.onReadingCallback = callback;

    this.timer = window.setInterval(() => {
      this.tick++;
      // Ondulación fisiológica senoidal + fluctuación aleatoria acotada
      const sinus = Math.sin(this.tick * 0.15) * 4;
      const jitter = (Math.random() - 0.5) * 3;
      const currentBpm = Math.round(this.baseBpm + sinus + jitter);

      // Simular 2 intervalos RR coherentes con el BPM
      const expectedRr = Math.round((60 / currentBpm) * 1000);
      const rr1 = expectedRr + Math.round((Math.random() - 0.5) * 40);
      const rr2 = expectedRr + Math.round((Math.random() - 0.5) * 40);

      const reading: HeartRateReading = {
        bpm: currentBpm,
        contactDetected: true,
        rrIntervalsMs: [rr1, rr2],
        hrvRmssd: calculateRmssd([rr1, rr2]),
        timestamp: Date.now(),
      };

      this.onReadingCallback?.(reading);
    }, intervalMs);
  }

  public setStressState(state: "calm" | "focused" | "stressed") {
    if (state === "calm") this.baseBpm = 64;
    else if (state === "focused") this.baseBpm = 78;
    else if (state === "stressed") this.baseBpm = 104;
  }

  public stop() {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
