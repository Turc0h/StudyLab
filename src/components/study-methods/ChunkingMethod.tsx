import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Boxes, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Layers, 
  Sparkles,
  Play
} from "lucide-react";

export interface ChunkingMethodProps {
  onSessionFinished?: () => void;
}

interface ChunkGroup {
  id: string;
  name: string;
  mnemonicTag: string;
  items: string[];
}

const DEFAULT_CHUNKS: ChunkGroup[] = [
  {
    id: "chunk_1",
    name: "Pares Craneales Sensitivos",
    mnemonicTag: "1 - 2 - 8 (Sentidos especiales)",
    items: ["Nervio Olfatorio (I)", "Nervio Óptico (II)", "Nervio Vestibulococlear (VIII)"],
  },
  {
    id: "chunk_2",
    name: "Motores Oculares",
    mnemonicTag: "3 - 4 - 6 (Movimiento del ojo)",
    items: ["Nervio Oculomotor (III)", "Nervio Troclear (IV)", "Nervio Abducens (VI)"],
  },
  {
    id: "chunk_3",
    name: "Motores Puros Restantes",
    mnemonicTag: "11 - 12 (Cuello y Lengua)",
    items: ["Nervio Accesorio / Espinal (XI)", "Nervio Hipogloso (XII)"],
  },
  {
    id: "chunk_4",
    name: "Pares Craneales Mixtos",
    mnemonicTag: "5 - 7 - 9 - 10 (Cara y Vísceras)",
    items: ["Nervio Trigémino (V)", "Nervio Facial (VII)", "Nervio Glosofaríngeo (IX)", "Nervio Vago (X)"],
  },
];

export const ChunkingMethod: React.FC<ChunkingMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Los 12 Pares Craneales");
  const [chunks, setChunks] = useState<ChunkGroup[]>(DEFAULT_CHUNKS);
  const [mode, setMode] = useState<"organize" | "recall">("organize");

  // Estado para nuevo chunk
  const [newChunkName, setNewChunkName] = useState("");
  const [newChunkTag, setNewChunkTag] = useState("");

  // Estado para nuevo ítem en un chunk
  const [itemInputByChunk, setItemInputByChunk] = useState<Record<string, string>>({});

  // Drill de recuerdo
  const [revealedChunks, setRevealedChunks] = useState<Record<string, boolean>>({});
  const [testedCount, setTestedCount] = useState<number>(0);

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
    await saveStudySession({
      id: `chunking_${Date.now()}`,
      methodId: "chunking",
      subject: "Agrupación Cognitiva (Chunking)",
      topic: topic || "Compresión en Paquetes Mnémicos",
      durationMinutes: Math.max(15, totalItems * 3),
      notes: `Tema: ${topic}\nPaquetes Cognitivos (${chunks.length}):\n${chunks
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
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

      {/* Tema */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-text-primary">Eje Temático a Comprimir</label>
        <Input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Ej: Fórmulas de Física Mecánica"
        />
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
