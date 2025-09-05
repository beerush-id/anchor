import { derive, history, type HistoryOptions, type HistoryState, softEqual, type State } from '@anchor/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';

import { useMicrotask } from './hooks.js';

export type HistoryRef = {
  history: HistoryState;
  cleanup: () => void;
  options?: HistoryOptions;
};
/**
 * A React hook that provides history management for a given state.
 *
 * @template T - The type of the state extending from State
 * @param state - The initial state to track history for
 * @param options - Optional history configuration options
 * @returns The history state object containing current state, history methods, and navigation functions
 */
export function useHistory<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
  const [, setVersion] = useState(1);

  // Create reference map to hold the history states that being used in the current component.
  const historyRef = useRef(new Map<State, HistoryRef>()).current;
  // Create reference to hold the active history state.
  const currentRef = useRef<HistoryState>(null);

  // Use memo to create or switch between history states when the state or options changes.
  const historyState = useMemo(() => {
    let current = historyRef.get(state) as HistoryRef;

    if (!current) {
      // Initialize new history state if the state is not in the reference map.
      const newHistory = history(state, options);
      const unsubscribe = derive(newHistory, (_, event) => {
        if (event.type !== 'init' && currentRef.current === newHistory) {
          setVersion((prev) => prev + 1);
        }
      });

      current = { history: newHistory, cleanup: unsubscribe, options };
      historyRef.set(state, current);
    } else if (options && !softEqual(options, current.options)) {
      // Cleanup the existing history state if the options have changed before re-creating.
      current.history.destroy();
      current.cleanup();

      // Re-create the history state if the options have changed.
      current.history = history(state, options);
      current.options = options;
      current.cleanup = derive(state, (_, event) => {
        if (event.type !== 'init') {
          setVersion((c) => c + 1);
        }
      });
    }

    currentRef.current = current.history;
    return currentRef.current;
  }, [state, options]);

  useEffect(() => {
    // Prevent cleanup if the component is unmounted and remounted quickly (e.g., in Strict Mode).
    cancelCleanup();

    return () => {
      // Cleanup the history when the component is truly unmounted.
      cleanup(() => {
        for (const ref of historyRef.values()) {
          ref.history.destroy();
          ref.cleanup?.();
        }

        historyRef.clear();
      });
    };
  }, []);

  return historyState;
}
