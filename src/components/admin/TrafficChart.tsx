import React, { useMemo, useState } from 'react';
import { BarChart3, CalendarDays, CalendarRange, Calendar } from 'lucide-react';
import type {
  TrafficGranularity,
  TrafficTimePoint,
  TrafficTimeSeries,
} from '../../lib/analytics';

interface TrafficChartProps {
  timeSeries?: TrafficTimeSeries;
  loading?: boolean;
}

const GRANULARITY_OPTIONS: {
  key: TrafficGranularity;
  label: string;
  subtitle: string;
  unitLabel: string;
  icon: React.FC<{ size?: number }>;
}[] = [
  {
    key: 'day',
    label: 'Días',
    subtitle: 'Tráfico diario de tiendas y productos',
    unitLabel: 'día',
    icon: CalendarDays,
  },
  {
    key: 'week',
    label: 'Semanas',
    subtitle: 'Tráfico agrupado por semana (lunes a domingo)',
    unitLabel: 'semana',
    icon: CalendarRange,
  },
  {
    key: 'month',
    label: 'Meses',
    subtitle: 'Evolución mensual acumulada',
    unitLabel: 'mes',
    icon: Calendar,
  },
];

/** Calcula un techo limpio para el eje Y (múltiplo legible) */
const computeNiceMax = (rawMax: number): number => {
  if (rawMax <= 0) return 10;
  if (rawMax <= 5) return 5;
  if (rawMax <= 10) return 10;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawMax)));
  const normalized = rawMax / magnitude;
  let step = 1;
  if (normalized <= 1.5) step = 1.5;
  else if (normalized <= 2) step = 2;
  else if (normalized <= 3) step = 3;
  else if (normalized <= 5) step = 5;
  else if (normalized <= 8) step = 8;
  else step = 10;
  return Math.ceil(step * magnitude);
};

