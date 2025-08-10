import { type ZodArray, type ZodObject, ZodType } from 'zod/v4';
import type { AnchorOptions, ObjLike, StateChange, StateMutation } from '@anchor/core';
import { anchor, derive, logger } from '@anchor/core';
import { useEffect, useMemo, useState } from 'react';

export type Dependency<T> =
  | keyof T
  | StateMutation
  | {
      path?: keyof T;
      type?: StateMutation;
    };
export type Dependencies<T> = Dependency<T>[];
export type UseAnchorOptions<T, S extends ZodType> = AnchorOptions<S> & {
  deps?: Dependencies<T>;
};
export type DerivedMemoDeps<T> = Array<Dependency<T> | unknown>;
export type StateOutput<T> = [T, StateChange];

export function useAnchor<T>(init: T, deps?: Dependencies<T>): [T, StateChange];
export function useAnchor<T, S extends ZodType = ZodType>(init: T, options?: UseAnchorOptions<T, S>): [T, StateChange];
export function useAnchor<T, S extends ZodType = ZodType>(
  init: T,
  options?: UseAnchorOptions<T, S> | Dependencies<T>
): [T, StateChange] {
  const [[initRef, optionsRef]] = useState([init, options]);
  const [eventRef, setEventRef] = useState<StateChange>({ type: 'init', keys: [] });
  const [stateRef] = useMemo<[T]>(() => {
    logger.verbose('[react:use] Creating state:', init);

    const initOptions = !Array.isArray(options) ? options : {};
    return [anchor(init, initOptions)];
  }, [initRef, optionsRef]);

  useEffect(() => {
    const controller = derive.resolve(stateRef);
    const dependencies = Array.isArray(options) ? options : options?.deps;

    const unsubscribe = controller?.subscribe((newValue, event) => {
      if (event?.type === 'init') {
        logger.verbose('[react:use] Reactive state initialized:', newValue);
      } else {
        if (shouldRender(event, dependencies)) {
          logger.verbose('[react:use] State changed:', event);
          setEventRef(event);
        }
      }
    });

    return () => {
      logger.verbose('[react:use] Leaving state:', stateRef);
      unsubscribe?.();
    };
  }, [stateRef]);

  return [stateRef, eventRef];
}

export function useObject<T extends ObjLike>(init: T, deps?: Dependencies<T>): [T, StateChange];
export function useObject<T extends ObjLike, S extends ZodObject = ZodObject>(
  init: T,
  options?: UseAnchorOptions<T, S>
): [T, StateChange];
export function useObject<T extends ObjLike, S extends ZodObject = ZodObject>(
  init: T,
  options?: UseAnchorOptions<T, S> | Dependencies<T>
): [T, StateChange] {
  return useAnchor(init, options as Dependencies<T>);
}

export function useArray<T extends unknown[]>(init: T, deps?: Dependencies<T>): [T, StateChange];
export function useArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T,
  options?: UseAnchorOptions<T, S>
): [T, StateChange];
export function useArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T,
  options?: UseAnchorOptions<T, S> | Dependencies<T>
): [T, StateChange] {
  return useAnchor<T, S>(init, options as UseAnchorOptions<T, S>);
}

export function useFlatArray<T extends unknown[]>(init: T, deps?: Dependencies<T>): [T, StateChange];
export function useFlatArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T,
  options?: UseAnchorOptions<T, S>
): [T, StateChange];
export function useFlatArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T,
  options?: UseAnchorOptions<T, S> | Dependencies<T>
): [T, StateChange] {
  return useAnchor<T, S>(init, { ...options, recursive: 'flat' } as UseAnchorOptions<T, S>);
}

export function useDerived<T>(state: T, deps?: Dependencies<T>): StateOutput<T>;
export function useDerived<T, R>(state: T, transform?: (state: T) => R): StateOutput<R>;
export function useDerived<T, R>(state: T, transform?: (state: T) => R, deps?: Dependencies<T>): StateOutput<R>;
export function useDerived<T, R>(
  state: T,
  transform?: ((state: T) => R) | Dependencies<T>,
  deps?: Dependencies<T>
): StateOutput<T | R> {
  const [eventRef, setEventRef] = useState({ type: 'init', keys: [] } as StateChange);
  const [derivedRef] = useMemo(() => {
    return [typeof transform === 'function' ? transform(state) : state];
  }, [eventRef, state, transform, deps]);

  useEffect(() => {
    const controller = derive.resolve(state);
    const dependencies = Array.isArray(transform) ? transform : deps;

    if (typeof controller?.subscribe !== 'function') {
      logger.warn('[react:derived] Trying to derive from non-reactive state:', state);
    }

    const unsubscribe = controller?.subscribe((snapshot, event) => {
      if (event?.type === 'init') {
        logger.verbose('[react:derived] State derived:', snapshot);
      } else if (shouldRender(event, dependencies)) {
        logger.verbose('[react:derived] State changed:', event);
        setEventRef(event);
      }
    });

    return () => {
      logger.verbose('[react:derived] Leaving state:', state);
      unsubscribe?.();
    };
  }, [state]);

  return [derivedRef, eventRef];
}

export function useDerivedMemo<T>(state: T, deps: DerivedMemoDeps<T>, props?: Dependencies<T>): StateOutput<T>;
export function useDerivedMemo<T, R>(
  state: T,
  transform: (state: T) => R,
  deps: DerivedMemoDeps<T>,
  props?: Dependencies<T>
): StateOutput<R>;
export function useDerivedMemo<T, R>(
  state: T,
  transform?: ((state: T) => R) | DerivedMemoDeps<T>,
  deps?: DerivedMemoDeps<T>
): StateOutput<T | R> {
  const initDeps = (Array.isArray(transform) ? transform : deps) as Dependency<T>[];
  const [stateRef, eventRef] = useDerived(state);

  const output = useMemo(() => {
    return typeof transform === 'function' ? transform(stateRef) : stateRef;
  }, [eventRef, ...(initDeps ?? [])]);

  return [output, eventRef];
}

const shouldRender = <T>(event: StateChange, dependencies?: Dependency<T>[]) => {
  if (!dependencies) return true;
  const path = event.keys.join('.');

  for (const dep of dependencies) {
    if (typeof dep === 'string') {
      return path === dep || event.type === dep;
    } else if (typeof dep === 'object') {
      const { path, type } = dep;

      if (path && type) {
        return path === path && event.type === type;
      } else {
        return event.type === type || path === path;
      }
    }
  }

  return false;
};

export { anchor, derive };
