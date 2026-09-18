import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Stethoscope, 
  HelpCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Lightbulb, 
  ArrowRight,
  BookOpen,
  FileCheck
} from "lucide-react";

export interface ProblemBasedLearningMethodProps {
  onSessionFinished?: () => void;
}

interface KnownFact {
  id: string;
  text: string;
}

interface UnknownIssue {
  id: string;
  text: string;
}

interface LearningHypothesis {
  id: string;
  hypothesis: string;
  learningNeed: string;
}

const DEFAULT_FACTS: KnownFact[] = [
  { id: "f1", text: "Paciente de 58 años con fiebre de 38.8°C y taquipnea (24 rpm)." },
  { id: "f2", text: "Presión arterial límite 95/60 mmHg y saturación al 91% aire ambiente." },
  { id: "f3", text: "Crepitantes básales en hemitórax derecho a la auscultación." },
];

const DEFAULT_UNKNOWNS: UnknownIssue[] = [
  { id: "u1", text: "¿Cuáles son los biomarcadores inflamatorios actuales (PCR, Procalcitonina)?" },
  { id: "u2", text: "¿Presenta comorbilidades previas (EPOC, diabetes, inmunosupresión)?" },
];

const DEFAULT_HYPOTHESES: LearningHypothesis[] = [
  {
    id: "h1",
    hypothesis: "Neumonía Adquirida en la Comunidad (NAC) con riesgo de sepsis temprana.",
    learningNeed: "Revisar criterios de gravedad CURB-65 y protocolo inicial de fluidoterapia (Sepsis-3).",
  },
];

