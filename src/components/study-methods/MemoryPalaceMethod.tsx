import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Castle, 
  MapPin, 
  Eye, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Trophy,
  RefreshCcw
} from "lucide-react";

export interface MemoryPalaceMethodProps {
  onSessionFinished?: () => void;
}

interface LocusStation {
  id: string;
  stationNumber: number;
  locationName: string;
  concept: string;
  visualAnchor: string;
}

const DEFAULT_STATIONS: LocusStation[] = [
  {
    id: "s1",
    stationNumber: 1,
    locationName: "Puerta de Entrada",
    concept: "Potencial de Reposo (-70 mV)",
    visualAnchor: "Un candado de neón azul congelado a 70 grados bajo cero en la cerradura",
  },
  {
    id: "s2",
    stationNumber: 2,
    locationName: "Perchero del Pasillo",
    concept: "Apertura de Canales de Na+ (Despolarización)",
    visualAnchor: "Un abrigo amarillo brillante electrificado que arroja chispas de sal al suelo",
  },
  {
    id: "s3",
    stationNumber: 3,
    locationName: "Espejo del Baño",
    concept: "Pico de Acción (+30 mV)",
    visualAnchor: "El termómetro del espejo estalla en llamas rojas marcando +30",
  },
  {
    id: "s4",
    stationNumber: 4,
    locationName: "Mesa de la Cocina",
    concept: "Cierre de Na+ y Apertura de K+ (Repolarización)",
    visualAnchor: "Un racimo gigante de bananas de potasio apagando el fuego de la mesa",
  },
  {
    id: "s5",
    stationNumber: 5,
    locationName: "Balcón al Exterior",
    concept: "Bomba Sodio-Potasio (Restitución ATP)",
    visualAnchor: "Una bomba de agua mecánica bombeando agua salada hacia afuera sin parar",
  },
];

