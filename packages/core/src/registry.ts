import type {
  Linkable,
  LinkableSchema,
  StateController,
  StateReferences,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';

export const INIT_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const STATE_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const CONTROLLER_REGISTRY = new WeakMap<WeakKey, StateController<unknown>>();
export const REFERENCE_REGISTRY = new WeakMap<WeakKey, StateReferences<Linkable, LinkableSchema>>();
export const SUBSCRIBER_REGISTRY = new WeakMap<WeakKey, StateSubscriberList<unknown>>();
export const SUBSCRIPTION_REGISTRY = new WeakMap<WeakKey, StateSubscriptionMap>();

export const STATE_BUSY_LIST = new WeakSet<WeakKey>();
