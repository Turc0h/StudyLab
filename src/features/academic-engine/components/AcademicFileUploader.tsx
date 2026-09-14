import React, { useState, useRef } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { db, type AcademicSourceRecord } from "../../../db/db";
import { pdfjsLib } from "../../../lib/pdf";
import { chunkAcademicText } from "../academicChunker";

interface AcademicFileUploaderProps {
  onSourceIngested: (source: AcademicSourceRecord) => void;
  careerDefault?: string;
}

type IngestStep = "idle" | "reading" | "extracting" | "indexing" | "success" | "error";

export const AcademicFileUploader: React.FC<AcademicFileUploaderProps> = ({
  onSourceIngested,
  careerDefault = "Ingeniería / Ciencias",
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<IngestStep>("idle");
  const [progressPct, setProgressPct] = useState(0);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setCurrentFilename(file.name);
    setErrorMessage(null);
    setStep("reading");
    setProgressPct(15);

    try {
      const sourceId = `src_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const rawTitle = file.name.replace(/\.[^/.]+$/, "");
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      let extractedText = "";
      let pageCount = 1;

      if (ext === "pdf" || file.type === "application/pdf") {
        setStep("extracting");
        setProgressPct(35);

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;
        pageCount = pdfDoc.numPages;

        const textParts: string[] = [];
        for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageString = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ");
          textParts.push(`--- Pág. ${pageNum} ---\n${pageString}`);
          setProgressPct(35 + Math.round((pageNum / pageCount) * 35));
        }

        extractedText = textParts.join("\n\n");
      } else {
        // Markdown, TXT or others
        setStep("extracting");
        setProgressPct(50);
        extractedText = await file.text();
        pageCount = Math.max(1, Math.ceil(extractedText.length / 2500));
      }

      setStep("indexing");
      setProgressPct(80);

      // Save binary blob to Dexie db.files so PdfViewer can render it
      await db.files.put({
        id: fileId,
        folderId: "academic_sources",
        name: file.name,
        mimeType: file.type || (ext === "pdf" ? "application/pdf" : "text/plain"),
        size: file.size,
        blob: file,
        ocrStatus: "done",
        createdAt: Date.now(),
      });

      // Semantic chunking with formulas & AST
      const subjectId = "academic_general";
      const chunks = chunkAcademicText(sourceId, subjectId, extractedText, 1);

      if (chunks.length > 0) {
        await db.academicChunks.bulkPut(chunks);
      }

      const docType: AcademicSourceRecord["documentType"] =
        ext === "pdf" ? "textbook" : ext === "md" ? "lecture_notes" : "paper";

      const newSource: AcademicSourceRecord = {
        id: sourceId,
        subjectId,
        professorId: "Cátedra Universitaria",
        career: careerDefault,
        year: 2026,
        semester: "1C",
        title: rawTitle,
        documentType: docType,
        pageCount,
        fileId,
        ocrProcessed: true,
        chunkCount: chunks.length,
        createdAt: Date.now(),
      };

      await db.academicSources.put(newSource);

      // Attempt background backend sync if server is reachable (fail-safe)
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("title", rawTitle);
        formData.append("subject", subjectId);
        formData.append("totalPages", String(pageCount));
        void fetch("/api/academic/sources/ingest", {
          method: "POST",
          body: formData,
        }).catch(() => {});
      } catch {
        // Ignore backend errors; local-first is already persisted
      }

      setProgressPct(100);
      setStep("success");
      onSourceIngested(newSource);

      setTimeout(() => {
        setStep("idle");
        setProgressPct(0);
        setCurrentFilename(null);
      }, 2500);
    } catch (err: unknown) {
      console.error("Error al procesar archivo:", err);
      setStep("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al procesar el documento");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void processFile(files[0]);
    }
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.md,.txt,.docx,application/pdf,text/markdown,text/plain"
        onChange={handleFileSelect}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => step === "idle" && fileInputRef.current?.click()}
        className={`group relative flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center ${
          isDragging
            ? "border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-500/10 scale-[1.01]"
            : step === "error"
              ? "border-rose-500/60 bg-rose-950/10"
              : step === "success"
                ? "border-emerald-500/60 bg-emerald-950/10"
                : "border-slate-800 hover:border-cyan-500/50 bg-slate-900/40 hover:bg-slate-900/80"
        }`}
      >
        {step === "idle" && (
          <>
            <div className="p-2 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 mb-2 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="font-display font-semibold text-xs text-slate-200">
                Arrastra tu PDF / Apunte aquí
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                o haz clic para explorar (.pdf, .md, .txt)
              </span>
            </div>
          </>
        )}

        {step === "reading" && (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            <span className="text-[11px] font-mono text-cyan-300">
              Leyendo {currentFilename}...
            </span>
          </div>
        )}

        {step === "extracting" && (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
            <span className="text-[11px] font-mono text-purple-300">
              Extrayendo texto y fórmulas...
            </span>
          </div>
        )}

        {step === "indexing" && (
          <div className="flex flex-col items-center gap-2 py-1">
            <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
            <span className="text-[11px] font-mono text-amber-300">
              Segmentación AST y Chunks...
            </span>
          </div>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center gap-1.5 py-1 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="text-[11px] font-mono font-bold">
              ¡Documento Ingestado Exitosamente!
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
              {currentFilename}
            </span>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-1 py-1 text-rose-400">
            <AlertCircle className="w-5 h-5" />
            <span className="text-[11px] font-mono font-bold">Error en la ingesta</span>
            <span className="text-[10px] text-slate-400">{errorMessage}</span>
          </div>
        )}

        {/* Progress Bar */}
        {step !== "idle" && step !== "error" && (
          <div className="w-full bg-slate-950 rounded-full h-1.5 mt-2.5 overflow-hidden border border-slate-800">
            <div
              className="bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 h-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 px-1">
        <span className="flex items-center gap-1">
          <FileText className="w-3 h-3 text-cyan-400" /> Formatos: PDF, MD, TXT
        </span>
        <span>Local-First OCR</span>
      </div>
    </div>
  );
};
