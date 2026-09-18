import { create } from "zustand";
import { persist } from "zustand/middleware";
import { db } from "../db/db";

interface ContextEngineState {
  contextEngineEnabled: boolean;
  heuristicHoursPerUnit: number;
  activeProjectId: string | null;
  setContextEngineEnabled: (enabled: boolean) => Promise<void>;
  setHeuristicHoursPerUnit: (hours: number) => Promise<void>;
  setActiveProjectId: (id: string | null) => void;
  loadFromDatabase: () => Promise<void>;
}

export const useContextEngineStore = create<ContextEngineState>()(
  persist(
    (set, get) => ({
      contextEngineEnabled: false,
      heuristicHoursPerUnit: 3.0,
      activeProjectId: null,

      setContextEngineEnabled: async (enabled: boolean) => {
        set({ contextEngineEnabled: enabled });
        try {
          const config = await db.workspaceConfigs.toCollection().first();
          if (config) {
            await db.workspaceConfigs.update(config.id, {
              contextEngineEnabled: enabled,
              updatedAt: Date.now(),
            });
          } else {
            await db.workspaceConfigs.add({
              id: "default-config",
              profileType: "deep-problem-solving",
              activeWidgets: ["clock", "methods", "stats"],
              automationEnabled: false,
              contextEngineEnabled: enabled,
              studyHoursHeuristic: get().heuristicHoursPerUnit,
              updatedAt: Date.now(),
            });
          }
        } catch (e) {
          console.warn("[ContextEngine] Error sincronizando con workspaceConfigs:", e);
        }
      },

      setHeuristicHoursPerUnit: async (hours: number) => {
        const safeHours = Math.max(0.5, Math.min(20, hours));
        set({ heuristicHoursPerUnit: safeHours });
        try {
          const config = await db.workspaceConfigs.toCollection().first();
          if (config) {
            await db.workspaceConfigs.update(config.id, {
              studyHoursHeuristic: safeHours,
              updatedAt: Date.now(),
            });
          }
        } catch (e) {
          console.warn("[ContextEngine] Error sincronizando heurística:", e);
        }
      },

      setActiveProjectId: (id: string | null) => {
        set({ activeProjectId: id });
      },

      loadFromDatabase: async () => {
        try {
          const config = await db.workspaceConfigs.toCollection().first();
          if (config && typeof config.contextEngineEnabled === "boolean") {
            set({
              contextEngineEnabled: config.contextEngineEnabled,
              heuristicHoursPerUnit: config.studyHoursHeuristic ?? 3.0,
            });
          }
        } catch (e) {
          console.warn("[ContextEngine] Error al cargar configuración de db:", e);
        }
      },
    }),
    {
      name: "studylab-context-engine-store",
      partialize: (s) => ({
        contextEngineEnabled: s.contextEngineEnabled,
        heuristicHoursPerUnit: s.heuristicHoursPerUnit,
        activeProjectId: s.activeProjectId,
      }),
    }
  )
);
