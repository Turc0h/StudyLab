import { create } from "zustand";
import {
  parseGattHeartRate,
  evaluateStressLevel,
  SyntheticHeartRateSimulator,
  type HeartRateReading,
  type StressEvaluation,
} from "../features/biometrics/biometricsService";

export type BiometricsConnectionState = "disconnected" | "connecting" | "connected" | "simulated";

interface BiometricsState {
  connectionState: BiometricsConnectionState;
  deviceName: string | null;
  currentBpm: number;
  currentHrv: number | null;
  stressEvaluation: StressEvaluation;
  history: Array<{ timestamp: number; bpm: number; hrv?: number }>;
  isBoxBreathingOpen: boolean;
  errorMessage: string | null;

  // Acciones
  connectBle: () => Promise<void>;
  disconnect: () => void;
  startSimulation: (profile?: "calm" | "focused" | "stressed") => void;
  setBoxBreathingOpen: (open: boolean) => void;
  updateReading: (reading: HeartRateReading) => void;
  clearError: () => void;
}

let activeBleDevice: any = null;
let activeGattServer: any = null;
let activeCharacteristic: any = null;
let simulatorInstance: SyntheticHeartRateSimulator | null = null;

export const useBiometricsStore = create<BiometricsState>((set, get) => ({
  connectionState: "disconnected",
  deviceName: null,
  currentBpm: 72,
  currentHrv: null,
  stressEvaluation: evaluateStressLevel(72),
  history: [],
  isBoxBreathingOpen: false,
  errorMessage: null,

  connectBle: async () => {
    if (typeof navigator === "undefined" || !("bluetooth" in navigator)) {
      set({
        errorMessage: "Web Bluetooth API no está disponible en este navegador. Puedes usar el simulador sintético.",
      });
      return;
    }

    try {
      set({ connectionState: "connecting", errorMessage: null });

      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ["heart_rate"] }],
        optionalServices: ["battery_service"],
      });

      activeBleDevice = device;
      const server = await device.gatt.connect();
      activeGattServer = server;

      const service = await server.getPrimaryService("heart_rate");
      const characteristic = await service.getCharacteristic("heart_rate_measurement");
      activeCharacteristic = characteristic;

      await characteristic.startNotifications();

      characteristic.addEventListener("characteristicvaluechanged", (event: any) => {
        const value = event.target.value as DataView;
        const reading = parseGattHeartRate(value);
        get().updateReading(reading);
      });

      device.addEventListener("gattserverdisconnected", () => {
        get().disconnect();
      });

      set({
        connectionState: "connected",
        deviceName: device.name || "Pulsómetro BLE",
      });
    } catch (err: any) {
      if (err.name !== "NotFoundError") {
        set({
          connectionState: "disconnected",
          errorMessage: err.message || "Error al conectar con el dispositivo Bluetooth.",
        });
      } else {
        set({ connectionState: "disconnected" });
      }
    }
  },

  disconnect: () => {
    if (simulatorInstance) {
      simulatorInstance.stop();
      simulatorInstance = null;
    }

    if (activeCharacteristic) {
      try {
        activeCharacteristic.stopNotifications();
      } catch {
        // Ignorar
      }
      activeCharacteristic = null;
    }

    if (activeBleDevice && activeBleDevice.gatt && activeBleDevice.gatt.connected) {
      try {
        activeBleDevice.gatt.disconnect();
      } catch {
        // Ignorar
      }
    }

    if (activeGattServer && activeGattServer.connected) {
      try {
        activeGattServer.disconnect();
      } catch {
        // Ignorar
      }
      activeGattServer = null;
    }

    activeBleDevice = null;

    set({
      connectionState: "disconnected",
      deviceName: null,
    });
  },

  startSimulation: (profile = "focused") => {
    get().disconnect();

    const sim = new SyntheticHeartRateSimulator();
    sim.setStressState(profile);
    simulatorInstance = sim;

    set({
      connectionState: "simulated",
      deviceName: `Simulador Sintético (${profile})`,
      errorMessage: null,
    });

    sim.start(1200, (reading) => {
      get().updateReading(reading);
    });
  },

  updateReading: (reading: HeartRateReading) => {
    const evalResult = evaluateStressLevel(reading.bpm, reading.hrvRmssd);

    set((state) => {
      const newHistory = [
        ...state.history.slice(-29), // Guardar las últimas 30 lecturas
        {
          timestamp: reading.timestamp,
          bpm: reading.bpm,
          hrv: reading.hrvRmssd,
        },
      ];

      return {
        currentBpm: reading.bpm,
        currentHrv: reading.hrvRmssd ?? state.currentHrv,
        stressEvaluation: evalResult,
        history: newHistory,
      };
    });
  },

  setBoxBreathingOpen: (open: boolean) => set({ isBoxBreathingOpen: open }),
  clearError: () => set({ errorMessage: null }),
}));
