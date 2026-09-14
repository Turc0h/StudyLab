import React, { useState } from "react";
import { Card, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { Plus, Trash2, FolderTree } from "lucide-react";

interface NodeItem {
  id: string;
  title: string;
  parentId: string | null;
}

export interface MindMapMethodProps {
  onSessionFinished?: () => void;
}

export const MindMapMethod: React.FC<MindMapMethodProps> = ({ onSessionFinished }) => {
  const [rootTitle, setRootTitle] = useState<string>("Concepto Central");
  const [nodes, setNodes] = useState<NodeItem[]>([
    { id: "1", title: "Rama Principal 1: Fundamentos", parentId: null },
    { id: "2", title: "Rama Principal 2: Aplicaciones", parentId: null },
  ]);
  const [newChildText, setNewChildText] = useState<string>("");

  const addNode = (parentId: string | null) => {
    if (!newChildText.trim()) return;
    setNodes((prev) => [
      ...prev,
      { id: String(Date.now()), title: newChildText.trim(), parentId },
    ]);
    setNewChildText("");
  };

  const removeNode = (id: string) => {
    setNodes((prev) => prev.filter((n) => n.id !== id && n.parentId !== id));
  };

  const handleFinish = async () => {
    await saveStudySession({
      id: `mindmap_${Date.now()}`,
      methodId: "mind-maps",
      subject: "Estructura Conceptual",
      topic: rootTitle,
      durationMinutes: 30,
      notes: `Nodo central: ${rootTitle}\nElementos: ${nodes.map((n) => n.title).join(", ")}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      <CardHeader>
        <CardTitle>Organización Jerárquica y Mapas Conceptuales</CardTitle>
        <span className="text-xs text-text-secondary">
          Estructura árboles lógicos para conectar ideas supraordinadas y subordinadas
        </span>
      </CardHeader>

      <div className="flex flex-col gap-2">
        <label className="font-sans text-xs font-medium text-text-primary">Nodo Central:</label>
        <Input value={rootTitle} onChange={(e) => setRootTitle(e.target.value)} />
      </div>

      <div className="rounded border border-border-subtle bg-bg-secondary p-4 flex flex-col gap-3">
        <div className="flex items-center gap-2 font-serif text-sm font-semibold text-accent-primary">
          <FolderTree className="h-4 w-4" />
          <span>Árbol de Ramas</span>
        </div>

        <div className="space-y-2">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="flex items-center justify-between p-2 rounded border border-border-subtle bg-bg-elevated text-xs font-sans"
            >
              <span>{node.title}</span>
              <button
                type="button"
                onClick={() => removeNode(node.id)}
                className="text-text-muted hover:text-error transition-colors p-1"
                aria-label="Eliminar rama"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex gap-2 mt-2">
          <Input
            value={newChildText}
            onChange={(e) => setNewChildText(e.target.value)}
            placeholder="Añadir nueva rama o sub-concepto..."
            className="text-xs"
          />
          <Button size="sm" onClick={() => addNode(null)} disabled={!newChildText.trim()}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Añadir
          </Button>
        </div>
      </div>

      <div className="border-t border-border-subtle pt-4 flex justify-end">
        <Button variant="secondary" onClick={handleFinish}>
          Guardar Mapa Conceptual
        </Button>
      </div>
    </Card>
  );
};
