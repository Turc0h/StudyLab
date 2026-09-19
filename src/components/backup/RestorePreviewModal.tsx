import React from "react";
import {
  ShieldCheck,
  AlertTriangle,
  FileText,
  CreditCard,
  History,
  Compass,
  X,
  RotateCcw,
  Loader2,
  DownloadCloud
} from "lucide-react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Progress } from "../ui/Progress";
import type { BackupInspectionResult } from "../../features/storage/workspaceBackup";

interface RestorePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  inspection: BackupInspectionResult | null;
  onConfirmRestore: () => void;
  restoring: boolean;
  restoreProgress: number;
  restoreMessage: string;
}

export const RestorePreviewModal: React.FC<RestorePreviewModalProps> = ({
  isOpen,
  onClose,
  inspection,
  onConfirmRestore,
  restoring,
  restoreProgress,
  restoreMessage,
}) => {
  if (!isOpen || !inspection) return null;

  const dateStr = inspection.manifest?.timestamp
    ? new Date(inspection.manifest.timestamp).toLocaleString("es-AR", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "Desconocida";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl rounded-2xl border border-border-subtle bg-bg-elevated shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4 bg-bg-secondary/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              <DownloadCloud className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-base font-bold text-text-primary">
                  Inspección de Respaldo Portable
                </h3>
                <Badge variant="accent">.studylab-bundle</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Verificación de integridad antes de restaurar en tu máquina.
              </p>
            </div>
          </div>

          {!restoring && (
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-secondary text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors"
              title="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Integrity Check Banner */}
          {inspection.checksumValid ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-emerald-400">
                    Firma Criptográfica SHA-256 Válida
                  </div>
                  <div className="text-[11px] text-text-muted font-mono truncate max-w-xs sm:max-w-sm">
                    {inspection.manifest.sha256Checksum || "Hash verificado"}
                  </div>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                Íntegro
              </span>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="text-xs leading-relaxed">
                <span className="font-bold">Advertencia de Integridad:</span> El archivo no coincide con su hash SHA-256 o está incompleto.
              </div>
            </div>
          )}

          {/* Metadata summary */}
          <div className="rounded-xl border border-border-subtle bg-bg-secondary/70 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Fecha del Respaldo:</span>
              <span className="font-mono font-medium text-text-primary">{dateStr}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Versión de Esquema Dexie:</span>
              <span className="font-mono text-text-primary">
                v{inspection.manifest?.dexieSchemaVersion || 6} ({inspection.stats.totalTables} tablas)
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-center space-y-1">
              <FileText className="h-4 w-4 text-accent-primary mx-auto" />
              <div className="text-base font-serif font-bold text-text-primary">
                {inspection.stats.fileCount}
              </div>
              <div className="text-[10px] text-text-muted">Documentos PDF</div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-center space-y-1">
              <CreditCard className="h-4 w-4 text-emerald-400 mx-auto" />
              <div className="text-base font-serif font-bold text-text-primary">
                {inspection.stats.cardCount}
              </div>
              <div className="text-[10px] text-text-muted">Flashcards FSRS</div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-center space-y-1">
              <History className="h-4 w-4 text-amber-400 mx-auto" />
              <div className="text-base font-serif font-bold text-text-primary">
                {inspection.stats.studySessionCount}
              </div>
              <div className="text-[10px] text-text-muted">Sesiones de Métodos</div>
            </div>

            <div className="rounded-xl border border-border-subtle bg-bg-secondary p-3 text-center space-y-1">
              <Compass className="h-4 w-4 text-purple-400 mx-auto" />
              <div className="text-base font-serif font-bold text-text-primary">
                {inspection.stats.projectCount}
              </div>
              <div className="text-[10px] text-text-muted">Proyectos Contexto</div>
            </div>
          </div>

          {/* Restoration Progress */}
          {restoring && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{restoreMessage}</span>
                <span className="font-mono">{restoreProgress}%</span>
              </div>
              <Progress value={restoreProgress} />
            </div>
          )}

          {/* Caution Alert */}
          {!restoring && (
            <div className="rounded-lg border border-border-subtle bg-bg-secondary/50 p-3 flex items-start gap-2.5 text-xs text-text-muted">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Esta acción restaurará los registros y archivos del respaldo en tu base de datos local IndexedDB.
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-border-subtle px-6 py-4 bg-bg-secondary/40 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={restoring}
            className="text-xs"
          >
            Cancelar
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onConfirmRestore}
            disabled={!inspection.isValid || !inspection.checksumValid || restoring}
            className="text-xs flex items-center gap-1.5"
          >
            {restoring ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Restaurando…</span>
              </>
            ) : (
              <>
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Confirmar y Restaurar</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
