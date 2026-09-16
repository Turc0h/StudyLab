import { useState } from "react";
import { Feynman2Runner } from "../components/Feynman2Runner";
import { BrainCircuit, Sparkles } from "lucide-react";

interface SocraticFeynmanRunnerProps {
  methodId?: string;
  subjectFolderId: string | null;
}

export function SocraticFeynmanRunner({
  subjectFolderId: _subjectFolderId,
}: SocraticFeynmanRunnerProps) {
  const [mode, setMode] = useState<"feynman2" | "quick">("feynman2");

  return (
    <div className="flex flex-col gap-4">
      {/* Tab Selector */}
      <div className="flex items-center justify-between rounded-xl border border-border-subtle bg-bg-surface-2 p-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-text-main">Modo Feynman</span>
        </div>
        <div className="flex items-center gap-1 bg-bg-surface-3 p-0.5 rounded-lg border border-border-subtle">
          <button
            type="button"
            onClick={() => setMode("feynman2")}
            className={`flex items-center gap-1.5 rounded px-3 py-1 text-xs font-semibold transition-colors ${
              mode === "feynman2"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            <Sparkles className="h-3 w-3" /> Feynman 2.0 (Cátedra &amp; 4D)
          </button>
          <button
            type="button"
            onClick={() => setMode("quick")}
            className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
              mode === "quick"
                ? "bg-primary text-white shadow-sm"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Modo Rápido
          </button>
        </div>
      </div>

      {mode === "feynman2" ? (
        <Feynman2Runner />
      ) : (
        <Feynman2Runner />
      )}
    </div>
  );
}

