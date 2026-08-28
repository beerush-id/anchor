import { classx, Show, template } from '@airlib/react';
import { MAX_PLAYERS, type RoomStats } from '@/pages/demos/temporal/function.js';

export interface StatsOverlayProps {
  stats: RoomStats;
  connected?: boolean;
  playerName?: string;
}

/**
 * Floating room stats HUD.
 */
export const StatsOverlay = template<StatsOverlayProps>(
  ({ stats, connected, playerName }) => (
    <div className="pointer-events-none absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3">
      {/* Left: Branding & Connection */}
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-slate-800/80 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur-md">
        <div className="relative flex h-3 w-3 items-center justify-center">
          <span
            className={classx(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-75',
              connected ? 'bg-emerald-400' : 'bg-amber-400'
            )}
          />
          <span
            className={classx(
              'relative inline-flex h-2 w-2 rounded-full',
              connected ? 'bg-emerald-500' : 'bg-amber-500'
            )}
          />
        </div>
        <div>
          <div className="text-xs font-semibold text-slate-200">
            Temporal World <span className="text-[10px] text-sky-400 font-normal">AirLib DO Demo</span>
          </div>
          <Show when={() => connected && playerName}>
            {(name) => (
              <div className="text-[11px] text-slate-400">
                Playing as <span className="font-medium text-slate-200">{name}</span>
              </div>
            )}
          </Show>
        </div>
      </div>

      {/* Right: Metrics Counter */}
      <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-slate-800/80 bg-slate-900/90 px-4 py-2.5 shadow-xl backdrop-blur-md">
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Online</div>
          <div className="text-sm font-bold text-sky-400">
            {stats.activeCount} <span className="text-xs text-slate-500 font-normal">/ {MAX_PLAYERS}</span>
          </div>
        </div>
        <div className="h-7 w-px bg-slate-800" />
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total Joined</div>
          <div className="text-sm font-bold text-slate-200">{stats.totalJoined}</div>
        </div>
      </div>
    </div>
  ),
  'StatsOverlay'
);
