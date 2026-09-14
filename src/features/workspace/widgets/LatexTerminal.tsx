import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { Button } from "../../../components/ui/Button";
import { Calculator, Copy, Check } from "lucide-react";

const QUICK_SNIPPETS = [
  {
    label: "FSRS Retrievability",
    code: "R(t, S) = \\left(1 + 19 \\cdot \\frac{t}{S}\\right)^{-0.5}",
  },
  {
    label: "Knowledge Half-Life",
    code: "t_{1/2} = \\frac{3}{19} \\cdot S \\approx 0.1579 \\cdot S",
  },
  {
    label: "Bayes Posterior",
    code: "P(\\theta | D) = \\frac{P(D | \\theta) \\cdot P(\\theta)}{P(D)}",
  },
  {
    label: "Loss Gradient",
    code: "\\nabla_\\theta \\mathcal{L}(\\theta) = \\frac{1}{N}\\sum_{i=1}^N \\nabla_\\theta \\ell(f(x_i; \\theta), y_i)",
  },
];

const SYMBOLS = ["\\sum", "\\int", "\\partial", "\\nabla", "\\alpha", "\\beta", "\\gamma", "\\sigma", "\\lambda", "\\infty", "\\approx", "\\in"];

export function LatexTerminal() {
  const [latexInput, setLatexInput] = useState<string>(
    "R(t, S) = \\left(1 + 19 \\cdot \\frac{t}{S}\\right)^{-0.5}",
  );
  const [copied, setCopied] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const renderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!renderRef.current) return;
    try {
      katex.render(latexInput, renderRef.current, {
        displayMode: true,
        throwOnError: true,
      });
      setRenderError(null);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setRenderError(err.message);
      } else {
        setRenderError("Error de sintaxis LaTeX.");
      }
    }
  }, [latexInput]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(latexInput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSymbol = (sym: string) => {
    setLatexInput((prev) => `${prev} ${sym} `);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-2/90 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-accent-primary animate-pulse" />
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Terminal LaTeX &amp; KaTeX REPL
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3 text-success" /> Copiado
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copiar LaTeX
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Preset Snippets */}
      <div className="flex flex-wrap gap-1.5 font-mono text-[11px]">
        {QUICK_SNIPPETS.map((snip) => (
          <button
            key={snip.label}
            type="button"
            onClick={() => setLatexInput(snip.code)}
            className="px-2 py-1 rounded bg-bg-surface-1 text-text-tertiary hover:text-accent-primary hover:bg-accent-primary/10 border border-border-subtle transition-colors"
          >
            {snip.label}
          </button>
        ))}
      </div>

      {/* Symbol quick palette */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-mono text-text-secondary">
        {SYMBOLS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => handleInsertSymbol(s)}
            className="px-2 py-0.5 rounded bg-bg-surface-1/60 hover:bg-bg-surface-1 border border-border-subtle/50 shrink-0"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <textarea
        value={latexInput}
        onChange={(e) => setLatexInput(e.target.value)}
        placeholder="Escribe expresión LaTeX (ej: E = mc^2)..."
        rows={2}
        className="w-full resize-none rounded-lg border border-border-subtle bg-bg-surface-1 p-3 text-xs font-mono text-text-primary focus:outline-hidden focus:border-accent-primary"
      />

      {/* Live Render Area */}
      <div className="flex flex-col items-center justify-center min-h-[72px] rounded-lg border border-accent-primary/20 bg-bg-surface-1/80 p-4 text-text-primary overflow-x-auto shadow-inner">
        {renderError ? (
          <p className="text-xs text-danger font-mono">{renderError}</p>
        ) : (
          <div ref={renderRef} className="text-center font-display" />
        )}
      </div>
    </div>
  );
}
