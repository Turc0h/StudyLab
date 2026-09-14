import React, { useEffect, useRef, useState } from "react";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { logSession } from "../logSession";
import {
  Castle,
  Lock,
  Unlock,
  CheckCircle2,
  Sparkles,
  Compass,
  ArrowRight,
} from "lucide-react";

interface LocusItem {
  id: string;
  name: string;
  isoX: number; // grid coords (e.g. -2..2)
  isoY: number; // grid coords (e.g. -2..2)
  prompt: string;
  solution: string;
  retrievability: number; // 0..1
  mastered: boolean;
}

interface PalaceChamber {
  id: string;
  name: string;
  description: string;
  requiredRetrievability: number;
  loci: LocusItem[];
  isLocked: boolean;
}

const INITIAL_CHAMBERS: PalaceChamber[] = [
  {
    id: "chamber-foundations",
    name: "Atrio de Fundamentos",
    description: "Cámara inicial: axiomas de memoria y límites de retención.",
    requiredRetrievability: 0.85,
    isLocked: false,
    loci: [
      {
        id: "locus-1",
        name: "Pedestal de la Ley de Potencia",
        isoX: -1.5,
        isoY: -1,
        prompt: "¿Cuál es la fórmula canónica de Retrievability en FSRS v4.5?",
        solution: "R(t, S) = (1 + 19 * t / S)^(-0.5), donde t son los días transcurridos y S la estabilidad.",
        retrievability: 0.70,
        mastered: false,
      },
      {
        id: "locus-2",
        name: "Altar de la Vida Media",
        isoX: 1.5,
        isoY: -1,
        prompt: "¿Cómo se deduce la vida media t_(1/2) a partir de la estabilidad S?",
        solution: "Haciendo R = 0.5: t_(1/2) = (3 / 19) * S ≈ 0.1579 * S días.",
        retrievability: 0.65,
        mastered: false,
      },
      {
        id: "locus-3",
        name: "Monolito de Miller",
        isoX: 0,
        isoY: 1.5,
        prompt: "¿Cuál es el límite clásico del buffer fonológico en memoria operativa?",
        solution: "7 ± 2 chunks de información (o 4 chunks bajo atención sostenida según Nelson Cowan).",
        retrievability: 0.75,
        mastered: false,
      },
    ],
  },
  {
    id: "chamber-dynamics",
    name: "Cámara de Dinámica Sináptica",
    description: "Cámara intermedia: plasticidad y receptores moleculares.",
    requiredRetrievability: 0.85,
    isLocked: true,
    loci: [
      {
        id: "locus-4",
        name: "Cristal NMDA / Magnesio",
        isoX: -1.5,
        isoY: 0,
        prompt: "¿Qué ion bloquea el poro del receptor NMDA en potencial de reposo?",
        solution: "El ion magnesio (Mg²⁺), que es repelido únicamente tras la despolarización.",
        retrievability: 0.50,
        mastered: false,
      },
      {
        id: "locus-5",
        name: "Fuente de Plasticidad Hebbiana",
        isoX: 1.5,
        isoY: 0,
        prompt: "¿Cuál es el postulado de Donald Hebb (1949)?",
        solution: "'Neuronas que disparan juntas, se conectan juntas' (retroalimentación correlacional).",
        retrievability: 0.60,
        mastered: false,
      },
    ],
  },
  {
    id: "chamber-synthesis",
    name: "Bóveda de Síntesis Superior",
    description: "Cámara final: metacognición y discriminación adaptativa.",
    requiredRetrievability: 0.85,
    isLocked: true,
    loci: [
      {
        id: "locus-6",
        name: "Esfera de Metacognición",
        isoX: 0,
        isoY: 0,
        prompt: "¿Cómo se previene la Ilusión de Competencia?",
        solution: "Mediante entrelazado adaptativo de conceptos y evaluación con latencia estricta.",
        retrievability: 0.40,
        mastered: false,
      },
    ],
  },
];

