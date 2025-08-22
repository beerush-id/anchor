import type { input, output } from 'zod/v4';
import type { Immutable, Linkable, LinkableSchema } from '@anchor/core';
import type { Dependencies, Derived, InitFn, InitOptions } from './types.js';
import { useAnchor } from './anchor.js';

export function useModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T | InitFn<T>,
  deps?: Dependencies<T>
): Derived<output<S>>;
export function useModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<output<S>>;
export function useModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T,
  optionDeps?: InitOptions<T, S> | Dependencies<T>
): Derived<output<S>> {
  if (Array.isArray(optionDeps)) {
    return useAnchor(init as Linkable, {
      deps: optionDeps as Dependencies<Linkable>,
      schema,
    }) as Derived<output<S>>;
  }

  return useAnchor(init as Linkable, {
    ...(optionDeps as InitOptions<Linkable, S>),
    schema,
  }) as Derived<output<S>>;
}

export function useImmutableModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T | InitFn<T>,
  deps?: Dependencies<T>
): Derived<Immutable<output<S>>>;
export function useImmutableModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T | InitFn<T>,
  options?: InitOptions<T, S>
): Derived<Immutable<output<S>>>;
export function useImmutableModel<S extends LinkableSchema, T extends input<S>>(
  schema: S,
  init: T,
  optionDeps?: InitOptions<T, S> | Dependencies<T>
): Derived<Immutable<output<S>>> {
  if (Array.isArray(optionDeps)) {
    return useAnchor(init as Linkable, {
      deps: optionDeps as Dependencies<Linkable>,
      schema,
      immutable: true,
    }) as Derived<Immutable<output<S>>>;
  }

  return useAnchor(
    init as Linkable,
    {
      ...optionDeps,
      schema,
      immutable: true,
    } as never
  ) as Derived<Immutable<output<S>>>;
}
