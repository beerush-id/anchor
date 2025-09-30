import { history, type HistoryOptions, type HistoryState, type State } from '@anchorlib/core';

/**
 * Creates a reactive history state that can be used to provide undo/redo functionality.
 *
 * This function wraps the core history functionality and provides a SolidJS-compatible
 * interface for managing history state.
 *
 * @template T - The type of the state extending from State
 * @param state - The initial state value to be tracked in history
 * @param options - Optional configuration for history behavior
 * @returns A HistoryState object that provides reactive access to the history state
 */
export function historyRef<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  return history(state, options);
}
