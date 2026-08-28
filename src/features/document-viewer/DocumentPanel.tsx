import { DocumentAnnotator } from "./DocumentAnnotator";

interface DocumentPanelProps {
  fileId: string;
  onClose: () => void;
}

/** Panel a pantalla completa — nunca pestaña ni ventana nueva. Usado desde Archivos. */
export function DocumentPanel({ fileId, onClose }: DocumentPanelProps) {
  return (
    <div className="fixed inset-0 z-40 bg-bg-base">
      <DocumentAnnotator fileId={fileId} onClose={onClose} />
    </div>
  );
}
