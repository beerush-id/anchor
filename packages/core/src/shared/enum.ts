import type { Enum } from '../types.js';

export const ArrayMutations = {
  POP: 'pop',
  SORT: 'sort',
  PUSH: 'push',
  FILL: 'fill',
  SHIFT: 'shift',
  SPLICE: 'splice',
  UNSHIFT: 'unshift',
  REVERSE: 'reverse',
  COPY_WITHIN: 'copyWithin',
} as const;

export type ArrayMutations = Enum<typeof ArrayMutations>;

export const ObjectMutations = {
  SET: 'set',
  DELETE: 'delete',
} as const;

export type ObjectMutations = Enum<typeof ObjectMutations>;

export const BatchMutations = {
  CLEAR: 'clear',
  ASSIGN: 'assign',
  REMOVE: 'remove',
  REPLACE: 'replace',
} as const;

export type BatchMutations = Enum<typeof BatchMutations>;

export const MapMutations = {
  SET: 'map:set',
  CLEAR: 'map:clear',
  DELETE: 'map:delete',
} as const;

export type MapMutations = Enum<typeof MapMutations>;

export const SetMutations = {
  ADD: 'set:add',
  CLEAR: 'set:clear',
  DELETE: 'set:delete',
} as const;

export type SetMutations = Enum<typeof SetMutations>;

export const Linkables = {
  MAP: 'map',
  SET: 'set',
  ARRAY: 'array',
  OBJECT: 'object',
} as const;

export type Linkables = Enum<typeof Linkables>;

export const OBSERVER_KEYS = {
  OWN_KEYS: '--anchor_own_keys--',
  ARRAY_MUTATIONS: '--anchor_array_mutations--',
  COLLECTION_MUTATIONS: '--anchor_collection_mutations--',
} as const;

export type OBSERVER_KEYS = Enum<typeof OBSERVER_KEYS>;
