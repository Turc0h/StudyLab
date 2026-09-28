import React, { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import {
  PRESET_COMPARATIVE_MATRICES,
  createBlindRecallDeck,
  evaluateRecallAnswer,
  saveMatrixSessionRecord,
  type ComparativeMatrix,
  type BlindCellItem,
} from "../../features/comparative-matrix/comparativeMatrixEngine";
import {
  Columns3,
  Eye,
  EyeOff,
  Flame,
  RotateCcw,
  Plus,
} from "lucide-react";

interface ComparativeMatrixMethodProps {
  onSessionFinished?: () => void;
}

type ViewMode = "table" | "blind-recall";

export const ComparativeMatrixMethod: React.FC<ComparativeMatrixMethodProps> = ({
  onSessionFinished,
}) => {
  const [matrices, setMatrices] = useState<ComparativeMatrix[]>(PRESET_COMPARATIVE_MATRICES);
  const [selectedMatrixId, setSelectedMatrixId] = useState<string>(PRESET_COMPARATIVE_MATRICES[0].id);
  const [viewMode, setViewMode] = useState<ViewMode>("table");

  // Blind Recall State
  const [blindRatio, setBlindRatio] = useState<number>(0.5);
  const [blindCells, setBlindCells] = useState<BlindCellItem[]>([]);
  const [activeCellKey, setActiveCellKey] = useState<string | null>(null);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());

  // Custom matrix creation state
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customEntitiesStr, setCustomEntitiesStr] = useState("");
  const [customDimensionsStr, setCustomDimensionsStr] = useState("");

  const activeMatrix = useMemo(() => {
    return matrices.find((m) => m.id === selectedMatrixId) || matrices[0];
  }, [matrices, selectedMatrixId]);

  // Start blind recall mode
  const handleStartBlindRecall = (ratio: number) => {
    setBlindRatio(ratio);
    const deck = createBlindRecallDeck(activeMatrix, ratio);
    setBlindCells(deck);
    setRevealedCells(new Set());
    setUserInputs({});
    setActiveCellKey(null);
    setViewMode("blind-recall");
  };

  const handleRevealCell = (cellKey: string) => {
    setRevealedCells((prev) => new Set(prev).add(cellKey));
  };

  const handleRateCell = (cellKey: string, status: BlindCellItem["masteryStatus"]) => {
    setBlindCells((prev) =>
      prev.map((c) => (c.cellKey === cellKey ? { ...c, masteryStatus: status } : c)),
    );
  };

  // Compute mastery stats
  const blindStats = useMemo(() => {
    const hidden = blindCells.filter((c) => c.isHidden);
    const mastered = hidden.filter((c) => c.masteryStatus === "mastered").length;
    const doubtful = hidden.filter((c) => c.masteryStatus === "doubtful").length;
    const failed = hidden.filter((c) => c.masteryStatus === "failed").length;
    const tested = mastered + doubtful + failed;
    const pct = hidden.length > 0 ? Math.round((mastered / hidden.length) * 100) : 0;
    return { totalHidden: hidden.length, mastered, doubtful, failed, tested, pct };
  }, [blindCells]);

  const handleCreateCustomMatrix = () => {
    if (!customTitle.trim() || !customEntitiesStr.trim() || !customDimensionsStr.trim()) return;
    const entities = customEntitiesStr.split(",").map((e) => e.trim()).filter(Boolean);
    const dimensions = customDimensionsStr.split(",").map((d) => d.trim()).filter(Boolean);

    const cells: Record<string, string> = {};
    entities.forEach((_, eIdx) => {
      dimensions.forEach((_, dIdx) => {
        cells[`${eIdx}_${dIdx}`] = `Contenido clave de ${entities[eIdx]} en dimensión ${dimensions[dIdx]}.`;
      });
    });

    const newMatrix: ComparativeMatrix = {
      id: `custom_${Date.now()}`,
      title: customTitle.trim(),
      discipline: "General",
      description: "Matriz comparativa personalizada creada por el estudiante.",
      entities,
      dimensions,
      cells,
      frictionPoints: [],
    };

    setMatrices((prev) => [newMatrix, ...prev]);
    setSelectedMatrixId(newMatrix.id);
    setIsCreatingCustom(false);
    setCustomTitle("");
    setCustomEntitiesStr("");
    setCustomDimensionsStr("");
  };

  const handleFinish = async () => {
    try {
      await saveMatrixSessionRecord(activeMatrix.title, 600);
    } catch {
      // Ignorar error de logging
    }
    onSessionFinished?.();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Encabezado */}
      <Card className="border border-border-hairline bg-bg-surface-1 shadow-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-surface-2 text-text-primary border border-border-hairline">
              <Columns3 size={20} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-text-primary flex items-center gap-2 font-serif">
                Matriz Comparativa y Despiece Teórico
                <Badge variant="neutral" className="text-xs font-mono py-0">
                  Active Recall a celdas ciegas
                </Badge>
              </CardTitle>
              <p className="text-xs text-text-tertiary">
                Compara autores, escuelas o diagnósticos diferenciales y entrena la evocación tapando celdas clave.
              </p>
            </div>
          </div>

          {/* Selector de Modos */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors ${
                viewMode === "table"
                  ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                  : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
              }`}
            >
              <Eye size={13} /> Cuadro Completo
            </button>
            <button
              type="button"
              onClick={() => handleStartBlindRecall(0.5)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium font-mono flex items-center gap-1.5 transition-colors ${
                viewMode === "blind-recall"
                  ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                  : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
              }`}
            >
              <EyeOff size={13} /> Celdas Ciegas (Recall)
            </button>
          </div>
        </CardHeader>

        {/* Barra de Selección de Matrices */}
        <div className="p-4 pt-0 flex flex-wrap items-center justify-between gap-3 border-t border-border-hairline mt-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-text-tertiary">Matrices:</span>
            {matrices.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMatrixId(m.id);
                  if (viewMode === "blind-recall") {
                    handleStartBlindRecall(blindRatio);
                  }
                }}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all ${
                  selectedMatrixId === m.id
                    ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                    : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
                }`}
              >
                {m.title}
              </button>
            ))}
          </div>

          <Button size="sm" variant="outline" onClick={() => setIsCreatingCustom(true)} className="text-xs">
            <Plus size={13} /> Nueva Matriz
          </Button>
        </div>
      </Card>

      {/* Modal / Formulario de Creación de Matriz Personalizada */}
      {isCreatingCustom && (
        <Card className="p-4 border border-border-hairline bg-bg-surface-2 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-text-primary font-serif">
              Crear nueva matriz comparativa
            </h4>
            <Button size="sm" variant="ghost" onClick={() => setIsCreatingCustom(false)}>
              Cancelar
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="text-xs font-mono text-text-tertiary block mb-1">Título del tema:</label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Ej. Modelos de Base de Datos"
                className="w-full rounded bg-bg-surface-1 px-2.5 py-1.5 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-subtle"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-text-tertiary block mb-1">
                Entidades / Columnas (separadas por comas):
              </label>
              <input
                type="text"
                value={customEntitiesStr}
                onChange={(e) => setCustomEntitiesStr(e.target.value)}
                placeholder="Relacional (SQL), NoSQL Documental, Grafo"
                className="w-full rounded bg-bg-surface-1 px-2.5 py-1.5 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-subtle"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-text-tertiary block mb-1">
                Dimensiones / Filas (separadas por comas):
              </label>
              <input
                type="text"
                value={customDimensionsStr}
                onChange={(e) => setCustomDimensionsStr(e.target.value)}
                placeholder="Esquema, Escalabilidad, Garantías ACID, Caso Típico"
                className="w-full rounded bg-bg-surface-1 px-2.5 py-1.5 text-xs border border-border-hairline text-text-primary focus:outline-none focus:border-border-subtle"
              />
            </div>
          </div>

          <Button size="sm" variant="primary" onClick={handleCreateCustomMatrix}>
            Generar Matriz
          </Button>
        </Card>
      )}

      {/* ----------------- MODO 1: TABLA COMPLETA ----------------- */}
      {viewMode === "table" && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-border-hairline bg-bg-surface-1 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-hairline bg-bg-surface-2">
                  <th className="p-3 font-mono text-xs text-text-tertiary w-40 border-r border-border-hairline font-normal">
                    Dimensión / Eje
                  </th>
                  {activeMatrix.entities.map((ent, idx) => (
                    <th key={idx} className="p-3 font-bold text-text-primary font-serif border-r border-border-hairline last:border-r-0">
                      <span className="text-accent-primary mr-1 font-mono">#{idx + 1}</span> {ent}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline font-sans">
                {activeMatrix.dimensions.map((dim, dIdx) => (
                  <tr key={dIdx} className="hover:bg-bg-surface-2/30 transition-colors">
                    <td className="p-3 font-medium text-text-secondary bg-bg-surface-2/40 border-r border-border-hairline align-top">
                      {dim}
                    </td>
                    {activeMatrix.entities.map((_, eIdx) => {
                      const content = activeMatrix.cells[`${eIdx}_${dIdx}`] || "—";
                      return (
                        <td key={eIdx} className="p-3 text-text-primary border-r border-border-hairline last:border-r-0 align-top leading-relaxed">
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Puntos de Fricción Teórica / Trampas de Examen */}
          {activeMatrix.frictionPoints.length > 0 && (
            <div className="rounded-xl border border-border-hairline bg-bg-surface-2 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Flame size={16} className="text-highlighter" />
                <h4 className="text-xs font-semibold text-text-primary font-serif">
                  Puntos de fricción teórica y preguntas trampa de examen
                </h4>
              </div>

              <div className="grid gap-2.5 sm:grid-cols-2">
                {activeMatrix.frictionPoints.map((fp) => (
                  <div key={fp.id} className="rounded-lg bg-bg-surface-1 p-3 border border-border-hairline text-xs">
                    <p className="font-semibold text-text-primary font-serif">{fp.title}</p>
                    <p className="text-text-secondary mt-1 leading-relaxed">{fp.explanation}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {fp.entitiesInvolved.map((e) => (
                        <Badge key={e} variant="neutral" className="text-[10px] font-mono">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ----------------- MODO 2: ACTIVE RECALL DE CELDAS CIEGAS ----------------- */}
      {viewMode === "blind-recall" && (
        <div className="space-y-4">
          {/* Barra de Progreso y Opciones de Celdas Ciegas */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-surface-1 p-3 border border-border-hairline shadow-sm">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold text-text-primary">
                Dominio: {blindStats.mastered} / {blindStats.totalHidden} celdas ({blindStats.pct}%)
              </span>
              <div className="w-32 h-1.5 rounded-full bg-bg-surface-2 overflow-hidden border border-border-hairline">
                <div
                  className="h-full bg-signal-ok transition-all duration-300"
                  style={{ width: `${blindStats.pct}%` }}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleStartBlindRecall(0.5)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  blindRatio === 0.5
                    ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                    : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
                }`}
              >
                Tapar 50%
              </button>
              <button
                type="button"
                onClick={() => handleStartBlindRecall(1.0)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  blindRatio === 1.0
                    ? "bg-bg-surface-3 text-text-primary border border-border-hairline font-semibold"
                    : "bg-bg-surface-2 text-text-tertiary hover:text-text-primary border border-border-hairline"
                }`}
              >
                Tapar 100% (Tabique completo)
              </button>
              <Button size="sm" variant="ghost" onClick={() => handleStartBlindRecall(blindRatio)}>
                <RotateCcw size={13} /> Reiniciar
              </Button>
            </div>
          </div>

          {/* Grilla de Celdas Ciegas */}
          <div className="overflow-x-auto rounded-xl border border-border-hairline bg-bg-surface-1 shadow-sm">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border-hairline bg-bg-surface-2">
                  <th className="p-3 font-mono text-xs text-text-tertiary w-36 border-r border-border-hairline font-normal">
                    Dimensión
                  </th>
                  {activeMatrix.entities.map((ent, idx) => (
                    <th key={idx} className="p-3 font-bold text-text-primary font-serif border-r border-border-hairline last:border-r-0">
                      {ent}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-hairline font-sans">
                {activeMatrix.dimensions.map((dim, dIdx) => (
                  <tr key={dIdx}>
                    <td className="p-3 font-medium text-text-secondary bg-bg-surface-2/40 border-r border-border-hairline align-top">
                      {dim}
                    </td>
                    {activeMatrix.entities.map((ent, eIdx) => {
                      const cellKey = `${eIdx}_${dIdx}`;
                      const item = blindCells.find((c) => c.cellKey === cellKey);
                      const isHidden = item?.isHidden;
                      const isRevealed = revealedCells.has(cellKey);
                      const canonical = activeMatrix.cells[cellKey] || "";
                      const isActive = activeCellKey === cellKey;
                      const userInput = userInputs[cellKey] || "";

                      if (!isHidden) {
                        return (
                          <td key={eIdx} className="p-3 text-text-primary border-r border-border-hairline last:border-r-0 align-top opacity-75">
                            {canonical}
                          </td>
                        );
                      }

                      return (
                        <td
                          key={eIdx}
                          className={`p-3 border-r border-border-hairline last:border-r-0 align-top transition-all ${
                            item?.masteryStatus === "mastered"
                              ? "bg-signal-ok/10"
                              : item?.masteryStatus === "failed"
                              ? "bg-rubric-red/10"
                              : item?.masteryStatus === "doubtful"
                              ? "bg-highlighter/10"
                              : "bg-bg-surface-2/50"
                          }`}
                        >
                          {!isRevealed ? (
                            <div className="space-y-2">
                              {isActive ? (
                                <div className="space-y-1.5 animate-in fade-in duration-150">
                                  <span className="text-xs font-mono text-text-primary block font-medium">
                                    Evocá: {ent} en {dim}
                                  </span>
                                  <textarea
                                    rows={2}
                                    value={userInput}
                                    onChange={(e) => setUserInputs({ ...userInputs, [cellKey]: e.target.value })}
                                    placeholder="Escribí lo que recuerdes o formulalo mentalmente..."
                                    className="w-full rounded bg-bg-surface-1 px-2 py-1 text-xs border border-border-hairline text-text-primary resize-none focus:outline-none focus:border-border-subtle"
                                  />
                                  <Button
                                    size="sm"
                                    variant="primary"
                                    onClick={() => handleRevealCell(cellKey)}
                                    className="w-full text-xs py-1 justify-center"
                                  >
                                    <Eye size={12} /> Revelar Definición Canónica
                                  </Button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveCellKey(cellKey)}
                                  className="w-full p-2.5 rounded-lg border border-dashed border-border-hairline bg-bg-surface-2/50 hover:bg-bg-surface-2 text-text-secondary font-mono text-xs flex items-center justify-center gap-1.5 transition-colors"
                                >
                                  <EyeOff size={13} /> Celda Ciega — Click para Evocar
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="space-y-2 animate-in fade-in duration-200">
                              <p className="text-text-primary text-xs leading-relaxed font-sans">{canonical}</p>

                              {userInput.trim() && (() => {
                                const evalResult = evaluateRecallAnswer(userInput, canonical);
                                return (
                                  <div className="rounded bg-bg-surface-2 p-1.5 text-xs font-mono border border-border-hairline">
                                    <span className="text-accent-primary font-semibold">Acierto: {evalResult.score * 10}%</span>
                                    {evalResult.matchedKeywords.length > 0 && (
                                      <span className="text-signal-ok ml-1 font-medium">✓ {evalResult.matchedKeywords.join(", ")}</span>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Botones de Calificación */}
                              <div className="flex items-center gap-1 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleRateCell(cellKey, "mastered")}
                                  className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                                    item?.masteryStatus === "mastered"
                                      ? "bg-signal-ok text-white font-semibold border-signal-ok"
                                      : "bg-signal-ok/15 text-signal-ok border-signal-ok/30 hover:bg-signal-ok/25"
                                  }`}
                                >
                                  Dominado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateCell(cellKey, "doubtful")}
                                  className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                                    item?.masteryStatus === "doubtful"
                                      ? "bg-highlighter text-black font-semibold border-highlighter"
                                      : "bg-highlighter/15 text-highlighter border-highlighter/30 hover:bg-highlighter/25"
                                  }`}
                                >
                                  Dudoso
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateCell(cellKey, "failed")}
                                  className={`flex-1 py-1 rounded text-xs font-mono border transition-colors ${
                                    item?.masteryStatus === "failed"
                                      ? "bg-rubric-red text-white font-semibold border-rubric-red"
                                      : "bg-rubric-red/15 text-rubric-red border-rubric-red/30 hover:bg-rubric-red/25"
                                  }`}
                                >
                                  Fallo
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botón de Finalización */}
      {onSessionFinished && (
        <div className="flex justify-end pt-2">
          <Button variant="ghost" onClick={handleFinish}>
            Finalizar Sesión Comparativa
          </Button>
        </div>
      )}
    </div>
  );
};
