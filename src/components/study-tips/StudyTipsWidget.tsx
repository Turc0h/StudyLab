import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Lightbulb, RefreshCw, Compass } from "lucide-react";

export interface StudyTip {
  id: string;
  category: "Neurociencia" | "Memoria" | "Enfoque" | "Gestión del Tiempo";
  title: string;
  insight: string;
  actionableTip: string;
  scientificBasis: string;
}

export const STUDY_TIPS: StudyTip[] = [
  {
    id: "ebbinghaus",
    category: "Memoria",
    title: "La Curva del Olvido de Ebbinghaus",
    insight: "El cerebro desecha hasta el 70% de la información nueva en las primeras 24 horas si no se produce una reactivación neuronal activa.",
    actionableTip: "Haz un repaso relámpago de 5 minutos al día siguiente de leer un apunte, otro a los 3 días y otro a la semana.",
    scientificBasis: "Hermann Ebbinghaus (1885), 'Memory: A Contribution to Experimental Psychology'.",
  },
  {
    id: "active-recall",
    category: "Memoria",
    title: "El Efecto de Recuperación Activa",
    insight: "Cerrar el libro y forzarte a recordar fortalece las sinapsis mucho más que releer el texto 5 veces consecutivas ('Ilusión de competencia').",
    actionableTip: "Al terminar una página, tápala con la mano y explícate en voz alta qué decía el autor sin mirar.",
    scientificBasis: "Karpicke & Roediger (2008), Science: 'The Critical Importance of Retrieval Practice for Learning'.",
  },
  {
    id: "ultradian-rhythms",
    category: "Enfoque",
    title: "Ciclos Ultradianos de Atención (90 min)",
    insight: "La corteza prefrontal funciona en pulsos de máxima agudeza de aproximadamente 90 minutos, seguidos de un valle fisiológico de fatiga.",
    actionableTip: "Nunca fuerces bloques de más de 90 minutos seguidos. Programa una pausa de 15 minutos lejos de pantallas al terminar el bloque.",
    scientificBasis: "Nathaniel Kleitman (1963), 'Basic Rest-Activity Cycle (BRAC)'.",
  },
  {
    id: "interleaving",
    category: "Neurociencia",
    title: "Práctica Intercalada (Interleaving)",
    insight: "Alternar entre 2 o 3 materias afines en la misma tarde parece más difícil al principio, pero produce una retención a largo plazo un 43% superior.",
    actionableTip: "Dedica 45 min a resolver ejercicios de Física y luego 45 min a repasar Álgebra, en vez de 3 horas continuas de una sola.",
    scientificBasis: "Rohrer & Taylor (2007), Instructional Science: 'The Shuffling of Mathematics Problems Improves Learning'.",
  },
  {
    id: "diffuse-mode",
    category: "Neurociencia",
    title: "Modo Enfocado vs Modo Difuso",
    insight: "Cuando te trabas con un concepto complejo, continuar insistiendo agota neurotransmisores. La solución suele brotar cuando la mente divaga en reposo.",
    actionableTip: "Si estás bloqueado con un teorema o ejercicio difícil, sal a caminar 10 minutos sin celular: la red neuronal por defecto conectará las ideas.",
    scientificBasis: "Dr. Barbara Oakley & Dr. Terrence Sejnowski, 'Learning How to Learn' / Nature Neuroscience.",
  },
  {
    id: "pomodoro-adaptation",
    category: "Enfoque",
    title: "Pomodoro Académico y Resistencia Cognitiva",
    insight: "Saber que solo te comprometes a 25 minutos reduce la resistencia de la amígdala al dolor percibido de una tarea aburrida o compleja.",
    actionableTip: "Cuando sientas pereza extrema para empezar a estudiar, di a ti mismo: 'Solo haré un Pomodoro de 25 minutos y luego decido si sigo'.",
    scientificBasis: "Francesco Cirillo / Timothy Pychyl, Procrastination Research Group.",
  },
  {
    id: "feynman-technique",
    category: "Neurociencia",
    title: "Técnica Feynman y Lenguaje Llano",
    insight: "Si no puedes explicar un concepto con palabras cotidianas a alguien que no sabe del tema, realmente no lo has comprendido en profundidad.",
    actionableTip: "Escribe una carta imaginaria a un chico de 12 años explicando el principio que acabas de estudiar sin usar jerga técnica.",
    scientificBasis: "Richard Feynman, Premio Nobel de Física.",
  },
  {
    id: "zeigarnik-effect",
    category: "Gestión del Tiempo",
    title: "El Efecto Zeigarnik y Tareas Inconclusas",
    insight: "El cerebro recuerda con mayor urgencia las tareas que han sido iniciadas pero quedaron interrumpidas que las tareas que nunca se empezaron.",
    actionableTip: "Si vas a parar de estudiar para ir a cenar, deja la próxima oración o ejercicio a medio escribir: tu cerebro querrá retomarlo de inmediato.",
    scientificBasis: "Bluma Zeigarnik (1927), Universidad de Berlín.",
  },
  {
    id: "spaced-intervals",
    category: "Gestión del Tiempo",
    title: "Espaciado y Consolidación del Sueño",
    insight: "La mielinización y transferencia de recuerdos desde el hipocampo a la neocorteza ocurre casi exclusivamente durante las fases de sueño profundo NREM y REM.",
    actionableTip: "Pasar la noche en vela antes de un examen disminuye la capacidad de razonamiento lógico en un 40%. Prioriza siempre 7-8 horas de descanso.",
    scientificBasis: "Matthew Walker (2017), 'Why We Sleep', UC Berkeley Sleep and Neuroimaging Laboratory.",
  },
];

