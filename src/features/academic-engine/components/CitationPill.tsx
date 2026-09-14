import { useState } from "react";
import type { AcademicBoundingBox } from "../../../db/db";
import { ExternalLink, Quote } from "lucide-react";

interface CitationPillProps {
  sourceTitle: string;
  pageNumber: number;
  paragraphIndex: number;
  snippet?: string;
  formulaLatex?: string;
  boundingBox?: AcademicBoundingBox;
  onClickCitation?: (page: number, bbox?: AcademicBoundingBox) => void;
}

export function CitationPill({
  sourceTitle,
  pageNumber,
  paragraphIndex,
  snippet,
  formulaLatex,
  boundingBox,
  onClickCitation,
}: CitationPillProps) {
  const [showPopover, setShowPopover] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClickCitation) {
      onClickCitation(pageNumber, boundingBox);
    }
  };

  const shortTitle = sourceTitle.split(":")[0] || sourceTitle;

  return (
    <span
      className="relative inline-block align-baseline mx-1"
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-primary/15 hover:bg-accent-primary/25 text-accent-primary border border-accent-primary/30 font-mono text-[11px] font-semibold transition-all hover:shadow-[0_0_8px_rgba(0,240,255,0.4)] cursor-pointer"
        title="Auditar cita en la fuente original"
      >
        <Quote className="h-2.5 w-2.5" />
        <span>{shortTitle} · Pág. {pageNumber}, §{paragraphIndex}</span>
        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
      </button>

      {/* Hover Citation Audit Popover */}
      {showPopover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 p-3 rounded-xl border border-accent-primary/40 bg-bg-surface-2/95 shadow-2xl backdrop-blur-md text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary border-b border-border-subtle pb-1.5 mb-1.5">
            <span className="truncate max-w-[170px] text-text-secondary">{sourceTitle}</span>
            <span className="text-accent-primary font-bold">Pág. {pageNumber}</span>
          </div>

          {snippet && (
            <p className="text-text-primary text-[11px] leading-relaxed italic bg-bg-surface-1/80 p-2 rounded border border-border-subtle/50 mb-1.5">
              "{snippet}"
            </p>
          )}

          {formulaLatex && (
            <div className="text-[10px] font-mono text-accent-primary bg-bg-surface-1 p-1.5 rounded border border-accent-primary/20">
              $${formulaLatex}$$
            </div>
          )}

          <span className="text-[9px] font-mono text-text-tertiary block text-right mt-1">
            Clic para saltar con resplandor neón ↗
          </span>
        </div>
      )}
    </span>
  );
}
