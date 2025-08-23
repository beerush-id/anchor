import { history, type HistoryOptions, type HistoryState, type State } from '@anchor/core';
import type { Ref } from 'vue';
import { derivedRef } from './derive.js';

export function historyRef<T extends State>(state: T, options?: HistoryOptions): Ref<HistoryState> {
  const historyState = history(state, options);
  return derivedRef(historyState);
}
