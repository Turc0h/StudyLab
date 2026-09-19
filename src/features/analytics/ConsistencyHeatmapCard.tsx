import React, { useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { db } from "../../db/db";
import {
  generateConsistencyHeatmap,
  type DailyActivity,
} from "./consistencyHeatmap";
import { Flame, Trophy, Calendar, Clock, Sparkles } from "lucide-react";

export const ConsistencyHeatmapCard: React.FC = () => {
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) || [];
  const reviewLogs = useLiveQuery(() => db.reviewLogs.toArray(), []) || [];
  const [selectedDay, setSelectedDay] = useState<DailyActivity | null>(null);

  const heatmapData = useMemo(() => {
    return generateConsistencyHeatmap(sessions, reviewLogs);
  }, [sessions, reviewLogs]);

  const { weeks, stats } = heatmapData;

  const getCellColorClass = (intensity: number) => {
    switch (intensity) {
      case 1:
        return "bg-emerald-500/25 border-emerald-500/30 hover:border-emerald-400";
      case 2:
        return "bg-emerald-500/50 border-emerald-500/50 hover:border-emerald-300";
      case 3:
        return "bg-emerald-500/80 border-emerald-400/80 shadow-[0_0_8px_rgba(16,185,129,0.3)] hover:border-emerald-200";
      case 4:
        return "bg-emerald-400 border-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.5)] hover:border-white";
      default:
        return "bg-white/[0.04] border-transparent hover:bg-white/[0.1] hover:border-border-subtle";
    }
  };

  const dayLabels = ["D", "L", "M", "M", "J", "V", "S"];

  return (
    <Card className="border-border-subtle bg-bg-surface/80 backdrop-blur-md">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Calendar size={18} />
          </div>
          <div>
            <CardTitle className="text-base font-semibold text-text-primary flex items-center gap-2">
              Matriz Anual de Consistencia Cognitiva
              <Badge variant="success" className="text-[10px] font-mono py-0">
                365 DÍAS
              </Badge>
            </CardTitle>
            <p className="text-xs text-text-tertiary">
              Densidad de trabajo profundo, sesiones y repasos FSRS en las últimas 52 semanas.
            </p>
          </div>
        </div>

        {/* Resumen de Métricas de Racha */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 px-2.5 py-1 border border-border-subtle">
            <Flame
              size={15}
              className={stats.currentStreak > 0 ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" : "text-text-tertiary"}
            />
            <span className="font-mono text-xs font-bold text-text-primary">{stats.currentStreak}d</span>
            <span className="text-[10px] text-text-tertiary uppercase">Racha</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-lg bg-bg-surface-2 px-2.5 py-1 border border-border-subtle">
            <Trophy size={14} className="text-cyan-400" />
            <span className="font-mono text-xs font-bold text-text-primary">{stats.longestStreak}d</span>
            <span className="text-[10px] text-text-tertiary uppercase">Récord</span>
          </div>
        </div>
      </CardHeader>

      <div className="space-y-4 p-4 pt-0">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg bg-bg-surface-2/60 p-2 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1">
              <Calendar size={11} /> Días Activos
            </span>
            <p className="text-sm font-mono font-bold text-text-primary mt-0.5">
              {stats.totalStudyDays}{" "}
              <span className="text-[10px] font-normal text-text-tertiary">({stats.consistencyPercentage}%)</span>
            </p>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1">
              <Clock size={11} /> Horas de Foco
            </span>
            <p className="text-sm font-mono font-bold text-emerald-400 mt-0.5">
              {Math.round((stats.totalStudyMinutes / 60) * 10) / 10}h
            </p>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary flex items-center gap-1">
              <Sparkles size={11} /> Tarjetas Repasadas
            </span>
            <p className="text-sm font-mono font-bold text-text-primary mt-0.5">
              {stats.totalCardsReviewed}
            </p>
          </div>

          <div className="rounded-lg bg-bg-surface-2/60 p-2 border border-border-subtle/50">
            <span className="text-[10px] uppercase font-mono text-text-tertiary">
              Promedio / Día Activo
            </span>
            <p className="text-sm font-mono font-bold text-cyan-400 mt-0.5">
              {stats.averageMinutesPerActiveDay} min
            </p>
          </div>
        </div>

        {/* Heatmap Grid con Scroll Horizontal Responsivo */}
        <div className="overflow-x-auto pb-2 scrollbar-thin">
          <div className="min-w-[680px]">
            <div className="flex gap-1">
              {/* Day Labels Column */}
              <div className="flex flex-col justify-between py-0.5 pr-1.5 text-[9px] font-mono text-text-tertiary select-none">
                {dayLabels.map((lbl, idx) => (
                  <span key={idx} className="h-2.5 leading-none flex items-center justify-end">
                    {idx % 2 === 1 ? lbl : ""}
                  </span>
                ))}
              </div>

              {/* 52 Columns of Weeks */}
              <div className="flex flex-1 gap-[3px]">
                {weeks.map((week) => (
                  <div key={week.weekIndex} className="flex flex-col gap-[3px] flex-1">
                    {week.days.map((day, dIdx) => {
                      if (!day) {
                        return <div key={dIdx} className="h-2.5 w-full rounded-[2px] opacity-0" />;
                      }
                      const colorClass = getCellColorClass(day.intensity);
                      const isSelected = selectedDay?.dateStr === day.dateStr;

                      return (
                        <button
                          key={day.dateStr}
                          type="button"
                          onClick={() => setSelectedDay(day)}
                          onMouseEnter={() => setSelectedDay(day)}
                          title={`${day.dateStr}: ${day.studyMinutes} min, ${day.sessionsCount} sesiones, ${day.cardsReviewed} tarjetas`}
                          className={`h-2.5 w-full rounded-[2px] border transition-all duration-150 ${colorClass} ${
                            isSelected ? "ring-2 ring-emerald-400 ring-offset-1 ring-offset-bg-surface" : ""
                          }`}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Scale Legend */}
            <div className="mt-3 flex items-center justify-between text-[10px] text-text-tertiary">
              <span>{heatmapData.startDate}</span>
              <div className="flex items-center gap-1.5">
                <span>Menos</span>
                <div className="h-2 w-2 rounded-[2px] bg-white/[0.04] border border-border-subtle" />
                <div className="h-2 w-2 rounded-[2px] bg-emerald-500/25 border border-emerald-500/30" />
                <div className="h-2 w-2 rounded-[2px] bg-emerald-500/50 border border-emerald-500/50" />
                <div className="h-2 w-2 rounded-[2px] bg-emerald-500/80 border border-emerald-400/80" />
                <div className="h-2 w-2 rounded-[2px] bg-emerald-400 border border-emerald-300" />
                <span>Más foco</span>
              </div>
              <span>{heatmapData.endDate}</span>
            </div>
          </div>
        </div>

        {/* Selected Day Detail Popover / Banner */}
        {selectedDay && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-emerald-500/10 p-2.5 border border-emerald-500/20 text-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-emerald-400">{selectedDay.dateStr}</span>
              <span className="text-text-secondary">
                {selectedDay.studyMinutes > 0
                  ? `${selectedDay.studyMinutes} min estudiados`
                  : "Sin actividad registrada"}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px] text-text-tertiary">
              <span>{selectedDay.sessionsCount} sesiones</span>
              <span>•</span>
              <span>{selectedDay.cardsReviewed} tarjetas repasadas</span>
              <span>•</span>
              <span className="capitalize text-emerald-300">
                Nivel {selectedDay.intensity}/4
              </span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
