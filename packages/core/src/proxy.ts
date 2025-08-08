import type { ZodType } from 'zod/v4';
import { createArrayMutator, createDeleteTrap, createGetTrap, createSetTrap } from './trap.js';
import type { SetTrapOptions } from './types.js';

export function createProxyHandler<T, S extends ZodType>(options: SetTrapOptions<T, S>) {
  const { deferred, recursive } = options;

  const proxyHandler = {
    set: createSetTrap(options),
    deleteProperty: createDeleteTrap(options),
  } as ProxyHandler<Record<string, unknown>>;

  if (recursive && deferred) {
    proxyHandler.get = createGetTrap(options);
  }

  return proxyHandler;
}

export function createArrayProxyHandler<T, S extends ZodType>(options: SetTrapOptions<T, S>) {
  const mutator = createArrayMutator(options);
  return createProxyHandler<T, S>({ ...options, mutator });
}
