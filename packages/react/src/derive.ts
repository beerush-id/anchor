import { type Context, useContext, useEffect, useMemo, useState } from 'react';
import { anchor, captureStack, derive, type Linkable, type StateChange } from '@anchor/core';
import { shouldRender } from './utils.js';
import type { Dependencies, Dependency, Derived, DerivedMemoDeps, TransformFn } from './types.js';

export function useDerived<T extends Linkable>(state: T, deps?: Dependencies<T>): Derived<T>;
export function useDerived<T extends Linkable, R>(state: T, transform?: TransformFn<T, R>): Derived<R>;
export function useDerived<T extends Linkable, R>(
  state: T,
  transform?: TransformFn<T, R>,
  deps?: Dependencies<T>
): Derived<R>;
export function useDerived<T extends Linkable, R>(
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
      captureStack.warning.external(
        'Unable to derive from object',
        'Attempted to derive from non-reactive state.',
        'Object is not reactive'
      );
    }

    const unsubscribe = controller?.subscribe((snapshot, event) => {
      if (event.type !== 'init' && shouldRender(event, dependencies)) {
        setEventRef(event);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [derived]);

  return [derived, eventRef, snapshot];
}

export function useDerivedContext<T extends Linkable>(context: Context<T>, deps?: Dependencies<T>): Derived<T>;
export function useDerivedContext<T extends Linkable, R>(
  context: Context<T>,
  transform?: TransformFn<T, R>
): Derived<R>;
export function useDerivedContext<T extends Linkable, R>(
  context: Context<T>,
  transform?: TransformFn<T, R>,
  deps?: Dependencies<T>
): Derived<R>;
export function useDerivedContext<T extends Linkable, R>(
  context: Context<T>,
  transformDeps?: ((state: T) => R) | Dependencies<T>,
  deps?: Dependencies<T>
): Derived<T | R> {
  const state = useContext<T>(context);
  return useDerived(state, transformDeps as (snapshot: T) => R, deps);
}

export function useDerivedMemo<T extends Linkable>(
  state: T,
  deps: DerivedMemoDeps<T>,
  props?: Dependencies<T>
): Derived<T>;
export function useDerivedMemo<T extends Linkable, R>(
  state: T,
  transform: TransformFn<T, R>,
  deps: DerivedMemoDeps<T>,
  props?: Dependencies<T>
): Derived<R>;
export function useDerivedMemo<T extends Linkable, R>(
  state: T,
  transformDeps?: ((state: T) => R) | DerivedMemoDeps<T>,
  deps?: DerivedMemoDeps<T>
): Derived<T | R> {
  const initDeps = (Array.isArray(transformDeps) ? transformDeps : deps) as Dependency<T>[];
  const [stateRef, snapshot, eventRef] = useDerived(state);

  const output = useMemo(() => {
    return typeof transformDeps === 'function' ? transformDeps(stateRef) : stateRef;
  }, [eventRef, initDeps]);

  return [output, snapshot, eventRef];
}
