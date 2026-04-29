import { AsyncStore, getContext, setContext, shortId } from '@anchorlib/core';
import type { FC, ReactNode } from 'react';

/**
 * @deprecated use setContext() at the setup component instead.
 *
 * Creates a context provider component for managing scoped context values.
 *
 * This function generates a React provider component that manages context values
 * using a unique symbol identifier. It provides automatic cleanup and restoration
 * of previous context values when the provider unmounts.
 *
 * @template T - The type of value to be stored in the context
 * @param key - A unique symbol identifier for the context. Defaults to a generated symbol.
 * @param displayName - Optional display name for the provider component for debugging purposes
 * @returns A React functional component that provides context scoping
 */
export function contextProvider<T>(key: symbol = Symbol(shortId()), displayName?: string) {
  function Provider({ value, children }: { value: T; children: ReactNode }) {
    const prev = getContext(key);
    setContext(key, value);

    const Restore = () => <>{setContext(key, prev)}</>;
    Restore.displayName = `Exit Context(${displayName || 'Anonymous'})`;

    return (
      <>
        {children}
        <Restore />
      </>
    );
  }

  Provider.displayName = `Enter Context(${displayName || 'Anonymous'})`;

  return Provider as FC<{ value: T; children: ReactNode }>;
}

const RENDER_CONTEXT_KEY = Symbol('render-context');

export class RenderContext extends AsyncStore {
  constructor(
    public name?: string,
    parent?: AsyncStore
  ) {
    super(parent);
  }
}

export function setRenderCtx(context?: RenderContext) {
  setContext(RENDER_CONTEXT_KEY, context);
}

export function getRenderCtx() {
  return getContext(RENDER_CONTEXT_KEY);
}
