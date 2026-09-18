import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Link2, Hash, BookOpen, Check, Copy, ArrowRight, Layers } from "lucide-react";

export interface ZettelkastenMethodProps {
  onSessionFinished?: () => void;
}

interface ZettelNote {
  id: string;
  title: string;
  content: string;
  source: string;
  links: string[];
  tags: string[];
  createdAt: number;
}

export const ZettelkastenMethod: React.FC<ZettelkastenMethodProps> = ({ onSessionFinished }) => {
  // Generar ID Zettelkasten canónico tipo timestamp (ej. 202609182005)
  const generateZettelId = () => {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
  };

  const [zettelId, setZettelId] = useState(generateZettelId());
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("");
  const [savedNotes, setSavedNotes] = useState<ZettelNote[]>([]);
  const [copiedId, setCopiedId] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Extracción reactiva de links [[wiki]] y tags #etiqueta
  const detectedLinks: string[] = Array.from(
    new Set((content.match(/\[\[(.*?)\]\]/g) || []).map((m) => m.slice(2, -2).trim()))
  );
  const detectedTags: string[] = Array.from(
    new Set((content.match(/#[a-zA-Z0-9_\u00C0-\u017F]+/g) || []).map((t) => t.trim()))
  );

  const handleCopyId = () => {
    navigator.clipboard.writeText(`[[${zettelId} - ${title || "Nota"}]]`);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveZettel = async () => {
    if (!title.trim() || !content.trim()) return;

    const newNote: ZettelNote = {
      id: zettelId,
      title: title.trim(),
      content: content.trim(),
      source: source.trim(),
      links: detectedLinks,
      tags: detectedTags,
      createdAt: Date.now(),
    };

    setSavedNotes((prev) => [newNote, ...prev]);

    await saveStudySession({
      id: `zettel_${Date.now()}`,
      methodId: "zettelkasten",
      subject: "Zettelkasten Académico",
      topic: `${zettelId}: ${title.trim()}`,
      durationMinutes: 20,
      notes: `ID: ${zettelId}\nFUENTE: ${source}\nTAGS: ${detectedTags.join(", ")}\nENLACES: ${detectedLinks.join(", ")}\n\n${content.trim()}`,
      completedAt: Date.now(),
    });

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      // Preparar siguiente nota
      setZettelId(generateZettelId());
      setTitle("");
      setContent("");
      setSource("");
    }, 1200);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <Card elevated className="p-5 flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle pb-3">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-serif text-lg">Zettelkasten Académico</CardTitle>
              <Badge variant="accent">Notas Atómicas & Red</Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Principio de atomicidad: una sola idea nuclear por ficha, enlazada bidireccionalmente con la sintaxis [[Título]].
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono bg-bg-primary border border-border-subtle px-2.5 py-1 rounded text-text-primary">
              ID: {zettelId}
            </span>
            <Button variant="outline" size="sm" onClick={handleCopyId} className="text-xs flex items-center gap-1">
              <Copy className="h-3 w-3" />
              <span>{copiedId ? "Copiado" : "Copiar Enlace"}</span>
            </Button>
          </div>
        </div>

        {/* Metadatos de la Nota Atómica */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="text-text-secondary font-medium block mb-1">Título de la Idea Atómica:</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ej: Potencial de Acción como Fenómeno Todo o Nada"
            />
          </div>
          <div>
            <label className="text-text-secondary font-medium block mb-1">Fuente Bibliográfica o Cátedra:</label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="ej: Kandel - Principios de Neurociencia, Cap. 7"
            />
          </div>
        </div>
      </Card>

      {/* Editor Zettelkasten */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Panel de Escritura (8 cols) */}
        <Card elevated className="md:col-span-8 p-5 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-text-primary flex items-center gap-1.5">
              <BookOpen className="h-3.5 w-3.5 text-accent-primary" />
              Contenido de la Ficha (Markdown)
            </span>
            <span className="text-[11px] text-text-muted">
              Usa [[Enlace]] para conectar y #tag para categorizar
            </span>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribí la idea conceptual de forma autónoma...&#10;&#10;Ejemplo:&#10;El potencial de acción responde a la [[Ley del Todo o Nada]]. Si la despolarización inicial alcanza el umbral de -55mV, los canales de Na+ dependientes de voltaje se abren masivamente.&#10;&#10;Véase también: [[Período Refractario Absoluto]]&#10;#neurofisiologia #biofisica"
            className="w-full text-xs font-mono leading-relaxed resize-none p-3 min-h-[280px] bg-bg-primary"
          />

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-[11px] text-text-muted">
              {content.length} caracteres • {detectedLinks.length} enlaces wiki • {detectedTags.length} tags
            </span>

            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveZettel}
              disabled={savedSuccess || !title.trim() || !content.trim()}
              className="text-xs flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  <span>Ficha Registrada</span>
                </>
              ) : (
                <>
                  <span>Guardar Nota Atómica</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Panel Lateral: Vínculos Semánticos & Tags (4 cols) */}
        <div className="md:col-span-4 space-y-4">
          {/* Tarjeta de Enlaces Detectados */}
          <Card className="p-4 border-border-subtle bg-bg-surface-2 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Link2 className="h-3.5 w-3.5 text-accent-primary" />
              <span>Conexiones de Red ([[...]])</span>
            </div>
            {detectedLinks.length === 0 ? (
              <p className="text-[11px] text-text-muted italic">
                Escribí [[Nombre de concepto]] en el texto para enlazar esta nota con otras en el grafo.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detectedLinks.map((link) => (
                  <Badge key={link} variant="accent">
                    [[{link}]]
                  </Badge>
                ))}
              </div>
            )}
          </Card>

          {/* Tarjeta de Etiquetas Detectadas */}
          <Card className="p-4 border-border-subtle bg-bg-surface-2 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
              <Hash className="h-3.5 w-3.5 text-accent-primary" />
              <span>Etiquetas Temáticas</span>
            </div>
            {detectedTags.length === 0 ? (
              <p className="text-[11px] text-text-muted italic">
                Escribí #etiqueta para agrupar esta nota por dominio.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detectedTags.map((tag) => (
                  <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Historial de Fichas creadas en esta sesión */}
      {savedNotes.length > 0 && (
        <div className="space-y-3 pt-2">
          <h4 className="font-serif text-sm font-semibold text-text-primary flex items-center gap-1.5">
            <Layers className="h-4 w-4 text-accent-primary" />
            <span>Fichas Creadas en esta Sesión ({savedNotes.length})</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {savedNotes.map((note) => (
              <Card key={note.id} className="p-4 border-border-subtle space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[11px] text-accent-primary font-bold">
                    {note.id}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <h5 className="font-serif text-xs font-bold text-text-primary">{note.title}</h5>
                <p className="text-[11px] text-text-secondary line-clamp-3 font-mono">
                  {note.content}
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {note.links.map((l) => (
                    <Badge key={l} variant="accent" className="text-[10px]">
                      [[{l}]]
                    </Badge>
                  ))}
                  {note.tags.map((t) => (
                    <Badge key={t} variant="neutral" className="text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" size="sm" onClick={() => onSessionFinished?.()} className="text-xs">
          Finalizar Sesión y Volver al Catálogo
        </Button>
      </div>
    </div>
  );
};
