import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";
import { Textarea } from "../ui/Input";
import { Badge } from "../ui/Badge";
import { saveOcrRecord, savePdfDocument } from "../../lib/db";
import {
  Upload,
  Copy,
  CheckCircle2,
  ScanText,
  FileDown,
  BookOpen,
  FileText,
  Volume2,
} from "lucide-react";
import {
  processFileWithOcr,
  exportOcrResultAsPdf,
  type OcrProcessResult,
  type PdfExportMode,
} from "../../features/ocr/ocrPdfHelper";
import { useSpeechReader } from "../../hooks/useSpeechReader";
import { VoiceReaderControls } from "../speech/VoiceReaderControls";
import { LatexMathToolbar } from "../latex/LatexMathToolbar";
import { LatexMathViewer } from "../latex/LatexMathViewer";
import { autoFormatMathToLatex } from "../../lib/latexHelper";

export const ClientOcr: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [ocrResult, setOcrResult] = useState<OcrProcessResult | null>(null);
  const [savedToLibrary, setSavedToLibrary] = useState<boolean>(false);
  const [isFormulaView, setIsFormulaView] = useState<boolean>(false);

  // Hook de síntesis de voz (Text-to-speech)
  const speechReader = useSpeechReader();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setExtractedText("");
    setOcrResult(null);
    setProgress(0);
    setSavedToLibrary(false);
    speechReader.stop();

    if (file.type.startsWith("image/")) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRunOcr = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setStatusText("Iniciando digitalización...");
    setProgress(5);
    speechReader.stop();

    try {
      const result = await processFileWithOcr(selectedFile, (msg, pct) => {
        setStatusText(msg);
        setProgress(pct);
      });

      setOcrResult(result);
      setExtractedText(result.fullText);
      if (result.firstPagePreview) {
        setPreviewUrl(result.firstPagePreview);
      }

      await saveOcrRecord({
        id: `ocr_${Date.now()}`,
        fileName: selectedFile.name,
        extractedText: result.fullText,
        confidence: result.confidence,
        createdAt: Date.now(),
      });

      setStatusText("Extracción concluida y guardada localmente.");
      setProgress(100);
    } catch (err) {
      console.error("Error en OCR:", err);
      setStatusText("Ocurrió un error al procesar el archivo. Verifica el formato.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToPdfViewer = async () => {
    if (!selectedFile || !extractedText) return;
    try {
      const isPdf = selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf");
      
      // Si es un PDF, guardar el blob original; si es imagen, crear un archivo legible
      const docBlob = isPdf
        ? selectedFile
        : new Blob([extractedText], { type: "text/plain" });

      await savePdfDocument({
        id: `doc_${Date.now()}`,
        title: selectedFile.name.replace(/\.[^/.]+$/, ""),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        totalPages: ocrResult?.totalPages || 1,
        blob: docBlob,
        uploadedAt: Date.now(),
      });

      setSavedToLibrary(true);
      setTimeout(() => setSavedToLibrary(false), 3000);
    } catch (err) {
      console.error("Error al guardar en el visor:", err);
    }
  };

  const handleDownloadTxt = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedFile?.name.replace(/\.[^/.]+$/, "") || "documento"}_digitalizado.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = (mode: PdfExportMode = "overlay") => {
    if (!ocrResult) return;
    exportOcrResultAsPdf(ocrResult, mode);
  };

  const handleInsertSnippet = (snippet: string) => {
    setExtractedText((prev) => (prev ? `${prev}\n${snippet}` : snippet));
  };

  const handleAutoFormatMath = () => {
    if (!extractedText) return;
    const formatted = autoFormatMathToLatex(extractedText);
    setExtractedText(formatted);
    setIsFormulaView(true);
  };

  return (
    <Card elevated className="flex flex-col gap-6 pb-6">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Digitalización OCR y Lectura de Archivos</CardTitle>
            <span className="text-xs text-text-secondary">
              Reconocimiento de caracteres para PDFs con fotos/escaneos e imágenes. Procesamiento 100% local con Tesseract.js y síntesis de voz.
            </span>
          </div>
          {ocrResult && (
            <div className="flex items-center gap-2">
              <Badge variant={ocrResult.isScannedPdf ? "warning" : "accent"}>
                {ocrResult.isScannedPdf ? "PDF Escaneado (con fotos)" : "Documento procesado"}
              </Badge>
              <Badge variant="neutral">Confianza: {ocrResult.confidence}%</Badge>
            </div>
          )}
        </div>
      </CardHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Columna Izquierda: Carga de archivo y Vista previa */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center p-8 rounded border-2 border-dashed border-border-subtle bg-bg-secondary cursor-pointer hover:border-accent-primary transition-colors text-center">
            <input
              type="file"
              accept="image/*,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-8 w-8 text-text-muted mb-2" />
            <span className="font-serif text-sm font-semibold text-text-primary">
              Selecciona un PDF (con fotos/escaneado) o una Imagen
            </span>
            <span className="font-sans text-xs text-text-muted mt-1">
              PDF, PNG, JPG, JPEG, WEBP • Múltiples páginas soportadas
            </span>
            {selectedFile && (
              <span className="mt-3 px-2 py-1 rounded bg-bg-elevated border border-border-subtle text-xs font-mono text-accent-primary max-w-xs truncate">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </label>

          {previewUrl && (
            <div className="rounded border border-border-subtle bg-bg-secondary p-3 max-h-72 overflow-hidden flex flex-col items-center justify-center">
              <span className="text-[11px] text-text-muted mb-2 font-sans">
                Vista previa {ocrResult ? `(Pág. 1 de ${ocrResult.totalPages})` : ""}
              </span>
              <img
                src={previewUrl}
                alt="Vista previa de documento"
                className="max-h-56 object-contain rounded border border-border-subtle shadow-xs"
              />
            </div>
          )}

          <Button
            onClick={handleRunOcr}
            disabled={!selectedFile || isProcessing}
            className="gap-2 w-full justify-center"
          >
            <ScanText className="h-4 w-4" />
            <span>
              {isProcessing
                ? "Procesando páginas y extrayendo texto..."
                : "Digitalizar y Reconocer Caracteres (OCR)"}
            </span>
          </Button>

          {isProcessing && (
            <div className="flex flex-col gap-1.5 p-3 rounded bg-bg-secondary border border-border-subtle">
              <div className="flex justify-between text-xs font-sans text-text-secondary">
                <span>{statusText}</span>
                <span className="font-mono font-semibold">{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Acciones de exportación y guardado cuando hay resultado */}
          {ocrResult && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPdf("overlay")}
                className="gap-1.5 text-xs"
                title="Conserva la foto original con texto seleccionable posicionado encima"
              >
                <FileDown className="h-3.5 w-3.5" />
                <span>PDF con Diseño Original</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportPdf("text-only")}
                className="gap-1.5 text-xs"
                title="Exporta como documento de texto limpio, estructurado por párrafos y títulos"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF Texto Formateado</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadTxt}
                className="gap-1.5 text-xs"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Descargar .TXT</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleSaveToPdfViewer}
                className="gap-1.5 text-xs"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>{savedToLibrary ? "✓ Guardado en Biblioteca" : "Guardar en Visor PDF"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Columna Derecha: Texto extraído y Reproductor de Voz */}
        <div className="flex flex-col gap-3">
          {/* Lector por voz integrado */}
          <VoiceReaderControls
            reader={speechReader}
            textToRead={extractedText}
            label="Lector de Texto por Voz"
          />

          {/* Barra de herramientas para LaTeX y fórmulas matemáticas */}
          {extractedText && (
            <LatexMathToolbar
              onInsertSnippet={handleInsertSnippet}
              onAutoFormat={handleAutoFormatMath}
              isFormulaView={isFormulaView}
              onToggleView={() => setIsFormulaView((v) => !v)}
              hasFormulas={extractedText.includes("$")}
            />
          )}

          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <label className="font-sans text-xs font-medium text-text-primary">
                {isFormulaView ? "Vista Previa de Fórmulas (KaTeX):" : "Texto Reconocido:"}
              </label>
              {extractedText.includes("$") && (
                <Badge variant="accent">Contiene LaTeX</Badge>
              )}
            </div>

            {extractedText && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs">
                  {copied ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>{copied ? "Copiado" : "Copiar"}</span>
                </Button>
              </div>
            )}
          </div>

          {isFormulaView ? (
            <LatexMathViewer content={extractedText} className="min-h-[300px]" />
          ) : (
            <Textarea
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              rows={14}
              placeholder="El texto digitalizado de las fotos o páginas del PDF aparecerá aquí. Podrás editarlo, copiarlo, exportarlo o escucharlo por voz..."
              className="font-sans text-xs leading-relaxed resize-y font-mono"
            />
          )}

          {extractedText && (
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <Volume2 className="h-3.5 w-3.5 text-accent-primary" />
              <span>
                Tip: Haz clic en <strong>Escuchar</strong> arriba para reproducir el texto en voz alta con la velocidad que prefieras.
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};
