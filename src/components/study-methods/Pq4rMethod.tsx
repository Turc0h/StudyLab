import React, { useState } from "react";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Compass, 
  HelpCircle, 
  BookOpen, 
  Lightbulb, 
  Mic, 
  FileCheck,
} from "lucide-react";
import { StepperShell, type StepItem } from "../shells";

export interface Pq4rMethodProps {
  onSessionFinished?: () => void;
}

const PQ4R_STEPS: StepItem[] = [
  { 
    id: "preview", 
    title: "1. Preview", 
    subtitle: "Ojeada", 
    description: "Ojea títulos, subtítulos, cuadros y resúmenes en 2 a 3 minutos para crear un mapa mental de orientación." 
  },
  { 
    id: "question", 
    title: "2. Question", 
    subtitle: "Preguntas", 
    description: "Convierte los encabezados en preguntas concretas que dirijan selectivamente tu atención al leer." 
  },
  { 
    id: "read", 
    title: "3. Read", 
    subtitle: "Lectura", 
    description: "Lee buscando intencionalmente las respuestas a las preguntas que planteaste en la etapa anterior." 
  },
  { 
    id: "reflect", 
    title: "4. Reflect", 
    subtitle: "Reflexión", 
    description: "El sello distintivo de PQ4R: conecta la lectura con conocimientos previos, busca contraejemplos, evalúa límites de validez y piensa en aplicaciones prácticas." 
  },
  { 
    id: "recite", 
    title: "5. Recite", 
    subtitle: "Recitado", 
    description: "Cierra los apuntes y parafrasea de memoria el concepto con tus propias palabras antes de mirar el texto." 
  },
  { 
    id: "review", 
    title: "6. Review", 
    subtitle: "Revisión", 
    description: "Contrasta tu recitado con el texto original para identificar qué puntos se omitieron o requieren refuerzo." 
  },
];

