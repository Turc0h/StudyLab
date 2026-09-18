import React, { useState } from "react";
import { Card, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import { 
  Brain, 
  ShieldCheck, 
  PenTool, 
  Flame, 
  Play, 
  Sparkles, 
  Clock
} from "lucide-react";

export interface CognitiveProfile {
  id: string;
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badge: string;
  description: string;
  recommendedBlock: string;
  recommendedMethods: Array<{
    id: string;
    name: string;
    description: string;
    runParam: string;
  }>;
}

export const COGNITIVE_PROFILES: CognitiveProfile[] = [
  {
    id: "logical-depth",
    name: "Inmersión Lógica & Deducción",
    tagline: "Pensamiento abstracto, algoritmos, matemáticas y bioquímica",
    icon: Brain,
    accentColor: "text-sky-400 border-sky-500/30 bg-sky-500/5",
    badge: "Alta Complejidad",
    description:
      "Diseñado para sesiones donde la dificultad radica en comprender mecanismos causales y teoremas profundos. Minimiza la memorización superficial y promueve la reestructuración conceptual.",
    recommendedBlock: "Bloques de 45 a 60 min con pausas de 10 min",
    recommendedMethods: [
      {
        id: "interleaving",
        name: "Práctica Intercalada",
        description: "Alterna tipos de ejercicios para entrenar la discriminación de modelos.",
        runParam: "interleaving",
      },
      {
        id: "feynman",
        name: "Técnica Feynman",
        description: "Simplifica conceptos abstractos en lenguaje llano para detectar lagunas.",
        runParam: "feynman",
      },
      {
        id: "elaborative-interrogation",
        name: "Interrogación Elaborativa",
        description: "Cuestiona sistemáticamente por qué cada afirmación o teorema es verdadero.",
        runParam: "elaborative-interrogation",
      },
    ],
  },
  {
    id: "mnemonic-fortress",
    name: "Fortaleza Mnemónica & Retención",
    tagline: "Farmacología, taxonomías, artículos normativos y fórmulas",
    icon: ShieldCheck,
    accentColor: "text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
    badge: "Alta Densidad Fáctica",
    description:
      "Optimizado para asimilar grandes volúmenes de datos donde no existe una lógica causal obvia. Emplea la biofísica del repaso espaciado y la evocación activa forzada.",
    recommendedBlock: "Bloques rápidos de 25 a 30 min a alta velocidad",
    recommendedMethods: [
      {
        id: "leitner",
        name: "Método Leitner (Cajas)",
        description: "5 compartimentos progresivos con avance en aciertos y retroceso en olvidos.",
        runParam: "leitner",
      },
      {
        id: "active-recall",
        name: "Recuerdo Activo",
        description: "Entrena el camino de recuperación voluntaria sin consultar apuntes.",
        runParam: "active-recall",
      },
      {
        id: "spaced-repetition",
        name: "Repaso Espaciado (FSRS)",
        description: "Intervalos matemáticos óptimos basados en estabilidad y dificultad mnemónica.",
        runParam: "spaced-repetition",
      },
    ],
  },
  {
    id: "synthesis-writing",
    name: "Síntesis, Tesis & Estructura",
    tagline: "Manuales densos, producción de papers, monografías y ensayos",
    icon: PenTool,
    accentColor: "text-purple-400 border-purple-500/30 bg-purple-500/5",
    badge: "Estructuración Cognitiva",
    description:
      "Orientado a transformar lecturas dispersas en redes de conocimiento interconectadas. Ideal para tesis, marcos teóricos y preparación de clases magistrales.",
    recommendedBlock: "Bloques sostenidos de 50 min de lectura y redacción",
    recommendedMethods: [
      {
        id: "zettelkasten",
        name: "Zettelkasten Académico",
        description: "Notas atómicas con identificadores canónicos y enlaces wiki bidireccionales.",
        runParam: "zettelkasten",
      },
      {
        id: "cornell",
        name: "Método Cornell",
        description: "Estructura en 3 cuadrantes con notas, cues de examen y síntesis integradora.",
        runParam: "cornell",
      },
      {
        id: "sq3r",
        name: "Método SQ3R",
        description: "Protocolo de 5 etapas: Inspección, Preguntas, Lectura, Recitación y Repaso.",
        runParam: "sq3r",
      },
      {
        id: "mind-maps",
        name: "Mapas Conceptuales",
        description: "Organización jerárquica radial para estructurar árboles lógicos de ideas.",
        runParam: "mind-maps",
      },
    ],
  },
  {
    id: "exam-crucible",
    name: "Presión de Examen & Auditoría",
    tagline: "Simulación de estrés evaluativo, cronómetro implacable y vaciado en blanco",
    icon: Flame,
    accentColor: "text-amber-400 border-amber-500/30 bg-amber-500/5",
    badge: "Prueba de Choque",
    description:
      "Diseñado para erradicar la ilusión de competencia antes de una mesa examinadora. Expone de manera implacable qué partes del temario dominas de verdad sin ayudas periféricas.",
    recommendedBlock: "Bloques cronometrados de 15 a 60 min sin interrupciones",
    recommendedMethods: [
      {
        id: "mock-tests",
        name: "Simulacros de Examen",
        description: "Evaluación cronometrada estricta con bloqueo de respuestas y rúbrica final.",
        runParam: "practice-testing",
      },
      {
        id: "blurting",
        name: "Blurting (Vaciado Mental)",
        description: "Vaciado a ciegas de memoria y auditoría comparativa de lagunas con FSRS.",
        runParam: "blurting",
      },
    ],
  },
];

export const CognitiveProfileSelector: React.FC = () => {
  const navigate = useNavigate();
  const [activeProfileId, setActiveProfileId] = useState<string>("logical-depth");

  const activeProfile = COGNITIVE_PROFILES.find((p) => p.id === activeProfileId) || COGNITIVE_PROFILES[0];
  const Icon = activeProfile.icon;

  const handleLaunchMethod = (runParam: string) => {
    navigate(`/methods?run=${runParam}`);
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Perfiles Cognitivos de Estudio</CardTitle>
            <Badge variant="accent">Fase 5 • Context Stance</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Configura la postura mental de tu sesión actual para recibir las metodologías científicas recomendadas.
          </p>
        </div>
      </div>

      {/* Profile Selector Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {COGNITIVE_PROFILES.map((profile) => {
          const ProfIcon = profile.icon;
          const isSelected = profile.id === activeProfileId;

          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => setActiveProfileId(profile.id)}
              className={`rounded-xl border p-4 text-left transition-all flex flex-col justify-between gap-3 ${
                isSelected
                  ? `${profile.accentColor} ring-2 ring-accent-primary shadow-sm`
                  : "border-border-subtle bg-bg-secondary hover:bg-bg-elevated hover:border-border-hover opacity-85"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-elevated border border-border-subtle">
                    <ProfIcon className="h-4 w-4 text-accent-primary" />
                  </div>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border border-border-subtle bg-bg-primary">
                    {profile.badge}
                  </span>
                </div>
                <h4 className="font-serif text-sm font-semibold text-text-primary mt-3">
                  {profile.name}
                </h4>
                <p className="text-[11px] text-text-secondary line-clamp-2 mt-1">
                  {profile.tagline}
                </p>
              </div>

              <div className="pt-2 border-t border-border-subtle/50 flex items-center gap-1.5 text-[10px] text-text-muted">
                <Clock className="h-3 w-3" />
                <span className="truncate">{profile.recommendedBlock.split(" con ")[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Profile Details and Recommendations */}
      <div className="rounded-xl border border-border-subtle bg-bg-secondary p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-primary/10 text-accent-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-semibold text-text-primary">
                Modo Activo: {activeProfile.name}
              </h3>
              <p className="text-xs text-text-secondary">{activeProfile.tagline}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-text-muted bg-bg-elevated px-3 py-1.5 rounded-lg border border-border-subtle self-start sm:self-auto">
            <Clock className="h-3.5 w-3.5 text-accent-primary" />
            <span>{activeProfile.recommendedBlock}</span>
          </div>
        </div>

        <p className="text-xs text-text-primary leading-relaxed">
          {activeProfile.description}
        </p>

        {/* Recommended Runners */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-mono uppercase tracking-wider text-text-muted flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
            <span>Métodos Científicos Recomendados para este Perfil</span>
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {activeProfile.recommendedMethods.map((method) => (
              <div
                key={method.id}
                className="rounded-lg border border-border-subtle bg-bg-elevated p-3.5 flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h5 className="font-serif text-sm font-semibold text-text-primary">
                      {method.name}
                    </h5>
                    <Badge variant="success" className="text-[9px]">Listo para Usar</Badge>
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {method.description}
                  </p>
                </div>

                <div className="flex justify-end">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleLaunchMethod(method.runParam)}
                    className="text-xs flex items-center gap-1.5 py-1"
                  >
                    <Play className="h-3 w-3 fill-current" />
                    <span>Iniciar {method.name}</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};
