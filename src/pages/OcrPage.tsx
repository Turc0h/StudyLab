import React from "react";
import { ClientOcr } from "../components/ocr/ClientOcr";

export const OcrPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
          Digitalización y Extracción OCR
        </h1>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Reconocimiento óptico de caracteres para apuntes impresos y manuales sin enviar datos a servidores.
        </p>
      </div>
      <ClientOcr />
    </div>
  );
};
