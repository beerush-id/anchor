import { derive, history, type HistoryOptions, type HistoryState, type State } from '@anchor/core';
import { useEffect, useMemo, useState } from 'react';

/**
 * A React hook that provides history management for a given state.
 *
 * @template T - The type of the state extending from State
 * @param state - The initial state to track history for
 * @param options - Optional history configuration options
 * @returns The history state object containing current state, history methods, and navigation functions
 */
export function useHistory<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  const [, setVersion] = useState(1);
  const historyState = useMemo(() => {
    return history(state, options);
  }, [state, options]);

  useEffect(() => {
    return derive(historyState, (_, event) => {
      if (event.type !== 'init') {
        setVersion((c) => c + 1);
      }
    });
  }, [state, options]);

  return historyState;
}
