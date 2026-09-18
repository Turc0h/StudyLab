import React, { useState } from "react";
import { Card, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Input, Textarea } from "../ui/Input";
import { saveStudySession } from "../../lib/db";
import { 
  Key, 
  CheckCircle2
} from "lucide-react";

export interface MnemonicsMethodProps {
  onSessionFinished?: () => void;
}

export const MnemonicsMethod: React.FC<MnemonicsMethodProps> = ({ onSessionFinished }) => {
  const [topic, setTopic] = useState<string>("Fases de la Mitosis Celular");
  const [rawItems, setRawItems] = useState<string>("Profase\nMetafase\nAnafase\nTelofase");
  const [acronym, setAcronym] = useState<string>("PMAT");
  const [acrosticPhrase, setAcrosticPhrase] = useState<string>("Prometeo Me Ama Tanto");
  const [mentalImage, setMentalImage] = useState<string>("Un titán Prometeo abrazando un reloj de arena de células");

  // Modo Decodificador
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [testAnswers, setTestAnswers] = useState<string[]>([]);
  const [revealed, setRevealed] = useState<boolean>(false);

  const itemsList = rawItems
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const initials = itemsList.map((item) => item.charAt(0).toUpperCase()).join(" - ");

  const handleGenerateInitials = () => {
    const extracted = itemsList.map((item) => item.charAt(0).toUpperCase()).join("");
    setAcronym(extracted);
  };

  const handleStartTest = () => {
    setIsTestMode(true);
    setTestAnswers(new Array(itemsList.length).fill(""));
    setRevealed(false);
  };

  const handleFinishSession = async () => {
    await saveStudySession({
      id: `mnemonic_${Date.now()}`,
      methodId: "mnemonics",
      subject: "Técnicas Mnemotécnicas",
      topic: topic || "Regla Mnemotécnica",
      durationMinutes: 20,
      notes: `Tema: ${topic}\nTérminos (${itemsList.length}): ${itemsList.join(", ")}\nAcrónimo: ${acronym}\nAcróstico: "${acrosticPhrase}"\nImagen: "${mentalImage}"`,
      completedAt: Date.now(),
    });
    onSessionFinished?.();
  };

  return (
    <Card elevated className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle pb-4">
        <div>
          <div className="flex items-center gap-2">
            <CardTitle>Técnicas Mnemotécnicas (Acrónimos & Acrósticos)</CardTitle>
            <Badge variant="accent">Puentes Fonéticos</Badge>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            Construye anclajes artificiales memorables para recordar secuencias o taxonomías sin relación causal obvia.
          </p>
        </div>

        {!isTestMode ? (
          <Button
            variant="primary"
            size="sm"
            onClick={handleStartTest}
            disabled={itemsList.length === 0 || !acronym.trim()}
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Key className="h-3.5 w-3.5" />
            <span>Probar Decodificador Activo</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsTestMode(false)}
            className="text-xs self-start sm:self-auto"
          >
            Editar Regla
          </Button>
        )}
      </div>

      {!isTestMode ? (
        /* Modo Diseñador Mnemotécnico */
        <div className="space-y-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-primary">Materia o Tema a Memorizar:</label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: Pares Craneales, Taxonomía de Linneo, Requisitos de Validez..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Columna Izquierda: Lista de Términos */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-text-primary">
                  Lista de Términos en Orden Serial:
                </label>
                <span className="text-[10px] text-text-muted">Uno por línea</span>
              </div>
              <Textarea
                rows={5}
                value={rawItems}
                onChange={(e) => setRawItems(e.target.value)}
                placeholder="Escribe los términos ordenados..."
              />
              <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
                <span>Iniciales detectadas: <strong className="font-mono text-accent-primary">{initials || "—"}</strong></span>
                <Button variant="outline" size="sm" onClick={handleGenerateInitials} className="text-[11px] py-0.5">
                  Extraer Acrónimo
                </Button>
              </div>
            </div>

            {/* Columna Derecha: Acrónimo y Frase Acróstica */}
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-primary">Acrónimo Palabra-Clave:</label>
                <Input
                  value={acronym}
                  onChange={(e) => setAcronym(e.target.value)}
                  placeholder="Ej: PMAT, VIP, SODIO..."
                  className="font-mono uppercase tracking-wider font-bold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-primary">
                  Frase Acróstica Memorable (Historia Sonora):
                </label>
                <Input
                  value={acrosticPhrase}
                  onChange={(e) => setAcrosticPhrase(e.target.value)}
                  placeholder="Ej: Prometeo Me Ama Tanto"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-primary">
                  Imagen Mental Hiperbólica / Emocional:
                </label>
                <Input
                  value={mentalImage}
                  onChange={(e) => setMentalImage(e.target.value)}
                  placeholder="Ej: Un titán abrazando una célula gigante de gelatina..."
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Modo Prueba del Decodificador */
        <div className="space-y-6">
          <div className="rounded-xl border border-accent-primary/30 bg-bg-secondary p-5 text-center space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
              Estímulo Mnemotécnico
            </span>
            <div className="font-mono text-2xl font-black text-accent-primary tracking-widest">
              {acronym}
            </div>
            <p className="text-sm font-serif italic text-text-primary">
              "{acrosticPhrase}"
            </p>
            {mentalImage && (
              <p className="text-xs text-text-muted">
                Imagen mental: {mentalImage}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h4 className="font-serif text-sm font-semibold text-text-primary">
              Decodifica cada término de memoria a partir de las iniciales:
            </h4>

            <div className="space-y-2.5">
              {itemsList.map((item, idx) => {
                const initial = item.charAt(0).toUpperCase();
                return (
                  <div
                    key={idx}
                    className="rounded-lg border border-border-subtle bg-bg-secondary p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent-primary/10 font-mono text-xs font-bold text-accent-primary">
                        {initial}
                      </span>
                      <Input
                        placeholder={`Término #${idx + 1}...`}
                        value={testAnswers[idx] || ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTestAnswers((prev) => {
                            const copy = [...prev];
                            copy[idx] = val;
                            return copy;
                          });
                        }}
                        disabled={revealed}
                        className="w-full sm:w-64"
                      />
                    </div>

                    {revealed && (
                      <div className="text-xs font-medium font-serif flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                        <span>Respuesta correcta: <strong>{item}</strong></span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border-subtle">
            {!revealed ? (
              <Button variant="secondary" size="sm" onClick={() => setRevealed(true)}>
                Verificar Respuestas
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={handleFinishSession}>
                Guardar Sesión de Mnemotecnia
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
};
