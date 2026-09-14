import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import type { CardFsrsRecord, FlashcardRecord } from "../../../db/db";
import { db } from "../../../db/db";
import { generateId } from "../../files/fileHelpers";
import { calculateHalfLife, calculateRetrievability, previewNextStates, type FsrsRating } from "../../fsrs/fsrsModel";
import { createFsrsCard, executeFsrsReview, migrateLeitnerToFsrs } from "../../fsrs/scheduler";
import { Cpu, Zap, Activity, Clock } from "lucide-react";

const BOX_INTERVAL_DAYS = [1, 2, 4, 7, 14];
const DAY_MS = 24 * 60 * 60 * 1000;

interface LeitnerRunnerProps {
  subjectFolderId: string | null;
}

export function LeitnerRunner({ subjectFolderId }: LeitnerRunnerProps) {
  const [engineMode, setEngineMode] = useState<"fsrs" | "leitner">("fsrs");
  const [revealed, setRevealed] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const presentationTimeRef = useRef<number>(Date.now());
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);

  const deck = useLiveQuery(
    () => db.flashcardDecks.where({ subjectFolderId }).first(),
    [subjectFolderId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const existing = await db.flashcardDecks.where({ subjectFolderId }).first();
      if (!existing && !cancelled) {
        await db.flashcardDecks.add({
          id: generateId(),
          name: "Mazo por defecto",
          subjectFolderId,
          createdAt: Date.now(),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [subjectFolderId]);

  // Auto-migrate legacy flashcards to FSRS when deck loads
  useEffect(() => {
    if (deck) {
      migrateLeitnerToFsrs(deck.id).catch(console.error);
    }
  }, [deck]);

  const allLeitnerCards =
    useLiveQuery(
      () => (deck ? db.flashcards.where({ deckId: deck.id }).toArray() : ([] as FlashcardRecord[])),
      [deck],
    ) ?? [];

  const allFsrsCards =
    useLiveQuery(
      () => (deck ? db.cardsFsrs.where({ deckId: deck.id }).toArray() : ([] as CardFsrsRecord[])),
      [deck],
    ) ?? [];

  const dueFsrsCards = allFsrsCards.filter((c) => c.dueDate <= Date.now());
  const dueLeitnerCards = allLeitnerCards.filter((c) => c.dueDate <= Date.now());

  const currentFsrs = dueFsrsCards[0];
  const currentLeitner = dueLeitnerCards[0];

  // Reset latency clock when card changes
  useEffect(() => {
    presentationTimeRef.current = Date.now();
    setRevealed(false);
  }, [currentFsrs?.id, currentLeitner?.id, engineMode]);

  if (!deck) return null;

  async function handleLeitnerAnswer(correct: boolean) {
    if (!currentLeitner) return;
    const nextBox = correct ? ((Math.min(5, currentLeitner.box + 1)) as 1 | 2 | 3 | 4 | 5) : 1;
    const dueDate = Date.now() + BOX_INTERVAL_DAYS[nextBox - 1] * DAY_MS;
    await db.flashcards.update(currentLeitner.id, { box: nextBox, dueDate });
    setRevealed(false);
  }

  async function handleFsrsAnswer(rating: FsrsRating) {
    if (!currentFsrs) return;
    const latency = Date.now() - presentationTimeRef.current;
    setLastLatencyMs(latency);
    await executeFsrsReview(currentFsrs.id, rating, latency);
    setRevealed(false);
  }

  async function handleAddCard() {
    if (!deck || !front.trim() || !back.trim()) return;
    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    // Add to legacy Leitner
    await db.flashcards.add({
      id: generateId(),
      deckId: deck.id,
      front: trimmedFront,
      back: trimmedBack,
      box: 1,
      dueDate: Date.now(),
      createdAt: Date.now(),
    });

    // Add to FSRS
    await createFsrsCard({
      deckId: deck.id,
      front: trimmedFront,
      back: trimmedBack,
    });

    setFront("");
    setBack("");
  }

  // Previews for FSRS 4 ratings
  const elapsedDays = currentFsrs?.lastReview
    ? Math.max(0, (Date.now() - currentFsrs.lastReview) / (24 * 60 * 60 * 1000))
    : 0;
  const isNewCard = !currentFsrs?.lastReview;
  const fsrsPreviews = currentFsrs
    ? previewNextStates(currentFsrs.stability, currentFsrs.difficulty, elapsedDays, isNewCard)
    : null;
  const currentR = currentFsrs
    ? isNewCard
      ? 1.0
      : calculateRetrievability(elapsedDays, currentFsrs.stability)
    : 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Engine Switcher HUD */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-accent-primary animate-pulse" />
          <span className="text-xs font-mono font-medium tracking-wider text-text-secondary uppercase">
            Algoritmo de Memoria:
          </span>
          <span className="text-xs font-mono font-bold text-accent-primary">
            {engineMode === "fsrs" ? "FSRS v4.5 Neural" : "Leitner Clásico (5 Cajas)"}
          </span>
        </div>
        <div className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 p-0.5">
          <button
            type="button"
            onClick={() => setEngineMode("fsrs")}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              engineMode === "fsrs"
                ? "bg-accent-primary/20 text-accent-primary font-bold shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            FSRS v4.5
          </button>
          <button
            type="button"
            onClick={() => setEngineMode("leitner")}
            className={`px-2 py-1 text-xs font-mono rounded transition-colors ${
              engineMode === "leitner"
                ? "bg-accent-primary/20 text-accent-primary font-bold shadow-xs"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            Leitner
          </button>
        </div>
      </div>

      {engineMode === "fsrs" ? (
        currentFsrs ? (
          <div className="flex flex-col items-center gap-5 rounded-xl border border-accent-primary/20 bg-bg-surface-2/80 p-8 text-center backdrop-blur-md shadow-lg relative overflow-hidden">
            {/* Top Telemetry Bar */}
            <div className="flex flex-wrap items-center justify-center gap-3 w-full border-b border-border-subtle/50 pb-3 text-xs font-mono">
              <Badge variant={currentR > 0.8 ? "success" : currentR > 0.6 ? "warning" : "danger"}>
                R: {(currentR * 100).toFixed(1)}%
              </Badge>
              <span className="text-text-tertiary">
                Estabilidad: <strong className="text-text-secondary">{currentFsrs.stability.toFixed(1)}d</strong>
              </span>
              <span className="text-text-tertiary">
                t½: <strong className="text-text-secondary">{calculateHalfLife(currentFsrs.stability).toFixed(2)}d</strong>
              </span>
              <span className="text-text-tertiary">
                Dificultad: <strong className="text-text-secondary">{currentFsrs.difficulty.toFixed(1)}/10</strong>
              </span>
              <span className="text-text-tertiary">
                Reps: <strong className="text-text-secondary">{currentFsrs.reps}</strong>
              </span>
              {lastLatencyMs && (
                <span className="flex items-center gap-1 text-accent-primary/90">
                  <Clock className="h-3 w-3" />
                  {lastLatencyMs}ms
                </span>
              )}
            </div>

            <span className="text-xs font-mono tracking-wider text-text-tertiary uppercase">
              {dueFsrsCards.length} tarjeta{dueFsrsCards.length === 1 ? "" : "s"} pendiente{dueFsrsCards.length === 1 ? "" : "s"}
            </span>

            <p className="font-display text-xl text-text-primary max-w-lg leading-relaxed">{currentFsrs.front}</p>

            {revealed ? (
              <div className="flex flex-col items-center gap-5 w-full">
                <div className="w-full max-w-lg rounded-lg border border-border-subtle bg-bg-surface-1/90 p-4 text-sm text-text-secondary leading-relaxed shadow-inner">
                  {currentFsrs.back}
                </div>

                {/* 4-tier FSRS Rating Matrix */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full max-w-lg">
                  <Button
                    variant="danger"
                    size="sm"
                    className="flex flex-col gap-0.5 py-2"
                    onClick={() => handleFsrsAnswer(1)}
                  >
                    <span className="font-bold">Fallé (Again)</span>
                    <span className="text-[10px] opacity-80 font-mono">{fsrsPreviews?.[1].label}</span>
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex flex-col gap-0.5 py-2 border-warning/40 text-warning hover:bg-warning/10"
                    onClick={() => handleFsrsAnswer(2)}
                  >
                    <span className="font-bold">Difícil (Hard)</span>
                    <span className="text-[10px] opacity-80 font-mono">{fsrsPreviews?.[2].label}</span>
                  </Button>
                  <Button
                    size="sm"
                    className="flex flex-col gap-0.5 py-2 border-accent-primary/40 text-accent-primary hover:bg-accent-primary/10"
                    onClick={() => handleFsrsAnswer(3)}
                  >
                    <span className="font-bold">Bien (Good)</span>
                    <span className="text-[10px] opacity-80 font-mono">{fsrsPreviews?.[3].label}</span>
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex flex-col gap-0.5 py-2 bg-success/20 text-success border-success/40 hover:bg-success/30"
                    onClick={() => handleFsrsAnswer(4)}
                  >
                    <span className="font-bold">Fácil (Easy)</span>
                    <span className="text-[10px] opacity-80 font-mono">{fsrsPreviews?.[4].label}</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => setRevealed(true)}>
                Mostrar respuesta
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-surface-2/50 p-8 text-center">
            <Zap className="h-8 w-8 text-accent-primary/60 mx-auto mb-2" />
            <p className="text-sm font-medium text-text-primary">
              {allFsrsCards.length === 0
                ? "No hay flashcards FSRS en este mazo todavía."
                : "Todas las tarjetas FSRS están al día con retención óptima (R ≥ 90%)."}
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Podés crear nuevas tarjetas abajo o importar desde apuntes.
            </p>
          </div>
        )
      ) : (
        /* Classical Leitner Mode */
        currentLeitner ? (
          <div className="flex flex-col items-center gap-4 rounded-lg border border-border-subtle bg-bg-surface-2 p-8 text-center">
            <span className="text-xs font-medium tracking-wide text-text-tertiary uppercase">
              Caja {currentLeitner.box} · {dueLeitnerCards.length} pendiente{dueLeitnerCards.length === 1 ? "" : "s"}
            </span>
            <p className="font-display text-lg text-text-primary">{currentLeitner.front}</p>
            {revealed ? (
              <>
                <p className="text-sm text-text-secondary">{currentLeitner.back}</p>
                <div className="flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => handleLeitnerAnswer(false)}>
                    Fallé (Caja 1)
                  </Button>
                  <Button size="sm" onClick={() => handleLeitnerAnswer(true)}>
                    Acerté (Caja {Math.min(5, currentLeitner.box + 1)})
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
            {allLeitnerCards.length === 0
              ? "Todavía no hay flashcards en este mazo — agregá la primera abajo."
              : "No tenés tarjetas pendientes de repaso hoy. Buen trabajo."}
          </p>
        )
      )}

      {/* Creation form */}
      <div className="flex flex-col gap-3 rounded-lg border border-border-subtle bg-bg-surface-1 p-4">
        <span className="text-xs font-medium font-mono text-text-secondary flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5 text-accent-primary" />
          Crear nueva tarjeta de memoria
        </span>
        <Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Frente (Pregunta o concepto)" />
        <Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Dorso (Respuesta o síntesis)" />
        <Button
          size="sm"
          variant="secondary"
          onClick={handleAddCard}
          disabled={!front.trim() || !back.trim()}
        >
          Guardar Tarjeta
        </Button>
      </div>
    </div>
  );
}
