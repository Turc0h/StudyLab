import React, { useMemo } from "react";
import { renderLatexToHtml } from "../../lib/latexHelper";

interface LatexMathViewerProps {
  content: string;
  className?: string;
}

export const LatexMathViewer: React.FC<LatexMathViewerProps> = ({
  content,
  className = "",
}) => {
  const html = useMemo(() => {
    return renderLatexToHtml(content);
  }, [content]);

  if (!content.trim()) {
    return (
      <div className="p-8 text-center text-xs text-text-muted italic">
        Sin contenido para mostrar en la vista previa.
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded border border-border-subtle bg-bg-elevated text-text-primary text-xs font-sans leading-relaxed overflow-y-auto max-h-[420px] ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
