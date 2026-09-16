import { useState, useEffect } from "react";
import {
  getRetentionOverview,
  type RetentionOverview,
} from "../retentionAnalytics";
import {
  balanceLoad,
  postponeReviews,
  advanceReviews,
  disperseSiblings,
  applyEasyDays,
} from "../loadBalancer";
import {
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle2,
} from "lucide-react";

interface RetentionForecastPanelProps {
  onStudyConcept?: (conceptId: string) => void;
}

export function RetentionForecastPanel({ onStudyConcept }: RetentionForecastPanelProps) {
  const [data, setData] = useState<RetentionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [easyDayTuesday, setEasyDayTuesday] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const overview = await getRetentionOverview();
      setData(overview);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBalance = async () => {
    const res = await balanceLoad(14, 30);
    setActionFeedback(res.message);
    await loadData();
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handlePostpone = async (days = 1) => {
    const res = await postponeReviews(days);
    setActionFeedback(res.message);
    await loadData();
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleAdvance = async () => {
    const res = await advanceReviews(2, 15);
    setActionFeedback(res.message);
    await loadData();
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleDisperse = async () => {
    const res = await disperseSiblings();
    setActionFeedback(res.message);
    await loadData();
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleToggleEasyDay = async (enabled: boolean) => {
    setEasyDayTuesday(enabled);
    if (enabled) {
      // Reducir los martes (día 2) al 30%
      const res = await applyEasyDays({ 2: 0.3 });
      setActionFeedback(res.message);
      await loadData();
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center p-8 text-xs text-text-muted">
        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Cargando panel de retención FSRS...
      </div>
    );
  }

  if (!data) return null;

  const maxCardsInForecast = Math.max(1, ...data.fourteenDayForecast.map((d) => d.cardCount));

  return (
    <div className="flex flex-col gap-6 rounded-2xl border border-border-subtle bg-bg-surface-2/80 p-6 shadow-xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Activity className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-main">Panel de Retención y Sostenibilidad FSRS</h2>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400">
                Sección 20-BIS &amp; 22-BIS
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Previsión de carga, balanceo de picos y comparación rigurosa entre memoria real y meta algorítmica.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadData}
          className="flex items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface-3 px-3 py-1.5 text-xs text-text-muted hover:bg-bg-surface-1"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Actualizar
        </button>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 p-3 text-xs font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Top 3 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Retención Verdadera vs Objetivo */}
        <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Retención Verdadera</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
                data.divergence >= 0
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-amber-500/20 text-amber-300"
              }`}
            >
              {data.divergence >= 0 ? `+${data.divergence}%` : `${data.divergence}%`} vs meta
            </span>
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-primary">{data.trueRetention}%</span>
            <span className="text-xs text-text-muted">/ meta {data.targetRetention}%</span>
          </div>
          <p className="text-[11px] text-text-muted">
            Basado en {data.matureReviewsCount} repaso(s) maduro(s). Mide la fidelidad real de recuperación.
          </p>
        </div>

        {/* Tarjetas Vencidas & Deuda */}
        <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Vencimientos Activos</span>
            <Clock className="h-4 w-4 text-text-muted" />
          </div>
          <div className="my-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-text-main">{data.overdueCardsCount}</span>
            <span className="text-xs text-text-muted">tarjetas a repasar hoy</span>
          </div>
          <p className="text-[11px] text-text-muted">
            {data.overdueCardsCount > 40
              ? "Carga elevada. Podés posponer 1 día o balancear entre días adyacentes."
              : "Carga dentro del rango cognitivo recomendado (< 35 tarjetas/día)."}
          </p>
        </div>

        {/* Calibración de Pesos FSRS */}
        <div className="flex flex-col justify-between rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Calibración FSRS</span>
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="my-2">
            <div className="flex items-center justify-between text-xs font-bold text-text-main">
              <span>{data.totalLogsCount} repasos</span>
              <span className="text-text-muted">Meta: {data.optimizationStatus.threshold}</span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-bg-surface-3">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{
                  width: `${Math.min(100, (data.totalLogsCount / data.optimizationStatus.threshold) * 100)}%`,
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-text-muted line-clamp-2">
            {data.optimizationStatus.description}
          </p>
        </div>
      </div>

      {/* 14-Day Load Forecast with Interactive Bar Chart */}
      <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-main">
              Pronóstico de Carga a 14 Días
            </h3>
            <span className="text-[11px] text-text-muted">
              Distribuí la carga antes de que se acumule para evitar la deserción por avalancha de tarjetas.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBalance}
              className="flex items-center gap-1.5 rounded-lg bg-primary/10 border border-primary/30 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20"
            >
              <Layers className="h-3.5 w-3.5" /> Aplanar y Balancear Picos
            </button>
          </div>
        </div>

        {/* Bar chart */}
        <div className="mt-4 flex h-36 items-end gap-1.5 sm:gap-2">
          {data.fourteenDayForecast.map((day, idx) => {
            const heightPct = Math.max(8, (day.cardCount / maxCardsInForecast) * 100);
            return (
              <div key={idx} className="flex flex-1 flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-text-muted">{day.cardCount}</span>
                <div
                  className={`w-full rounded-t-md transition-all ${
                    day.isPeak
                      ? "bg-amber-500 hover:bg-amber-400"
                      : idx === 0
                        ? "bg-primary hover:opacity-90"
                        : "bg-bg-surface-3 hover:bg-primary/40"
                  }`}
                  style={{ height: `${heightPct}%` }}
                  title={`${day.dayName} ${day.dateStr}: ${day.cardCount} tarjetas`}
                />
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-bold text-text-main">{day.dayName}</span>
                  <span className="text-[9px] text-text-muted">{day.dateStr}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Sustainability Controls & Easy Days */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Acciones de Flujo */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Acciones de Descompresión FSRS
          </h4>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => handlePostpone(1)}
              className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center hover:bg-bg-surface-3"
            >
              <Calendar className="mb-1 h-4 w-4 text-primary" />
              <span className="text-xs font-semibold text-text-main">Posponer 1 Día</span>
              <span className="text-[10px] text-text-muted">Pasa vencidos a mañana</span>
            </button>

            <button
              type="button"
              onClick={handleAdvance}
              className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center hover:bg-bg-surface-3"
            >
              <ArrowRight className="mb-1 h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-text-main">Adelantar Repasos</span>
              <span className="text-[10px] text-text-muted">Trae tarjetas de 48 hs</span>
            </button>

            <button
              type="button"
              onClick={handleDisperse}
              className="flex flex-col items-center justify-center rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-center hover:bg-bg-surface-3"
            >
              <Layers className="mb-1 h-4 w-4 text-blue-400" />
              <span className="text-xs font-semibold text-text-main">Dispersar Hermanas</span>
              <span className="text-[10px] text-text-muted">Separa cloze del mismo tema</span>
            </button>
          </div>

          {/* Easy Days Toggle */}
          <div className="mt-2 flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface-2 p-3 text-xs">
            <div>
              <strong className="block text-text-main">Día Fácil: Martes de Cursada / Laboratorio</strong>
              <span className="text-[11px] text-text-muted">
                Reduce automáticamente al 30% la carga de los martes derivando tarjetas a miércoles y jueves.
              </span>
            </div>
            <input
              type="checkbox"
              checked={easyDayTuesday}
              onChange={(e) => handleToggleEasyDay(e.target.checked)}
              className="h-4 w-4 rounded border-border-subtle accent-primary"
            />
          </div>
        </div>

        {/* Conceptos en Caída de Retención */}
        <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Conceptos en Caída de Retención R(t)
            </h4>
            <TrendingDown className="h-4 w-4 text-amber-500" />
          </div>

          {data.decayingConcepts.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-xs text-text-muted">
              ✓ No hay conceptos con caída crítica de retención esta semana.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {data.decayingConcepts.map((c) => (
                <div
                  key={c.conceptId}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-surface-2 px-3 py-2 text-xs"
                >
                  <div className="flex flex-col">
                    <span className="font-semibold text-text-main">{c.conceptName}</span>
                    <span className="text-[11px] text-text-muted">
                      Retención: <strong className="text-amber-400">{c.currentRetention}%</strong> · {c.lapseCount} fallo(s)
                    </span>
                  </div>
                  {onStudyConcept && (
                    <button
                      type="button"
                      onClick={() => onStudyConcept(c.conceptId)}
                      className="rounded bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20"
                    >
                      Rescatar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 12-Week Study Heatmap */}
      <div className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-bg-surface-1 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
            Constancia de Repaso (Últimas 12 Semanas)
          </h4>
          <span className="text-[11px] text-text-muted">
            {data.weeklyHeatmap.filter((d) => d.count > 0).length} día(s) con actividad
          </span>
        </div>

        <div className="flex flex-wrap gap-1 pt-2">
          {data.weeklyHeatmap.map((day, i) => {
            let color = "bg-bg-surface-3";
            if (day.count > 0 && day.count < 5) color = "bg-primary/30";
            else if (day.count >= 5 && day.count < 15) color = "bg-primary/60";
            else if (day.count >= 15) color = "bg-primary";

            return (
              <div
                key={i}
                className={`h-3 w-3 rounded-xs ${color}`}
                title={`${day.dateStr}: ${day.count} repaso(s)`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
