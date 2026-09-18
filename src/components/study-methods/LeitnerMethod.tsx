import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { saveStudySession } from "../../lib/db";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { 
  Inbox, 
  RotateCw, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Layers, 
  RefreshCcw
} from "lucide-react";

export interface LeitnerMethodProps {
  onSessionFinished?: () => void;
}

interface LeitnerCard {
  id: string;
  front: string;
  back: string;
  box: number; // 1 to 5
}

const DEFAULT_CARDS: LeitnerCard[] = [
  {
    id: "l1",
    front: "¿Cuál es la función principal de la enzima ARN polimerasa II?",
    back: "Sintetizar pre-ARNm (mensajero) y la mayoría de los ARN nucleares pequeños (snRNA) a partir del molde de ADN.",
    box: 1,
  },
  {
    id: "l2",
    front: "¿Qué enuncia el Teorema del Límite Central (Central Limit Theorem)?",
    back: "Que la suma (o promedio) de un gran número de variables aleatorias independientes e idénticamente distribuidas tiende a una distribución normal, sin importar la distribución original.",
    box: 1,
  },
  {
    id: "l3",
    front: "¿Qué caracteriza al potencial de acción en la fase de despolarización?",
    back: "Apertura rápida y masiva de canales de sodio dependientes de voltaje, invirtiendo la polaridad de membrana hacia valores positivos (+30 mV).",
    box: 1,
  },
  {
    id: "l4",
    front: "¿Cuál es la diferencia entre validez interna y validez externa en un experimento?",
    back: "La validez interna evalúa si la variable independiente causó el efecto observado; la validez externa evalúa si los resultados son extrapolables a otros contextos y poblaciones.",
    box: 2,
  },
  {
    id: "l5",
    front: "¿En qué consiste el Principio de Le Chatelier?",
    back: "Si un sistema en equilibrio químico es perturbado por un cambio de temperatura, presión o concentración, el sistema se desplazará en el sentido que contrarreste dicha perturbación.",
    box: 2,
  },
];

const BOX_SCHEDULES = [
  { box: 1, label: "Caja 1", frequency: "Diario", color: "border-amber-500/30 bg-amber-500/5 text-amber-500" },
  { box: 2, label: "Caja 2", frequency: "Cada 3 días", color: "border-sky-500/30 bg-sky-500/5 text-sky-500" },
  { box: 3, label: "Caja 3", frequency: "Semanal", color: "border-indigo-500/30 bg-indigo-500/5 text-indigo-500" },
  { box: 4, label: "Caja 4", frequency: "Quincenal", color: "border-purple-500/30 bg-purple-500/5 text-purple-500" },
  { box: 5, label: "Caja 5", frequency: "Graduadas", color: "border-emerald-500/30 bg-emerald-500/5 text-emerald-500" },
];

