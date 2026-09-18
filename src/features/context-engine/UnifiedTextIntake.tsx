import React, { useState } from "react";
import { db } from "../../db/db";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Check, AlertCircle, Sparkles } from "lucide-react";
import type { TextIntakeDraft } from "./types";
import { parseTextIntakeRules } from "./textIntakeParser";

export const UnifiedTextIntake: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [draft, setDraft] = useState<TextIntakeDraft | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleProcessInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseTextIntakeRules(inputText.trim());
    setDraft(parsed);
  };

  const handleConfirmAndSave = async () => {
    if (!draft) return;

    // Persistir de forma explícita según el tipo confirmado por el usuario
    if (draft.detectedType === "calendar_event" || draft.detectedType === "task") {
      const dueTimestamp = draft.suggestedDate ? new Date(draft.suggestedDate).getTime() : Date.now();
      await db.deadlines.add({
        id: `deadline_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: draft.title,
        dueDate: dueTimestamp,
        subjectFolderId: null,
        source: "manual",
      });
    }

    setDraft(null);
    setInputText("");
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-base font-semibold text-text-primary">
          Entrada Unificada de Texto (Embudo Rápido)
        </h3>
        <p className="text-xs text-text-secondary">
          Escribí libremente una idea, entrega o evento; el sistema sugerirá la clasificación para que la confirmes antes de guardar.
        </p>
      </div>

      <form onSubmit={handleProcessInput} className="flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="ej: Entregar informe de Química el viernes a las 18hs o Repasar Parcial de Álgebra"
          className="flex-1 rounded border border-border-subtle bg-bg-primary px-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
        />
        <Button variant="primary" size="sm" type="submit" disabled={!inputText.trim()} className="text-xs flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Analizar</span>
        </Button>
      </form>

      {savedSuccess && (
        <div className="flex items-center gap-2 rounded bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-600 font-medium">
          <Check className="h-4 w-4" />
          <span>Elemento confirmado y guardado localmente en tu Centro de Organización.</span>
        </div>
      )}

      {/* Vista Previa Editable Obligatoria antes de Guardar */}
      {draft && (
        <Card className="p-4 border-accent-primary/40 bg-bg-secondary/30 space-y-3">
          <div className="flex items-center justify-between border-b border-border-subtle pb-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-accent-primary" />
              <h4 className="font-serif text-xs font-semibold text-text-primary">
                Confirmación de Entrada (Vista Previa Editable)
              </h4>
            </div>
            <Badge variant="accent">
              {draft.detectedType === "calendar_event" && "Evento de Calendario"}
              {draft.detectedType === "task" && "Tarea de Estudio"}
              {draft.detectedType === "quick_note" && "Nota de Apunte"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="text-text-secondary block mb-1">Título:</label>
              <input
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                className="w-full rounded border border-border-subtle bg-bg-primary px-2.5 py-1 text-xs text-text-primary"
              />
            </div>

            <div>
              <label className="text-text-secondary block mb-1">Tipo de Elemento:</label>
              <select
                value={draft.detectedType}
                onChange={(e) => setDraft({ ...draft, detectedType: e.target.value as any })}
                className="w-full rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary"
              >
                <option value="task">Tarea Académica</option>
                <option value="calendar_event">Evento / Examen en Calendario</option>
                <option value="quick_note">Nota Rápida</option>
              </select>
            </div>

            <div>
              <label className="text-text-secondary block mb-1">Fecha Sugerida:</label>
              <input
                type="date"
                value={draft.suggestedDate || ""}
                onChange={(e) => setDraft({ ...draft, suggestedDate: e.target.value })}
                className="w-full rounded border border-border-subtle bg-bg-primary px-2 py-1 text-xs text-text-primary"
              />
            </div>
          </div>

          <p className="text-[11px] text-text-muted italic">
            El sistema nunca crea elementos automáticamente en segundo plano. Revisá los campos y confirmá la creación.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button variant="ghost" size="sm" onClick={() => setDraft(null)} className="text-xs">
              Descartar
            </Button>
            <Button variant="primary" size="sm" onClick={handleConfirmAndSave} className="text-xs flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5" />
              <span>Confirmar y Guardar</span>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
