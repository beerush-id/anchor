import type { AnchorSettings } from './types.js';

export const SET_MUTATIONS = ['add', 'delete'] as const;
export const MAP_MUTATIONS = ['set', 'delete', 'clear'] as const;
export const BATCH_MUTATIONS = ['assign', 'remove', 'clear'] as const;
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
export const ANCHOR_SETTINGS = {
  cloned: false,
  strict: false,
  deferred: true,
  recursive: true,
  immutable: false,
  observable: true,
  production: true,
} satisfies AnchorSettings;

export enum OBSERVER_KEYS {
  ARRAY_MUTATIONS = 'array_mutations',
  COLLECTION_MUTATIONS = 'collection_mutations',
}

export const BATCH_MUTATION_KEYS = new Set(BATCH_MUTATIONS);
export const COLLECTION_MUTATION_KEYS = new Set([...MAP_MUTATIONS, ...SET_MUTATIONS]);
