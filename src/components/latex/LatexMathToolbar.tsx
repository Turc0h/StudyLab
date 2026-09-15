import React from "react";
import { LATEX_SNIPPETS } from "../../lib/latexHelper";
import { Sparkles, Code2, Eye } from "lucide-react";
import { Button } from "../ui/Button";

interface LatexMathToolbarProps {
  onInsertSnippet: (snippet: string) => void;
  onAutoFormat: () => void;
  isFormulaView: boolean;
  onToggleView: () => void;
  hasFormulas: boolean;
}

export const LatexMathToolbar: React.FC<LatexMathToolbarProps> = ({
  onInsertSnippet,
  onAutoFormat,
  isFormulaView,
  onToggleView,
  hasFormulas,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-md border border-border-subtle bg-bg-secondary/80 text-xs">
      {/* Botones de acción principales */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Button
          size="sm"
          variant={isFormulaView ? "primary" : "outline"}
          onClick={onToggleView}
          className="gap-1 text-xs"
          title="Alternar entre editor de texto y vista con fórmulas renderizadas en KaTeX"
        >
          {isFormulaView ? (
            <>
              <Code2 className="h-3.5 w-3.5" />
              <span>Editar Texto</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5" />
              <span>Ver con LaTeX {hasFormulas ? "✨" : ""}</span>
            </>
          )}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={onAutoFormat}
          className="gap-1 text-xs text-accent-primary hover:text-accent-hover"
          title="Detecta automáticamente expresiones matemáticas en el texto y las formatea en LaTeX"
        >
          <Sparkles className="h-3 w-3" />
          <span>Auto-detectar Fórmulas</span>
        </Button>
      </div>

      {/* Snippets rápidos de fórmulas */}
      <div className="flex items-center gap-1 overflow-x-auto py-0.5 max-w-full">
        <span className="text-[11px] text-text-muted mr-1 font-sans hidden sm:inline">
          Insertar:
        </span>
        {LATEX_SNIPPETS.slice(0, 6).map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onInsertSnippet(item.snippet)}
            className="px-1.5 py-0.5 rounded border border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary hover:border-accent-primary font-mono text-[11px] transition-colors"
            title={`Insertar ${item.label}: ${item.snippet}`}
          >
            {item.preview}
          </button>
        ))}
      </div>
    </div>
  );
};