export const LeitnerMethod: React.FC<LeitnerMethodProps> = ({ onSessionFinished }) => {
  const dbCards = useLiveQuery(() => db.flashcards.toArray(), []);
  
  const [cards, setCards] = useState<LeitnerCard[]>(() => {
    return DEFAULT_CARDS;
  });

  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showAnswer, setShowAnswer] = useState<boolean>(false);
  const [reviewedCount, setReviewedCount] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);

  // Importar tarjetas de la base de datos si el usuario lo desea
  const handleImportDbCards = () => {
    if (dbCards && dbCards.length > 0) {
      const imported: LeitnerCard[] = dbCards.slice(0, 15).map((c, i) => ({
        id: c.id || `card_${i}`,
        front: c.front,
        back: c.back,
        box: 1,
      }));
      setCards(imported);
      setCurrentCardIndex(0);
      setShowAnswer(false);
      setReviewedCount(0);
      setCorrectCount(0);
      setSessionCompleted(false);
    }
  };

  const currentCard = cards[currentCardIndex];

  const handleGrade = (correct: boolean) => {
    if (!currentCard) return;

    setReviewedCount((prev) => prev + 1);
    if (correct) {
      setCorrectCount((prev) => prev + 1);
    }

    setCards((prev) =>
      prev.map((c) => {
        if (c.id === currentCard.id) {
          if (correct) {
            // Avanza a la siguiente caja (máximo caja 5)
            return { ...c, box: Math.min(5, c.box + 1) };
          } else {
            // Regla estricta de Leitner: cualquier fallo vuelve a Caja 1
            return { ...c, box: 1 };
          }
        }
        return c;
      })
    );

    setShowAnswer(false);
    if (currentCardIndex + 1 < cards.length) {
      setCurrentCardIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `leitner_${Date.now()}`,
      methodId: "leitner",
      subject: "Memorización Progresiva",
      topic: "Repaso con Cajas de Leitner",
      durationMinutes: Math.max(10, Math.round(reviewedCount * 1.5)),
      notes: `Tarjetas evaluadas: ${reviewedCount} | Aciertos: ${correctCount} | Distribución final: ${BOX_SCHEDULES.map(
        (b) => `Caja ${b.box}: ${cards.filter((c) => c.box === b.box).length}`
      ).join(" - ")}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const restartQueue = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionCompleted(false);
  };

  const graduatedCount = cards.filter((c) => c.box === 5).length;
  const masteryPercentage = Math.round((graduatedCount / Math.max(1, cards.length)) * 100);

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Método Leitner (Cajas de Flashcards)</CardTitle>
            <Badge variant="accent">5 Compartimentos</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Mecanismo físico de espaciado: el acierto asciende la tarjeta; el olvido la devuelve inmediatamente a la Caja 1.
          </p>
        </div>

        {dbCards && dbCards.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleImportDbCards}
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Layers className="h-3.5 w-3.5 text-accent-primary" />
            <span>Cargar {Math.min(15, dbCards.length)} Flashcards Propias</span>
          </Button>
        )}
      </div>

      {/* Visual Boxes Display */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        {BOX_SCHEDULES.map((b) => {
          const count = cards.filter((c) => c.box === b.box).length;
          const isCurrentCardInThisBox = currentCard && currentCard.box === b.box && !sessionCompleted;

          return (
            <div
              key={b.box}
              className={`rounded-lg border p-3 flex flex-col items-center text-center transition-all ${b.color} ${
                isCurrentCardInThisBox ? "ring-2 ring-accent-primary scale-102" : "opacity-90"
              }`}
            >
              <div className="flex items-center gap-1.5 font-serif text-xs font-semibold">
                <Inbox className="h-3.5 w-3.5" />
                <span>{b.label}</span>
              </div>
              <span className="text-[10px] opacity-80 mt-0.5">{b.frequency}</span>
              <div className="mt-2 text-lg font-mono font-bold">{count}</div>
              <span className="text-[10px] opacity-75">tarjetas</span>
            </div>
          );
        })}
      </div>

      {/* Active Runner or Completed View */}
      {!sessionCompleted && currentCard ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span>
              Tarjeta <strong>{currentCardIndex + 1}</strong> de <strong>{cards.length}</strong>
            </span>
            <span className="font-mono">
              Ubicación actual: <strong>Caja {currentCard.box}</strong>
            </span>
          </div>

          {/* Flashcard Canvas */}
          <div className="min-h-[220px] rounded-xl border border-border-subtle bg-bg-secondary p-6 flex flex-col justify-between shadow-xs transition-all">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                Anverso (Pregunta / Disparador)
              </span>
              <p className="mt-2 text-base sm:text-lg font-medium text-text-primary leading-relaxed">
                {currentCard.front}
              </p>
            </div>

            {showAnswer ? (
              <div className="mt-4 pt-4 border-t border-border-subtle/60">
                <span className="text-[10px] font-mono uppercase tracking-wider text-accent-primary">
                  Reverso (Respuesta Completa)
                </span>
                <p className="mt-2 text-sm sm:text-base text-text-primary leading-relaxed font-sans bg-bg-elevated/70 p-3 rounded-lg border border-border-subtle">
                  {currentCard.back}
                </p>
              </div>
            ) : (
              <div className="mt-6 flex justify-center">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAnswer(true)}
                  className="flex items-center gap-2 text-xs"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Revelar Respuesta</span>
                </Button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {showAnswer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => handleGrade(false)}
                className="flex items-center justify-center gap-2 border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
              >
                <XCircle className="h-4 w-4 text-rose-500" />
                <span>Me Equivoqué (Volver a Caja 1)</span>
              </Button>

              <Button
                variant="primary"
                onClick={() => handleGrade(true)}
                className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>¡Acerté! (Avanzar a Caja {Math.min(5, currentCard.box + 1)})</span>
              </Button>
            </div>
          )}
        </div>
      ) : (
        /* Summary Screen */
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Trophy className="h-7 w-7" />
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold text-text-primary">
              ¡Ronda Leitner Completada!
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Has evaluado {reviewedCount} tarjetas. Las acertadas avanzaron hacia intervalos mayores, mientras que los fallos volvieron a la Caja 1 para consolidación inmediata.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto text-left">
            <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3 text-center">
              <span className="text-[10px] text-text-muted">Aciertos</span>
              <div className="font-mono text-lg font-bold text-emerald-400">{correctCount}</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3 text-center">
              <span className="text-[10px] text-text-muted">Graduadas (Caja 5)</span>
              <div className="font-mono text-lg font-bold text-accent-primary">{graduatedCount}</div>
            </div>
            <div className="rounded-lg border border-border-subtle bg-bg-elevated p-3 text-center">
              <span className="text-[10px] text-text-muted">Consolidación</span>
              <div className="font-mono text-lg font-bold text-text-primary">{masteryPercentage}%</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={restartQueue} className="flex items-center gap-1.5 text-xs">
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Repetir Ronda</span>
            </Button>
            <Button variant="primary" size="sm" onClick={handleFinishSession} className="flex items-center gap-1.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Guardar Sesión y Salir</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
