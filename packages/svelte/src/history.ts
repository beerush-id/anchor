import type { HistoryOptions, HistoryState, State } from '@anchorlib/core';
import { history } from '@anchorlib/core';

/**
 * Creates a readable Svelte store that reflects the history state of a given Anchor state.
 * @param state The initial Anchor state.
 * @param options Optional history options.
 * @returns A readable Svelte store containing the history state.
 */
export function historyRef<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  return history(state, options);
}
