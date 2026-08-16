import { vi } from 'vitest';

/**
 * Shared chokidar stub for watcher tests. Watchers are keyed by the directory
 * they watch, so events route to the watcher that owns the file's parent —
 * deterministic, no real filesystem timing.
 */
const hoisted = vi.hoisted(() => {
  const watchers = new Map<
    string,
    { handlers: Map<string, (p: string) => void>; emit: (ev: string, p: string) => void }
  >();
  const watch = (dir: string) => {
    const handlers = new Map<string, (p: string) => void>();
    const watcher = {
      handlers,
      emit: (ev: string, p: string) => handlers.get(ev)?.(p),
      on: (ev: string, cb: (p: string) => void) => handlers.set(ev, cb),
      once: (ev: string, cb: (p: string) => void) => handlers.set(ev, cb),
      close: () => undefined,
    };
    watchers.set(dir, watcher);
    return watcher;
  };
  return { watchers, watch };
});

vi.mock('chokidar', () => ({
  default: { watch: (dir: string) => hoisted.watch(dir) },
}));

/** The stub's watcher registry, keyed by watched directory. */
export const chokidarState = hoisted;
