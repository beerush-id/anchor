import { history, type HistoryOptions, type HistoryState, type State } from '@anchor/core';
import type { Ref } from 'vue';
import { derivedRef } from './derive.js';

/**
 * Creates a Vue ref that wraps a history state object.
 *
 * This function takes a state object and optional history options, creates a history state
 * using the core history functionality, and wraps it in a Vue ref for reactive usage.
 *
 * @template T - The type of the state object that extends State
 * @param state - The initial state object
 * @param options - Optional configuration for the history behavior
 * @returns A Vue ref containing the history state
 */
export function historyRef<T extends State>(state: T, options?: HistoryOptions): Ref<HistoryState> {
  const historyState = history(state, options);
  return derivedRef(historyState);
}
