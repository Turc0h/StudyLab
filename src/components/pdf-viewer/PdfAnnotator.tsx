import React, { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { pdfjsLib } from "../../lib/pdf";
import {
  getPdfDocuments,
  savePdfDocument,
  getHighlights,
  saveHighlight,
  deleteHighlight,
} from "../../lib/db";
import type { PdfDocumentRecord, PdfHighlightRecord } from "../../types";
import { Upload, ZoomIn, ZoomOut, Highlighter, Trash2, FileText } from "lucide-react";

export const PdfAnnotator: React.FC = () => {
  const [documents, setDocuments] = useState<PdfDocumentRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<PdfDocumentRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [numPages, setNumPages] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.2);
  const [highlights, setHighlights] = useState<PdfHighlightRecord[]>([]);
  const [noteText, setNoteText] = useState<string>("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPdfDocuments().then((docs) => {
      if (!cancelled) {
        setDocuments(docs);
        if (docs.length > 0) setSelectedDoc(docs[0]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDoc) return;
    let cancelled = false;
    getHighlights(selectedDoc.id).then((hl) => {
      if (!cancelled) setHighlights(hl);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedDoc]);

  // Render PDF page to canvas
  useEffect(() => {
    if (!selectedDoc || !canvasRef.current) return;
    let cancelled = false;

    void (async () => {
      try {
        const arrayBuffer = await selectedDoc.blob.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        if (cancelled) return;

        setNumPages(pdfDoc.numPages);
        const page = await pdfDoc.getPage(currentPage);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      } catch (err) {
        console.error("Error al renderizar página PDF:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedDoc, currentPage, scale]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newDoc: PdfDocumentRecord = {
      id: `doc_${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ""),
      fileName: file.name,
      fileSize: file.size,
      totalPages: 1,
      blob: file,
      uploadedAt: Date.now(),
    };

    await savePdfDocument(newDoc);
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDoc(newDoc);
    setCurrentPage(1);
  };

  const handleAddNote = async () => {
    if (!selectedDoc || !noteText.trim()) return;

    const hl: PdfHighlightRecord = {
      id: `hl_${Date.now()}`,
      documentId: selectedDoc.id,
      pageNumber: currentPage,
      selectedText: `Nota en Pág. ${currentPage}`,
      note: noteText.trim(),
      rects: [{ x: 0.1, y: 0.1, width: 0.8, height: 0.05 }],
      color: "#3B5169",
      createdAt: Date.now(),
    };

    await saveHighlight(hl);
    setHighlights((prev) => [...prev, hl]);
    setNoteText("");
  };

  const handleDeleteHighlight = async (id: string) => {
    await deleteHighlight(id);
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  const pageHighlights = highlights.filter((h) => h.pageNumber === currentPage);

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Toolbar */}
      <Card elevated className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
        <div className="flex items-center gap-3">
          <label className="cursor-pointer">
            <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-medium rounded border border-accent-primary bg-accent-primary text-bg-elevated hover:bg-accent-hover transition-colors">
              <Upload className="h-3.5 w-3.5" />
              <span>Cargar PDF local</span>
            </span>
          </label>

          {documents.length > 0 && (
            <select
              value={selectedDoc?.id || ""}
              onChange={(e) => {
                const doc = documents.find((d) => d.id === e.target.value);
                if (doc) {
                  setSelectedDoc(doc);
                  setCurrentPage(1);
                }
              }}
              className="text-xs font-sans rounded border border-border-subtle bg-bg-elevated px-2.5 py-1.5 text-text-primary"
            >
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {selectedDoc && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              ◀
            </Button>
            <span className="font-sans text-xs text-text-muted">
              Página {currentPage} de {numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= numPages}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              ▶
            </Button>
            <div className="h-4 w-px bg-border-subtle mx-1" />
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.8, s - 0.2))}
              aria-label="Alejar"
              className="p-1 rounded border border-border-subtle text-text-secondary hover:bg-bg-secondary"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.0, s + 0.2))}
              aria-label="Acercar"
              className="p-1 rounded border border-border-subtle text-text-secondary hover:bg-bg-secondary"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </Card>

      {/* Main Reader View & Notes Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* PDF Canvas View */}
        <div className="lg:col-span-2 flex flex-col items-center justify-start rounded border border-border-subtle bg-bg-secondary p-4 overflow-x-auto min-h-[500px]">
          {selectedDoc ? (
            <canvas ref={canvasRef} className="rounded border border-border-subtle shadow-2xs bg-white" />
          ) : (
            <div className="py-24 text-center">
              <FileText className="h-10 w-10 text-text-muted mx-auto mb-2 opacity-50" />
              <p className="font-serif text-base text-text-primary">No hay ningún documento abierto</p>
              <p className="font-sans text-xs text-text-muted mt-1">Carga un archivo PDF para comenzar a leer y anotar.</p>
            </div>
          )}
        </div>

        {/* Marginal Notes & Highlights */}
        <div className="flex flex-col gap-4">
          <Card elevated>
            <CardHeader>
              <CardTitle>Notas Marginales</CardTitle>
              <span className="text-xs text-text-muted">Anotaciones guardadas en la página {currentPage}</span>
            </CardHeader>

            <div className="space-y-2 mb-4">
              {pageHighlights.length === 0 ? (
                <p className="text-xs text-text-muted italic py-4 text-center">
                  Sin notas en esta página.
                </p>
              ) : (
                pageHighlights.map((h) => (
                  <div key={h.id} className="p-3 rounded border border-border-subtle bg-bg-secondary flex flex-col gap-1 text-xs font-sans">
                    <div className="flex items-center justify-between">
                      <Badge variant="accent">Pág. {h.pageNumber}</Badge>
                      <button
                        type="button"
                        onClick={() => handleDeleteHighlight(h.id)}
                        className="text-text-muted hover:text-error transition-colors"
                        aria-label="Eliminar nota"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    {h.note && <p className="text-text-primary mt-1 leading-relaxed">{h.note}</p>}
                  </div>
                ))
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-border-subtle pt-3">
              <Input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Escribir nota al margen..."
                className="text-xs"
              />
              <Button size="sm" onClick={handleAddNote} disabled={!noteText.trim() || !selectedDoc}>
                <Highlighter className="h-3.5 w-3.5 mr-1" /> Anotar en página
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
