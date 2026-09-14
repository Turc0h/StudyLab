import { useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import type { AcademicSourceRecord } from "../../../db/db";
import {
  CheckCircle2,
  FileText,
  GraduationCap,
  Trash2,
  BookOpen,
} from "lucide-react";
import { AcademicFileUploader } from "./AcademicFileUploader";

interface AcademicSourceManagerProps {
  sources: AcademicSourceRecord[];
  activeSourceId: string | null;
  onSelectSource: (source: AcademicSourceRecord) => void;
  onDeleteSource?: (sourceId: string) => void;
  onUploadSource?: () => void;
  onLoadSample?: () => void;
}

export function AcademicSourceManager({
  sources,
  activeSourceId,
  onSelectSource,
  onDeleteSource,
  onUploadSource,
  onLoadSample,
}: AcademicSourceManagerProps) {
  const [selectedCareer, setSelectedCareer] = useState<string>("all");

  const careers = Array.from(new Set(sources.map((s) => s.career).filter(Boolean)));

  const filteredSources =
    selectedCareer === "all" ? sources : sources.filter((s) => s.career === selectedCareer);

  return (
    <div
      data-tour="source-manager"
      className="flex flex-col h-full gap-4 p-4 border-r border-border-subtle bg-bg-surface-1/95 text-text-primary overflow-y-auto"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-accent-primary" />
          <h3 className="font-display font-bold text-xs uppercase tracking-wider text-text-primary">
            Gestor de Fuentes
          </h3>
        </div>
        <span className="font-mono text-[10px] text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded border border-accent-primary/20">
          {sources.length} Docs
        </span>
      </div>

      {/* Filter by Career / Year */}
      {careers.length > 0 && (
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-mono uppercase text-text-tertiary">
            Filtrar por Carrera:
          </label>
          <select
            value={selectedCareer}
            onChange={(e) => setSelectedCareer(e.target.value)}
            className="w-full rounded-lg border border-border-subtle bg-bg-surface-2 p-1.5 text-xs font-mono text-text-secondary focus:outline-hidden focus:border-accent-primary"
          >
            <option value="all">Todas las Carreras</option>
            {careers.map((c) => (
              <option key={c} value={c!}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Source Document Cards or Empty State */}
      <div className="flex flex-col gap-2.5 flex-1 overflow-y-auto">
        {filteredSources.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border-subtle rounded-xl bg-bg-surface-2/30 my-auto">
            <BookOpen className="h-8 w-8 text-text-tertiary/60 mb-2" />
            <span className="font-display font-semibold text-xs text-text-secondary">
              Sin fuentes académicas
            </span>
            <p className="text-[11px] text-text-tertiary mt-1 max-w-[200px] leading-snug">
              Arrastrá tus PDFs, apuntes en Markdown o DOCX abajo para procesarlos localmente.
            </p>
            {onLoadSample && (
              <button
                type="button"
                onClick={onLoadSample}
                className="mt-3.5 px-2.5 py-1 text-[11px] font-mono rounded-lg border border-accent-primary/40 bg-accent-primary/10 text-accent-primary hover:bg-accent-primary/20 transition-all cursor-pointer"
              >
                + Cargar material de cátedra de ejemplo
              </button>
            )}
          </div>
        ) : (
          filteredSources.map((source) => {
            const isSelected = activeSourceId === source.id;
            return (
              <div
                key={source.id}
                className={`relative group flex flex-col text-left p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-accent-primary bg-bg-surface-2 shadow-lg shadow-accent-primary/10 ring-1 ring-accent-primary"
                    : "border-border-subtle bg-bg-surface-2/60 hover:bg-bg-surface-2 hover:border-border-subtle/80"
                }`}
              >
                <div
                  className="cursor-pointer"
                  onClick={() => onSelectSource(source)}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-display font-semibold text-xs text-text-primary line-clamp-2 leading-snug pr-5">
                      {source.title}
                    </span>
                    <FileText
                      className={`h-4 w-4 shrink-0 ${
                        isSelected ? "text-accent-primary" : "text-text-tertiary"
                      }`}
                    />
                  </div>

                  {/* Metadata tags */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-mono text-text-tertiary">
                    <span className="text-text-secondary">{source.professorId || "Cátedra"}</span>
                    <span>·</span>
                    <span>{source.semester || "1C"}</span>
                    <span>·</span>
                    <span>{source.pageCount} págs</span>
                  </div>

                  {/* Ingestion & AST Status Badges */}
                  <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border-subtle/50 font-mono text-[9px]">
                    <Badge variant="success" className="px-1.5 py-0">
                      <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" /> OCR
                    </Badge>
                    <Badge variant="neutral" className="px-1.5 py-0">
                      AST {source.chunkCount} chk
                    </Badge>
                    <Badge variant="neutral" className="px-1.5 py-0 text-accent-primary border-accent-primary/30">
                      GraphRAG
                    </Badge>
                  </div>
                </div>

                {/* Delete Source Action */}
                {onDeleteSource && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`¿Desea eliminar la fuente "${source.title}" y todos sus fragmentos indexados?`)) {
                        onDeleteSource(source.id);
                      }
                    }}
                    className="absolute top-2.5 right-2.5 p-1 rounded-md text-text-tertiary hover:text-error hover:bg-error/10 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                    title="Eliminar documento del gestor"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Native File Uploader Section */}
      <div className="pt-2 border-t border-border-subtle">
        <AcademicFileUploader
          onSourceIngested={(newSrc) => {
            onSelectSource(newSrc);
            onUploadSource?.();
          }}
          careerDefault={selectedCareer !== "all" ? selectedCareer : undefined}
        />
      </div>
    </div>
  );
}
