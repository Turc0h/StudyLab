import { useEffect, useState } from "react";
import { RefreshCw, AlertCircle } from "lucide-react";
import { isDesktop } from "../../platform/platform";
import { runStartupReconciliation, type ReconciliationResult } from "../../platform/reconciliation";

export function SyncStatusIndicator() {
  const [status, setStatus] = useState<"syncing" | "synced" | "attention">("syncing");
  const [stats, setStats] = useState<ReconciliationResult | null>(null);

  useEffect(() => {
    if (!isDesktop()) {
      setStatus("synced");
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await runStartupReconciliation();
        if (isMounted) {
          setStats(res);
          if (res.missingOnDisk > 0) {
            setStatus("attention");
          } else {
            setStatus("synced");
          }
        }
      } catch {
        if (isMounted) setStatus("attention");
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isDesktop()) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-mono select-none transition-colors duration-150"
      title={
        stats
          ? `Archivos en disco: ${stats.unmodified} sincronizados, ${stats.added} nuevos, ${stats.updated} actualizados`
          : "Estado de la biblioteca física"
      }
    >
      {status === "syncing" && (
        <>
          <RefreshCw size={11} className="animate-spin text-accent-primary" />
          <span className="text-text-muted">Sincronizando...</span>
        </>
      )}
      {status === "synced" && (
        <>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" />
          <span className="text-text-secondary">Biblioteca sincronizada</span>
        </>
      )}
      {status === "attention" && (
        <>
          <AlertCircle size={11} className="text-amber-500" />
          <span className="text-amber-500">
            {stats?.missingOnDisk ? `${stats.missingOnDisk} desvinculados` : "Verificar"}
          </span>
        </>
      )}
    </div>
  );
}
