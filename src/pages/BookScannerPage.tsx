import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Badge } from "../components/ui/Badge";
import { Progress } from "../components/ui/Progress";
import {
  BookOpen,
  Upload,
  FolderPlus,
  CheckCircle2,
  Trash2,
  Plus,
  FileDown,
  Sparkles,
  Layers,
  FolderOpen,
  FileText,
} from "lucide-react";
import {
  detectBookChapters,
  splitAndStoreBookChapters,
  type ChapterPlan,
  type SplitBookResult,
} from "../features/books/bookSplitter";

export const BookScannerPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bookTitle, setBookTitle] = useState<string>("");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [isSplitting, setIsSplitting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusText, setStatusText] = useState<string>("");
  const [detectionMethod, setDetectionMethod] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(0);

  // Lista de capítulos a revisar/editar antes del corte
  const [chapters, setChapters] = useState<ChapterPlan[]>([]);

  // Resultado final tras procesar y guardar en carpetas
  const [splitResult, setSplitResult] = useState<SplitBookResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setBookTitle(cleanName);
    setChapters([]);
    setSplitResult(null);
    setProgress(0);
    setStatusText("");
  };

  const handleAnalyzeBook = async () => {
    if (!selectedFile) return;
    setIsAnalyzing(true);
    setProgress(10);
    setStatusText("Iniciando análisis del libro...");

    try {
      const result = await detectBookChapters(selectedFile, (msg, pct) => {
        setStatusText(msg);
        setProgress(pct);
      });

      setChapters(result.chapters);
      setTotalPages(result.totalPages);
      setDetectionMethod(result.detectedMethod);
    } catch (err) {
      console.error("Error al analizar capítulos del libro:", err);
      setStatusText("Ocurrió un error al analizar el documento.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateChapter = (
    id: string,
    field: keyof ChapterPlan,
    value: string | number,
  ) => {
    setChapters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)),
    );
  };

  const handleAddChapter = () => {
    const last = chapters[chapters.length - 1];
    const newStart = last ? last.endPage + 1 : 1;
    const newEnd = Math.min(newStart + 15, totalPages || 100);

    const newChap: ChapterPlan = {
      id: `chap_${Date.now()}`,
      title: `Capítulo ${chapters.length + 1}: Nueva Unidad`,
      startPage: newStart,
      endPage: newEnd,
    };
    setChapters((prev) => [...prev, newChap]);
  };

  const handleDeleteChapter = (id: string) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
  };

  const handleExecuteSplit = async () => {
    if (!selectedFile || chapters.length === 0) return;
    setIsSplitting(true);
    setProgress(5);
    setStatusText("Iniciando separación y guardado en carpetas...");

    try {
      const result = await splitAndStoreBookChapters(
        selectedFile,
        chapters,
        bookTitle,
        (msg, pct) => {
          setStatusText(msg);
          setProgress(pct);
        },
      );

      setSplitResult(result);
    } catch (err) {
      console.error("Error al separar y guardar capítulos:", err);
      setStatusText("Error durante el corte del libro. Verifica los rangos de páginas.");
    } finally {
      setIsSplitting(false);
    }
  };

  const handleDownloadChapter = (blob: Blob, title: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Encabezado */}
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-accent-primary" />
          <span>Escanear y Desglosar Libros por Capítulos</span>
        </h1>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Sube un libro completo: StudyLab detecta automáticamente los capítulos, los divide en archivos independientes por unidad y los guarda en una carpeta organizada para estudiar sin saturar memoria.
        </p>
      </div>

      {/* Paso 1: Carga y Nombre del Libro */}
      <Card elevated className="flex flex-col gap-5 p-5">
        <CardHeader className="p-0">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent-primary" />
            <span>1. Cargar Libro y Nombrar Colección</span>
          </CardTitle>
        </CardHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col items-center justify-center p-6 rounded border-2 border-dashed border-border-subtle bg-bg-secondary cursor-pointer hover:border-accent-primary transition-colors text-center">
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="h-7 w-7 text-text-muted mb-2" />
            <span className="font-serif text-sm font-semibold text-text-primary">
              Selecciona el libro en formato PDF
            </span>
            <span className="font-sans text-xs text-text-muted mt-1">
              Libros de cátedra, manuales, fotocopias o apuntes largos
            </span>
            {selectedFile && (
              <span className="mt-2.5 px-2 py-0.5 rounded bg-bg-elevated border border-border-subtle text-xs font-mono text-accent-primary max-w-xs truncate">
                {selectedFile.name} ({(selectedFile.size / (1024 * 1024)).toFixed(1)} MB)
              </span>
            )}
          </label>

          <div className="flex flex-col justify-between gap-3">
            <div className="flex flex-col gap-2">
              <label className="font-sans text-xs font-medium text-text-primary">
                Nombre del Libro / Carpeta de Destino:
              </label>
              <Input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Ej: Física Universitaria - Sears Zemansky"
                className="text-xs"
              />
              <span className="font-sans text-[11px] text-text-muted">
                Se creará una carpeta con este nombre en tu gestor de archivos con todos los capítulos separados.
              </span>
            </div>

            <Button
              onClick={handleAnalyzeBook}
              disabled={!selectedFile || isAnalyzing || isSplitting}
              className="gap-2 w-full justify-center"
            >
              <Sparkles className="h-4 w-4" />
              <span>{isAnalyzing ? "Analizando estructura..." : "Identificar Capítulos Automáticamente"}</span>
            </Button>
          </div>
        </div>

        {(isAnalyzing || isSplitting) && (
          <div className="flex flex-col gap-1.5 p-3 rounded bg-bg-secondary border border-border-subtle">
            <div className="flex justify-between text-xs font-sans text-text-secondary">
              <span>{statusText}</span>
              <span className="font-mono font-semibold">{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </Card>

      {/* Paso 2: Revisión y Ajuste de Capítulos Detectados */}
      {chapters.length > 0 && !splitResult && (
        <Card elevated className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-accent-primary" />
                <span>2. Revisar y Ajustar Unidades Detectadas ({chapters.length})</span>
              </CardTitle>
              <span className="font-sans text-xs text-text-secondary">
                Método: {detectionMethod} • Total: {totalPages} páginas
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleAddChapter} className="gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Capítulo</span>
              </Button>
            </div>
          </div>

          {/* Tabla de Capítulos */}
          <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
            {chapters.map((chap, idx) => {
              const pagesCount = Math.max(1, chap.endPage - chap.startPage + 1);
              return (
                <div
                  key={chap.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 rounded-md border border-border-subtle bg-bg-secondary/60 text-xs font-sans"
                >
                  <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
                    <span className="font-mono font-semibold text-text-muted w-6 text-center">
                      {idx + 1}.
                    </span>
                    <Input
                      value={chap.title}
                      onChange={(e) => handleUpdateChapter(chap.id, "title", e.target.value)}
                      className="text-xs flex-1"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <div className="flex items-center gap-1">
                      <span className="text-text-muted">Pág:</span>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={chap.startPage}
                        onChange={(e) =>
                          handleUpdateChapter(chap.id, "startPage", parseInt(e.target.value) || 1)
                        }
                        className="w-14 px-1.5 py-1 text-xs rounded border border-border-subtle bg-bg-elevated text-center"
                      />
                      <span className="text-text-muted">a</span>
                      <input
                        type="number"
                        min={chap.startPage}
                        max={totalPages}
                        value={chap.endPage}
                        onChange={(e) =>
                          handleUpdateChapter(chap.id, "endPage", parseInt(e.target.value) || chap.startPage)
                        }
                        className="w-14 px-1.5 py-1 text-xs rounded border border-border-subtle bg-bg-elevated text-center"
                      />
                    </div>

                    <Badge variant="neutral" className="whitespace-nowrap">
                      {pagesCount} pág.
                    </Badge>

                    <button
                      type="button"
                      onClick={() => handleDeleteChapter(chap.id)}
                      className="text-text-muted hover:text-error transition-colors p-1"
                      title="Eliminar capítulo de la lista"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-3 border-t border-border-subtle flex justify-end">
            <Button
              onClick={handleExecuteSplit}
              disabled={isSplitting}
              className="gap-2 px-6 py-2.5 text-sm"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>
                {isSplitting
                  ? "Dividiendo libro y guardando..."
                  : `Separar en ${chapters.length} Archivos y Guardar en Carpeta`}
              </span>
            </Button>
          </div>
        </Card>
      )}

      {/* Paso 3: Resultado Final y Acceso Inmediato */}
      {splitResult && (
        <Card elevated className="flex flex-col gap-5 p-5 border-success/30 bg-success/5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-success/20 text-success flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-semibold text-text-primary">
                  ¡Libro desglosado con éxito!
                </h2>
                <p className="font-sans text-xs text-text-secondary">
                  Se crearon <strong>{splitResult.totalChapters} archivos independientes</strong> guardados en la carpeta local <strong>"{splitResult.folderName}"</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link to="/files">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Ver Carpeta en Archivos</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Lista de Capítulos Generados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {splitResult.chapters.map((chap) => (
              <div
                key={chap.id}
                className="p-3.5 rounded-lg border border-border-subtle bg-bg-elevated flex flex-col justify-between gap-3 hover:border-accent-primary/50 transition-colors shadow-2xs"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-serif text-sm font-semibold text-text-primary line-clamp-2">
                      {chap.title}
                    </span>
                    <Badge variant="accent" className="shrink-0 text-[10px]">
                      {chap.pageCount} pág.
                    </Badge>
                  </div>
                  <span className="font-sans text-[11px] text-text-muted mt-1 block">
                    Páginas {chap.startPage} a {chap.endPage} • {(chap.fileSize / 1024).toFixed(0)} KB
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border-subtle">
                  <Link to="/pdf">
                    <Button size="sm" variant="secondary" className="gap-1 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      <span>Abrir y Estudiar</span>
                    </Button>
                  </Link>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownloadChapter(chap.blob, chap.title)}
                    className="gap-1 text-xs text-text-secondary hover:text-text-primary"
                    title="Descargar este capítulo en PDF"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Descargar</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex justify-between items-center text-xs font-sans text-text-secondary">
            <span>
              Todos los capítulos están disponibles en el <strong>Anotador de PDF</strong> y en la sección de <strong>Archivos Universitarios</strong>.
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedFile(null);
                setChapters([]);
                setSplitResult(null);
              }}
            >
              Desglosar Otro Libro
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
