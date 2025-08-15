import { type Context, useContext, useEffect, useMemo, useState } from 'react';
import { anchor, derive, logger, type StateChange } from '@anchor/core';
import { shouldRender } from './utils.js';
import type { Dependencies, Dependency, Derived, DerivedMemoDeps } from './types.js';

export function useDerived<T>(state: T, deps?: Dependencies<T>): Derived<T>;
export function useDerived<T, R>(state: T, transform?: (state: T) => R): Derived<R>;
export function useDerived<T, R>(state: T, transform?: (state: T) => R, deps?: Dependencies<T>): Derived<R>;
export function useDerived<T, R>(
  state: T,
  transformDeps?: ((state: T) => R) | Dependencies<T>,
  deps?: Dependencies<T>
): Derived<T | R> {
  const [eventRef, setEventRef] = useState({ type: 'init', keys: [] } as StateChange);
  const [derived, snapshot] = useMemo(() => {
    const derivedRef = typeof transformDeps === 'function' ? transformDeps(state) : state;
    return [derivedRef, anchor.get(state)];
  }, [state, transformDeps, deps]);

  useEffect(() => {
    const controller = derive.resolve(state);
    const dependencies = Array.isArray(transformDeps) ? transformDeps : deps;

    if (typeof controller?.subscribe !== 'function') {
      logger.warn('[react:derived] Trying to derive from non-reactive state:', state);
    }

    const unsubscribe = controller?.subscribe((snapshot, event) => {
      if (event.type === 'init') {
        logger.verbose('[react:derived] State derived:', snapshot);
      } else {
        if (shouldRender(event, dependencies)) {
          logger.verbose('[react:derived] State changed:', event);
          setEventRef(event);
        }
      }
    });

    return () => {
      logger.verbose('[react:derived] Leaving state:', state);
      unsubscribe?.();
    };
  }, [derived]);

  return [derived, eventRef, snapshot];
}

export function useDerivedContext<T>(context: Context<T>, deps?: Dependencies<T>): Derived<T>;
export function useDerivedContext<T, R>(context: Context<T>, transform?: (state: T) => R): Derived<R>;
export function useDerivedContext<T, R>(
  context: Context<T>,
  transform?: (state: T) => R,
  deps?: Dependencies<T>
): Derived<R>;
export function useDerivedContext<T, R>(
  context: Context<T>,
  transformDeps?: ((state: T) => R) | Dependencies<T>,
  deps?: Dependencies<T>
): Derived<T | R> {
  const state = useContext<T>(context);
  return useDerived(state, transformDeps as (state: T) => R, deps);
}

export function useDerivedMemo<T>(state: T, deps: DerivedMemoDeps<T>, props?: Dependencies<T>): Derived<T>;
export function useDerivedMemo<T, R>(
  state: T,
  transform: (state: T) => R,
  deps: DerivedMemoDeps<T>,
  props?: Dependencies<T>
): Derived<R>;
export function useDerivedMemo<T, R>(
  state: T,
  transform?: ((state: T) => R) | DerivedMemoDeps<T>,
  deps?: DerivedMemoDeps<T>
): Derived<T | R> {
  const initDeps = (Array.isArray(transform) ? transform : deps) as Dependency<T>[];
  const [stateRef, snapshot, eventRef] = useDerived(state);

  const output = useMemo(() => {
    return typeof transform === 'function' ? transform(stateRef) : stateRef;
  }, [eventRef, initDeps]);

  return [output, snapshot, eventRef];
}
