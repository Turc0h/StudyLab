import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { FlashcardRecord } from "../../../db/db";
import { db } from "../../../db/db";
import { generateId } from "../../files/fileHelpers";

const BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14];
const DAY_MS = 24 * 60 * 60 * 1000;

interface LeitnerRunnerProps {
  subjectFolderId: string | null;
}

export function LeitnerRunner({ subjectFolderId }: LeitnerRunnerProps) {
  const deck = useLiveQuery(async () => {
    const existing = await db.flashcardDecks.where({ subjectFolderId }).first();
    if (existing) return existing;
    const created = {
      id: generateId(),
      name: "Mazo por defecto",
      subjectFolderId,
      createdAt: Date.now(),
    };
    await db.flashcardDecks.add(created);
    return created;
  }, [subjectFolderId]);

  const allCards =
    useLiveQuery(
      () => (deck ? db.flashcards.where({ deckId: deck.id }).toArray() : ([] as FlashcardRecord[])),
      [deck],
    ) ?? [];

  const dueCards = allCards.filter((c) => c.dueDate <= Date.now());
  const current = dueCards[0];

  const [revealed, setRevealed] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");

  if (!deck) return null;

  async function handleAnswer(correct: boolean) {
    if (!current) return;
    const nextBox = correct ? ((Math.min(5, current.box + 1)) as 1 | 2 | 3 | 4 | 5) : 1;
    const dueDate = Date.now() + BOX_INTERVAL_DAYS[nextBox - 1] * DAY_MS;
    await db.flashcards.update(current.id, { box: nextBox, dueDate });
    setRevealed(false);
  }

  async function handleAddCard() {
    if (!deck || !front.trim() || !back.trim()) return;
    await db.flashcards.add({
      id: generateId(),
      deckId: deck.id,
      front: front.trim(),
      back: back.trim(),
      box: 1,
      dueDate: Date.now(),
      createdAt: Date.now(),
    });
    setFront("");
    setBack("");
  }

  return (
    <div className="flex flex-col gap-6">
      {current ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface-2 p-8 text-center">
          <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
            Caja {current.box} · {dueCards.length} pendiente{dueCards.length === 1 ? "" : "s"}
          </span>
          <p className="font-display text-lg text-text-primary">{current.front}</p>
          {revealed ? (
            <>
              <p className="text-sm text-text-secondary">{current.back}</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => handleAnswer(false)}>
                  Fallé
                </Button>
                <Button size="sm" onClick={() => handleAnswer(true)}>
                  Acerté
                </Button>
              </div>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
              Mostrar respuesta
            </Button>
          )}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          {allCards.length === 0
            ? "Todavía no hay flashcards en este mazo — agregá la primera abajo."
            : "No tenés tarjetas pendientes de repaso hoy. Buen trabajo."}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border-subtle pt-4">
        <span className="text-xs font-medium text-text-secondary">Agregar flashcard</span>
        <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Frente (pregunta)" />
        <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Dorso (respuesta)" />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAddCard}
          disabled={!front.trim() || !back.trim()}
        >
          Agregar
        </Button>
      </div>
    </div>
  );
}
