import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type ContextProjectRecord } from "../../db/db";
import { useContextEngineStore } from "../../stores/useContextEngineStore";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Folder, FileText, Plus, Check, Clock, Calendar, BookOpen, Trash2 } from "lucide-react";

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

          {/* Vinculación Manual de Carpetas y Archivos */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-text-secondary block">
              Vincular Materiales de Estudio de la Biblioteca (Carpetas / Archivos)
            </label>

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
