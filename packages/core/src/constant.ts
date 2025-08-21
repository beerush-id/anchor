import type { AnchorConfig } from './types.js';

export const SET_MUTATIONS = ['add', 'delete'] as const;
export const MAP_MUTATIONS = ['set', 'delete', 'clear'] as const;
export const BATCH_MUTATIONS = ['assign', 'remove'] as const;
export const OBJECT_MUTATIONS = ['set', 'delete'] as const;
export const ARRAY_MUTATIONS = [
  'copyWithin',
  'fill',
  'pop',
  'push',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
] as const;

export const LINKABLE = new Set(['array', 'object', 'map', 'set']);
export const ANCHOR_CONFIG = {
  cloned: true,
  strict: false,
  deferred: true,
  recursive: true,
  immutable: false,
  observable: true,
} satisfies AnchorConfig;

export enum OBSERVER_KEYS {
  ARRAY_MUTATIONS = 'array_mutations',
  COLLECTION_MUTATIONS = 'collection_mutations',
}

export const LIST_MUTATIONS = new Set(ARRAY_MUTATIONS);
export const COLLECTION_MUTATIONS = new Set([...MAP_MUTATIONS, ...SET_MUTATIONS]);