export function SpatialPalaceRunner({
  methodId = "palace",
  subjectFolderId,
}: {
  methodId?: string;
  subjectFolderId: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [chambers, setChambers] = useState<PalaceChamber[]>(INITIAL_CHAMBERS);
  const [currentChamberIdx, setCurrentChamberIdx] = useState(0);
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const [selectedLocus, setSelectedLocus] = useState<LocusItem | null>(null);
  const [revealedSolution, setRevealedSolution] = useState(false);
  const [sessionStartTime] = useState<number>(Date.now());

  const currentChamber = chambers[currentChamberIdx];

  // Check if current chamber is 100% mastered to unlock next chamber
  const chamberMastered = currentChamber.loci.every((l) => l.mastered);

  useEffect(() => {
    if (chamberMastered && currentChamberIdx < chambers.length - 1) {
      // Unlock next chamber
      setChambers((prev) =>
        prev.map((ch, idx) => (idx === currentChamberIdx + 1 ? { ...ch, isLocked: false } : ch)),
      );
    }
  }, [chamberMastered, currentChamberIdx, chambers.length]);

  // Keyboard navigation (WASD / Arrows)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const step = 0.25;
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        setPlayerPos((p) => ({ ...p, y: Math.max(-2.2, p.y - step) }));
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        setPlayerPos((p) => ({ ...p, y: Math.min(2.2, p.y + step) }));
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        setPlayerPos((p) => ({ ...p, x: Math.max(-2.2, p.x - step) }));
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        setPlayerPos((p) => ({ ...p, x: Math.min(2.2, p.x + step) }));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 2.5D Isometric projection helper
  const toScreen = (gx: number, gy: number, originX: number, originY: number) => {
    const tileW = 90;
    const tileH = 45;
    const screenX = originX + (gx - gy) * (tileW / 2);
    const screenY = originY + (gx + gy) * (tileH / 2);
    return { screenX, screenY };
  };

  // Canvas render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const originX = w / 2;
      const originY = h / 2 - 30;

      ctx.clearRect(0, 0, w, h);

      // Draw Isometric Cyber Tile Grid
      const gridSize = 3;
      const tileW = 90;
      const tileH = 45;

      for (let x = -gridSize; x <= gridSize; x++) {
        for (let y = -gridSize; y <= gridSize; y++) {
          const { screenX, screenY } = toScreen(x, y, originX, originY);

          // Tile diamond
          ctx.beginPath();
          ctx.moveTo(screenX, screenY - tileH / 2);
          ctx.lineTo(screenX + tileW / 2, screenY);
          ctx.lineTo(screenX, screenY + tileH / 2);
          ctx.lineTo(screenX - tileW / 2, screenY);
          ctx.closePath();

          ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(12, 19, 34, 0.9)" : "rgba(8, 14, 26, 0.9)";
          ctx.fill();
          ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      // Draw Chamber Walls / Perimeter glow
      ctx.save();
      ctx.strokeStyle = "rgba(0, 240, 255, 0.35)";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 12;

      const pTop = toScreen(-gridSize - 0.5, -gridSize - 0.5, originX, originY);
      const pRight = toScreen(gridSize + 0.5, -gridSize - 0.5, originX, originY);
      const pBottom = toScreen(gridSize + 0.5, gridSize + 0.5, originX, originY);
      const pLeft = toScreen(-gridSize - 0.5, gridSize + 0.5, originX, originY);

      ctx.beginPath();
      ctx.moveTo(pTop.screenX, pTop.screenY);
      ctx.lineTo(pRight.screenX, pRight.screenY);
      ctx.lineTo(pBottom.screenX, pBottom.screenY);
      ctx.lineTo(pLeft.screenX, pLeft.screenY);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      // Draw Recall Gate Door at far end
      const gatePos = toScreen(0, -gridSize - 0.5, originX, originY);
      ctx.save();
      ctx.beginPath();
      ctx.arc(gatePos.screenX, gatePos.screenY - 20, 22, Math.PI, 0);
      ctx.lineWidth = 3;
      ctx.strokeStyle = chamberMastered ? "#00e5a3" : "#ff3b5c";
      ctx.shadowColor = chamberMastered ? "#00e5a3" : "#ff3b5c";
      ctx.shadowBlur = 15;
      ctx.stroke();

      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 9px JetBrains Mono, monospace";
      ctx.textAlign = "center";
      ctx.fillText(
        chamberMastered ? "PUERTA DESBLOQUEADA" : "PUERTA SELLADA (R ≥ 85%)",
        gatePos.screenX,
        gatePos.screenY - 48,
      );
      ctx.restore();

      // Draw Loci (Holographic Crystals)
      for (const locus of currentChamber.loci) {
        const { screenX, screenY } = toScreen(locus.isoX, locus.isoY, originX, originY);

        const isHovered = selectedLocus?.id === locus.id;
        const color = locus.mastered ? "#00e5a3" : isHovered ? "#00f0ff" : "#ffb020";

        // Pedestal base
        ctx.beginPath();
        ctx.ellipse(screenX, screenY, 18, 9, 0, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Holographic Crystal
        const crystalY = screenY - 25 - Math.sin(Date.now() / 350) * 4;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(screenX, crystalY - 14);
        ctx.lineTo(screenX + 10, crystalY);
        ctx.lineTo(screenX, crystalY + 14);
        ctx.lineTo(screenX - 10, crystalY);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.restore();

        // Label
        ctx.font = "bold 10px Space Grotesk, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText(locus.name, screenX, screenY + 22);

        // Retrievability Badge
        ctx.font = "9px JetBrains Mono, monospace";
        ctx.fillStyle = locus.mastered ? "#00e5a3" : "#c4d1db";
        ctx.fillText(`R: ${Math.round(locus.retrievability * 100)}%`, screenX, screenY + 34);
      }

      // Draw Avatar (Player)
      const pScreen = toScreen(playerPos.x, playerPos.y, originX, originY);
      ctx.save();
      // Shadow
      ctx.beginPath();
      ctx.ellipse(pScreen.screenX, pScreen.screenY, 12, 6, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0, 240, 255, 0.3)";
      ctx.fill();

      // Avatar orb
      ctx.beginPath();
      ctx.arc(pScreen.screenX, pScreen.screenY - 14, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#00f0ff";
      ctx.shadowColor = "#00f0ff";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.restore();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [currentChamber, playerPos, selectedLocus, chamberMastered]);

  // Handle canvas click to select locus
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const originX = canvas.width / 2;
    const originY = canvas.height / 2 - 30;

    for (const locus of currentChamber.loci) {
      const { screenX, screenY } = toScreen(locus.isoX, locus.isoY, originX, originY);
      const dist = Math.hypot(clickX - screenX, clickY - screenY);
      if (dist < 32) {
        setSelectedLocus(locus);
        setRevealedSolution(false);
        // Move player close to locus
        setPlayerPos({ x: locus.isoX, y: locus.isoY });
        return;
      }
    }
  };

  const handlePassLocus = () => {
    if (!selectedLocus) return;

    setChambers((prev) =>
      prev.map((ch, idx) =>
        idx === currentChamberIdx
          ? {
              ...ch,
              loci: ch.loci.map((l) =>
                l.id === selectedLocus.id ? { ...l, retrievability: 0.95, mastered: true } : l,
              ),
            }
          : ch,
      ),
    );

    setSelectedLocus(null);
    setRevealedSolution(false);
  };

  const handleNextChamber = () => {
    if (currentChamberIdx < chambers.length - 1 && chamberMastered) {
      setCurrentChamberIdx((i) => i + 1);
      setPlayerPos({ x: 0, y: 1.5 });
      setSelectedLocus(null);
      setRevealedSolution(false);
    }
  };

  const handleFinish = () => {
    const duration = Math.max(60, Math.round((Date.now() - sessionStartTime) / 1000));
    logSession(methodId, subjectFolderId, sessionStartTime, duration).catch(console.error);
  };

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border-subtle/80 pb-4">
        <div className="flex items-center gap-2.5">
          <Castle className="h-5 w-5 text-accent-primary animate-pulse" />
          <div>
            <h3 className="font-display font-bold text-base text-text-primary">
              Palacio de la Memoria 2.5D (Método de Loci)
            </h3>
            <span className="text-xs text-text-secondary">
              Navegación espacial por cámaras cognitivas con compuertas de recuerdo activo (R ≥ 85%).
            </span>
          </div>
        </div>

        {/* Chamber Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-lg bg-bg-surface-1 border border-border-subtle font-mono text-xs">
          {chambers.map((ch, idx) => (
            <button
              key={ch.id}
              type="button"
              disabled={ch.isLocked}
              onClick={() => {
                setCurrentChamberIdx(idx);
                setSelectedLocus(null);
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-colors ${
                currentChamberIdx === idx
                  ? "bg-accent-primary/20 text-accent-primary font-bold border border-accent-primary/30"
                  : ch.isLocked
                    ? "opacity-40 text-text-tertiary cursor-not-allowed"
                    : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {ch.isLocked ? <Lock className="h-3 w-3 text-danger" /> : <Unlock className="h-3 w-3 text-success" />}
              {ch.name}
            </button>
          ))}
        </div>
      </div>

      {/* Chamber Sub-Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-border-subtle bg-bg-surface-1 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Compass className="h-4 w-4 text-accent-primary" />
          <span>{currentChamber.description}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-text-tertiary font-mono">
            Loci dominados: {currentChamber.loci.filter((l) => l.mastered).length} /{" "}
            {currentChamber.loci.length}
          </span>
          {chamberMastered && currentChamberIdx < chambers.length - 1 && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleNextChamber}
              className="flex items-center gap-1 font-mono text-xs animate-bounce"
            >
              Cruzar Compuerta <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          )}
          {chamberMastered && currentChamberIdx === chambers.length - 1 && (
            <Button
              size="sm"
              variant="primary"
              onClick={handleFinish}
              className="flex items-center gap-1 font-mono text-xs bg-success text-black hover:bg-success/90"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Palacio Completado
            </Button>
          )}
        </div>
      </div>

      {/* 2.5D Canvas View */}
      <div className="relative w-full h-[420px] rounded-xl border border-accent-primary/20 bg-black/40 overflow-hidden shadow-inner">
        <canvas
          ref={canvasRef}
          width={800}
          height={420}
          onClick={handleCanvasClick}
          className="w-full h-full cursor-pointer"
        />

        {/* Controls Overlay */}
        <div className="absolute bottom-3 left-3 bg-bg-surface-2/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-border-subtle text-[11px] font-mono text-text-tertiary">
          Controles: W/A/S/D o Flechas para moverte · Clic en los cristales para inspeccionar
        </div>

        {/* Gate Status Pill */}
        <div className="absolute top-3 right-3">
          <Badge variant={chamberMastered ? "success" : "danger"}>
            {chamberMastered ? "COMPUERTA ABIERTA" : "COMPUERTA BLOQUEADA"}
          </Badge>
        </div>
      </div>

      {/* Locus Active Recall Inspector Modal / Drawer */}
      {selectedLocus && (
        <div className="flex flex-col gap-4 rounded-xl border border-accent-primary/30 bg-bg-surface-1 p-5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <h4 className="font-display text-sm font-bold text-text-primary">
                {selectedLocus.name}
              </h4>
            </div>
            <Badge variant={selectedLocus.mastered ? "success" : "warning"}>
              Retención Actual: {Math.round(selectedLocus.retrievability * 100)}%
            </Badge>
          </div>

          <div className="rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-xs text-text-primary">
            <strong className="block text-text-tertiary uppercase font-mono text-[10px] mb-1">
              Desafío de Recuerdo Activo:
            </strong>
            <p className="leading-relaxed">{selectedLocus.prompt}</p>
          </div>

          {revealedSolution ? (
            <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-text-primary animate-in fade-in">
              <strong className="block text-success uppercase font-mono text-[10px] mb-1">
                Respuesta Correcta / Clave Mnemónica:
              </strong>
              <p className="leading-relaxed">{selectedLocus.solution}</p>
              <div className="mt-3 flex justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => setSelectedLocus(null)}>
                  Cerrar
                </Button>
                <Button size="sm" variant="primary" onClick={handlePassLocus}>
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Consolidado (R = 95%)
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center pt-2">
              <span className="text-[11px] text-text-tertiary">
                Intenta recordar la respuesta antes de revelarla.
              </span>
              <Button size="sm" variant="secondary" onClick={() => setRevealedSolution(true)}>
                Verificar Memoria
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
