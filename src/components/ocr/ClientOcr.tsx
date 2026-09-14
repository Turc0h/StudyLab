import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";
import { Textarea } from "../ui/Input";
import { saveOcrRecord } from "../../lib/db";
import { createWorker } from "tesseract.js";
import { Upload, Copy, CheckCircle2, ScanText } from "lucide-react";

export const ClientOcr: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");
  const [extractedText, setExtractedText] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExtractedText("");
    setProgress(0);
  };

  const handleRunOcr = async () => {
    if (!imageFile) return;
    setIsProcessing(true);
    setStatusText("Iniciando motor OCR en cliente...");
    setProgress(10);

    try {
      const worker = await createWorker("spa");
      setStatusText("Analizando patrones ópticos y caracteres...");
      setProgress(40);

      const ret = await worker.recognize(imageFile);
      setProgress(90);

      setExtractedText(ret.data.text);
      await worker.terminate();

      await saveOcrRecord({
        id: `ocr_${Date.now()}`,
        fileName: imageFile.name,
        extractedText: ret.data.text,
        confidence: ret.data.confidence,
        createdAt: Date.now(),
      });

      setStatusText("Extracción concluida y guardada.");
      setProgress(100);
    } catch (err) {
      console.error("Error en OCR:", err);
      setStatusText("Ocurrió un error al procesar la imagen.");
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

  return (
    <Card elevated className="flex flex-col gap-6 pb-6">
      <CardHeader>
        <CardTitle>Extracción Óptica de Caracteres (OCR)</CardTitle>
        <span className="text-xs text-text-secondary">
          Motor Tesseract.js ejecutado en Web Worker local. Ningún dato viaja a servidores externos.
        </span>
      </CardHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Input file and preview */}
        <div className="flex flex-col gap-4">
          <label className="flex flex-col items-center justify-center p-8 rounded border-2 border-dashed border-border-subtle bg-bg-secondary cursor-pointer hover:border-accent-primary transition-colors text-center">
            <input type="file" accept="image/*,application/pdf" onChange={handleFileChange} className="hidden" />
            <Upload className="h-8 w-8 text-text-muted mb-2" />
            <span className="font-serif text-sm font-semibold text-text-primary">
              Selecciona una imagen o escaneo
            </span>
            <span className="font-sans text-xs text-text-muted mt-1">PNG, JPG, WEBP</span>
          </label>

          {previewUrl && (
            <div className="rounded border border-border-subtle bg-bg-secondary p-2 max-h-60 overflow-hidden flex items-center justify-center">
              <img src={previewUrl} alt="Vista previa de documento" className="max-h-52 object-contain" />
            </div>
          )}

          <Button onClick={handleRunOcr} disabled={!imageFile || isProcessing} className="gap-2">
            <ScanText className="h-4 w-4" />
            <span>{isProcessing ? "Extrayendo texto..." : "Ejecutar OCR local"}</span>
          </Button>

          {isProcessing && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-xs font-sans text-text-muted">
                <span>{statusText}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}
        </div>

        {/* Right: Extracted Text Result */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="font-sans text-xs font-medium text-text-primary">Texto Extraído:</label>
            {extractedText && (
              <Button variant="ghost" size="sm" onClick={handleCopy} className="gap-1 text-xs">
                {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copied ? "Copiado" : "Copiar texto"}</span>
              </Button>
            )}
          </div>

          <Textarea
            value={extractedText}
            onChange={(e) => setExtractedText(e.target.value)}
            rows={12}
            placeholder="El texto digitalizado aparecerá aquí para ser copiado o editado..."
            className="font-sans text-xs leading-relaxed"
          />
        </div>
      </div>
    </Card>
  );
};
