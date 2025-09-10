import type { HistoryOptions, HistoryState, State } from '@anchor/core';
import { history } from '@anchor/core';
import type { ConstantRef } from './types.js';
import { constantRef } from './ref.js';

/**
 * Creates a readable Svelte store that reflects the history state of a given Anchor state.
 * @param state The initial Anchor state.
 * @param options Optional history options.
 * @returns A readable Svelte store containing the history state.
 */
export function historyRef<T extends State>(state: T, options?: HistoryOptions): ConstantRef<HistoryState> {
  const historyState = history(state, options);
  return constantRef(historyState);
}
