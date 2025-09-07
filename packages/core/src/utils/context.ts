import type { KeyLike } from '../types.js';
import { captureStack } from '../exception.js';
import { anchor } from '../anchor.js';

export type Context<K extends KeyLike, V> = Map<K, V>;

let currentContext: Context<KeyLike, unknown> | undefined = undefined;
let currentRestore: (() => void) | undefined = undefined;

export function activateContext<K extends KeyLike, V>(context: Context<K, V>): () => void {
  if (currentContext === context) return currentRestore as () => void;

  let restored = false;
  const prevContext = currentContext;
  const prevRestore = currentRestore;

  currentContext = context;
  currentRestore = () => {
    if (!restored) {
      restored = true;
      currentContext = prevContext;
      currentRestore = prevRestore;
    }
  };

  return currentRestore;
}

export function getActiveContext() {
  return currentContext;
}

export function createContext<K extends KeyLike, V>(init?: [K, V][]) {
  return anchor(new Map<K, V>(init), { recursive: false });
}

export function withinContext<K extends KeyLike, V, T>(context: Map<K, V>, fn: () => T): T {
  activateGlobalContext();

  const restore = activateContext(context);

  try {
    return fn();
  } finally {
    restore();
  }
}

export function setContext<V, K extends KeyLike = KeyLike>(key: K, value: V): void {
  activateGlobalContext();

  if (!currentContext) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Set context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  currentContext.set(key, value);
}

export function getContext<V, K extends KeyLike = KeyLike>(key: K): V | undefined {
  activateGlobalContext();

  if (!currentContext) {
    const error = new Error('Outside of context.');
    captureStack.error.external(
      'Get context is called outside of context. Make sure you are calling it within a context.',
      error
    );
    return;
  }

  return currentContext.get(key) as V | undefined;
}

let globalContextActivated = false;

export function activateGlobalContext() {
  if (globalContextActivated || typeof window === 'undefined') return;

  activateContext(createContext());
  globalContextActivated = true;
}

export function deactivateGlobalContext() {
  if (!globalContextActivated) return;

  globalContextActivated = false;
  currentContext = undefined;
}
