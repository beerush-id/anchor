import type { StateController, StateSubscriberList, StateSubscriptionMap } from './types.js';

export const STATE_REGISTRY = new WeakMap<WeakKey, StateController<unknown>>();
export const INIT_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const REFLECT_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const SUBSCRIBER_REGISTRY = new WeakMap<WeakKey, StateSubscriberList<unknown>>();
export const SUBSCRIPTION_REGISTRY = new WeakMap<WeakKey, StateSubscriptionMap>();

export const STATE_BUSY_LIST = new WeakSet<WeakKey>();
export const STATE_CLEANUP_QUEUES = new WeakMap<StateController<unknown>, number>();
