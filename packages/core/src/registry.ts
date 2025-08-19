import type {
  Linkable,
  State,
  StateController,
  StateMetadata,
  StateReferences,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';

export const INIT_REGISTRY = new WeakMap<Linkable, State>();
export const META_REGISTRY = new WeakMap<Linkable, StateMetadata>();
export const STATE_REGISTRY = new WeakMap<State, Linkable>();
export const CONTROLLER_REGISTRY = new WeakMap<State, StateController>();
export const REFERENCE_REGISTRY = new WeakMap<State, StateReferences>();
export const SUBSCRIBER_REGISTRY = new WeakMap<State, StateSubscriberList>();
export const SUBSCRIPTION_REGISTRY = new WeakMap<State, StateSubscriptionMap>();

export const STATE_BUSY_LIST = new WeakSet<State>();
