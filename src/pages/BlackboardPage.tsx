import React, { useState } from "react";
import { VirtualBlackboard } from "../components/whiteboard/VirtualBlackboard";
import { Maximize2, Minimize2, BookOpen } from "lucide-react";
import { Button } from "../components/ui/Button";

export const BlackboardPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera del Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-hairline pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl font-semibold tracking-tight text-text-primary">
              Pizarra Virtual & Demostraciones
            </h1>
          </div>
          <p className="mt-1 font-sans text-xs sm:text-sm text-text-secondary">
            Un espacio para escribir, resolver ejercicios y ordenar ideas a mano.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 text-xs"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            <span>{isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}</span>
          </Button>
        </div>
      </div>

      {/* Contenedor Principal de la Pizarra */}
      <div className="w-full h-[calc(100vh-12.5rem)] min-h-[560px] rounded-xl overflow-hidden border border-border-subtle shadow-xs bg-bg-surface-1">
        <VirtualBlackboard
          className="w-full h-full border-0 rounded-none shadow-none"
          initialSurface="chalkboard"
        />
      </div>

      {/* Nota al pie con buenas prácticas */}
      <div className="flex items-center justify-between text-[11px] text-text-muted px-1 font-sans">
        <span className="flex items-center gap-1">
          <BookOpen size={12} />
          <span>Elegí entre pizarra o cuaderno y corregí tus trazos con el borrador.</span>
        </span>
      </div>
    </div>
  );
};