export const Pq4rMethod: React.FC<Pq4rMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Mecanismos de Resistencia a los Antibióticos");
  const [stepIndex, setStepIndex] = useState<number>(3); // Empieza en reflect como default original

  // Estados de cada fase
  const [previewNotes, setPreviewNotes] = useState<string>(
    "Estructura del capítulo: 3 secciones principales (Mutaciones cromosómicas, Plásmidos de resistencia R y Bombas de eflujo activo). Incluye tabla de antibiogramas al final."
  );

  const [questionList, setQuestionList] = useState<string>(
    "1. ¿Cómo difiere la resistencia transferible por plásmidos de la mutacional espontánea?\n2. ¿Qué mecanismo bioquímico emplean las beta-lactamasas para neutralizar cefalosporinas?\n3. ¿Qué implicancias clínicas tiene el fenotipo de hipermutación bacteriana?"
  );

  const [readNotes, setReadNotes] = useState<string>(
    "Sección leída con foco en las preguntas. Se identificaron las 4 familias de beta-lactamasas (Ambler clase A-D) y el rol de los transposones en la diseminación horizontal."
  );

  // Fase nuclear diferenciadora de PQ4R: REFLECT
  const [reflectConnections, setReflectConnections] = useState<string>(
    "Vínculo con Farmacología: explica por qué asociamos ácido clavulánico con amoxicilina (inhibidor suicida de enzima).\nContraejemplo analizado: no todas las resistencias son enzimáticas; las alteraciones de porinas impiden la entrada física del fármaco."
  );

  const [reciteSynthesis, setReciteSynthesis] = useState<string>(
    "Recitado sin mirar el texto: La resistencia ocurre por 3 vías principales: alteración de diana, inactivación enzimática y bombas de expulsión. Los plásmidos son el vector epidemiológico más crítico por conjugación veloz."
  );

  const [reviewGaps, setReviewGaps] = useState<string>(
    "Laguna detectada al releer: revisar el espectro exacto de las carbapenemasas tipo KPC vs metalobetalactamasas (NDM-1)."
  );

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `pq4r_${Date.now()}`,
      methodId: "pq4r",
      subject: "Método PQ4R (Lectura Crítica & Reflexión)",
      topic: topic || "Protocolo de Comprensión Analítica",
      durationMinutes: 45,
      notes: `Tema: ${topic}\n\n[1. PREVIEW - Ojeada Estructural]:\n${previewNotes}\n\n[2. QUESTION - Preguntas Directrices]:\n${questionList}\n\n[3. READ - Lectura Focalizada]:\n${readNotes}\n\n[4. REFLECT - Reflexión Crítica & Contraejemplos]:\n${reflectConnections}\n\n[5. RECITE - Recitado Activo sin Apuntes]:\n${reciteSynthesis}\n\n[6. REVIEW - Auditoría de Lagunas]:\n${reviewGaps}`,
      completedAt: Date.now(),
    });

    onSessionFinished?.();
  };

  return (
    <div className="space-y-6">
      <StepperShell
        title="Método PQ4R"
        badgeText="Lectura Crítica Reflexiva (Thomas & Robinson)"
        steps={PQ4R_STEPS}
        currentStepIndex={stepIndex}
        onStepChange={(newIdx) => setStepIndex(newIdx)}
        onComplete={handleFinishSession}
        completeLabel="Guardar Protocolo PQ4R"
        canAdvance={() => topic.trim().length > 0}
      >
        <div className="space-y-4">
          {/* Campo de Tema */}
          <div className="space-y-1.5 pb-2">
            <label className="text-xs font-semibold text-text-primary">Texto o Capítulo de Estudio</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Patología Renal - Glomerulonefritis"
            />
          </div>

          {/* Contenido según paso activo */}
          <div className="p-4 rounded-xl border border-border-subtle bg-bg-secondary/50 space-y-4">
            {stepIndex === 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Compass className="h-4 w-4 text-accent-primary" />
                  <span>Pase Rápido Estructural (Preview)</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Ojea títulos, subtítulos, cuadros y resúmenes en 2 a 3 minutos para crear un mapa mental de orientación.
                </p>
                <Textarea
                  rows={4}
                  value={previewNotes}
                  onChange={(e) => setPreviewNotes(e.target.value)}
                  placeholder="Anota la arquitectura general del documento..."
                  className="text-xs leading-relaxed"
                />
              </div>
            )}

            {stepIndex === 1 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <HelpCircle className="h-4 w-4 text-accent-primary" />
                  <span>Formulación de Preguntas Guía (Question)</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Convierte los encabezados en preguntas concretas que dirijan selectivamente tu atención al leer.
                </p>
                <Textarea
                  rows={4}
                  value={questionList}
                  onChange={(e) => setQuestionList(e.target.value)}
                  placeholder="¿Qué preguntas debe responder este texto?..."
                  className="text-xs leading-relaxed"
                />
              </div>
            )}

            {stepIndex === 2 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <BookOpen className="h-4 w-4 text-accent-primary" />
                  <span>Lectura Focalizada (Read)</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Lee buscando intencionalmente las respuestas a las preguntas que planteaste en la etapa anterior.
                </p>
                <Textarea
                  rows={4}
                  value={readNotes}
                  onChange={(e) => setReadNotes(e.target.value)}
                  placeholder="Registra los hallazgos y argumentos centrales..."
                  className="text-xs leading-relaxed"
                />
              </div>
            )}

            {stepIndex === 3 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                  <span>Fase Nuclear: Reflexión Cognitiva (Reflect)</span>
                  <Badge variant="neutral" className="text-[10px] text-amber-300 border-amber-500/30 bg-amber-500/10">
                    Núcleo PQ4R
                  </Badge>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  El sello distintivo de PQ4R: conecta la lectura con conocimientos previos, busca contraejemplos, evalúa límites de validez y piensa en aplicaciones prácticas.
                </p>
                <Textarea
                  rows={5}
                  value={reflectConnections}
                  onChange={(e) => setReflectConnections(e.target.value)}
                  placeholder="¿Con qué otros temas se conecta? ¿Qué contraejemplos contradicen la regla? ¿Qué pasa si las condiciones varían?..."
                  className="text-xs leading-relaxed border-amber-500/30 focus:border-amber-400"
                />
              </div>
            )}

            {stepIndex === 4 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <Mic className="h-4 w-4 text-accent-primary" />
                  <span>Recitado de Memoria (Recite)</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Cierra los apuntes y parafrasea de memoria el concepto con tus propias palabras antes de mirar el texto.
                </p>
                <Textarea
                  rows={4}
                  value={reciteSynthesis}
                  onChange={(e) => setReciteSynthesis(e.target.value)}
                  placeholder="Parafrasea de memoria el argumento sin consultar el libro..."
                  className="text-xs leading-relaxed"
                />
              </div>
            )}

            {stepIndex === 5 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                  <FileCheck className="h-4 w-4 text-accent-primary" />
                  <span>Revisión Integradora y Lagunas (Review)</span>
                </div>
                <p className="text-xs text-text-secondary">
                  Contrasta tu recitado con el texto original para identificar qué puntos se omitieron o requieren refuerzo.
                </p>
                <Textarea
                  rows={4}
                  value={reviewGaps}
                  onChange={(e) => setReviewGaps(e.target.value)}
                  placeholder="Anota lagunas detectadas y conceptos que necesitan repaso espaciado..."
                  className="text-xs leading-relaxed"
                />
              </div>
            )}
          </div>
        </div>
      </StepperShell>
    </div>
  );
};

