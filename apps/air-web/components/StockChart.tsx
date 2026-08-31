import { classx, derived, mutable, Show, Snippet, setup } from '@airlib/react';
import type { MouseEvent } from 'react';
import type { StockItem, TimeInterval } from './StockTable.js';

export interface StockChartProps {
  item: StockItem;
  className?: string;
}

/**
 * Interactive SVG stock chart showing price history, time intervals, and market stats.
 */
export const StockChart = setup<StockChartProps>((props) => {
  const state = mutable({
    interval: '1D' as TimeInterval,
    hoveredIndex: -1,
  });

  const displayPrice = derived(() => {
    const history = props.item?.history;
    const hovered = state.hoveredIndex;
    if (hovered >= 0 && history?.[hovered] !== undefined) {
      return history[hovered];
    }
    return props.item?.price ?? 0;
  });

  const changeInfo = derived(() => {
    const change = props.item?.change ?? 0;
    const pct = props.item?.changePercent ?? 0;
    const isPositive = change >= 0;
    return {
      text: `${isPositive ? '+' : ''}$${Math.abs(change).toFixed(2)} (${pct.toFixed(2)}%)`,
      className: isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
    };
  });

  return () => (
    <div className={classx('flex h-full flex-col justify-between gap-3.5 p-3.5 sm:p-5 lg:p-6', props.className)}>
      {/* Header & Intervals */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Snippet data={() => props.item?.symbol}>
              {(symbol) => <span className="font-mono text-xl sm:text-2xl font-bold text-on-surface">{symbol}</span>}
            </Snippet>
            <Snippet data={() => props.item?.name}>
              {(name) => (
                <span className="rounded-md border border-border bg-surface-variant px-1.5 py-0.5 text-[11px] text-on-surface-variant">
                  {name}
                </span>
              )}
            </Snippet>
          </div>

          <div className="mt-0.5 flex items-baseline gap-2">
            <Snippet data={() => displayPrice.value}>
              {(price) => (
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-on-surface">
                  ${formatNumber(price)}
                </span>
              )}
            </Snippet>

            <Snippet data={() => changeInfo.value}>
              {({ text, className }) => (
                <span className={classx('font-mono text-xs sm:text-sm font-semibold', className)}>{text}</span>
              )}
            </Snippet>
          </div>
        </div>

        <div className="flex rounded-lg border border-border bg-surface-variant p-0.5 sm:p-1">
          <Snippet data={() => state.interval}>
            {(activeInterval) =>
              (['1D', '1W', '1M', '1Y', 'ALL'] as TimeInterval[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => (state.interval = tab)}
                  className={classx(
                    'rounded-md px-2 py-0.5 sm:px-2.5 sm:py-1 text-xs font-semibold transition-all cursor-pointer',
                    activeInterval === tab
                      ? 'bg-surface text-primary shadow-xs'
                      : 'text-on-surface-variant hover:text-on-surface'
                  )}
                >
                  {tab}
                </button>
              ))
            }
          </Snippet>
        </div>
      </div>

      {/* SVG Area Chart */}
      <div className="relative my-auto flex h-36 sm:h-44 lg:h-48 w-full items-center justify-center">
        <StockAreaChart item={props.item} state={state} />
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-2 gap-2.5 border-t border-border pt-3 sm:grid-cols-4 sm:pt-4">
        <div>
          <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
            24h High
          </span>
          <Snippet data={() => props.item?.high24h}>
            {(high) => (
              <span className="font-mono text-xs font-semibold text-on-surface">${formatNumber(high ?? 0)}</span>
            )}
          </Snippet>
        </div>
        <div>
          <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
            24h Low
          </span>
          <Snippet data={() => props.item?.low24h}>
            {(low) => (
              <span className="font-mono text-xs font-semibold text-on-surface">${formatNumber(low ?? 0)}</span>
            )}
          </Snippet>
        </div>
        <div>
          <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
            24h Volume
          </span>
          <Snippet data={() => props.item?.volume}>
            {(volume) => <span className="font-mono text-xs font-semibold text-on-surface">{volume}</span>}
          </Snippet>
        </div>
        <div>
          <span className="block text-[10px] sm:text-[11px] font-medium uppercase tracking-wider text-on-surface-variant">
            Market Cap
          </span>
          <Snippet data={() => props.item?.marketCap}>
            {(marketCap) => <span className="font-mono text-xs font-semibold text-on-surface">{marketCap}</span>}
          </Snippet>
        </div>
      </div>
    </div>
  );
});