export const MemoryPalaceMethod: React.FC<MemoryPalaceMethodProps> = ({ onSessionFinished }) => {
  const [palaceTitle, setPalaceTitle] = useState<string>("Recorrido de Fisiología Neuronal");
  const [stations, setStations] = useState<LocusStation[]>(DEFAULT_STATIONS);
  const [isWalkthroughMode, setIsWalkthroughMode] = useState<boolean>(false);
  const [currentStationIndex, setCurrentStationIndex] = useState<number>(0);
  const [revealedCurrent, setRevealedCurrent] = useState<boolean>(false);
  const [userRecallAttempt, setUserRecallAttempt] = useState<string>("");
  const [recalledCorrectly, setRecalledCorrectly] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Campos de nueva estación
  const [newLocation, setNewLocation] = useState<string>("");
  const [newConcept, setNewConcept] = useState<string>("");
  const [newAnchor, setNewAnchor] = useState<string>("");

  const handleAddStation = () => {
    if (!newLocation.trim() || !newConcept.trim()) return;
    const newStation: LocusStation = {
      id: `station_${Date.now()}`,
      stationNumber: stations.length + 1,
      locationName: newLocation.trim(),
      concept: newConcept.trim(),
      visualAnchor: newAnchor.trim() || "Imagen visual vívida",
    };
    setStations((prev) => [...prev, newStation]);
    setNewLocation("");
    setNewConcept("");
    setNewAnchor("");
  };

  const handleRemoveStation = (id: string) => {
    setStations((prev) =>
      prev
        .filter((s) => s.id !== id)
        .map((s, idx) => ({ ...s, stationNumber: idx + 1 }))
    );
  };

  const handleStartWalkthrough = () => {
    setIsWalkthroughMode(true);
    setCurrentStationIndex(0);
    setRevealedCurrent(false);
    setUserRecallAttempt("");
    setRecalledCorrectly(0);
    setIsCompleted(false);
  };

  const handleNextStation = (correct: boolean) => {
    if (correct) setRecalledCorrectly((prev) => prev + 1);
    setUserRecallAttempt("");
    setRevealedCurrent(false);

    if (currentStationIndex + 1 < stations.length) {
      setCurrentStationIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
    }
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `palace_${Date.now()}`,
      methodId: "method-of-loci",
      subject: "Palacio de la Memoria",
      topic: palaceTitle,
      durationMinutes: Math.max(15, stations.length * 3),
      notes: `Palacio: ${palaceTitle}\nEstaciones (${stations.length}):\n${stations
        .map((s) => `${s.stationNumber}. [${s.locationName}]: ${s.concept} (${s.visualAnchor})`)
        .join("\n")}\n\nPrecisión de Recorrido: ${recalledCorrectly}/${stations.length}`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  const currentStation = stations[currentStationIndex];

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Palacio de la Memoria (Método de Loci)</CardTitle>
            <Badge variant="accent">Topología Espacial</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Ancla conceptos abstractos en puntos fijos de un recorrido físico conocido para recordar secuencias en orden serial estricto.
          </p>
        </div>

        {!isWalkthroughMode && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartWalkthrough}
            disabled={stations.length === 0}
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Castle className="h-3.5 w-3.5" />
            <span>Iniciar Recorrido Mental ({stations.length} Estaciones)</span>
          </Button>
        )}
      </div>

      {/* Mode Switch: Architecture vs Walkthrough */}
      {!isWalkthroughMode ? (
        /* Modo Arquitectura y Carga de Estaciones */
        <div className="space-y-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-primary font-sans">
              Nombre o Temática del Palacio:
            </label>
            <Input
              value={palaceTitle}
              onChange={(e) => setPalaceTitle(e.target.value)}
              placeholder="Ej: Fisiología Neuronal, Huesos del Cráneo, Tratado de Roma..."
            />
          </div>

          {/* List of Stations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-serif font-semibold text-text-primary">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-accent-primary" />
                <span>Ruta de Estaciones Fijas ({stations.length})</span>
              </span>
              <span className="text-text-muted text-[11px] font-sans">Recorrido secuencial estricto</span>
            </div>

            <div className="space-y-2.5">
              {stations.map((s) => (
                <div
                  key={s.id}
                  className="rounded-lg border border-border-subtle bg-bg-secondary p-3 flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-primary/10 font-mono text-xs font-bold text-accent-primary">
                      {s.stationNumber}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-semibold text-text-primary font-serif">
                          {s.locationName}
                        </strong>
                        <span className="text-xs text-text-secondary">&rarr; {s.concept}</span>
                      </div>
                      <p className="text-xs text-text-muted italic mt-0.5">
                        "{s.visualAnchor}"
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStation(s.id)}
                    className="text-text-muted hover:text-rose-400 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Add Station Box */}
          <div className="rounded-xl border border-dashed border-border-hover bg-bg-secondary/60 p-4 space-y-3">
            <span className="text-xs font-semibold text-text-primary font-serif flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5 text-accent-primary" />
              <span>Agregar Nueva Estación a la Ruta</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Input
                placeholder="1. Estación física (Ej: Sofá del living)"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
              />
              <Input
                placeholder="2. Concepto a recordar (Ej: Arteria Carótida)"
                value={newConcept}
                onChange={(e) => setNewConcept(e.target.value)}
              />
            </div>
            <Input
              placeholder="3. Ancla visual bizarra o insólita (Ej: Un dragón escupiendo sangre carmesí sobre el almohadón)"
              value={newAnchor}
              onChange={(e) => setNewAnchor(e.target.value)}
            />

            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleAddStation}
                disabled={!newLocation.trim() || !newConcept.trim()}
                className="text-xs flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Estación</span>
              </Button>
            </div>
          </div>
        </div>
      ) : !isCompleted && currentStation ? (
        /* Modo Recorrido Mental */
        <div className="space-y-5">
          <div className="flex items-center justify-between text-xs text-text-secondary border-b border-border-subtle pb-2">
            <span>
              Estación <strong>{currentStation.stationNumber}</strong> de <strong>{stations.length}</strong>
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsWalkthroughMode(false)}
              className="text-[11px] py-0.5 px-2"
            >
              Editar Estaciones
            </Button>
          </div>

          <div className="rounded-xl border border-border-subtle bg-bg-secondary p-6 space-y-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary font-mono text-base font-bold">
                {currentStation.stationNumber}
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                  Punto de Anclaje Espacial
                </span>
                <h3 className="font-serif text-lg font-bold text-text-primary">
                  {currentStation.locationName}
                </h3>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-xs font-medium text-text-secondary">
                ¿Qué concepto dejaste depositado en esta estación?
              </label>
              <Input
                placeholder="Escribe lo que recuerdes antes de comprobar..."
                value={userRecallAttempt}
                onChange={(e) => setUserRecallAttempt(e.target.value)}
                disabled={revealedCurrent}
              />
            </div>

            {revealedCurrent ? (
              <div className="rounded-lg border border-accent-primary/30 bg-bg-elevated p-4 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-accent-primary">
                    Concepto Almacenado
                  </span>
                  <Badge variant="success">Solución Revelada</Badge>
                </div>
                <p className="text-base font-semibold text-text-primary font-serif">
                  {currentStation.concept}
                </p>
                <p className="text-xs text-text-secondary italic">
                  Ancla visual: "{currentStation.visualAnchor}"
                </p>

                <div className="grid grid-cols-2 gap-3 pt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleNextStation(false)}
                    className="text-xs border-rose-500/30 text-rose-400 hover:bg-rose-500/10"
                  >
                    Olvidado / Incompleto
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleNextStation(true)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    ¡Recordado con Precisión!
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setRevealedCurrent(true)}
                  className="text-xs flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>Comprobar Evocación</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Pantalla Final de Recorrido */
        <div className="rounded-xl border border-border-subtle bg-bg-secondary p-8 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <Trophy className="h-7 w-7" />
          </div>

          <div>
            <h3 className="font-serif text-xl font-semibold text-text-primary">
              ¡Recorrido del Palacio Completado!
            </h3>
            <p className="text-xs text-text-secondary mt-1">
              Has atravesado las {stations.length} estaciones de {palaceTitle}.
            </p>
          </div>

          <div className="inline-flex items-center gap-6 rounded-xl border border-border-subtle bg-bg-elevated px-6 py-3">
            <div className="text-center">
              <span className="text-[10px] text-text-muted">Aciertos</span>
              <div className="font-mono text-lg font-bold text-emerald-400">
                {recalledCorrectly} / {stations.length}
              </div>
            </div>
            <div className="text-center">
              <span className="text-[10px] text-text-muted">Precisión Serial</span>
              <div className="font-mono text-lg font-bold text-accent-primary">
                {Math.round((recalledCorrectly / Math.max(1, stations.length)) * 100)}%
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleStartWalkthrough}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              <span>Repetir Recorrido</span>
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFinishSession}
              className="text-xs flex items-center gap-1.5"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span>Guardar Sesión y Salir</span>
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
