import { useEffect, useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { Button } from "../components/ui/Button";
import { Modal } from "../components/ui/Modal";
import { Switch } from "../components/ui/Switch";
import { BinauralSynthesizer } from "../features/workspace/widgets/BinauralSynthesizer";
import { CognitiveFatigueMeter } from "../features/workspace/widgets/CognitiveFatigueMeter";
import { EphemeralScratchpad } from "../features/workspace/widgets/EphemeralScratchpad";
import { LatexTerminal } from "../features/workspace/widgets/LatexTerminal";
import { automationBus, type AutomationRule } from "../features/workspace/automationEngine";
import {
  BrainCircuit,
  Sliders,
  Sparkles,
  ShieldAlert,
  Bell,
  AlertCircle,
  X,
} from "lucide-react";

export type WorkspaceProfile =
  | "deep-problem-solving"
  | "memory-fortress"
  | "research-synthesis"
  | "custom";

interface ProfileDef {
  id: WorkspaceProfile;
  name: string;
  tagline: string;
  badgeVariant: "accent" | "success" | "warning";
  widgets: string[];
}

const PROFILES: Record<WorkspaceProfile, ProfileDef> = {
  "deep-problem-solving": {
    id: "deep-problem-solving",
    name: "Deep Problem Solving",
    tagline: "KaTeX REPL + Síntesis Gamma 40 Hz + Medidor de Fatiga",
    badgeVariant: "accent",
    widgets: ["latex", "binaural", "fatigue"],
  },
  "memory-fortress": {
    id: "memory-fortress",
    name: "Memory Fortress",
    tagline: "Bloc Efímero + Síntesis Alfa 10 Hz + Medidor de Fatiga",
    badgeVariant: "success",
    widgets: ["scratchpad", "binaural", "fatigue"],
  },
  "research-synthesis": {
    id: "research-synthesis",
    name: "Research Synthesis",
    tagline: "KaTeX REPL + Bloc Efímero 60s + Síntesis Theta 6 Hz",
    badgeVariant: "warning",
    widgets: ["latex", "scratchpad", "binaural"],
  },
  custom: {
    id: "custom",
    name: "Personalizado",
    tagline: "Configuración libre de micro-widgets activos",
    badgeVariant: "accent",
    widgets: ["latex", "binaural", "fatigue", "scratchpad"],
  },
};

export function Workspace() {
  const [activeProfile, setActiveProfile] = useState<WorkspaceProfile>("deep-problem-solving");
  const [activeWidgets, setActiveWidgets] = useState<string[]>(
    PROFILES["deep-problem-solving"].widgets,
  );
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [rules, setRules] = useState<AutomationRule[]>(automationBus.getRules());
  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: "info" | "warning" | "alert";
  } | null>(null);

  // Subscribe to autonomic engine toasts
  useEffect(() => {
    const unsub = automationBus.onToast((text, type) => {
      setToastMessage({ text, type });
    });
    return unsub;
  }, []);

  const handleSelectProfile = (p: WorkspaceProfile) => {
    setActiveProfile(p);
    setActiveWidgets(PROFILES[p].widgets);
  };

  const toggleWidget = (widgetId: string) => {
    setActiveProfile("custom");
    if (activeWidgets.includes(widgetId)) {
      setActiveWidgets(activeWidgets.filter((w) => w !== widgetId));
    } else {
      setActiveWidgets([...activeWidgets, widgetId]);
    }
  };

  const handleToggleRule = (ruleId: string) => {
    automationBus.toggleRule(ruleId);
    setRules(automationBus.getRules());
  };

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* Top Autonomic Notification Toast */}
      {toastMessage && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border shadow-xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-300 ${
            toastMessage.type === "alert"
              ? "bg-danger/15 border-danger/40 text-danger"
              : toastMessage.type === "warning"
                ? "bg-warning/15 border-warning/40 text-warning"
                : "bg-accent-primary/15 border-accent-primary/40 text-accent-primary"
          }`}
        >
          <div className="flex items-center gap-3">
            {toastMessage.type === "alert" ? (
              <ShieldAlert className="h-5 w-5 shrink-0 animate-bounce" />
            ) : toastMessage.type === "warning" ? (
              <AlertCircle className="h-5 w-5 shrink-0" />
            ) : (
              <Bell className="h-5 w-5 shrink-0" />
            )}
            <span className="text-xs font-mono font-medium">{toastMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          eyebrow="Cognitive Workspace OS"
          title="Espacio de Trabajo Modular"
          description="Entorno unificado de alto rendimiento cognitivo con perfiles sintonizados, terminal KaTeX, audio binaural y motor IFTTT."
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setIsRulesModalOpen(true)}
          className="flex items-center gap-2 self-start sm:self-auto"
        >
          <Sliders className="h-4 w-4 text-accent-primary" />
          Reglas IFTTT Autonómicas ({rules.filter((r) => r.enabled).length})
        </Button>
      </div>

      {/* Profile Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {(Object.keys(PROFILES) as WorkspaceProfile[]).map((key) => {
          const prof = PROFILES[key];
          const isSelected = activeProfile === key;
          return (
            <button
              type="button"
              key={key}
              onClick={() => handleSelectProfile(key)}
              className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                isSelected
                  ? "border-accent-primary bg-bg-surface-2 shadow-lg shadow-accent-primary/10 ring-1 ring-accent-primary"
                  : "border-border-subtle bg-bg-surface-1/70 hover:bg-bg-surface-2 hover:border-border-subtle/80"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <span className="font-display font-semibold text-sm text-text-primary">
                  {prof.name}
                </span>
                {isSelected && <BrainCircuit className="h-4 w-4 text-accent-primary" />}
              </div>
              <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">
                {prof.tagline}
              </p>
            </button>
          );
        })}
      </div>

      {/* Quick Widget Toggles Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border-subtle bg-bg-surface-1 font-mono text-xs text-text-secondary">
        <span className="flex items-center gap-2 text-text-tertiary">
          <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
          Widgets Activos:
        </span>
        <div className="flex items-center gap-3">
          {[
            { id: "latex", label: "KaTeX REPL" },
            { id: "binaural", label: "Audio Binaural" },
            { id: "fatigue", label: "Medidor de Fatiga" },
            { id: "scratchpad", label: "Bloc Efímero" },
          ].map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => toggleWidget(w.id)}
              className={`px-2 py-1 rounded transition-colors ${
                activeWidgets.includes(w.id)
                  ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Micro-Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeWidgets.includes("latex") && <LatexTerminal />}
        {activeWidgets.includes("binaural") && <BinauralSynthesizer />}
        {activeWidgets.includes("fatigue") && <CognitiveFatigueMeter />}
        {activeWidgets.includes("scratchpad") && <EphemeralScratchpad />}
      </div>

      {/* IFTTT Rules Config Modal */}
      <Modal open={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} title="Reglas Autonómicas IFTTT">
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary leading-relaxed">
            El motor autonómico evalúa constantemente los sensores de fatiga, intervalos FSRS y ciclos circadianos para disparar intervenciones protectoras.
          </p>

          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-start justify-between p-3 rounded-lg border border-border-subtle bg-bg-surface-1 gap-3"
              >
                <div>
                  <h5 className="font-display text-xs font-semibold text-text-primary">
                    {rule.name}
                  </h5>
                  <p className="text-[11px] text-text-tertiary mt-0.5">{rule.description}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-bg-surface-2 border border-border-subtle text-accent-primary">
                      Acción: {rule.actionSummary}
                    </span>
                  </div>
                </div>
                <Switch
                  checked={rule.enabled}
                  onChange={() => handleToggleRule(rule.id)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-border-subtle">
            <Button size="sm" variant="secondary" onClick={() => setIsRulesModalOpen(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
