import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { getFlashcards, saveFlashcard, saveStudySession } from "../../lib/db";
import type { FlashcardItem } from "../../types";
import { RotateCw, Plus } from "lucide-react";
import { Input, Textarea } from "../ui/Input";

export interface SpacedRepetitionMethodProps {
  onSessionFinished?: () => void;
}

export const SpacedRepetitionMethod: React.FC<SpacedRepetitionMethodProps> = ({ onSessionFinished }) => {
  const [cards, setCards] = useState<FlashcardItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newFront, setNewFront] = useState<string>("");
  const [newBack, setNewBack] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    getFlashcards().then((data) => {
      if (!cancelled) setCards(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentCard = cards[currentIndex];

  const handleRate = async (multiplier: number) => {
    if (!currentCard) return;
    const nextInterval = Math.max(1, Math.round(currentCard.intervalDays * multiplier));
    const updated: FlashcardItem = {
      ...currentCard,
      repetitions: currentCard.repetitions + 1,
      intervalDays: nextInterval,
      nextReviewDate: Date.now() + nextInterval * 24 * 60 * 60 * 1000,
    };
    await saveFlashcard(updated);

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    } else {
      await saveStudySession({
        id: `sr_${Date.now()}`,
        methodId: "spaced-repetition",
        subject: "Repaso Espaciado",
        topic: `Repasadas ${cards.length} tarjetas`,
        durationMinutes: 15,
        notes: "Sesión completa de tarjetas de memoria",
        completedAt: Date.now(),
      });
      onSessionFinished?.();
    }
  };

  const handleAddCard = async () => {
    if (!newFront.trim() || !newBack.trim()) return;
    const card: FlashcardItem = {
      id: `fc_${Date.now()}`,
      deckId: "general",
      front: newFront.trim(),
      back: newBack.trim(),
      repetitions: 0,
      intervalDays: 1,
      easeFactor: 2.5,
      nextReviewDate: Date.now(),
      createdAt: Date.now(),
    };
    await saveFlashcard(card);
    setCards((prev) => [...prev, card]);
    setNewFront("");
    setNewBack("");
    setIsAdding(false);
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Repetición Espaciada</CardTitle>
          <span className="text-xs text-text-secondary">
            Repaso programado en los momentos previos al olvido
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => setIsAdding((v) => !v)} className="gap-1 text-xs">
          <Plus className="h-3.5 w-3.5" />
          <span>{isAdding ? "Cancelar" : "Nueva tarjeta"}</span>
        </Button>
      </CardHeader>

      {isAdding && (
        <div className="rounded border border-border-subtle bg-bg-secondary p-4 flex flex-col gap-3">
          <label className="font-sans text-xs font-medium text-text-primary">Anverso (Pregunta / Enunciado):</label>
          <Input value={newFront} onChange={(e) => setNewFront(e.target.value)} placeholder="Ej: ¿Qué establece el Teorema de Rolle?" />
          <label className="font-sans text-xs font-medium text-text-primary">Reverso (Respuesta / Demostración):</label>
          <Textarea value={newBack} onChange={(e) => setNewBack(e.target.value)} rows={3} placeholder="Condiciones de continuidad, derivabilidad y f(a)=f(b)..." />
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAddCard} disabled={!newFront.trim() || !newBack.trim()}>
              Guardar tarjeta
            </Button>
          </div>
        </div>
      )}

      {cards.length === 0 ? (
        <div className="py-12 text-center text-xs text-text-muted">
          No hay tarjetas creadas aún. Agrega una nueva tarjeta arriba para iniciar.
        </div>
      ) : currentCard ? (
        <div className="flex flex-col gap-4">
          <div className="flex justify-between text-xs font-sans text-text-muted">
            <span>Tarjeta {currentIndex + 1} de {cards.length}</span>
            <span>Intervalo actual: {currentCard.intervalDays} día(s)</span>
          </div>

          <div
            onClick={() => setIsFlipped((f) => !f)}
            className="min-h-[180px] p-6 rounded border border-border-subtle bg-bg-elevated cursor-pointer flex flex-col justify-between hover:border-accent-primary transition-colors select-none"
          >
            <span className="font-sans text-[11px] uppercase tracking-wider text-text-muted">
              {isFlipped ? "Reverso" : "Anverso (Clic para voltear)"}
            </span>
            <p className="font-serif text-base text-text-primary my-4 leading-relaxed">
              {isFlipped ? currentCard.back : currentCard.front}
            </p>
            <div className="flex justify-end">
              <RotateCw className="h-4 w-4 text-text-muted" />
            </div>
          </div>

          {isFlipped && (
            <div className="grid grid-cols-4 gap-2 pt-2 border-t border-border-subtle">
              <Button variant="outline" size="sm" onClick={() => handleRate(0.5)} className="text-xs">
                Repetir (0.5x)
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRate(1.0)} className="text-xs">
                Difícil (1x)
              </Button>
              <Button variant="primary" size="sm" onClick={() => handleRate(1.5)} className="text-xs">
                Bien (1.5x)
              </Button>
              <Button variant="secondary" size="sm" onClick={() => handleRate(2.5)} className="text-xs">
                Fácil (2.5x)
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-xs text-text-muted">
          ¡Has terminado todas las tarjetas de la sesión!
        </div>
      )}
    </Card>
  );
};