export const TrafficChart: React.FC<TrafficChartProps> = ({ timeSeries, loading = false }) => {
  const [granularity, setGranularity] = useState<TrafficGranularity>('day');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const activeMeta = GRANULARITY_OPTIONS.find(opt => opt.key === granularity)!;

  const points: TrafficTimePoint[] = useMemo(() => {
    if (!timeSeries) return [];
    if (granularity === 'day') return timeSeries.byDay;
    if (granularity === 'week') return timeSeries.byWeek;
    return timeSeries.byMonth;
  }, [timeSeries, granularity]);

  const stats = useMemo(() => {
    if (points.length === 0) {
      return { total: 0, average: 0, peak: null as TrafficTimePoint | null, niceMax: 10 };
    }
    let total = 0;
    let peak = points[0];
    for (const pt of points) {
      total += pt.totalViews;
      if (pt.totalViews > peak.totalViews) {
        peak = pt;
      }
    }
    const average = Math.round((total / points.length) * 10) / 10;
    const niceMax = computeNiceMax(peak.totalViews);
    return { total, average, peak, niceMax };
  }, [points]);

  const activePoint: TrafficTimePoint | null = useMemo(() => {
    if (points.length === 0) return null;
    if (selectedKey) {
      const found = points.find(p => p.key === selectedKey);
      if (found) return found;
    }
    return points[points.length - 1];
  }, [points, selectedKey]);

  const handleGranularityChange = (next: TrafficGranularity) => {
    setGranularity(next);
    setSelectedKey(null);
  };

  // Decidir cada cuántas barras mostrar etiqueta en eje X para evitar solapamiento
  const labelStep = points.length > 45 ? 5 : points.length > 24 ? 3 : points.length > 14 ? 2 : 1;

  return (
    <div className="card p-4 sm:p-5 space-y-4">
      {/* Cabecera y selector de granularidad */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-accent/10 text-accent flex-shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-primary">Evolución del Tráfico</h3>
            <p className="text-[11px] text-secondary">{activeMeta.subtitle}</p>
          </div>
        </div>

        <div
          className="inline-flex items-center bg-surface p-1 rounded-xl border border-border self-start sm:self-auto"
          role="tablist"
          aria-label="Agrupación temporal del gráfico"
        >
          {GRANULARITY_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const isActive = granularity === opt.key;
            return (
              <button
                key={opt.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleGranularityChange(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-secondary hover:text-primary hover:bg-surface-hover'
                }`}
              >
                <Icon size={13} />
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="h-56 w-full bg-surface-hover/60 animate-pulse rounded-xl" />
      ) : points.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-center bg-surface-hover/30 rounded-xl border border-dashed border-border p-4">
          <BarChart3 size={28} className="text-secondary/50 mb-2" />
          <p className="text-xs font-semibold text-primary">
            Sin eventos temporales para graficar
          </p>
          <p className="text-[11px] text-secondary mt-1 max-w-sm">
            No se encontraron registros con fecha en este período. A medida que lleguen visitas se
            mostrará la evolución por días, semanas y meses.
          </p>
        </div>
      ) : (
        <>
          {/* Resumen rápido de la serie */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-surface-hover/50 rounded-xl p-2.5 border border-border/60">
              <span className="block text-[10px] font-semibold text-secondary uppercase">
                Total ({points.length} {points.length === 1 ? activeMeta.unitLabel : `${activeMeta.unitLabel}s`.replace('mess', 'meses').replace('días', 'días')})
              </span>
              <span className="text-sm sm:text-base font-black text-primary">
                {stats.total.toLocaleString()}
              </span>
            </div>
            <div className="bg-surface-hover/50 rounded-xl p-2.5 border border-border/60">
              <span className="block text-[10px] font-semibold text-secondary uppercase">
                Promedio / {activeMeta.unitLabel}
              </span>
              <span className="text-sm sm:text-base font-black text-primary">
                {stats.average.toLocaleString()}
              </span>
            </div>
            <div className="bg-surface-hover/50 rounded-xl p-2.5 border border-border/60">
              <span className="block text-[10px] font-semibold text-secondary uppercase">
                Pico máximo
              </span>
              <span className="text-sm sm:text-base font-black text-accent truncate block">
                {stats.peak ? `${stats.peak.totalViews.toLocaleString()} (${stats.peak.label})` : '0'}
              </span>
            </div>
          </div>

          {/* Área del Gráfico */}
          <div className="relative pt-3">
            <div className="flex gap-2">
              {/* Eje Y */}
              <div className="flex flex-col justify-between text-[10px] text-secondary font-medium pb-7 pr-1 select-none w-9 text-right flex-shrink-0 h-52">
                <span>{stats.niceMax.toLocaleString()}</span>
                <span>{Math.round(stats.niceMax / 2).toLocaleString()}</span>
                <span>0</span>
              </div>

              {/* Contenedor scrollable de barras */}
              <div className="relative flex-1 overflow-x-auto pb-1">
                <div
                  className="relative h-52 flex flex-col justify-end"
                  style={{
                    minWidth: points.length > 14 ? `${points.length * 32}px` : '100%',
                  }}
                >
                  {/* Líneas guía horizontales */}
                  <div className="absolute inset-x-0 top-0 bottom-7 pointer-events-none flex flex-col justify-between">
                    <div className="border-t border-dashed border-border/70 w-full" />
                    <div className="border-t border-dashed border-border/70 w-full" />
                    <div className="border-t border-border w-full" />
                  </div>

                  {/* Barras */}
                  <div className="relative z-10 flex items-end gap-1 sm:gap-1.5 h-full pb-7 px-1">
                    {points.map((pt, idx) => {
                      const isSelected = activePoint?.key === pt.key;
                      const totalPct = stats.niceMax > 0 ? (pt.totalViews / stats.niceMax) * 100 : 0;
                      const storePct =
                        pt.totalViews > 0 ? (pt.storeViews / pt.totalViews) * 100 : 0;
                      const productPct =
                        pt.totalViews > 0 ? (pt.productViews / pt.totalViews) * 100 : 0;
                      const showLabel =
                        idx % labelStep === 0 || idx === points.length - 1 || isSelected;

                      return (
                        <button
                          key={pt.key}
                          type="button"
                          onMouseEnter={() => setSelectedKey(pt.key)}
                          onFocus={() => setSelectedKey(pt.key)}
                          onClick={() => setSelectedKey(pt.key)}
                          className={`group relative flex-1 min-w-[20px] h-full flex flex-col justify-end items-center focus:outline-none rounded-t-md transition-colors ${
                            isSelected ? 'bg-accent/5' : 'hover:bg-surface-hover/50'
                          }`}
                          aria-label={`${pt.fullLabel}: ${pt.totalViews} vistas`}
                        >
                          {/* Valor encima de la barra si cabe o está seleccionada */}
                          {pt.totalViews > 0 && (points.length <= 16 || isSelected) && (
                            <span
                              className={`text-[10px] font-bold mb-1 leading-none transition-opacity ${
                                isSelected
                                  ? 'text-accent'
                                  : 'text-secondary group-hover:text-primary'
                              }`}
                            >
                              {pt.totalViews}
                            </span>
                          )}

                          {/* Columna apilada */}
                          <div
                            className={`w-full max-w-[34px] rounded-t-md overflow-hidden flex flex-col justify-end transition-all duration-300 ${
                              isSelected ? 'ring-2 ring-accent/50 shadow-sm' : ''
                            }`}
                            style={{
                              height: pt.totalViews > 0 ? `${Math.max(totalPct, 3)}%` : '2px',
                              backgroundColor:
                                pt.totalViews === 0 ? 'rgba(148, 163, 184, 0.25)' : undefined,
                            }}
                          >
                            {pt.productViews > 0 && (
                              <div
                                className="w-full bg-purple-500 transition-all duration-300"
                                style={{ height: `${productPct}%` }}
                              />
                            )}
                            {pt.storeViews > 0 && (
                              <div
                                className="w-full bg-blue-500 transition-all duration-300"
                                style={{ height: `${storePct}%` }}
                              />
                            )}
                          </div>

                          {/* Etiqueta eje X */}
                          <span
                            className={`absolute -bottom-6 text-[10px] whitespace-nowrap transition-colors ${
                              showLabel ? 'opacity-100' : 'opacity-0 pointer-events-none'
                            } ${isSelected ? 'font-bold text-accent' : 'text-secondary'}`}
                          >
                            {pt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle del punto seleccionado + Leyenda */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/70">
            {activePoint && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                <span className="font-bold text-primary">{activePoint.fullLabel}:</span>
                <span className="text-secondary">
                  Total:{' '}
                  <strong className="text-primary">
                    {activePoint.totalViews.toLocaleString()}
                  </strong>
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  Tiendas: <strong>{activePoint.storeViews.toLocaleString()}</strong>
                </span>
                <span className="text-purple-600 dark:text-purple-400">
                  Productos: <strong>{activePoint.productViews.toLocaleString()}</strong>
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Referidos: <strong>{activePoint.referralViews.toLocaleString()}</strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-3 text-[11px] text-secondary flex-shrink-0">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                Tiendas
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                Productos
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
