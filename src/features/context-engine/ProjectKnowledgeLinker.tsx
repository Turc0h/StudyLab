import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ContextProjectRecord } from "../../db/db";
import { useContextEngineStore } from "../../stores/useContextEngineStore";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Folder, FileText, Plus, Check, Clock, Calendar, BookOpen, Trash2, Sparkles } from "lucide-react";
import { computeEmbeddingVector } from "../academic-engine/embeddings/embeddingManager";
import { cosineSimilarity } from "../academic-engine/vectorIndex";

export const ProjectKnowledgeLinker: React.FC = () => {
  const { heuristicHoursPerUnit, setHeuristicHoursPerUnit } = useContextEngineStore();
  const projects = useLiveQuery(() => db.contextProjects.toArray(), []);
  const folders = useLiveQuery(() => db.folders.toArray(), []);
  const files = useLiveQuery(() => db.files.toArray(), []);

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [unitCount, setUnitCount] = useState(4);
  const [examDate, setExamDate] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [overriddenHours, setOverriddenHours] = useState<string>("");

  // Fase 2: Estado de sugerencias semánticas automáticas
  const [isSearchingSemantic, setIsSearchingSemantic] = useState(false);
  const [semanticSuggestions, setSemanticSuggestions] = useState<{
    fileId: string;
    fileName: string;
    score: number;
    selected: boolean;
  }[]>([]);

  const suggestedHours = Math.round(unitCount * heuristicHoursPerUnit * 10) / 10;
  const effectiveHours = overriddenHours ? parseFloat(overriddenHours) || suggestedHours : suggestedHours;

  const handleToggleFolder = (id: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleToggleFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  };

  const handleSemanticSearch = async () => {
    if (!name.trim()) return;
    setIsSearchingSemantic(true);
    try {
      const query = `${name} ${description}`.trim();
      const queryVec = await computeEmbeddingVector(query);
      const allChunks = await db.academicChunks.toArray();
      const allFiles = await db.files.toArray();
      const fileMap = new Map(allFiles.map((f) => [f.id, f.name]));

      const scoreByFile = new Map<string, number>();

      // 1. Chunks densos
      for (const chunk of allChunks) {
        if (chunk.denseVector && chunk.denseVector.length > 0) {
          const sim = cosineSimilarity(queryVec, chunk.denseVector);
          const prev = scoreByFile.get(chunk.sourceId) || 0;
          if (sim > prev) scoreByFile.set(chunk.sourceId, sim);
        }
      }

      // 2. Lexical boost con nombres de archivo
      const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
      for (const file of allFiles) {
        const nameLower = file.name.toLowerCase();
        let matches = 0;
        for (const qw of queryWords) {
          if (nameLower.includes(qw)) matches++;
        }
        if (matches > 0) {
          const boost = Math.min(0.95, matches * 0.35);
          const prev = scoreByFile.get(file.id) || 0;
          scoreByFile.set(file.id, Math.max(prev, boost));
        }
      }

      const suggestions = Array.from(scoreByFile.entries())
        .map(([fileId, score]) => ({
          fileId,
          fileName: fileMap.get(fileId) || "Documento",
          score: Math.round(score * 100),
          selected: true,
        }))
        .filter((s) => s.score >= 20 && !selectedFileIds.includes(s.fileId))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      setSemanticSuggestions(suggestions);
    } catch (err) {
      console.error("Error en búsqueda semántica de proyectos:", err);
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleApplySemanticSuggestions = () => {
    const toAdd = semanticSuggestions.filter((s) => s.selected).map((s) => s.fileId);
    setSelectedFileIds((prev) => Array.from(new Set([...prev, ...toAdd])));
    setSemanticSuggestions([]);
  };

  const handleCreateProject = async () => {
    if (!name.trim()) return;

    const parsedOverride = overriddenHours ? parseFloat(overriddenHours) : undefined;

    // Actualizar heurística mediante promedio móvil simple si el usuario la modificó
    if (parsedOverride && parsedOverride > 0 && unitCount > 0) {
      const userRatio = parsedOverride / unitCount;
      const updatedHeuristic = Math.round(((heuristicHoursPerUnit + userRatio) / 2) * 10) / 10;
      await setHeuristicHoursPerUnit(updatedHeuristic);
    }

    const newProject: ContextProjectRecord = {
      id: `proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim(),
      description: description.trim() || undefined,
      targetExamDate: examDate ? new Date(examDate).getTime() : undefined,
      linkedFolderIds: selectedFolderIds,
      linkedFileIds: selectedFileIds,
      unitCount,
      heuristicHoursPerUnit,
      userOverriddenHours: parsedOverride,
      totalEstimatedHours: effectiveHours,
      status: "active",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await db.contextProjects.add(newProject);
    setName("");
    setDescription("");
    setSelectedFolderIds([]);
    setSelectedFileIds([]);
    setSemanticSuggestions([]);
    setOverriddenHours("");
    setIsCreating(false);
  };

  const handleDeleteProject = async (id: string) => {
    await db.contextProjects.delete(id);
    // Eliminar también bloques vinculados
    await db.contextTimeBlocks.where("projectId").equals(id).delete();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-base font-semibold text-text-primary">
            Proyectos Académicos Vinculados
          </h3>
          <p className="text-xs text-text-secondary">
            Vinculá carpetas y documentos con tus metas de estudio y horas estimadas.
          </p>
        </div>
        {!isCreating && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="text-xs flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Nuevo Proyecto</span>
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="p-5 border-accent-primary/40 bg-bg-secondary/30 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <h4 className="font-serif text-sm font-semibold text-text-primary">
              Crear Proyecto de Estudio
            </h4>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-xs">
              Cancelar
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-text-secondary font-medium mb-1">Nombre del Proyecto</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej: Aprobar Química General"
                className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>

            <div>
              <label className="block text-text-secondary font-medium mb-1">Fecha de Examen / Hito</label>
              <input
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full rounded border border-border-subtle bg-bg-primary px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
              />
            </div>
          </div>

          {/* Estimación de Horas Heurística */}
          <div className="rounded border border-border-subtle bg-bg-primary/60 p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium text-text-primary flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-accent-primary" />
                Estimador de Horas de Estudio (Heurística)
              </span>
              <span className="text-text-muted text-[11px]">
                Heurística base: {heuristicHoursPerUnit} hs / unidad
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-text-secondary block mb-1">Cantidad de unidades/capítulos:</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={unitCount}
                  onChange={(e) => setUnitCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded border border-border-subtle bg-bg-secondary px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>

              <div>
                <label className="text-text-secondary block mb-1">
                  Horas estimadas sugeridas: <strong>{suggestedHours} hs</strong> (o corregir):
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  placeholder={`Sugerido: ${suggestedHours}`}
                  value={overriddenHours}
                  onChange={(e) => setOverriddenHours(e.target.value)}
                  className="w-full rounded border border-border-subtle bg-bg-secondary px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>
            {overriddenHours && (
              <p className="text-[11px] text-accent-primary mt-1">
                El sistema guardará tu corrección ({effectiveHours} hs) para ajustar automáticamente el promedio móvil en proyectos futuros.
              </p>
            )}
          </div>

          {/* Vinculación de Carpetas y Archivos con Asistente Semántico (Fase 2) */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <label className="text-xs font-medium text-text-secondary block">
                Materiales de Estudio ({selectedFolderIds.length} carp., {selectedFileIds.length} arch. seleccionados)
              </label>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleSemanticSearch}
                disabled={isSearchingSemantic || !name.trim()}
                className="text-xs flex items-center gap-1.5 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/10 self-start sm:self-auto"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{isSearchingSemantic ? "Analizando biblioteca..." : "Sugerir Documentos por IA Semántica"}</span>
              </Button>
            </div>

            {/* Tarjeta de Sugerencias Semánticas Detectadas (Fase 2) */}
            {semanticSuggestions.length > 0 && (
              <div className="rounded-lg border border-accent-primary/30 bg-accent-primary/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-accent-primary flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sugerencias Semánticas Detectadas (Fase 2)
                  </span>
                  <span className="text-[11px] text-text-muted">
                    Elegí cuáles vincular antes de confirmar
                  </span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {semanticSuggestions.map((sug) => (
                    <div
                      key={sug.fileId}
                      className="flex items-center justify-between p-1.5 rounded bg-bg-primary/80 border border-border-subtle text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer select-none truncate mr-2">
                        <input
                          type="checkbox"
                          checked={sug.selected}
                          onChange={() => {
                            setSemanticSuggestions((prev) =>
                              prev.map((item) =>
                                item.fileId === sug.fileId ? { ...item, selected: !item.selected } : item
                              )
                            );
                          }}
                          className="rounded border-border text-accent-primary shrink-0"
                        />
                        <span className="truncate max-w-[220px] text-text-primary">{sug.fileName}</span>
                      </label>
                      <Badge variant="accent">{sug.score}% Afinidad</Badge>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1 border-t border-accent-primary/15">
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => setSemanticSuggestions([])}
                    className="text-xs"
                  >
                    Descartar
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    type="button"
                    onClick={handleApplySemanticSuggestions}
                    className="text-xs"
                  >
                    Vincular Sugeridos Seleccionados ({semanticSuggestions.filter((s) => s.selected).length})
                  </Button>
                </div>
              </div>
            )}

            <div className="max-h-40 overflow-y-auto rounded border border-border-subtle bg-bg-primary/50 p-2 space-y-1 text-xs">
              {(!folders || folders.length === 0) && (!files || files.length === 0) ? (
                <p className="text-text-muted p-2 text-center">No hay carpetas ni archivos en la biblioteca todavía.</p>
              ) : null}

              {folders?.map((folder) => {
                const isSelected = selectedFolderIds.includes(folder.id);
                return (
                  <div
                    key={folder.id}
                    onClick={() => handleToggleFolder(folder.id)}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                      isSelected ? "bg-accent-primary/15 text-accent-primary font-medium" : "hover:bg-bg-secondary text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Folder className="h-3.5 w-3.5" />
                      <span>{folder.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                );
              })}

              {files?.map((file) => {
                const isSelected = selectedFileIds.includes(file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => handleToggleFile(file.id)}
                    className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${
                      isSelected ? "bg-accent-primary/15 text-accent-primary font-medium" : "hover:bg-bg-secondary text-text-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5" />
                      <span className="truncate max-w-[250px]">{file.name}</span>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)} className="text-xs">
              Cancelar
            </Button>
            <Button variant="primary" size="sm" onClick={handleCreateProject} disabled={!name.trim()} className="text-xs">
              Confirmar y Guardar Proyecto ({effectiveHours} hs)
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de Proyectos Existentes */}
      {(!projects || projects.length === 0) && !isCreating ? (
        <Card className="p-8 text-center border-dashed border-border-subtle">
          <BookOpen className="h-8 w-8 text-text-muted mx-auto mb-2 opacity-50" />
          <p className="text-xs text-text-muted">No tenés proyectos de estudio creados todavía.</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsCreating(true)}
            className="mt-3 text-xs"
          >
            Crear el primero
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {projects?.map((proj) => (
            <Card key={proj.id} className="p-4 border-border-subtle flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-serif text-sm font-semibold text-text-primary">{proj.name}</h4>
                  <Badge variant="accent">{proj.totalEstimatedHours} hs estimadas</Badge>
                </div>

                {proj.description && (
                  <p className="text-xs text-text-secondary mt-1 line-clamp-2">{proj.description}</p>
                )}

                <div className="flex flex-wrap gap-2 text-[11px] text-text-muted mt-3">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-3 w-3" />
                    {proj.unitCount} unidades
                  </span>
                  {proj.targetExamDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(proj.targetExamDate).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Folder className="h-3 w-3" />
                    {proj.linkedFolderIds.length} carpetas
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {proj.linkedFileIds.length} archivos
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 mt-3 border-t border-border-subtle">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteProject(proj.id)}
                  className="text-xs text-red-500 hover:text-red-600 p-1 h-7 w-7"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
