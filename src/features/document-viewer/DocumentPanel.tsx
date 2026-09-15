import { useEffect } from "react";
import { DocumentAnnotator } from "./DocumentAnnotator";

interface DocumentPanelProps {
  fileId: string;
  onClose: () => void;
}

/** Panel a pantalla completa con fondo opaco sólido — previene colisión visual con la página de fondo. */
export function DocumentPanel({ fileId, onClose }: DocumentPanelProps) {
  // Manejo de tecla Escape para cerrar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary text-text-primary overflow-hidden shadow-2xl animate-in fade-in duration-150">
      <DocumentAnnotator fileId={fileId} onClose={onClose} />
    </div>
  );
}
