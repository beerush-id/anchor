import { classx, derived, For, mutable, render, Show, Snippet, setup } from '@airlib/react';
import { StockChart } from './StockChart.js';

export type TimeInterval = '1D' | '1W' | '1M' | '1Y' | 'ALL';

export interface StockItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: string;
  marketCap: string;
  high24h: number;
  low24h: number;
  history: number[];
}

export interface StockTableProps {
  items: StockItem[];
  className?: string;
}

/**
 * Real-time stock market table with integrated live asset charting.
 */
export const StockTable = setup<StockTableProps>((props) => {
  const state = mutable({
    selectedSymbol: props.items[0]?.symbol ?? '',
  });

  const selected = derived(() => {
    return props.items.find((item) => item.symbol === state.selectedSymbol) ?? props.items[0];
  });

  return render(() => (
    <div className={classx('flex flex-col gap-6 lg:flex-row lg:items-stretch', props.className)}>
      {/* Left: Market Overview List */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div className="text-sm font-semibold text-on-surface">Market Overview</div>
          <span className="text-xs text-on-surface-variant/70 italic">Simulated Demo Data</span>
        </div>

        <div className="divide-y divide-border/60 overflow-y-auto">
          <For each={() => props.items}>
            {(item) => {
              const active = derived(() => state.selectedSymbol === item.symbol);

              return (
                <button
                  key={item.symbol}
                  type="button"
                  onClick={() => (state.selectedSymbol = item.symbol)}
                  className={classx(
                    'flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition-colors',
                    active.value ? 'bg-surface-variant' : 'hover:bg-surface-variant/50'
                  )}
                >
                  {/* Ticker & Name */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={classx(
                          'font-mono text-sm font-bold',
                          active.value ? 'text-primary' : 'text-on-surface'
                        )}
                      >
                        {item.symbol}
                      </span>
                      <span className="truncate text-xs text-on-surface-variant">{item.name}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-on-surface-variant/80">Vol {item.volume}</div>
                  </div>

                  {/* Mini Sparkline */}
                  <div className="hidden sm:block">
                    <Snippet data={() => ({ history: item.history, isPos: item.change >= 0 })}>
                      {({ history, isPos }) => <Sparkline history={history} isPositive={isPos} />}
                    </Snippet>
                  </div>

                  {/* Price & Change */}
                  <div className="text-right">
                    <Snippet data={() => item.price}>
                      {(price) => (
                        <div className="font-mono text-sm font-semibold text-on-surface">${formatNumber(price)}</div>
                      )}
                    </Snippet>
                    <Snippet data={() => ({ change: item.change, pct: item.changePercent })}>
                      {({ change, pct }) => (
                        <span
                          className={classx(
                            'inline-flex items-center rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none',
                            change >= 0
                              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                              : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                          )}
                        >
                          {change >= 0 ? '+' : ''}
                          {pct.toFixed(2)}%
                        </span>
                      )}
                    </Snippet>
                  </div>
                </button>
              );
            }}
          </For>
        </div>
      </div>

      {/* Right: Delegated Stock Chart */}
      <div className="flex flex-1 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface">
        <Show when={() => selected.value}>{(item) => <StockChart item={item} />}</Show>
      </div>
    </div>
  ));
});

/**
 * Mini sparkline SVG for table rows.
 */
const Sparkline = ({ history, isPositive }: { history: number[]; isPositive: boolean }) => {
  if (!history || history.length < 2) return null;

  const width = 80;
  const height = 28;
  const min = Math.min(...history);
  const max = Math.max(...history);
  const range = max - min || 1;

  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - 2 - ((val - min) / range) * (height - 4);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const strokeColor = isPositive ? 'rgb(16, 185, 129)' : 'rgb(244, 63, 94)';

  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points.join(' ')}
      />
    </svg>
  );
};

function formatNumber(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
