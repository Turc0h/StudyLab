import { clsx } from "clsx";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { careerTemplates, getSubjectsForYear } from "../../config/templates";
import { db } from "../../db/db";
import { generateId } from "./fileHelpers";

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  /** Carpeta donde crear en modo manual. null = raíz. */
  parentId: string | null;
}

export function NewFolderModal({ open, onClose, parentId }: NewFolderModalProps) {
  const [mode, setMode] = useState<"template" | "manual">("template");
  const [year, setYear] = useState(() => new Date().getFullYear().toString());
  const [careerId, setCareerId] = useState(careerTemplates[0].id);
  const [manualName, setManualName] = useState("");

  async function handleTemplateSubmit() {
    const career = careerTemplates.find((c) => c.id === careerId);
    if (!career || !year.trim()) return;
    const now = Date.now();

    let yearFolder = await db.folders.where({ parentId: null, name: year }).first();
    if (!yearFolder) {
      yearFolder = { id: generateId(), parentId: null, name: year, type: "year", createdAt: now };
      await db.folders.add(yearFolder);
    }

    let careerFolder = await db.folders
      .where({ parentId: yearFolder.id, name: career.name })
      .first();
    if (!careerFolder) {
      careerFolder = {
        id: generateId(),
        parentId: yearFolder.id,
        name: career.name,
        type: "career",
        createdAt: now,
      };
      await db.folders.add(careerFolder);
    }

    const subjects = getSubjectsForYear(careerId, 1);
    const existingSubjects = await db.folders.where({ parentId: careerFolder.id }).toArray();
    const existingNames = new Set(existingSubjects.map((f) => f.name));

    for (const subject of subjects) {
      if (existingNames.has(subject)) continue;
      await db.folders.add({
        id: generateId(),
        parentId: careerFolder.id,
        name: subject,
        type: "subject",
        createdAt: now,
      });
    }

    onClose();
  }

  async function handleManualSubmit() {
    if (!manualName.trim()) return;
    await db.folders.add({
      id: generateId(),
      parentId,
      name: manualName.trim(),
      type: "custom",
      createdAt: Date.now(),
    });
    setManualName("");
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Nueva carpeta">
      <div className="flex gap-1 rounded-md bg-bg-surface-2 p-1">
        <button
          type="button"
          onClick={() => setMode("template")}
          className={clsx(
            "flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors duration-150",
            mode === "template"
              ? "bg-accent text-accent-contrast"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Desde plantilla
        </button>
        <button
          type="button"
          onClick={() => setMode("manual")}
          className={clsx(
            "flex-1 rounded-sm py-1.5 text-xs font-medium transition-colors duration-150",
            mode === "manual"
              ? "bg-accent text-accent-contrast"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Manual
        </button>
      </div>

      {mode === "template" ? (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-secondary">
            Elegí año y carrera — se crean las carpetas de materias típicas de primer año.
          </p>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Año
            <Input value={year} onChange={(e) => setYear(e.target.value)} placeholder="2026" />
          </label>
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Carrera
            <select
              value={careerId}
              onChange={(e) => setCareerId(e.target.value)}
              className="h-10 rounded-md border border-border bg-bg-surface-2 px-3 text-sm text-text-primary outline-none focus:border-accent"
            >
              {careerTemplates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <Button onClick={handleTemplateSubmit} disabled={!year.trim()}>
            Crear estructura
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-xs font-medium text-text-secondary">
            Nombre de la carpeta
            <Input
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              placeholder="Ej. Parciales"
              autoFocus
            />
          </label>
          <Button onClick={handleManualSubmit} disabled={!manualName.trim()}>
            Crear carpeta
          </Button>
        </div>
      )}
    </Modal>
  );
}
