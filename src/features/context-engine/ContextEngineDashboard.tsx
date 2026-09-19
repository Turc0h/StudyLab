import React, { useState } from "react";
import { useContextEngineStore } from "../../stores/useContextEngineStore";
import { ProjectKnowledgeLinker } from "./ProjectKnowledgeLinker";
import { WeeklyCalendarTimeBlocker } from "./WeeklyCalendarTimeBlocker";
import { PostSessionEnergyCheck } from "./PostSessionEnergyCheck";
import { UnifiedTextIntake } from "./UnifiedTextIntake";
import { CognitiveProfileSelector } from "./CognitiveProfileSelector";
import { DesktopEnvironmentContext } from "./DesktopEnvironmentContext";
import { BiometricsMonitorCard } from "../biometrics/BiometricsMonitorCard";
import { PanelGuide } from "../../components/guide/PanelGuide";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Compass, Calendar, Battery, Sparkles, Settings, Brain, Laptop, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const ContextEngineDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { contextEngineEnabled } = useContextEngineStore();
  const [activeTab, setActiveTab] = useState<"projects" | "calendar" | "energy" | "intake" | "profiles" | "desktop" | "biometrics">("projects");

  if (!contextEngineEnabled) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-primary/10 text-accent-primary">
          <Compass className="h-6 w-6" />
        </div>
        <h2 className="font-serif text-xl font-semibold text-text-primary">
          Motor de Contexto Desactivado
        </h2>
        <p className="text-xs text-text-secondary leading-relaxed max-w-md mx-auto">
          El Motor de Contexto es un módulo opcional local-first para coordinar proyectos de estudio, bloqueo de horarios y estimaciones heurísticas. Para utilizarlo, activá el interruptor correspondiente en los Ajustes del sistema.
        </p>
        <Button
          variant="primary"
          size="sm"
          onClick={() => navigate("/settings")}
          className="text-xs flex items-center gap-1.5 mx-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          <span>Ir a Ajustes para Activar</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Editorial Header */}
      <div className="flex items-start justify-between border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
              Motor de Contexto Unificado
            </h1>
            <Badge variant="accent">Local-First • Privado</Badge>
          </div>
          <p className="mt-1 font-sans text-sm text-text-secondary">
            Capa de contexto para vincular proyectos de estudio con documentos, planificar horarios semanales y registrar energía biológica sin salir de tu máquina.
          </p>
        </div>

        <PanelGuide
          id="context-engine-guide"
          title="Motor de Contexto (Context Engine)"
          whatItDoes="Superficie de planificación local que articula proyectos, estimaciones de tiempo heurísticas y franjas libres de estudio."
          howToUse={[
            "Creá un proyecto y vinculá los archivos y carpetas que vas a estudiar.",
            "Ajustá la estimación heurística de horas según la cantidad de unidades.",
            "En la pestaña 'Calendario', marcá tus horarios libres y confirmá los bloques sugeridos.",
            "Registrá tu nivel de energía tras las sesiones para conocer tu mejor franja de estudio.",
            "Usá el 'Embudo Rápido' para ingresar texto desestructurado con confirmación previa.",
          ]}
          tip="Todas las sugerencias requieren tu aprobación antes de guardarse en el calendario."
        />
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border-subtle pb-3">
        {[
          { id: "projects", label: "Proyectos & Materiales", icon: Compass },
          { id: "calendar", label: "Calendario & Horarios", icon: Calendar },
          { id: "energy", label: "Energía & Ritmo Circadiano", icon: Battery },
          { id: "intake", label: "Embudo Rápido de Texto", icon: Sparkles },
          { id: "profiles", label: "Perfiles Cognitivos", icon: Brain },
          { id: "desktop", label: "Entorno Desktop", icon: Laptop },
          { id: "biometrics", label: "Biometría & Pulso BLE", icon: Heart },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-sans font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-accent-primary text-bg-elevated shadow-xs"
                  : "bg-bg-secondary text-text-secondary border border-border-subtle hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="pt-2">
        {activeTab === "projects" && <ProjectKnowledgeLinker />}
        {activeTab === "calendar" && <WeeklyCalendarTimeBlocker />}
        {activeTab === "energy" && <PostSessionEnergyCheck />}
        {activeTab === "intake" && <UnifiedTextIntake />}
        {activeTab === "profiles" && <CognitiveProfileSelector />}
        {activeTab === "desktop" && <DesktopEnvironmentContext />}
        {activeTab === "biometrics" && <BiometricsMonitorCard />}
      </div>
    </div>
  );
};