export const ProblemBasedLearningMethod: React.FC<ProblemBasedLearningMethodProps> = ({ onSessionFinished }) => {
  const [caseTitle, setCaseTitle] = useState<string>("Caso Clínico: Síndrome Febril con Compromiso Respiratorio");
  const [caseScenario, setCaseScenario] = useState<string>(
    "Hombre de 58 años que consulta a guardia por cuadro de 72 hs de evolución caracterizado por astenia progresiva, tos productiva con expectoración herrumbrosa y picos febriles diarios."
  );

  const [activeTab, setActiveTab] = useState<"facts" | "hypotheses" | "resolution">("facts");

  // Hechos e Incógnitas
  const [facts, setFacts] = useState<KnownFact[]>(DEFAULT_FACTS);
  const [newFact, setNewFact] = useState<string>("");

  const [unknowns, setUnknowns] = useState<UnknownIssue[]>(DEFAULT_UNKNOWNS);
  const [newUnknown, setNewUnknown] = useState<string>("");

  // Hipótesis y Necesidades de Aprendizaje
  const [hypotheses, setHypotheses] = useState<LearningHypothesis[]>(DEFAULT_HYPOTHESES);
  const [newHypothesis, setNewHypothesis] = useState<string>("");
  const [newLearningNeed, setNewLearningNeed] = useState<string>("");

  // Resolución final
  const [resolutionPlan, setResolutionPlan] = useState<string>(
    "Estratificación CURB-65 (Score: 2 - internación en sala general). Toma de hemocultivos x2 y esputo. Inicio precoz de amoxicilina/clavulánico + claritromicina EV dentro de la primera hora."
  );
  const [metacognitiveReflection, setMetacognitiveReflection] = useState<string>(
    "Principio aprendido: la hipotensión relativa en un cuadro infeccioso respiratorio obliga a descartar hipoperfusión tisular antes de asumir deshidratación simple."
  );

  const handleAddFact = () => {
    if (!newFact.trim()) return;
    setFacts([...facts, { id: `fact_${Date.now()}`, text: newFact.trim() }]);
    setNewFact("");
  };

  const handleRemoveFact = (id: string) => {
    setFacts(facts.filter((f) => f.id !== id));
  };

  const handleAddUnknown = () => {
    if (!newUnknown.trim()) return;
    setUnknowns([...unknowns, { id: `unk_${Date.now()}`, text: newUnknown.trim() }]);
    setNewUnknown("");
  };

  const handleRemoveUnknown = (id: string) => {
    setUnknowns(unknowns.filter((u) => u.id !== id));
  };

  const handleAddHypothesis = () => {
    if (!newHypothesis.trim() || !newLearningNeed.trim()) return;
    setHypotheses([
      ...hypotheses,
      {
        id: `hyp_${Date.now()}`,
        hypothesis: newHypothesis.trim(),
        learningNeed: newLearningNeed.trim(),
      },
    ]);
    setNewHypothesis("");
    setNewLearningNeed("");
  };

  const handleRemoveHypothesis = (id: string) => {
    setHypotheses(hypotheses.filter((h) => h.id !== id));
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `pbl_${Date.now()}`,
      methodId: "problem-based-learning",
      subject: "Aprendizaje Basado en Problemas (PBL)",
      topic: caseTitle || "Resolución de Caso Práctico",
      durationMinutes: Math.max(25, (facts.length + unknowns.length + hypotheses.length) * 5),
      notes: `Caso: ${caseTitle}\nEscenario:\n${caseScenario}\n\nHechos Verificados (${facts.length}):\n${facts
        .map((f) => `• ${f.text}`)
        .join("\n")}\n\nIncógnitas por Resolver (${unknowns.length}):\n${unknowns
        .map((u) => `• ${u.text}`)
        .join("\n")}\n\nHipótesis y Fuentes (${hypotheses.length}):\n${hypotheses
        .map((h) => `• [Hipótesis]: ${h.hypothesis}\n  [Estudio Requerido]: ${h.learningNeed}`)
        .join("\n")}\n\nResolución Fundamentada:\n${resolutionPlan}\n\nReflexión Metacognitiva:\n${metacognitiveReflection}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Aprendizaje Basado en Problemas (PBL)</CardTitle>
            <Badge variant="accent">Metodología Inductiva</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Resuelve dilemas prácticos reales partiendo del caso concreto para deducir qué conocimientos teóricos necesitas adquirir (Barrows, 1980).
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          onClick={handleFinishSession}
          disabled={!caseTitle.trim() || facts.length === 0 || hypotheses.length === 0}
          className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>Guardar Resolución del Caso</span>
        </Button>
      </div>

      {/* Planteo del Caso */}
      <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/40 space-y-3">
        <div className="flex items-center gap-2">
          <Stethoscope className="h-4 w-4 text-accent-primary" />
          <span className="text-xs font-semibold text-text-primary">Título y Escenario del Problema</span>
        </div>

        <Input
          value={caseTitle}
          onChange={(e) => setCaseTitle(e.target.value)}
          placeholder="Ej: Caso Clínico, Dilema Jurisprudencial o Brief de Arquitectura"
          className="text-xs font-semibold"
        />

        <Textarea
          rows={3}
          value={caseScenario}
          onChange={(e) => setCaseScenario(e.target.value)}
          placeholder="Describe la situación fáctica, antecedentes, síntomas o parámetros conocidos..."
          className="text-xs leading-relaxed"
        />
      </div>

      {/* Selector de Pestañas del Flujo PBL */}
      <div className="flex border-b border-border-subtle gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("facts")}
          className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "facts"
              ? "border-accent-primary text-accent-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <FileCheck className="h-3.5 w-3.5" />
          <span>1. Hechos vs. Incógnitas ({facts.length + unknowns.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hypotheses")}
          className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "hypotheses"
              ? "border-accent-primary text-accent-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <Lightbulb className="h-3.5 w-3.5" />
          <span>2. Hipótesis & Aprendizaje ({hypotheses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("resolution")}
          className={`pb-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "resolution"
              ? "border-accent-primary text-accent-primary"
              : "border-transparent text-text-secondary hover:text-text-primary"
          }`}
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>3. Resolución & Reflexión</span>
        </button>
      </div>

      {/* Tab 1: Hechos vs Incógnitas */}
      {activeTab === "facts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Columna Hechos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Hechos Verificados ({facts.length})</span>
              </span>
              <span className="text-[10px] text-text-muted">Datos contrastados</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {facts.map((fact) => (
                <div
                  key={fact.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-xs text-text-primary"
                >
                  <span className="leading-relaxed">• {fact.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFact(fact.id)}
                    className="text-text-muted hover:text-red-400 p-0.5 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Añadir hecho o dato comprobado..."
                value={newFact}
                onChange={(e) => setNewFact(e.target.value)}
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddFact()}
              />
              <Button variant="secondary" size="sm" onClick={handleAddFact} className="text-xs px-2.5">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Columna Incógnitas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5" />
                <span>Incógnitas Críticas ({unknowns.length})</span>
              </span>
              <span className="text-[10px] text-text-muted">Vacíos por investigar</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {unknowns.map((unk) => (
                <div
                  key={unk.id}
                  className="flex items-start justify-between gap-2 p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-text-primary"
                >
                  <span className="leading-relaxed">? {unk.text}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveUnknown(unk.id)}
                    className="text-text-muted hover:text-red-400 p-0.5 shrink-0"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Añadir incógnita o pregunta clínica/técnica..."
                value={newUnknown}
                onChange={(e) => setNewUnknown(e.target.value)}
                className="text-xs"
                onKeyDown={(e) => e.key === "Enter" && handleAddUnknown()}
              />
              <Button variant="secondary" size="sm" onClick={handleAddUnknown} className="text-xs px-2.5">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Hipótesis y Aprendizaje */}
      {activeTab === "hypotheses" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 text-accent-primary" />
              <span>Hipótesis Diagnósticas y Objetivos de Indagación</span>
            </span>
            <span className="text-[10px] text-text-muted">Puente hacia la bibliografía</span>
          </div>

          <div className="space-y-3">
            {hypotheses.map((hyp) => (
              <div
                key={hyp.id}
                className="p-3 rounded-xl border border-border-subtle bg-bg-secondary/50 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-accent-primary">
                      Hipótesis Formulada
                    </span>
                    <p className="text-xs font-semibold text-text-primary">{hyp.hypothesis}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHypothesis(hyp.id)}
                    className="text-text-muted hover:text-red-400 p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="rounded-lg border border-border-subtle bg-bg-tertiary/70 p-2.5 space-y-1">
                  <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
                    <BookOpen className="h-3 w-3 text-amber-400" />
                    <span>Necesidad de Aprendizaje (Learning Issue)</span>
                  </span>
                  <p className="text-xs text-text-secondary">{hyp.learningNeed}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Form nueva hipótesis */}
          <div className="p-4 rounded-xl border border-dashed border-border-hover bg-bg-secondary/30 space-y-3">
            <span className="text-xs font-semibold text-text-primary">Nueva Hipótesis de Trabajo</span>
            <Input
              placeholder="Hipótesis explicativa (Ej: Síndrome Nefrótico vs Nefrítico)"
              value={newHypothesis}
              onChange={(e) => setNewHypothesis(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="¿Qué conceptos o guías teóricas necesitas consultar para sustentarla?"
              value={newLearningNeed}
              onChange={(e) => setNewLearningNeed(e.target.value)}
              className="text-xs"
            />
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddHypothesis}
                disabled={!newHypothesis.trim() || !newLearningNeed.trim()}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Hipótesis</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Resolución y Reflexión */}
      {activeTab === "resolution" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-accent-primary" />
              <span>Propuesta de Resolución Fundamentada</span>
            </label>
            <Textarea
              rows={4}
              value={resolutionPlan}
              onChange={(e) => setResolutionPlan(e.target.value)}
              placeholder="Detalla el diagnóstico definitivo, estrategia terapéutica, encuadre legal o diseño final..."
              className="text-xs leading-relaxed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Reflexión Metacognitiva (Principio Transferible)</span>
            </label>
            <Textarea
              rows={3}
              value={metacognitiveReflection}
              onChange={(e) => setMetacognitiveReflection(e.target.value)}
              placeholder="¿Qué principio general aprendiste con este caso que te servirá para situaciones futuras?"
              className="text-xs leading-relaxed"
            />
          </div>
        </div>
      )}
    </Card>
  );
};
