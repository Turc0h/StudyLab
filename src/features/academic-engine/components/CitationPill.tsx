import { useState } from "react";
import type { AcademicBoundingBox } from "../../../db/db";
import { ExternalLink, Quote, Globe, Headphones, FileText, AlertTriangle } from "lucide-react";

export interface CitationItem {
  sourceTitle: string;
  pageNumber?: number;
  paragraphIndex?: number;
  snippet?: string;
  formulaLatex?: string;
  boundingBox?: AcademicBoundingBox;
  charOffset?: { start: number; end: number };
  webUrlFragment?: { url: string; textSnippet: string };
  transcriptTimestamp?: { startSeconds: number; endSeconds: number; formatted: string };
  onClickCitation?: (page: number, bbox?: AcademicBoundingBox) => void;
}

export interface CitationPillProps extends CitationItem {
  className?: string;
}

export function CitationPill({
  sourceTitle,
  pageNumber = 1,
  paragraphIndex = 1,
  snippet,
  formulaLatex,
  boundingBox,
  charOffset,
  webUrlFragment,
  transcriptTimestamp,
  onClickCitation,
  className = "",
}: CitationPillProps) {
  const [showPopover, setShowPopover] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (webUrlFragment?.url) {
      window.open(webUrlFragment.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (onClickCitation) {
      onClickCitation(pageNumber, boundingBox);
    }
  };

  const shortTitle = sourceTitle.split(":")[0] || sourceTitle;

  let Icon = Quote;
  let label = `${shortTitle} · Pág. ${pageNumber}, §${paragraphIndex}`;

  if (transcriptTimestamp) {
    Icon = Headphones;
    label = `${shortTitle} · [${transcriptTimestamp.formatted}]`;
  } else if (webUrlFragment) {
    Icon = Globe;
    try {
      const host = new URL(webUrlFragment.url).hostname.replace(/^www\./, "");
      label = `${shortTitle} · ${host}`;
    } catch {
      label = `${shortTitle} · Web`;
    }
  } else if (charOffset) {
    Icon = FileText;
    label = `${shortTitle} · #${charOffset.start}-${charOffset.end}`;
  }

  return (
    <span
      className={`relative inline-block align-baseline mx-1 ${className}`}
      onMouseEnter={() => setShowPopover(true)}
      onMouseLeave={() => setShowPopover(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent-primary/15 hover:bg-accent-primary/25 text-accent-primary border border-accent-primary/30 font-mono text-[11px] font-semibold transition-all hover:shadow-[0_0_8px_rgba(0,240,255,0.4)] cursor-pointer"
        title="Auditar cita en la fuente original"
      >
        <Icon className="h-2.5 w-2.5" />
        <span className="truncate max-w-[210px]">{label}</span>
        <ExternalLink className="h-2.5 w-2.5 opacity-70" />
      </button>

      {/* Hover Citation Audit Popover */}
      {showPopover && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-72 p-3 rounded-xl border border-accent-primary/40 bg-bg-surface-2/95 shadow-2xl backdrop-blur-md text-left font-sans text-xs animate-in fade-in zoom-in-95 duration-150 pointer-events-none">
          <div className="flex items-center justify-between text-[10px] font-mono text-text-tertiary border-b border-border-subtle pb-1.5 mb-1.5">
            <span className="truncate max-w-[170px] text-text-secondary">{sourceTitle}</span>
            <span className="text-accent-primary font-bold">
              {transcriptTimestamp
                ? `Audio ${transcriptTimestamp.formatted}`
                : webUrlFragment
                  ? "Web"
                  : `Pág. ${pageNumber}`}
            </span>
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
            {webUrlFragment ? "Clic para abrir enlace web ↗" : "Clic para saltar con resplandor neón ↗"}
          </span>
        </div>
      )}
    </span>
  );
}

export function MultiCitationGroup({
  citations,
  onNavigate,
}: {
  citations: CitationItem[];
  onNavigate?: (page: number, bbox?: AcademicBoundingBox) => void;
}) {
  if (!citations || citations.length === 0) return null;

  return (
    <span className="inline-flex flex-wrap items-center gap-1 my-1">
      {citations.map((c, idx) => (
        <CitationPill
          key={`${c.sourceTitle}-${idx}`}
          {...c}
          onClickCitation={onNavigate || c.onClickCitation}
        />
      ))}
    </span>
  );
}

export function DiscrepancyAlertBanner({
  sourceA,
  sourceB,
  reason,
}: {
  sourceA: { title: string; snippet: string; pageNumber: number };
  sourceB: { title: string; snippet: string; pageNumber: number };
  reason: string;
}) {
  return (
    <div className="my-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs font-sans text-text-primary">
      <div className="flex items-center gap-1.5 text-warning font-semibold text-[11px] uppercase tracking-wider mb-1">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>Discrepancia detectada entre fuentes de cátedra</span>
      </div>
      <p className="text-[11px] text-text-secondary leading-snug mb-2">{reason}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="p-2 rounded bg-bg-surface-1 border border-border-subtle">
          <span className="font-bold text-accent-primary block mb-0.5">
            {sourceA.title} (Pág. {sourceA.pageNumber}):
          </span>
          <p className="italic text-text-muted leading-tight">"{sourceA.snippet}..."</p>
        </div>
        <div className="p-2 rounded bg-bg-surface-1 border border-border-subtle">
          <span className="font-bold text-accent-primary block mb-0.5">
            {sourceB.title} (Pág. {sourceB.pageNumber}):
          </span>
          <p className="italic text-text-muted leading-tight">"{sourceB.snippet}..."</p>
        </div>
      </div>
    </div>
  );
}
