import React, { useEffect, useState } from "react";
import {
  Printer,
  FileDown,
  Download,
  X,
  Sparkles,
  CheckSquare,
  Square,
  Loader2,
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db.ts";
import {
  buildDossierData,
  generateDossierMarkdown,
  generateDossierHtml,
  DEFAULT_DOSSIER_CONFIG,
  type DossierData,
  type DossierSectionConfig,
} from "../../features/dossier/dossierGenerator.ts";

interface DossierPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolderId?: string | null;
}

export const DossierPreviewModal: React.FC<DossierPreviewModalProps> = ({
  isOpen,
  onClose,
  initialFolderId = null,
}) => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(initialFolderId);
  const [config, setConfig] = useState<DossierSectionConfig>(DEFAULT_DOSSIER_CONFIG);
  const [dossierData, setDossierData] = useState<DossierData | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"preview" | "markdown">("preview");

  const folders = useLiveQuery(() => db.folders.toArray(), []) || [];

  useEffect(() => {
    if (isOpen) {
      setSelectedFolderId(initialFolderId);
    }
  }, [isOpen, initialFolderId]);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      void buildDossierData(selectedFolderId).then((data) => {
        setDossierData(data);
        setLoading(false);
      });
    }
  }, [isOpen, selectedFolderId]);

  if (!isOpen) return null;

  const toggleSection = (key: keyof DossierSectionConfig) => {
    setConfig((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePrint = () => {
    if (!dossierData) return;
    const html = generateDossierHtml(dossierData, config);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!dossierData) return;
    const md = generateDossierMarkdown(dossierData, config);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dossierData.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadHtml = () => {
    if (!dossierData) return;
    const html = generateDossierHtml(dossierData, config);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${dossierData.title.replace(/[^a-zA-Z0-9_-]/g, "_")}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const markdownContent = dossierData ? generateDossierMarkdown(dossierData, config) : "";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exportador de Dossier Académico"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-4xl h-[90vh] rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-secondary/70">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              <Printer className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-text-primary">
                  Exportador de Dossier Universitario
                </h3>
                <Badge variant="accent">A4 Print & Markdown</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Genera un compendio de síntesis estructurado listo para imprimir o estudiar sin pantallas.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors cursor-pointer"
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Barra de Filtros y Configuración */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-border-subtle/70 bg-bg-surface-2/40 text-xs">
          {/* Selector de Cátedra */}
          <div className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Materia:</span>
            <select
              value={selectedFolderId || ""}
              onChange={(e) => setSelectedFolderId(e.target.value || null)}
              className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1.5 text-xs text-text-primary focus:outline-hidden"
            >
              <option value="">Toda la Universidad (Global)</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggles de Secciones */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => toggleSection("includeConcepts")}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle bg-bg-elevated text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {config.includeConcepts ? <CheckSquare className="h-3.5 w-3.5 text-accent-primary" /> : <Square className="h-3.5 w-3.5" />}
              <span>Conceptos ({dossierData?.stats.totalConcepts || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection("includeHighlights")}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle bg-bg-elevated text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {config.includeHighlights ? <CheckSquare className="h-3.5 w-3.5 text-accent-primary" /> : <Square className="h-3.5 w-3.5" />}
              <span>Subrayados ({dossierData?.stats.totalHighlights || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection("includePostits")}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle bg-bg-elevated text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {config.includePostits ? <CheckSquare className="h-3.5 w-3.5 text-accent-primary" /> : <Square className="h-3.5 w-3.5" />}
              <span>Notas ({dossierData?.stats.totalPostits || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection("includeErrors")}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle bg-bg-elevated text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {config.includeErrors ? <CheckSquare className="h-3.5 w-3.5 text-accent-primary" /> : <Square className="h-3.5 w-3.5" />}
              <span>Errores ({dossierData?.stats.totalErrors || 0})</span>
            </button>

            <button
              type="button"
              onClick={() => toggleSection("includeFlashcards")}
              className="flex items-center gap-1.5 px-2 py-1 rounded border border-border-subtle bg-bg-elevated text-[11px] text-text-secondary hover:text-text-primary cursor-pointer"
            >
              {config.includeFlashcards ? <CheckSquare className="h-3.5 w-3.5 text-accent-primary" /> : <Square className="h-3.5 w-3.5" />}
              <span>Tarjetas ({dossierData?.stats.totalFlashcards || 0})</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Vista Previa */}
        <div className="flex items-center justify-between px-6 pt-2 border-b border-border-subtle/50 bg-bg-secondary/20">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "preview"
                  ? "border-accent-primary text-text-primary font-semibold"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Vista Previa Maquetada
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("markdown")}
              className={`px-3 py-1.5 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
                activeTab === "markdown"
                  ? "border-accent-primary text-text-primary font-semibold"
                  : "border-transparent text-text-muted hover:text-text-secondary"
              }`}
            >
              Código Markdown (.md)
            </button>
          </div>

          <div className="flex items-center gap-2 py-1 text-xs text-text-muted">
            <Sparkles className="h-3.5 w-3.5 text-accent-primary" />
            <span>Listo para A4 / Impresión</span>
          </div>
        </div>

        {/* Contenedor Principal con Scroll */}
        <div className="flex-1 overflow-y-auto p-6 bg-bg-primary/40">
          {loading ? (
            <div className="flex h-full items-center justify-center gap-2 text-sm text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin text-accent-primary" />
              <span>Compilando dossier académico...</span>
            </div>
          ) : activeTab === "preview" ? (
            <div className="max-w-2xl mx-auto rounded-xl border border-border-subtle bg-bg-elevated p-8 shadow-xs space-y-6 text-text-primary font-serif">
              {/* Portada en miniatura */}
              <div className="text-center pb-6 border-b border-border-subtle space-y-2">
                <h1 className="text-2xl font-bold">{dossierData?.title}</h1>
                <p className="text-sm text-text-secondary font-sans">
                  {dossierData?.subjectName}
                </p>
                <p className="text-xs text-text-muted font-mono">
                  Compilado con StudyLab Cognitive OS
                </p>
              </div>

              {/* Conceptos */}
              {config.includeConcepts && (dossierData?.concepts.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-text-muted border-b border-border-subtle/50 pb-1">
                    1. Conceptos Nucleares ({dossierData?.concepts.length})
                  </h3>
                  <div className="space-y-2">
                    {dossierData?.concepts.slice(0, 5).map((c, i) => (
                      <div key={i} className="rounded-lg border border-border-subtle/60 p-3 bg-bg-secondary/30">
                        <div className="flex justify-between items-center text-sm font-sans font-semibold">
                          <span>{c.name}</span>
                          <span className="text-xs text-accent-primary">{c.masteryScore}% Dominio</span>
                        </div>
                        {c.description && <p className="text-xs text-text-secondary mt-1">{c.description}</p>}
                      </div>
                    ))}
                    {(dossierData?.concepts.length || 0) > 5 && (
                      <p className="text-xs text-text-muted font-sans text-center">
                        + {(dossierData?.concepts.length || 0) - 5} conceptos más en el documento final
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Subrayados */}
              {config.includeHighlights && (dossierData?.highlights.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-text-muted border-b border-border-subtle/50 pb-1">
                    2. Citas y Subrayados ({dossierData?.highlights.length})
                  </h3>
                  <div className="space-y-2">
                    {dossierData?.highlights.slice(0, 3).map((h, i) => (
                      <div key={i} className="rounded-lg border-l-4 border-accent-primary bg-bg-secondary/30 p-3 text-xs italic">
                        &ldquo;{h.text}&rdquo;
                        <div className="text-[10px] text-text-muted font-sans text-right mt-1 not-italic">
                          {h.fileName} (Pág. {h.page})
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Errores */}
              {config.includeErrors && (dossierData?.errors.length || 0) > 0 && (
                <div className="space-y-3">
                  <h3 className="font-sans font-bold text-sm uppercase tracking-wider text-text-muted border-b border-border-subtle/50 pb-1">
                    3. Desafíos y Brechas Corregidas ({dossierData?.errors.length})
                  </h3>
                  <div className="space-y-2">
                    {dossierData?.errors.slice(0, 2).map((e, i) => (
                      <div key={i} className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs font-sans space-y-1">
                        <div className="font-semibold text-text-primary">{e.conceptName}</div>
                        <p className="text-text-secondary">{e.originalExercise}</p>
                        <div className="text-emerald-400 font-semibold">Respuesta: {e.expectedAnswer}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <textarea
              readOnly
              value={markdownContent}
              className="w-full h-full font-mono text-xs p-4 rounded-xl border border-border-subtle bg-bg-elevated text-text-primary resize-none focus:outline-hidden"
            />
          )}
        </div>

        {/* Barra de Acciones Inferior */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t border-border-subtle bg-bg-secondary/70">
          <div className="text-xs text-text-muted font-mono">
            Formato de impresión listo para hojas A4 con saltos de sección automáticos.
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
              className="gap-1.5 text-xs font-mono cursor-pointer"
            >
              <FileDown size={14} />
              <span>Descargar .md</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadHtml}
              className="gap-1.5 text-xs font-mono cursor-pointer"
            >
              <Download size={14} />
              <span>Descargar .html</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs font-mono cursor-pointer"
            >
              <Printer size={14} />
              <span>Imprimir / Guardar PDF</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
