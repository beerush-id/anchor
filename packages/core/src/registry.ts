import type { Linkable, StateController, StateReferences, StateSubscriberList, StateSubscriptionMap } from './types.js';
import type { ZodType } from 'zod/v4';

export const INIT_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const STATE_REGISTRY = new WeakMap<WeakKey, StateController<unknown>>();
export const REFLECT_REGISTRY = new WeakMap<WeakKey, WeakKey>();
export const REFERENCE_REGISTRY = new WeakMap<WeakKey, StateReferences<Linkable, ZodType>>();
export const SUBSCRIBER_REGISTRY = new WeakMap<WeakKey, StateSubscriberList<unknown>>();
export const SUBSCRIPTION_REGISTRY = new WeakMap<WeakKey, StateSubscriptionMap>();

export const STATE_BUSY_LIST = new WeakSet<WeakKey>();
export const STATE_CLEANUP_QUEUES = new WeakMap<StateController<unknown>, number>();
