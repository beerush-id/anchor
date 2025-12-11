import type { HistoryOptions, HistoryState, State } from '@anchorlib/core';
import { history } from '@anchorlib/core';

/**
 * @deprecated Use 'history()' instead.
 * Creates a reactive state that reflects the history state of a given Anchor state.
 * @param state The initial Anchor state.
 * @param options Optional history options.
 * @returns A `HistoryState` object representing the state of the history.
 */
export function historyRef<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  return history(state, options);
}