export const StudyTipsWidget: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNextTip = () => {
    setCurrentIndex((prev) => (prev + 1) % STUDY_TIPS.length);
  };

  const currentTip = STUDY_TIPS[currentIndex];

  const categoryVariant: Record<StudyTip["category"], "accent" | "secondary" | "neutral" | "warning"> = {
    Neurociencia: "accent",
    Memoria: "secondary",
    Enfoque: "warning",
    "Gestión del Tiempo": "neutral",
  };

  return (
    <Card elevated className="flex flex-col justify-between gap-4 p-5 h-full">
      <div>
        <div className="flex items-center justify-between gap-2 border-b border-border-subtle pb-3">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-accent-primary" />
            <span className="font-serif text-sm font-semibold text-text-primary">
              Ciencia del Aprendizaje
            </span>
          </div>
          <Badge variant={categoryVariant[currentTip.category]}>
            {currentTip.category}
          </Badge>
        </div>

        <div className="mt-4 space-y-2.5">
          <h3 className="font-serif text-base font-semibold text-text-primary">
            {currentTip.title}
          </h3>

          <p className="font-sans text-xs text-text-secondary leading-relaxed">
            {currentTip.insight}
          </p>

          <div className="rounded-md border border-border-subtle bg-bg-secondary/70 p-3 text-xs font-sans">
            <div className="flex items-center gap-1.5 font-semibold text-accent-primary mb-1">
              <Compass className="h-3.5 w-3.5" />
              <span>Acción práctica sugerida:</span>
            </div>
            <p className="text-text-primary leading-relaxed">
              {currentTip.actionableTip}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-subtle text-[11px] font-sans text-text-muted">
        <span className="truncate max-w-[200px]" title={currentTip.scientificBasis}>
          Fuente: {currentTip.scientificBasis}
        </span>

        <button
          type="button"
          onClick={handleNextTip}
          className="flex items-center gap-1 text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors cursor-pointer"
          title="Ver otra píldora de estudio"
        >
          <RefreshCw className="h-3 w-3" />
          <span>Siguiente tip ({currentIndex + 1}/{STUDY_TIPS.length})</span>
        </button>
      </div>
    </Card>
  );
};
