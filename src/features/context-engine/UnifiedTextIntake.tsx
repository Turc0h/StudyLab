import React, { useState, useEffect, useRef } from "react";
import { db } from "../../db/db";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Check, AlertCircle, Sparkles, Mic, MicOff, Cpu, Loader2 } from "lucide-react";
import type { TextIntakeDraft } from "./types";
import { parseTextIntakeRules } from "./textIntakeParser";
import { checkOllamaStatus, generateOllamaCompletion, type OllamaStatus } from "../../platform/ai/ollamaClient";

export const UnifiedTextIntake: React.FC = () => {
  const [inputText, setInputText] = useState("");
  const [draft, setDraft] = useState<TextIntakeDraft | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Fase 4: Estado del asistente local de Ollama
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus | null>(null);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  // Fase 3: Dictado de voz en cliente
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Verificar en segundo plano disponibilidad de Ollama sin bloquear
  useEffect(() => {
    void checkOllamaStatus().then(setOllamaStatus);
  }, []);

  // Inicializar motor de reconocimiento de voz del navegador si está soportado
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "es-ES";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleToggleVoice = () => {
    if (!recognitionRef.current) {
      alert("El reconocimiento de voz no está soportado en este entorno de navegador o WebView.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.warn("Error al iniciar reconocimiento de voz:", e);
        setIsListening(false);
      }
    }
  };

  // Procesamiento por reglas deterministas (estándar v5.1)
  const handleProcessInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseTextIntakeRules(inputText.trim());
    setDraft(parsed);
  };

  // Procesamiento con IA Local Ollama (Fase 4 v5.3)
  const handleProcessWithOllama = async () => {
    if (!inputText.trim()) return;
    setIsProcessingAI(true);

    try {
      const prompt = `Analiza la siguiente entrada de estudio libre y clasifícala. Devuelve EXCLUSIVAMENTE un JSON válido (sin explicaciones ni formato markdown adicional) con este esquema exacto:
{
  "title": "título conciso y claro de la tarea, examen o apunte",
  "detectedType": "task" | "calendar_event" | "quick_note",
  "suggestedDate": "YYYY-MM-DD o null si no se menciona fecha"
}
Texto del estudiante: "${inputText.trim()}"`;

      const activeModel = ollamaStatus?.models[0]?.name || "llama3.2";
      const rawResponse = await generateOllamaCompletion(prompt, {
        model: activeModel,
        temperature: 0.2,
      });

      // Intentar extraer JSON de la respuesta del modelo
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedJson = JSON.parse(jsonMatch[0]);
        setDraft({
          id: `draft_${Date.now()}`,
          rawText: inputText.trim(),
          title: parsedJson.title || inputText.trim().slice(0, 50),
          detectedType: ["task", "calendar_event", "quick_note"].includes(parsedJson.detectedType)
            ? parsedJson.detectedType
            : "task",
          suggestedDate: parsedJson.suggestedDate && parsedJson.suggestedDate !== "null"
            ? parsedJson.suggestedDate
            : undefined,
          isConfirmed: false,
        });
      } else {
        // Fallback a reglas si el modelo no devolvió JSON puro
        handleProcessInput();
      }
    } catch (err) {
      console.warn("Fallo en inferencia Ollama, recurriendo a analizador por reglas:", err);
      handleProcessInput();
    } finally {
      setIsProcessingAI(false);
    }
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
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-serif text-base font-semibold text-text-primary">
            Entrada Unificada de Texto (Embudo Rápido)
          </h3>
          <p className="text-xs text-text-secondary">
            Escribí o dictá libremente una idea, entrega o evento; el sistema sugerirá la clasificación para que la confirmes antes de guardar.
          </p>
        </div>
        {ollamaStatus?.isRunning && (
          <Badge variant="success">Ollama Local Activo</Badge>
        )}
      </div>

      <form onSubmit={(e) => handleProcessInput(e)} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="ej: Entregar informe de Química el viernes a las 18hs o Repasar Parcial de Álgebra"
            className="w-full rounded border border-border-subtle bg-bg-primary pl-3 pr-9 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary"
          />
          {/* Botón de Dictado de Voz (Fase 3) */}
          <button
            type="button"
            onClick={handleToggleVoice}
            title={isListening ? "Detener dictado de voz" : "Dictar por voz"}
            className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded transition-colors ${
              isListening
                ? "text-red-500 animate-pulse bg-red-500/10"
                : "text-text-muted hover:text-accent-primary"
            }`}
          >
            {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex gap-2">
          {/* Analizador por Reglas (Determinista) */}
          <Button
            variant="primary"
            size="sm"
            type="submit"
            disabled={!inputText.trim() || isProcessingAI}
            className="text-xs flex items-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>Analizar (Reglas)</span>
          </Button>

          {/* Analizador con IA Local Ollama (Fase 4) */}
          {ollamaStatus?.isRunning && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleProcessWithOllama}
              disabled={!inputText.trim() || isProcessingAI}
              className="text-xs flex items-center gap-1.5 border-accent-primary/30 text-accent-primary hover:bg-accent-primary/10"
            >
              {isProcessingAI ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Cpu className="h-3.5 w-3.5" />
              )}
              <span>{isProcessingAI ? "Pensando..." : "IA Local"}</span>
            </Button>
          )}
        </div>
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
