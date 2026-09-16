import React, { useState } from "react";
import type { SerializedOcclusionFront } from "./occlusionEngine";
import { Button } from "../../components/ui/Button";
import { Eye, EyeOff } from "lucide-react";

interface ImageOcclusionViewerProps {
  payload: SerializedOcclusionFront;
  isFlipped: boolean;
  onReveal?: () => void;
  className?: string;
}

export const ImageOcclusionViewer: React.FC<ImageOcclusionViewerProps> = ({
  payload,
  isFlipped,
  onReveal,
  className = "",
}) => {
  const [revealAll, setRevealAll] = useState(false);
  const targetIds = new Set(payload.targetMaskIds);

  const shouldReveal = isFlipped || revealAll;

  return (
    <div className={'flex flex-col gap-3 ' + className}>
      {/* Visual Diagram Canvas with SVG Masks */}
      <div className="relative rounded-xl border border-border-subtle bg-slate-950 flex items-center justify-center overflow-hidden min-h-[280px]">
        {payload.imageUrl ? (
          <img
            src={payload.imageUrl}
            alt="Diagrama de estudio"
            className="w-full h-full object-contain pointer-events-none max-h-[360px]"
          />
        ) : (
          <div className="text-center p-8 text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
            <span className="text-sm font-semibold text-text-primary">{payload.sourceTitle}</span>
            <span className="text-text-muted">Página {payload.pageNumber || 1}</span>
          </div>
        )}

        {/* SVG Overlay with Active and Inactive Masks */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {payload.allMasks.map((m) => {
            const isTarget = targetIds.has(m.id);
            const isRevealed = shouldReveal || (!isTarget && payload.mode === "normal");

            if (m.shape === "ellipse") {
              return (
                <g key={m.id} className="transition-all duration-200">
                  <ellipse
                    cx={(m.x + m.width / 2) * 100 + '%'}
                    cy={(m.y + m.height / 2) * 100 + '%'}
                    rx={(m.width / 2) * 100 + '%'}
                    ry={(m.height / 2) * 100 + '%'}
                    className={
                      isTarget
                        ? isRevealed
                          ? "fill-emerald-500/40 stroke-emerald-400 stroke-2"
                          : "fill-rose-600/90 stroke-rose-400 stroke-2"
                        : "fill-slate-800/40 stroke-slate-500/60 stroke-1"
                    }
                  />
                  <text
                    x={(m.x + m.width / 2) * 100 + '%'}
                    y={(m.y + m.height / 2) * 100 + '%'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="fill-white font-mono text-[10px] font-bold select-none"
                  >
                    {isRevealed ? m.label : '?'}
                  </text>
                </g>
              );
            }

            return (
              <g key={m.id} className="transition-all duration-200">
                <rect
                  x={m.x * 100 + '%'}
                  y={m.y * 100 + '%'}
                  width={m.width * 100 + '%'}
                  height={m.height * 100 + '%'}
                  rx="4"
                  className={
                    isTarget
                      ? isRevealed
                        ? "fill-emerald-500/40 stroke-emerald-400 stroke-2"
                        : "fill-rose-600/90 stroke-rose-400 stroke-2"
                      : "fill-slate-800/40 stroke-slate-500/60 stroke-1"
                  }
                />
                <text
                  x={(m.x + m.width / 2) * 100 + '%'}
                  y={(m.y + m.height / 2) * 100 + '%'}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-white font-mono text-[10px] font-bold select-none"
                >
                  {isRevealed ? m.label : '?'}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Control bar: Reveal all button per Section 9-BIS */}
      <div className="flex items-center justify-between px-1">
        <span className="font-mono text-[10px] text-text-muted">
          Modo: {payload.mode.toUpperCase()} · {targetIds.size} elemento(s) oculto(s)
        </span>

        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => {
            setRevealAll(!revealAll);
            if (onReveal) onReveal();
          }}
          className="text-xs font-mono py-1 px-2.5 h-auto flex items-center gap-1.5"
        >
          {revealAll ? (
            <>
              <EyeOff className="h-3 w-3" />
              <span>Ocultar</span>
            </>
          ) : (
            <>
              <Eye className="h-3 w-3 text-cyan-400" />
              <span>Revelar todo</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
