import React, { useState, useEffect, useRef } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { db } from "../../db/db";
import { useLiveQuery } from "dexie-react-hooks";
import {
  DEFAULT_CHUNKS,
  DEFAULT_CHUNKING_TOPIC,
  getChunkingSet,
  saveChunkingSet,
  type ChunkGroup,
} from "../../features/study-methods/chunkingStorage";
import { 
  Boxes, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Layers, 
  Sparkles,
  Play,
  Check,
  FolderOpen
} from "lucide-react";

export interface ChunkingMethodProps {
  onSessionFinished?: () => void;
}

export const ChunkingMethod: React.FC<ChunkingMethodProps> = ({ onSessionFinished }) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [topic, setTopic] = useState<string>(DEFAULT_CHUNKING_TOPIC);
  const [chunks, setChunks] = useState<ChunkGroup[]>(DEFAULT_CHUNKS);
  const [mode, setMode] = useState<"organize" | "recall">("organize");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // Estado para nuevo chunk
  const [newChunkName, setNewChunkName] = useState("");
  const [newChunkTag, setNewChunkTag] = useState("");

  // Estado para nuevo ítem en un chunk
  const [itemInputByChunk, setItemInputByChunk] = useState<Record<string, string>>({});

  // Drill de recuerdo
  const [revealedChunks, setRevealedChunks] = useState<Record<string, boolean>>({});
  const [testedCount, setTestedCount] = useState<number>(0);

  // Carpetas disponibles
  const folders = useLiveQuery(() => db.folders.toArray(), []) || [];
  const subjectFolders = folders.filter((f) => f.type === "subject" || !f.type);

  // 1. Rehidratación reactiva al cambiar de materia o montar
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setIsLoaded(false);
      try {
        const saved = await getChunkingSet(selectedFolderId || null);
        if (isCancelled) return;
        if (saved) {
          setTopic(saved.topic || DEFAULT_CHUNKING_TOPIC);
          setChunks(saved.chunks && saved.chunks.length > 0 ? saved.chunks : DEFAULT_CHUNKS);
        } else {
          setTopic(DEFAULT_CHUNKING_TOPIC);
          setChunks(DEFAULT_CHUNKS);
        }
      } catch (err) {
        console.error("Error cargando chunks de Dexie:", err);
      } finally {
        if (!isCancelled) setIsLoaded(true);
      }
    }
    void load();
    return () => {
      isCancelled = true;
    };
  }, [selectedFolderId]);

  // 2. Auto-guardado con debounce de 800ms
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (!isLoaded) return;

    setSaveStatus("saving");
    const timer = setTimeout(async () => {
      try {
        await saveChunkingSet({
          subjectFolderId: selectedFolderId || null,
          topic,
          chunks,
        });
        setSaveStatus("saved");
        const hideTimer = setTimeout(() => {
          setSaveStatus("idle");
        }, 2000);
        return () => clearTimeout(hideTimer);
      } catch (err) {
        console.error("Error auto-guardando Chunking en Dexie:", err);
        setSaveStatus("idle");
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [chunks, topic, selectedFolderId, isLoaded]);

  const handleAddChunk = () => {
    if (!newChunkName.trim()) return;
    const newGroup: ChunkGroup = {
      id: `chunk_${Date.now()}`,
      name: newChunkName.trim(),
      mnemonicTag: newChunkTag.trim() || "Bloque de memoria",
      items: [],
    };
    setChunks([...chunks, newGroup]);
    setNewChunkName("");
    setNewChunkTag("");
  };

  const handleRemoveChunk = (id: string) => {
    setChunks(chunks.filter((c) => c.id !== id));
  };

  const handleAddItemToChunk = (chunkId: string) => {
    const text = (itemInputByChunk[chunkId] || "").trim();
    if (!text) return;

    setChunks(
      chunks.map((c) => (c.id === chunkId ? { ...c, items: [...c.items, text] } : c))
    );
    setItemInputByChunk({ ...itemInputByChunk, [chunkId]: "" });
  };

  const handleRemoveItem = (chunkId: string, itemIdx: number) => {
    setChunks(
      chunks.map((c) =>
        c.id === chunkId
          ? { ...c, items: c.items.filter((_, idx) => idx !== itemIdx) }
          : c
      )
    );
  };

  const toggleReveal = (chunkId: string) => {
    const isNowRevealed = !revealedChunks[chunkId];
    setRevealedChunks({ ...revealedChunks, [chunkId]: isNowRevealed });
    if (isNowRevealed) {
      setTestedCount((prev) => prev + 1);
    }
  };

  const totalItems = chunks.reduce((acc, c) => acc + c.items.length, 0);

  const handleFinishSession = async () => {
    // Asegurar guardado inmediato en Dexie
    await saveChunkingSet({
      subjectFolderId: selectedFolderId || null,
      topic,
      chunks,
    });

    const folderName = subjectFolders.find((f) => f.id === selectedFolderId)?.name;

    await saveStudySession({
      id: `chunking_${Date.now()}`,
      methodId: "chunking",
      subject: folderName ? `Chunking • ${folderName}` : "Agrupación Cognitiva (Chunking)",
      topic: topic || "Compresión en Paquetes Mnémicos",
      durationMinutes: Math.max(15, totalItems * 3),
      notes: `Materia: ${folderName || "General"}\nTema: ${topic}\nPaquetes Cognitivos (${chunks.length}):\n${chunks
        .map(
          (c) =>
            `[${c.name}] (${c.mnemonicTag}):\n  ${c.items.map((it) => `• ${it}`).join("\n  ")}`
        )
        .join("\n\n")}\nTotal de elementos comprimidos: ${totalItems}`,
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
            <CardTitle>Agrupación Cognitiva (Chunking)</CardTitle>
            <Badge variant="accent">Capacidad 4 ± 1 (Miller / Cowan)</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Comprime listas complejas en 3 a 5 paquetes de orden superior para superar el límite biofísico de la memoria de trabajo.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {saveStatus === "saving" && (
            <span className="text-[11px] text-text-muted flex items-center gap-1.5 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Guardando...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-mono">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}

          <Button
            variant={mode === "recall" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setMode(mode === "organize" ? "recall" : "organize")}
            className="text-xs flex items-center gap-1.5"
          >
            {mode === "organize" ? (
              <>
                <Play className="h-3.5 w-3.5 text-accent-primary" />
                <span>Iniciar Drill de Recuerdo</span>
              </>
            ) : (
              <>
                <Layers className="h-3.5 w-3.5" />
                <span>Volver a Edición</span>
              </>
            )}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleFinishSession}
            disabled={chunks.length === 0 || totalItems === 0}
            className="text-xs flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>Guardar Sesión ({chunks.length} Bloques)</span>
          </Button>
        </div>
      </div>

      {/* Selector de Materia y Eje Temático */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-accent-primary" />
            <span>Materia / Carpeta de Cátedra</span>
          </label>
          <select
            value={selectedFolderId}
            onChange={(e) => setSelectedFolderId(e.target.value)}
            className="w-full text-xs rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent-primary"
          >
            <option value="">(Sin carpeta / General)</option>
            {subjectFolders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-primary">Eje Temático a Comprimir</label>
          <Input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ej: Fórmulas de Física Mecánica"
          />
        </div>
      </div>

      {/* Resumen Métrico de Capacidad */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Bloques (Chunks)</span>
          <span className={`text-sm font-mono font-bold ${chunks.length <= 5 ? "text-emerald-400" : "text-amber-400"}`}>
            {chunks.length} / 5 máx. óptimo
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Elementos Totales</span>
          <span className="text-sm font-mono font-bold text-accent-primary">
            {totalItems} ítems
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Ratio de Compresión</span>
          <span className="text-sm font-mono font-bold text-text-primary">
            {chunks.length > 0 ? (totalItems / chunks.length).toFixed(1) : "0"} ítems/bloque
          </span>
        </div>
        <div className="p-3 rounded-lg border border-border-subtle bg-bg-secondary/40 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Drill de Recuerdo</span>
          <span className="text-sm font-mono font-bold text-emerald-400">
            {testedCount} revelados
          </span>
        </div>
      </div>

      {/* Grid de Chunks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {chunks.map((chunk) => {
          const isRevealed = revealedChunks[chunk.id] || mode === "organize";

          return (
            <div
              key={chunk.id}
              className="rounded-xl border border-border-subtle bg-bg-secondary/60 p-4 space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Boxes className="h-4 w-4 text-accent-primary shrink-0" />
                    <span className="font-semibold text-xs text-text-primary truncate">
                      {chunk.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {mode === "recall" && (
                      <button
                        type="button"
                        onClick={() => toggleReveal(chunk.id)}
                        className="p-1 rounded text-text-muted hover:text-accent-primary transition-colors"
                        title={isRevealed ? "Ocultar ítems" : "Revelar ítems"}
                      >
                        {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5 text-accent-primary" />}
                      </button>
                    )}

                    {mode === "organize" && (
                      <button
                        type="button"
                        onClick={() => handleRemoveChunk(chunk.id)}
                        className="p-1 rounded text-text-muted hover:text-red-400 transition-colors"
                        title="Eliminar bloque"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Etiqueta mnemotécnica */}
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-mono bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                  <Sparkles className="h-3 w-3" />
                  <span>{chunk.mnemonicTag}</span>
                </div>

                {/* Lista de ítems */}
                <div className="space-y-1.5 pt-1">
                  {!isRevealed ? (
                    <div className="p-4 text-center rounded-lg border border-dashed border-border-subtle bg-bg-tertiary/40">
                      <p className="text-xs text-text-muted">
                        {chunk.items.length} elementos ocultos para memoria activa.
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleReveal(chunk.id)}
                        className="text-xs text-accent-primary font-medium mt-1 hover:underline"
                      >
                        Revelar y verificar
                      </button>
                    </div>
                  ) : (
                    chunk.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 rounded-lg bg-bg-tertiary/60 border border-border-subtle text-xs"
                      >
                        <span className="text-text-primary">• {item}</span>
                        {mode === "organize" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(chunk.id, idx)}
                            className="text-text-muted hover:text-red-400 p-0.5"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Agregar ítem a este chunk */}
              {mode === "organize" && (
                <div className="pt-2 border-t border-border-subtle/50 flex gap-2">
                  <Input
                    placeholder="Nuevo elemento en este bloque..."
                    value={itemInputByChunk[chunk.id] || ""}
                    onChange={(e) =>
                      setItemInputByChunk({ ...itemInputByChunk, [chunk.id]: e.target.value })
                    }
                    className="text-xs"
                    onKeyDown={(e) => e.key === "Enter" && handleAddItemToChunk(chunk.id)}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleAddItemToChunk(chunk.id)}
                    className="text-xs px-2.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Form para Agregar Nuevo Bloque */}
      {mode === "organize" && (
        <div className="rounded-xl border border-dashed border-border-hover bg-bg-secondary/40 p-4 space-y-3">
          <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
            <Plus className="h-3.5 w-3.5 text-accent-primary" />
            <span>Crear Nuevo Paquete Cognitivo (Chunk)</span>
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              placeholder="Nombre del bloque (Ej: Pares Craneales Sensitivos)"
              value={newChunkName}
              onChange={(e) => setNewChunkName(e.target.value)}
              className="text-xs"
            />
            <Input
              placeholder="Anclaje mnemotécnico (Ej: 1-2-8 Vista y Olfato)"
              value={newChunkTag}
              onChange={(e) => setNewChunkTag(e.target.value)}
              className="text-xs"
            />
          </div>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAddChunk}
              disabled={!newChunkName.trim()}
              className="text-xs flex items-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Añadir Bloque</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
