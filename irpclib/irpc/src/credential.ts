import { AsyncStore, getContext } from '@anchorlib/core';
import { IRPC_BASE_CONTEXT } from './enum.js';
import type { IRPCCredentials } from './types.js';

export function createCredentials(seeds: IRPCCredentials) {
  return new AsyncStore(seeds);
}

export function getCredentials() {
  return getContext<AsyncStore>(IRPC_BASE_CONTEXT.CREDENTIALS)!;
}

export function credential<V>(key: string): V | undefined {
  return getCredentials()?.get(key);
}
