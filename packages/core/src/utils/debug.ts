import { isFunction } from '@beerush/utils';

export type DebugFn = (...args: unknown[]) => void;

let currentDebugger: DebugFn | undefined = undefined;

export function setDebugger(debugFn: DebugFn | undefined) {
  if (typeof debugFn !== 'function' && debugFn !== undefined) {
    throw new Error('Debug function must be a function or undefined');
  }

  let restored = false;

  const prevDebugger = currentDebugger;
  currentDebugger = debugFn;

  return () => {
    if (!restored) {
      currentDebugger = prevDebugger;
      restored = true;
    }
  };
}

export function withDebugger<R>(fn: () => R, debugFn: DebugFn): R {
  const restoreDebugger = setDebugger(debugFn);

  let result: R | undefined = undefined;

  try {
    result = fn();
  } catch (error) {
    currentDebugger?.(error);
  }

  restoreDebugger();
  return result as R;
}

export interface Debugger {
  (...args: unknown[]): void;

  ok(message: string, ...extras: unknown[]): void;
  info(message: string, ...extras: unknown[]): void;
  check(message: string, condition: boolean, ...extras: unknown[]): void;
  error(message: string, ...extras: unknown[]): void;
  warning(message: string, ...extras: unknown[]): void;
}

const debugFn = ((...args: unknown[]) => {
  if (!currentDebugger) return;
  if (isFunction(currentDebugger)) {
    currentDebugger(...args);
  }
}) as Debugger;

debugFn.ok = (message: string, ...extras: unknown[]) => {
  if (!currentDebugger) return;
  return debugFn(`\x1b[32m✓ ${message}\x1b[0m`, ...extras);
};

debugFn.info = (message: string, ...extras: unknown[]) => {
  if (!currentDebugger) return;
  return debugFn(`\x1b[34mℹ ${message}\x1b[0m`, ...extras);
};

debugFn.check = (message: string, condition: boolean, ...extras: unknown[]) => {
  if (!currentDebugger) return;
  if (condition) {
    return debugFn(`\x1b[36m▣ ${message}\x1b[0m`, ...extras);
  }
  return debugFn(`\x1b[37m▢ ${message}\x1b[0m`, ...extras);
};

debugFn.error = (message: string, ...extras: unknown[]) => {
  if (!currentDebugger) return;
  return debugFn(`\x1b[31m✕ ${message}\x1b[0m`, ...extras);
};

debugFn.warning = (message: string, ...extras: unknown[]) => {
  if (!currentDebugger) return;
  return debugFn(`\x1b[33m! ${message}\x1b[0m`, ...extras);
};

export const debug = debugFn as Debugger;
