import React from "react";
import { AmbientSoundPlayer } from "../components/ambient-sound/AmbientSoundPlayer";

export const AmbientPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
          Aislamiento Acústico y Sonido Ambiente
        </h1>
        <p className="mt-1 font-sans text-sm text-text-secondary">
          Generador de frecuencias de concentración sintetizadas en tiempo real en tu navegador.
        </p>
      </div>
      <AmbientSoundPlayer />
    </div>
  );
};
