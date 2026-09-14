import { useEffect, useRef, useState } from "react";
import { Button } from "../../../components/ui/Button";
import { Clock, Copy, Flame, RefreshCw, Check } from "lucide-react";

export function EphemeralScratchpad() {
  const [content, setContent] = useState("");
  const [remainingSec, setRemainingSec] = useState(60);
  const [isActive, setIsActive] = useState(false);
  const [copied, setCopied] = useState(false);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (content.trim().length > 0 && !isActive) {
      setIsActive(true);
      setRemainingSec(60);
    }
  }, [content, isActive]);

  useEffect(() => {
    if (!isActive) return;

    timerRef.current = window.setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          // Dissolve
          setContent("");
          setIsActive(false);
          return 60;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleCopy = async () => {
    if (!content.trim()) return;
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setRemainingSec(60);
  };

  // Text opacity decays linearly from 1.0 down to 0.1
  const opacity = isActive ? Math.max(0.12, remainingSec / 60) : 1;
  const progressPct = (remainingSec / 60) * 100;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-2/90 p-5 shadow-lg backdrop-blur-md relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-warning animate-pulse" />
          <h4 className="font-display text-sm font-semibold text-text-primary">
            Bloc Efímero (60s Decay)
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-accent-primary flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {remainingSec}s
          </span>
          {content.trim() && (
            <button
              type="button"
              onClick={handleReset}
              title="Renovar 60s"
              className="p-1 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress countdown bar */}
      <div className="w-full h-1 bg-bg-surface-1 rounded-full overflow-hidden">
        <div
          className="h-full bg-linear-to-r from-accent-primary to-warning transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Ephemeral Text Area */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Descargá tu memoria de trabajo aquí. El texto comenzará a desvanecerse en 60 segundos si no lo cristalizás..."
          rows={4}
          style={{ opacity }}
          className="w-full resize-none rounded-lg border border-border-subtle bg-bg-surface-1 p-3 text-xs font-mono text-text-primary placeholder:text-text-tertiary focus:outline-hidden focus:border-accent-primary transition-opacity duration-500"
        />
        {content.trim() && remainingSec <= 10 && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-danger/20 border border-danger/40 text-[10px] font-mono text-danger animate-bounce">
            ¡Disolución inminente!
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-text-tertiary">
          Evita la sobrecarga del buffer fonológico forzando síntesis rápida.
        </span>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleCopy}
          disabled={!content.trim()}
          className="flex items-center gap-1 text-xs"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-success" /> Copiado
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Fijar a Notas
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
