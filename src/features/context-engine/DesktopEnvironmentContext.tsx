import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Laptop,
  RefreshCw,
  ShieldCheck,
  Brain,
  Sparkles,
  CheckCircle2,
  Sliders,
  Play
} from "lucide-react";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Card, CardTitle } from "../../components/ui/Card";
import {
  detectActiveStudyTools,
  analyzeEnvironmentReport,
  type StudyEnvironmentReport,
  isTauriEnvironment,
  CANONICAL_STUDY_WHITELIST
} from "./desktopContextService";

export const DesktopEnvironmentContext: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [report, setReport] = useState<StudyEnvironmentReport>(() =>
    analyzeEnvironmentReport([])
  );
  const [autoScan, setAutoScan] = useState<boolean>(false);
  const [appliedSuccess, setAppliedSuccess] = useState<string | null>(null);

  const handleScan = useCallback(async () => {
    setLoading(true);
    try {
      const apps = await detectActiveStudyTools();
      const newReport = analyzeEnvironmentReport(apps);
      setReport(newReport);
    } catch (err) {
      console.warn("[DesktopContext] Error escaneando herramientas:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void handleScan();
  }, [handleScan]);

  useEffect(() => {
    if (!autoScan) return;
    const interval = setInterval(() => {
      void handleScan();
    }, 30000);
    return () => clearInterval(interval);
  }, [autoScan, handleScan]);

  const handleLaunchMethod = (methodId: string) => {
    navigate(`/methods?run=${methodId}`);
  };

  const handleApplyProfile = (profileId: string) => {
    setAppliedSuccess(profileId);
    setTimeout(() => setAppliedSuccess(null), 3500);
  };

  const isDesktop = isTauriEnvironment();

  return (
    <div className="space-y-6">
      {/* Header & Status Card */}
      <Card elevated className="flex flex-col gap-5 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20">
              <Laptop className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-serif">
                  Contexto de Entorno Desktop
                </CardTitle>
                <Badge variant={isDesktop ? "success" : "neutral"}>
                  {isDesktop ? "Tauri Nativo • Activo" : "Modo Navegador Web"}
                </Badge>
                <Badge variant="accent">Fase 5 • Auto-Stance</Badge>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Inspección pasiva de procesos académicos abiertos en tu máquina para sugerir la postura mental ideal.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleScan()}
              disabled={loading}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>{loading ? "Escaneando…" : "Escanear Ahora"}</span>
            </Button>

            <button
              type="button"
              onClick={() => setAutoScan((v) => !v)}
              className={`text-xs px-2.5 py-1.5 rounded-md border flex items-center gap-1.5 transition-colors ${
                autoScan
                  ? "bg-accent-primary/15 border-accent-primary/40 text-accent-primary font-medium"
                  : "bg-bg-elevated border-border-subtle text-text-muted hover:text-text-primary"
              }`}
              title="Escanear en segundo plano cada 30 segundos"
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>Auto (30s): {autoScan ? "ON" : "OFF"}</span>
            </button>
          </div>
        </div>

        {/* Diagnosis & Suggested Stance Banner */}
        <div className="rounded-xl border border-accent-primary/30 bg-accent-primary/5 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-primary" />
              <span className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Postura Cognitiva Sugerida
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-accent-primary/20 text-accent-primary font-mono">
                {Math.round(report.confidence * 100)}% Coincidencia
              </span>
            </div>
            <h3 className="text-base font-serif font-bold text-text-primary">
              {report.profileName}
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed max-w-2xl">
              {report.reason}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2 shrink-0">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleApplyProfile(report.suggestedProfile)}
              className="text-xs flex items-center gap-1.5 w-full sm:w-auto justify-center"
            >
              {appliedSuccess ? (
                <>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>¡Postura Activada!</span>
                </>
              ) : (
                <>
                  <Brain className="h-3.5 w-3.5" />
                  <span>Activar Postura</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Detected Tools Grid */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span className="font-semibold text-text-primary">
              Herramientas de Estudio Detectadas ({report.detectedApps.length})
            </span>
            <span className="text-text-muted font-mono text-[11px]">
              Filtro estricto: Lista blanca ({CANONICAL_STUDY_WHITELIST.length} apps autorizadas)
            </span>
          </div>

          {report.detectedApps.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {report.detectedApps.map((app) => (
                <div
                  key={app.process_name}
                  className="rounded-lg border border-border-subtle bg-bg-secondary p-3 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-sans text-xs font-semibold text-text-primary truncate">
                      {app.display_name}
                    </div>
                    <div className="text-[10px] text-text-muted font-mono truncate">
                      {app.process_name} • {app.category}
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border-subtle bg-bg-elevated font-mono uppercase tracking-wider text-accent-primary shrink-0">
                    {app.suggested_profile.split("-")[0]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border-subtle bg-bg-secondary/40 p-5 text-center space-y-2">
              <Laptop className="h-6 w-6 text-text-muted mx-auto" />
              <p className="text-xs text-text-secondary max-w-md mx-auto">
                No hay herramientas de la lista blanca abiertas en este momento.
                Abrí VS Code, RStudio, SumatraPDF, Calibre o tu editor de apuntes para ver la auto-detección en vivo.
              </p>
            </div>
          )}
        </div>

        {/* Recommended Scientific Methods for the Suggested Stance */}
        <div className="space-y-3 pt-3 border-t border-border-subtle">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider font-mono">
                Metodologías Científicas Recomendadas para este Entorno
              </h4>
              <p className="text-[11px] text-text-muted mt-0.5">
                Herramientas cognitivas optimizadas para el tipo de carga mental detectado.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {report.recommendedMethods.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-border-subtle bg-bg-secondary p-3.5 flex flex-col justify-between gap-3 hover:border-accent-primary/40 transition-colors"
              >
                <div>
                  <h5 className="font-serif text-xs font-bold text-text-primary">
                    {m.name}
                  </h5>
                  <p className="text-[11px] text-text-secondary mt-1 line-clamp-2">
                    {m.description}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleLaunchMethod(m.id)}
                  className="w-full flex items-center justify-center gap-1 text-xs py-1.5 px-2.5 rounded-md bg-bg-elevated border border-border-subtle hover:bg-accent-primary hover:text-bg-elevated hover:border-transparent transition-all font-medium"
                >
                  <Play className="h-3 w-3" />
                  <span>Iniciar Método</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Ethical Guarantee & Privacy Notice */}
        <div className="mt-2 rounded-lg border border-border-subtle bg-bg-secondary/60 p-3 flex items-start gap-2.5">
          <ShieldCheck className="h-4 w-4 text-accent-primary shrink-0 mt-0.5" />
          <div className="text-[11px] text-text-muted leading-relaxed">
            <span className="font-medium text-text-secondary">Privacidad y Ética Innegociable:</span>{" "}
            La inspección de procesos se ejecuta al 100% en tu computadora mediante comandos nativos de solo lectura.
            No se analiza el contenido de tus pantallas ni tu teclado (cero keylogging), y ningún dato o nombre de proceso es transferido a internet.
          </div>
        </div>
      </Card>
    </div>
  );
};
