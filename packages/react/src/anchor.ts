import {
  anchor,
  createDebugger,
  getDebugger,
  type Linkable,
  type LinkableSchema,
  microtask,
  softClone,
  softEqual,
  type StateOptions,
} from '@anchor/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnchorState, Setter } from './types.js';
import { DEV_MODE } from './dev.js';
import { CLEANUP_DEBOUNCE_TIME } from './constant.js';

// Dedicated state update list to work with Fast Refresh (HMR) support.
const UPDATE_LIST = new Set();

/**
 * Custom React hook that creates and manages an anchor state.
 *
 * This hook provides a way to create reactive state that can be shared across components
 * and automatically handles cleanup, fast refresh (HMR), and strict mode concerns.
 *
 * @template T - The type of the initial value, must extend Linkable
 * @template S - The schema type for the state, defaults to LinkableSchema
 *
 * @param init - The initial value for the state
 * @param options - Optional configuration for the state
 *
 * @returns A tuple containing the current state and a setter function
 */
export function useAnchor<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StateOptions<S>
): AnchorState<T, S> {
  const [cleanup, cancelCleanup] = useRef(microtask(CLEANUP_DEBOUNCE_TIME)).current;
  const [state, setState] = useState(() => {
    return anchor(init, options);
  });

  // Create a setter function for the current state.
  const setCurrent = useMemo(() => {
    return (newInit: T | Setter<T>, newOptions?: StateOptions<S>) => {
      // Mark the state as updating to allow the effect to destroy the previous state.
      if (DEV_MODE) {
        UPDATE_LIST.add(initRef);
      }

      // Create a new state and dispatch the new state into React's internal state.
      const newValue = typeof newInit === 'function' ? newInit(state) : newInit;
      setState(anchor(newValue, newOptions ?? options));
    };
  }, [state]);

  // In production, we don't need to worry about double-render from strict-mode or
  // state update during fast-refresh. This early return will optimize the code path.
  if (!DEV_MODE) {
    useEffect(() => {
      cancelCleanup();

      return () => {
        cleanup(() => {
          anchor.destroy(state);
        });
      };
    }, [state]);

    return [state, setCurrent];
  }

  // -- BEGIN_DEV_MODE -- //
  // Make sure to work with the underlying object instead of the proxy object
  // in case the used init is a reactive object.
  const existingInt = (anchor.get as (s: T, silent: boolean) => T)(init, true);
  if (existingInt) {
    init = existingInt;
  }

  // Dedicated logics to handle state in development mode.
  const debug = createDebugger('[useAnchor]', getDebugger());
  const [schedule] = useRef(microtask(0)).current;
  const initRef = useRef(softClone(init));
  const optionsRef = useRef(softClone(options));
  const stableRef = useRef(false);
  const mountedRef = useRef(false);

  // Mark the effect as unstable on every-render; unless the render
  // is an effect of updating state (setCurrent is called).
  // This step is necessary to prevent the state from being destroyed
  // during fast-refresh (HMR) and strict-mode (double render).
  if (!UPDATE_LIST.size) {
    stableRef.current = false;
  }

  useEffect(() => {
    // Should run only in dev mode.
    schedule(() => {
      // This step is necessary to mark the effect as stable, to allow the next effect
      // to destroy the live state when the component unmount.
      if (!stableRef.current) {
        stableRef.current = true;
        cancelCleanup();
        debug.check('State is stable:', stableRef.current, state);
      }

      // Make sure the fast-refresh updater only applies after the component is mounted.
      if (!mountedRef.current) {
        mountedRef.current = true;
        debug.ok('State activated:', state);
        return;
      }

      /**
       * Fast Refresh (HMR) support.
       * This block is dedicated to support fast-refresh (HMR) since custom hooks
       * doesn't natively update the state when the code changes.
       */
      if (UPDATE_LIST.has(initRef)) {
        UPDATE_LIST.delete(initRef);
        debug.ok('State updated:', state);
      } else if (!UPDATE_LIST.size) {
        if (init !== initRef.current || options !== optionsRef.current) {
          // This step will only run during fast-refresh (HMR).
          const needUpdate = !softEqual(init, initRef.current, true) || !softEqual(options, optionsRef.current);
          debug.check('State need update?', needUpdate, state);

          if (needUpdate) {
            initRef.current = softClone(init);
            optionsRef.current = softClone(options);
            setCurrent(init, options);
          }
        }
      }
    });
  }, [init, options]);

  useEffect(() => {
    return () => {
      debug.check('State is stable?', stableRef.current, state);
      // Destroy the live/previous state ONLY if the effect is stable. Stable effect is:
      // - Not called during fast-refresh (HMR) re-render.
      // - Is called during unmount.
      // - Always stable in production mode.
      if (stableRef.current) {
        cleanup(() => {
          anchor.destroy(state);
          debug.ok('State destroyed:', state);
        });
      }
    };
  }, [state]);

  return [state, setCurrent];
  // -- END_DEV_MODE -- //
}
