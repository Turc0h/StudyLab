import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Globe,
  Headphones,
  Edit3,
} from "lucide-react";
import { db, type AcademicSourceRecord } from "../../../db/db";
import { isDesktop } from "../../../platform";
import {
  pdfAdapter,
  pastedTextAdapter,
  webPageAdapter,
  transcriptAdapter,
} from "../sourceIngestAdapters";

interface AcademicFileUploaderProps {
  onSourceIngested: (source: AcademicSourceRecord) => void;
  careerDefault?: string;
}

type TabType = "file" | "paste" | "web" | "transcript";
type IngestStep = "idle" | "reading" | "extracting" | "indexing" | "success" | "error";

export const AcademicFileUploader: React.FC<AcademicFileUploaderProps> = ({
  onSourceIngested,
  careerDefault = "Ingeniería / Ciencias",
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("file");
  const [isDragging, setIsDragging] = useState(false);
  const [step, setStep] = useState<IngestStep>("idle");
  const [progressPct, setProgressPct] = useState(0);
  const [currentFilename, setCurrentFilename] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states for non-file ingestion
  const [pastedTitle, setPastedTitle] = useState("");
  const [pastedContent, setPastedContent] = useState("");

  const [webUrl, setWebUrl] = useState("");
  const [webTitle, setWebTitle] = useState("");

  const [transcriptTitle, setTranscriptTitle] = useState("");
  const [transcriptContent, setTranscriptContent] = useState("");

  // Listen to native Tauri OS drag & drop events (Windows Explorer)
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        const { getCurrentWebview } = await import("@tauri-apps/api/webview");
        unlisten = await getCurrentWebview().onDragDropEvent(async (event) => {
          if (event.payload.type === "over" || event.payload.type === "enter") {
            setIsDragging(true);
          } else if (event.payload.type === "leave") {
            setIsDragging(false);
          } else if (event.payload.type === "drop") {
            setIsDragging(false);
            if (event.payload.paths && event.payload.paths.length > 0) {
              const filePath = event.payload.paths[0];
              const name = filePath.split(/[/\\]/).pop() || "documento.pdf";
              try {
                const { readFileBytes } = await import("../../../platform");
                const bytes = await readFileBytes(filePath);
                let blob: Blob;
                if (bytes) {
                  blob = new Blob([bytes.buffer as ArrayBuffer], {
                    type: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
                  });
                } else {
                  const { convertFileSrc } = await import("@tauri-apps/api/core");
                  const assetUrl = convertFileSrc(filePath);
                  const resp = await fetch(assetUrl);
                  blob = await resp.blob();
                }
                const file = new File([blob], name, {
                  type: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : blob.type,
                });
                void processFile(file);
              } catch (err) {
                console.error("Error al leer archivo arrastrado en Tauri:", err);
                setStep("error");
                setErrorMessage("No se pudo leer el archivo arrastrado.");
              }
            }
          }
        });
      } catch (err) {
        console.warn("Tauri drag-drop listener no pudo registrarse:", err);
      }
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  // 1. Process File (PDF, MD, TXT)
  const processFile = async (file: File) => {
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (file.size === 0) {
      setStep("error");
      setErrorMessage("El archivo seleccionado está vacío (0 bytes).");
      return;
    }
    setCurrentFilename(file.name);
    setErrorMessage(null);
    setStep("reading");
    setProgressPct(20);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      if (ext === "pdf" || file.type === "application/pdf") {
        setStep("extracting");
        const res = await pdfAdapter({
          file,
          career: careerDefault,
          onProgress: (pct) => setProgressPct(pct),
        });

        setStep("indexing");
        setProgressPct(85);

        // Save blob in db.files
        if (res.source.fileId) {
          await db.files.put({
            id: res.source.fileId,
            folderId: "academic_sources",
            name: file.name,
            mimeType: file.type || "application/pdf",
            size: file.size,
            blob: file,
            ocrStatus: "done",
            createdAt: Date.now(),
          });
        }

        if (res.chunks.length > 0) {
          await db.academicChunks.bulkPut(res.chunks);
        }
        await db.academicSources.put(res.source);

        setProgressPct(100);
        setStep("success");
        onSourceIngested(res.source);
      } else {
        // Text / Markdown
        setStep("extracting");
        setProgressPct(40);
        const text = await file.text();
        const res = await pastedTextAdapter({
          title: file.name.replace(/\.[^/.]+$/, ""),
          text,
          career: careerDefault,
        });

        setStep("indexing");
        setProgressPct(85);

        if (res.chunks.length > 0) {
          await db.academicChunks.bulkPut(res.chunks);
        }
        await db.academicSources.put(res.source);

        setProgressPct(100);
        setStep("success");
        onSourceIngested(res.source);
      }

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

  // Disparar selector de archivos (Nativo en Desktop vía plugin-dialog, HTML5 en Web)
  const handleOpenFilePicker = async () => {
    if (isDesktop()) {
      try {
        const { open } = await import("@tauri-apps/plugin-dialog");
        const selected = await open({
          title: "Seleccionar documento académico",
          multiple: false,
          directory: false,
          filters: [
            {
              name: "Documentos Académicos (*.pdf, *.md, *.txt, *.docx)",
              extensions: ["pdf", "md", "txt", "docx"],
            },
            {
              name: "Todos los archivos",
              extensions: ["*"],
            },
          ],
        });

        if (!selected) {
          // Usuario canceló el diálogo — retorno limpio sin bloquear UI
          return;
        }

        const filePath = typeof selected === "string" ? selected : selected[0];
        if (!filePath) return;

        const name = filePath.split(/[/\\]/).pop() || "documento.pdf";
        const { readFileBytes } = await import("../../../platform");
        const bytes = await readFileBytes(filePath);
        let blob: Blob;
        if (bytes) {
          blob = new Blob([bytes.buffer as ArrayBuffer], {
            type: name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "application/octet-stream",
          });
        } else {
          const { convertFileSrc } = await import("@tauri-apps/api/core");
          const assetUrl = convertFileSrc(filePath);
          const resp = await fetch(assetUrl);
          blob = await resp.blob();
        }
        const file = new File([blob], name, { type: blob.type });
        void processFile(file);
      } catch (err) {
        console.error("Error abriendo diálogo nativo de Tauri:", err);
        fileInputRef.current?.click();
      }
    } else {
      fileInputRef.current?.click();
    }
  };

  // 2. Process Pasted Text
  const handleIngestPastedText = async () => {
    if (!pastedContent.trim()) return;
    setStep("extracting");
    setProgressPct(40);
    setErrorMessage(null);

    try {
      const res = await pastedTextAdapter({
        title: pastedTitle || "Apunte Personal de Cátedra",
        text: pastedContent,
        career: careerDefault,
      });

      setStep("indexing");
      setProgressPct(80);

      if (res.chunks.length > 0) {
        await db.academicChunks.bulkPut(res.chunks);
      }
      await db.academicSources.put(res.source);

      setProgressPct(100);
      setStep("success");
      onSourceIngested(res.source);
      setPastedContent("");
      setPastedTitle("");

      setTimeout(() => {
        setStep("idle");
        setProgressPct(0);
      }, 2500);
    } catch (err: unknown) {
      setStep("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al procesar el texto pegado");
    }
  };

  // 3. Process Web Page URL
  const handleIngestWebPage = async () => {
    if (!webUrl.trim()) return;
    setStep("reading");
    setProgressPct(30);
    setErrorMessage(null);

    try {
      let htmlOrText = "";
      try {
        const response = await fetch(webUrl);
        if (response.ok) {
          htmlOrText = await response.text();
        }
      } catch {
        // If CORS blocks fetch, process with URL anchor
      }

      setStep("extracting");
      setProgressPct(60);

      const res = await webPageAdapter({
        url: webUrl,
        title: webTitle,
        rawHtmlOrText: htmlOrText,
        career: careerDefault,
      });

      setStep("indexing");
      setProgressPct(85);

      if (res.chunks.length > 0) {
        await db.academicChunks.bulkPut(res.chunks);
      }
      await db.academicSources.put(res.source);

      setProgressPct(100);
      setStep("success");
      onSourceIngested(res.source);
      setWebUrl("");
      setWebTitle("");

      setTimeout(() => {
        setStep("idle");
        setProgressPct(0);
      }, 2500);
    } catch (err: unknown) {
      setStep("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al procesar la página web");
    }
  };

  // 4. Process Transcript (.srt or timestamped text)
  const handleIngestTranscript = async () => {
    if (!transcriptContent.trim()) return;
    setStep("extracting");
    setProgressPct(50);
    setErrorMessage(null);

    try {
      const res = await transcriptAdapter({
        title: transcriptTitle || "Transcripción de Clase",
        content: transcriptContent,
        career: careerDefault,
      });

      setStep("indexing");
      setProgressPct(85);

      if (res.chunks.length > 0) {
        await db.academicChunks.bulkPut(res.chunks);
      }
      await db.academicSources.put(res.source);

      setProgressPct(100);
      setStep("success");
      onSourceIngested(res.source);
      setTranscriptContent("");
      setTranscriptTitle("");

      setTimeout(() => {
        setStep("idle");
        setProgressPct(0);
      }, 2500);
    } catch (err: unknown) {
      setStep("error");
      setErrorMessage(err instanceof Error ? err.message : "Error al procesar la transcripción");
    }
  };

  return (
    <div className="w-full flex flex-col gap-2.5">
      {/* Source Ingestion Tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle pb-1.5 text-[11px] font-mono">
        <button
          type="button"
          onClick={() => setActiveTab("file")}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
            activeTab === "file"
              ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <FileText className="h-3 w-3" />
          <span>PDF / Doc</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("paste")}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
            activeTab === "paste"
              ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Edit3 className="h-3 w-3" />
          <span>Pegar Texto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("web")}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
            activeTab === "web"
              ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Globe className="h-3 w-3" />
          <span>Página Web</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("transcript")}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-all cursor-pointer ${
            activeTab === "transcript"
              ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
              : "text-text-tertiary hover:text-text-secondary"
          }`}
        >
          <Headphones className="h-3 w-3" />
          <span>Clase (.srt)</span>
        </button>
      </div>

      {/* Tab 1: File Dropzone */}
      {activeTab === "file" && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.md,.txt,.docx,application/pdf,text/markdown,text/plain"
            onChange={(e) => {
              const files = e.target.files;
              if (files && files.length > 0) void processFile(files[0]);
            }}
            className="hidden"
          />
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              const files = e.dataTransfer.files;
              if (files && files.length > 0) void processFile(files[0]);
            }}
            onClick={() => void handleOpenFilePicker()}
            className={`group relative flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer ${
              isDragging
                ? "border-accent-primary bg-accent-primary/10 scale-[0.99]"
                : "border-border-subtle bg-bg-surface-2/40 hover:border-accent-primary/50 hover:bg-bg-surface-2/80"
            }`}
          >
            <UploadCloud className="h-6 w-6 text-text-tertiary group-hover:text-accent-primary transition-colors mb-1.5" />
            <span className="font-display font-semibold text-xs text-text-primary text-center">
              Arrastrá acá o tocá para subir
            </span>
            <span className="text-[10px] text-text-tertiary font-mono mt-0.5">
              PDF, Markdown, TXT (hasta 500 pág.)
            </span>
          </div>
        </>
      )}

      {/* Tab 2: Pasted Text */}
      {activeTab === "paste" && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border-subtle bg-bg-surface-2/40 text-xs">
          <input
            type="text"
            placeholder="Título del apunte (ej: Teorema de Gauss - Clase 4)"
            value={pastedTitle}
            onChange={(e) => setPastedTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-sans text-text-primary focus:outline-hidden focus:border-accent-primary text-xs"
          />
          <textarea
            rows={4}
            placeholder="Pegá tus apuntes de clase en texto plano o markdown acá..."
            value={pastedContent}
            onChange={(e) => setPastedContent(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-mono text-xs text-text-primary focus:outline-hidden focus:border-accent-primary resize-none"
          />
          <button
            type="button"
            onClick={handleIngestPastedText}
            disabled={!pastedContent.trim() || step !== "idle"}
            className="w-full py-1.5 rounded-lg bg-accent-primary text-bg-surface-1 font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer"
          >
            Indexar Apunte Directo
          </button>
        </div>
      )}

      {/* Tab 3: Web URL */}
      {activeTab === "web" && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border-subtle bg-bg-surface-2/40 text-xs">
          <input
            type="text"
            placeholder="Título opcional (ej: Guía de Teoremas de Circuitos)"
            value={webTitle}
            onChange={(e) => setWebTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-sans text-text-primary focus:outline-hidden focus:border-accent-primary text-xs"
          />
          <input
            type="url"
            placeholder="https://catedra.universidad.edu.ar/apunte.html"
            value={webUrl}
            onChange={(e) => setWebUrl(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-mono text-xs text-text-primary focus:outline-hidden focus:border-accent-primary"
          />
          <button
            type="button"
            onClick={handleIngestWebPage}
            disabled={!webUrl.trim() || step !== "idle"}
            className="w-full py-1.5 rounded-lg bg-accent-primary text-bg-surface-1 font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer"
          >
            Extraer e Indexar Artículo Web
          </button>
        </div>
      )}

      {/* Tab 4: Class Transcript */}
      {activeTab === "transcript" && (
        <div className="flex flex-col gap-2 p-3 rounded-xl border border-border-subtle bg-bg-surface-2/40 text-xs">
          <input
            type="text"
            placeholder="Título de la clase (ej: Teórica 07 - Magnetostática)"
            value={transcriptTitle}
            onChange={(e) => setTranscriptTitle(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-sans text-text-primary focus:outline-hidden focus:border-accent-primary text-xs"
          />
          <textarea
            rows={4}
            placeholder="Pegá el contenido .srt o líneas con marcas de tiempo [mm:ss]..."
            value={transcriptContent}
            onChange={(e) => setTranscriptContent(e.target.value)}
            className="w-full p-2.5 rounded-lg border border-border-subtle bg-bg-surface-1 font-mono text-xs text-text-primary focus:outline-hidden focus:border-accent-primary resize-none"
          />
          <button
            type="button"
            onClick={handleIngestTranscript}
            disabled={!transcriptContent.trim() || step !== "idle"}
            className="w-full py-1.5 rounded-lg bg-accent-primary text-bg-surface-1 font-semibold text-xs transition-all disabled:opacity-40 cursor-pointer"
          >
            Indexar Transcripción de Clase
          </button>
        </div>
      )}

      {/* Progress / Status Feedback */}
      {step !== "idle" && (
        <div className="flex flex-col gap-1.5 p-2.5 rounded-xl border border-border-subtle bg-bg-surface-2 text-xs font-mono">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-text-primary">
              {step === "reading" && <Loader2 className="h-3 w-3 animate-spin text-accent-primary" />}
              {step === "extracting" && <Loader2 className="h-3 w-3 animate-spin text-accent-primary" />}
              {step === "indexing" && <Loader2 className="h-3 w-3 animate-spin text-accent-primary" />}
              {step === "success" && <CheckCircle2 className="h-3 w-3 text-success" />}
              {step === "error" && <AlertCircle className="h-3 w-3 text-danger" />}
              <span className="truncate max-w-[220px]">
                {currentFilename ? `${currentFilename}: ` : ""}
                {step === "reading" && "Leyendo fuente..."}
                {step === "extracting" && "Extrayendo bloques y fórmulas..."}
                {step === "indexing" && "Generando embeddings locales..."}
                {step === "success" && "¡Material indexado con éxito!"}
                {step === "error" && "Error en la ingesta"}
              </span>
            </span>
            <span className="text-[10px] text-text-tertiary">{progressPct}%</span>
          </div>

          <div className="w-full h-1 bg-bg-surface-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                step === "error" ? "bg-danger" : step === "success" ? "bg-success" : "bg-accent-primary"
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {errorMessage && (
            <p className="text-[10px] text-danger mt-1 leading-snug">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
};