export interface StockAreaChartProps {
  item: StockItem;
  state: { hoveredIndex: number };
}

export const StockAreaChart = setup<StockAreaChartProps>((props) => {
  const width = 500;
  const height = 200;
  const paddingY = 20;

  const points = derived(() => {
    const history = props.item?.history;
    if (!history || history.length < 2) return [];

    const min = Math.min(...history);
    const max = Math.max(...history);
    const range = max - min || 1;

    return history.map((val, i) => ({
      x: (i / (history.length - 1)) * width,
      y: height - paddingY - ((val - min) / range) * (height - paddingY * 2),
      val,
    }));
  });

  const linePath = derived(() => buildSmoothPath(points.value));
  const areaPath = derived(() => {
    const path = linePath.value;
    return path ? `${path} L ${width} ${height} L 0 ${height} Z` : '';
  });

  const isPositive = derived(() => (props.item?.change ?? 0) >= 0);
  const strokeColor = derived(() => (isPositive.value ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)'));
  const gradientId = derived(() => `chart-gradient-${isPositive.value ? 'green' : 'red'}`);

  const activePoint = derived(() => {
    const pts = points.value;
    const idx = props.state.hoveredIndex;
    return idx >= 0 && pts[idx] ? { point: pts[idx], color: strokeColor.value } : null;
  });

  const handleMouseMove = (e: MouseEvent<SVGSVGElement>) => {
    const pts = points.value;
    if (!pts.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = (e.clientX - rect.left) / rect.width;
    const index = Math.round(relX * (pts.length - 1));
    props.state.hoveredIndex = Math.max(0, Math.min(pts.length - 1, index));
  };

  return () => (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-full w-full overflow-visible"
      preserveAspectRatio="none"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => (props.state.hoveredIndex = -1)}
    >
      <Snippet data={() => ({ id: gradientId.value, color: strokeColor.value })}>
        {({ id, color }) => (
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.25" />
              <stop offset="100%" stopColor={color} stopOpacity="0.0" />
            </linearGradient>
          </defs>
        )}
      </Snippet>

      <line
        x1="0"
        y1={paddingY}
        x2={width}
        y2={paddingY}
        stroke="currentColor"
        strokeDasharray="3 3"
        className="text-border/40"
      />
      <line
        x1="0"
        y1={height / 2}
        x2={width}
        y2={height / 2}
        stroke="currentColor"
        strokeDasharray="3 3"
        className="text-border/40"
      />
      <line
        x1="0"
        y1={height - paddingY}
        x2={width}
        y2={height - paddingY}
        stroke="currentColor"
        strokeDasharray="3 3"
        className="text-border/40"
      />

      <Snippet data={() => ({ d: areaPath.value, id: gradientId.value })}>
        {({ d, id }) => <path d={d} fill={`url(#${id})`} />}
      </Snippet>

      <Snippet data={() => ({ d: linePath.value, color: strokeColor.value })}>
        {({ d, color }) => <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
      </Snippet>

      <Show when={() => activePoint.value}>
        {({ point, color }) => (
          <g>
            <line
              x1={point.x}
              y1={0}
              x2={point.x}
              y2={height}
              stroke="currentColor"
              strokeDasharray="2 2"
              className="text-on-surface-variant/40"
            />
            <circle cx={point.x} cy={point.y} r="5" fill={color} className="stroke-surface stroke-2" />
          </g>
        )}
      </Show>
    </svg>
  );
});

function buildSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return '';

  let d = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? i : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return d;
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
