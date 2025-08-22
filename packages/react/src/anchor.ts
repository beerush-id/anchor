import type { ZodArray, ZodObject } from 'zod/v4';
import type { AnchorOptions, Linkable, LinkableSchema, ObjLike, StateChange } from '@anchor/core';
import { anchor, derive } from '@anchor/core';
import { useEffect, useMemo, useState } from 'react';
import type { Dependencies, Derived, InitFn, InitOptions } from './types.js';
import { shouldRender } from './utils.js';

export function useAnchor<T extends Linkable>(init: T | InitFn<T>, deps?: Dependencies<T>): Derived<T>;
export function useAnchor<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<T>;
export function useAnchor<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S> | Dependencies<T>
): Derived<T> {
  const [eventRef, setEventRef] = useState<StateChange>({ type: 'init', keys: [] });
  const [state, snapshot] = useMemo(() => {
    const initOptions = !Array.isArray(options) ? (options as AnchorOptions<S>) : {};

    if (typeof init === 'function') {
      const stateRef = anchor((init as InitFn<T>)(), initOptions);
      return [stateRef, anchor.get(stateRef)];
    }

    const stateRef = anchor(init, initOptions);
    return [stateRef, anchor.get(stateRef)];
  }, [init, options]);

  useEffect(() => {
    const controller = derive.resolve(state);
    const dependencies = Array.isArray(options) ? options : options?.deps;

    const unsubscribe = controller?.subscribe((newValue, event) => {
      if (event.type !== 'init' && shouldRender(event, dependencies)) {
        setEventRef(event);
      }
    });

    return () => {
      unsubscribe?.();
    };
  }, [state]);

  return [state, eventRef, snapshot];
}

export function useObject<T extends ObjLike>(init: T | InitFn<T>, deps?: Dependencies<T>): Derived<T>;
export function useObject<T extends ObjLike, S extends ZodObject = ZodObject>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<T>;
export function useObject<T extends ObjLike, S extends ZodObject = ZodObject>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S> | Dependencies<T>
): Derived<T> {
  return useAnchor(init, options as Dependencies<T>);
}

export function useArray<T extends unknown[]>(init: T | InitFn<T>, deps?: Dependencies<T>): Derived<T>;
export function useArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<T>;
export function useArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S> | Dependencies<T>
): Derived<T> {
  return useAnchor<T, S>(init, options as InitOptions<T, S>);
}

export function useFlatArray<T extends unknown[]>(init: T | InitFn<T>, deps?: Dependencies<T>): Derived<T>;
export function useFlatArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<T>;
export function useFlatArray<T extends unknown[], S extends ZodArray = ZodArray>(
  init: T | InitFn<T>,
  optionDeps?: InitOptions<T, S> | Dependencies<T>
): Derived<T> {
  if (Array.isArray(optionDeps)) {
    return useAnchor(init, { deps: optionDeps, recursive: 'flat' });
  }

  return useAnchor<T, S>(init, { ...optionDeps, recursive: 'flat' } as InitOptions<T, S>);
}
