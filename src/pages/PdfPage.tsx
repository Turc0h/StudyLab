import React from "react";
import { PdfAnnotator } from "../components/pdf-viewer/PdfAnnotator";

export const PdfPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
          Anotador de Documentos Académicos
        </h1>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Lectura pausada, subrayado contextual y notas marginales persistentes de forma 100% local.
        </p>
      </div>
      <PdfAnnotator />
    </div>
  );
};
