import type {
  Broadcaster,
  Linkable,
  State,
  StateController,
  StateExceptionHandlerList,
  StateGateway,
  StateMetadata,
  StateRelation,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';
import type { createArrayMutator } from './array.js';
import type { createCollectionMutator } from './collection.js';

export const INIT_REGISTRY = new WeakMap<Linkable, State>();
export const META_REGISTRY = new WeakMap<Linkable, StateMetadata>();
export const SORTER_REGISTRY = new WeakMap<Linkable, (a: unknown, b: unknown) => number>();

// GATEWAYS
export const RELATION_REGISTRY = new WeakMap<Linkable, StateRelation>();
export const MUTATOR_REGISTRY = new WeakMap<
  Linkable,
  ReturnType<typeof createArrayMutator> | ReturnType<typeof createCollectionMutator>
>();
export const BROADCASTER_REGISTRY = new WeakMap<Linkable, Broadcaster>();
export const INIT_GATEWAY_REGISTRY = new WeakMap<Linkable, StateGateway>();

export const STATE_REGISTRY = new WeakMap<State, Linkable>();
export const CONTROLLER_REGISTRY = new WeakMap<State, StateController>();
export const SUBSCRIBER_REGISTRY = new WeakMap<State, StateSubscriberList>();
export const SUBSCRIPTION_REGISTRY = new WeakMap<State, StateSubscriptionMap>();
export const STATE_GATEWAY_REGISTRY = new WeakMap<State, StateGateway>();

export const STATE_BUSY_LIST = new WeakSet<State>();
export const META_INIT_REGISTRY = new WeakMap<StateMetadata, Linkable>();
export const EXCEPTION_HANDLER_REGISTRY = new WeakMap<State, StateExceptionHandlerList>();
