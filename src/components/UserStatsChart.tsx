import React, { useState, useEffect, useMemo } from 'react';
import { Lock, TrendingUp, TrendingDown, Minus, Eye, Users, Zap } from 'lucide-react';
import { fetchUserStats, UserStatsResponse } from '../lib/stats';
import { motion, AnimatePresence } from 'motion/react';

interface UserStatsChartProps {
  userId: string;
  allTimeViews?: number;
  allTimeConnections?: number;
  currentStrength?: number;
}

type MetricType = 'views' | 'connections' | 'strength';
type RangeType = 'week' | 'month' | 'all';

export function UserStatsChart({
  userId,
  allTimeViews = 0,
  allTimeConnections = 0,
  currentStrength = 0
}: UserStatsChartProps) {
  const [metric, setMetric] = useState<MetricType>('views');
  const [range, setRange] = useState<RangeType>('all');
  const [loading, setLoading] = useState(false);
  const [cache, setCache] = useState<Record<string, UserStatsResponse>>({});
  const [hoveredPoint, setHoveredPoint] = useState<{ label: string; date: string; value: number } | null>(null);

  const cacheKey = `${range}_${metric}`;
  const currentStats = cache[cacheKey];

  useEffect(() => {
    if (!userId) return;

    // Load from cache or fetch
    if (!cache[cacheKey]) {
      setLoading(true);
      fetchUserStats(userId, range, metric)
        .then((res) => {
          setCache((prev) => ({ ...prev, [cacheKey]: res }));
        })
        .finally(() => setLoading(false));
    }
  }, [userId, range, metric, cacheKey]);

  // Derived numbers with fallbacks ensuring exact match with profile totals
  const totalDisplay = useMemo(() => {
    if (range === 'all') {
      if (metric === 'views') return allTimeViews;
      if (metric === 'connections') return allTimeConnections;
      if (metric === 'strength') return currentStrength;
    }
    if (currentStats) {
      return currentStats.totalInRange;
    }
    return 0;
  }, [range, metric, allTimeViews, allTimeConnections, currentStrength, currentStats]);

  const subtitleLabel = useMemo(() => {
    const rLabel = range === 'week' ? 'this week' : range === 'month' ? 'in the last 30 days' : 'since you joined';
    if (metric === 'views') return `Views ${rLabel}`;
    if (metric === 'connections') return `Connections ${rLabel}`;
    return `Profile strength (completeness)`;
  }, [range, metric]);

  const points = currentStats?.points || [];
  const hasData = useMemo(() => {
    if (!points.length) return false;
    return points.some((p) => p.value > 0);
  }, [points]);

  const maxPointVal = useMemo(() => {
    if (!points.length) return 10;
    const max = Math.max(...points.map((p) => p.value));
    return max > 0 ? max : 10;
  }, [points]);

  const delta = currentStats?.delta ?? 0;
  const rangeName = range === 'week' ? 'last week' : range === 'month' ? 'last month' : 'prior period';

  return (
    <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-5 shadow-2xl">
      {/* Header Bar: "My stats" in Serif + "ONLY YOU CAN SEE THIS" Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-serif text-3xl sm:text-4xl text-[#f3f6f8] tracking-tight">
          My stats
        </h2>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#00d1ff]/10 border border-[#00d1ff]/20 text-[#00d1ff] font-mono text-[10px] uppercase tracking-wider font-semibold">
          <Lock className="w-3 h-3 text-[#00d1ff]" />
          <span>ONLY YOU CAN SEE THIS</span>
        </div>
      </div>

      {/* Row 1: Metric Selector Tabs (Views, Connections, Strength) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'views' as const, label: 'Views', icon: Eye },
          { id: 'connections' as const, label: 'Connections', icon: Users },
          { id: 'strength' as const, label: 'Strength', icon: Zap },
        ].map((tab) => {
          const isActive = metric === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMetric(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-mono font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#00d1ff] text-[#00131a] shadow-[0_0_15px_rgba(0,209,255,0.25)]'
                  : 'bg-white/[0.03] text-white/60 border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Row 2: Range Selector Tabs (Week, Month, All time) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'week' as const, label: 'Week' },
          { id: 'month' as const, label: 'Month' },
          { id: 'all' as const, label: 'All time' },
        ].map((r) => {
          const isActive = range === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`px-4 py-1.5 rounded-xl text-xs font-mono font-semibold tracking-wider transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#00d1ff] text-[#00131a] shadow-[0_0_15px_rgba(0,209,255,0.25)]'
                  : 'bg-white/[0.03] text-white/60 border border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* Primary Metric Stat Display */}
      <div className="space-y-1 pt-1">
        <div className="flex items-baseline gap-2">
          <span className="font-serif text-5xl sm:text-6xl text-[#f3f6f8] leading-none">
            {totalDisplay}
            {metric === 'strength' && '%'}
          </span>
          {hoveredPoint && (
            <span className="font-mono text-xs text-[#00d1ff] animate-fade-in">
              ({hoveredPoint.label}: {hoveredPoint.value}{metric === 'strength' ? '%' : ''})
            </span>
          )}
        </div>
        <div className="font-mono text-xs uppercase tracking-[0.16em] text-[#59636d]">
          {subtitleLabel}
        </div>
      </div>

      {/* Chart Canvas or Pure Empty State */}
      <div className="relative min-h-[160px] flex items-center justify-center rounded-2xl bg-[#040506]/60 border border-white/[0.05] p-4">
        {loading ? (
          <div className="w-6 h-6 border-2 border-[#00d1ff]/20 border-t-[#00d1ff] rounded-full animate-spin" />
        ) : !hasData ? (
          <div className="text-center py-8 px-4 font-mono text-[11px] uppercase tracking-[0.2em] text-[#59636d] select-none">
            NO ACTIVITY YET. YOUR STATS WILL SHOW HERE.
          </div>
        ) : (
          <div className="w-full h-36 flex items-end gap-1.5 sm:gap-3 pt-6 pb-2 px-1">
            {points.map((pt, idx) => {
              const heightPct = Math.max(6, Math.min(100, Math.round((pt.value / maxPointVal) * 100)));
              const isHovered = hoveredPoint?.date === pt.date;

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="flex-1 h-full flex flex-col justify-end items-center group cursor-pointer relative"
                >
                  {/* Tooltip on bar */}
                  <div className={`absolute -top-7 px-2 py-0.5 rounded-md bg-[#00d1ff] text-[#00131a] text-[10px] font-mono font-bold whitespace-nowrap shadow-lg transition-all pointer-events-none ${
                    isHovered ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                  }`}>
                    {pt.value}{metric === 'strength' ? '%' : ''}
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPct}%` }}
                    className={`w-full max-w-[28px] rounded-t-lg transition-all duration-300 ${
                      pt.value > 0
                        ? isHovered
                          ? 'bg-[#33daff] shadow-[0_0_12px_rgba(0,209,255,0.6)]'
                          : 'bg-gradient-to-t from-[#00d1ff]/40 to-[#00d1ff] shadow-[0_0_8px_rgba(0,209,255,0.25)]'
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  />

                  {/* X Axis Label */}
                  <span className="font-mono text-[9px] sm:text-[10px] text-[#59636d] group-hover:text-white mt-2 truncate w-full text-center">
                    {pt.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Row under chart */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/[0.05] text-xs font-mono">
        <div className="text-[#8d97a1]">
          Total: <span className="text-[#f3f6f8] font-semibold">{totalDisplay}{metric === 'strength' ? '%' : ''}</span> in selected period
        </div>

        {range !== 'all' && metric !== 'strength' && (
          <div className="flex items-center gap-1.5">
            {delta > 0 ? (
              <span className="text-[#35e0a1] flex items-center gap-1 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                +{delta} vs {rangeName}
              </span>
            ) : delta < 0 ? (
              <span className="text-[#ff5a5f] flex items-center gap-1 font-semibold">
                <TrendingDown className="w-3.5 h-3.5" />
                {delta} vs {rangeName}
              </span>
            ) : (
              <span className="text-[#8d97a1] flex items-center gap-1">
                <Minus className="w-3.5 h-3.5" />
                No change vs {rangeName}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
