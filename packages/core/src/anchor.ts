import type { ZodObject, ZodType } from 'zod/v4';
import { clone, isArray, isObject } from '@beerush/utils';
import { logger } from './logger.js';
import type {
  AnchorFn,
  AnchorOptions,
  ObjLike,
  SetTrapOptions,
  StateChildrenMap,
  StateController,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';
import { ANCHOR_CONFIG } from './constant.js';
import {
  INIT_REGISTRY,
  REFLECT_REGISTRY,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
  SUBSCRIPTION_REGISTRY,
} from './registry.js';
import { createLinkableRefs, shouldProxy } from './internal.js';
import { createDestroyFactory, createLinkFactory, createSubscribeFactory, createUnlinkFactory } from './factory.js';
import { createArrayProxyHandler, createProxyHandler } from './proxy.js';
import { wrapMethods } from './wrapper.js';
import { assign, clear, remove } from './helper.js';
import { shortId } from './utils/index.js';

/**
 * Anchors a given value, making it reactive and observable.
 *
 * This function initializes a state controller for the provided value,
 * optionally validating it against a Zod schema, and returns a proxied
 * version of the value that can be observed for changes.
 *
 * If the value is already anchored or linked, the existing anchored state is returned.
 *
 * @template T The type of the value to anchor.
 * @template S The Zod schema type for validation.
 * @param init The initial value to anchor.
 * @param options Optional configuration for anchoring, including schema, strict mode, and recursive anchoring.
 * @returns The proxied, reactive version of the input value.
 * @throws If `strict` mode is enabled and schema validation fails during initialization.
 * @throws If `strict` mode is enabled and schema validation fails during property updates or array mutations.
 */
function anchorFn<T, S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T {
  if (STATE_REGISTRY.has(init as WeakKey)) {
    return init;
  }

  if (INIT_REGISTRY.has(init as WeakKey)) {
    return STATE_REGISTRY.get(init as WeakKey) as T;
  }

  const id = shortId();

  const {
    schema,
    strict = ANCHOR_CONFIG.strict,
    cloned = ANCHOR_CONFIG.cloned,
    deferred = ANCHOR_CONFIG.deferred,
    recursive = ANCHOR_CONFIG.recursive,
  } = options ?? {};
  const configs: AnchorOptions<S> = { deferred, cloned: false, strict, recursive };
  const children: StateChildrenMap = new WeakMap();
  const subscribers: StateSubscriberList<T> = new Set();
  const subscriptions: StateSubscriptionMap = new Map();

  if (cloned) {
    init = clone(init);
  }

  if (schema) {
    if (!isObject(init) && !isArray(init)) {
      throw new Error('Schema only supported on "object" and "array".');
    }

    const result = schema.safeParse(init);

    if (result.success) {
      if (Array.isArray(init)) {
        init.splice(0, init.length, ...(result.data as unknown[]));
      } else if (isObject(init)) {
        Object.assign(init, result.data);
      }
    } else if (strict) {
      throw result.error;
    } else {
      logger.error(result.error.message, result.error);
    }
  }

  if (recursive && !deferred) {
    for (const [key, ref] of createLinkableRefs(init)) {
      (init as ObjLike)[key] = anchorFn(ref, {
        ...configs,
        schema: (schema as never as ZodObject)?.shape?.[key],
      });
    }
  }

  let state: T = init;

  const link = createLinkFactory({
    init,
    subscribers,
    subscriptions,
  });
  const unlink = createUnlinkFactory({ subscriptions });

  if (shouldProxy(state)) {
    const proxyHandlerOptions: SetTrapOptions<T, S> = {
      ...configs,
      init,
      link,
      anchor: anchorFn,
      unlink,
      schema,
      children,
      subscribers,
      subscriptions,
    };

    const proxyHandler = Array.isArray(state)
      ? createArrayProxyHandler<T, S>(proxyHandlerOptions)
      : createProxyHandler<T, S>(proxyHandlerOptions);
    state = new Proxy(state as ObjLike, proxyHandler) as T;
  } else if (init instanceof Set || init instanceof Map) {
    wrapMethods({
      ...configs,
      init,
      link,
      anchor: anchorFn,
      unlink,
      children,
      subscribers,
      subscriptions,
    });
  }

  const controller: StateController<T> = {
    id,
    destroy: createDestroyFactory({ init, state, subscribers, subscriptions }),
    subscribe: createSubscribeFactory({
      init,
      link,
      state,
      unlink,
      children,
      deferred,
      recursive,
      subscribers,
      subscriptions,
    }),
  };

  // Register the state with its controller for global access.
  STATE_REGISTRY.set(state as WeakKey, controller as StateController<unknown>);
  INIT_REGISTRY.set(init as WeakKey, state as WeakKey);
  REFLECT_REGISTRY.set(state as WeakKey, init as WeakKey);
  SUBSCRIBER_REGISTRY.set(state as WeakKey, subscribers as never);
  SUBSCRIPTION_REGISTRY.set(state as WeakKey, subscriptions);

  // Return the proxied state object
  return state;
}

/**
 * This function is used to create a reactive array that only react to changes in the array.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {T}
 */
anchorFn.flat = <T extends unknown[], S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T => {
  return anchorFn(init, { ...options, recursive: 'flat' });
};

/**
 * This function is used to create a reactive object that mutates the original object.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {T}
 */
anchorFn.raw = <T, S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T => {
  return anchorFn(init, { ...options, cloned: false });
};

/**
 * This function is used to get the underlying object from the state.
 * @param {T} state
 * @returns {T}
 */
anchorFn.get = <T>(state: T): T => {
  const target = REFLECT_REGISTRY.get(state as WeakKey);

  if (!target) {
    logger.error('Attempt to get the underlying object on non-existence state:', state);
  }

  return (target ?? state) as T;
};

/**
 * This function is used to create a snapshot of the state.
 * @param {T} state
 * @returns {T}
 */
anchorFn.snapshot = <T>(state: T): T => {
  const target = REFLECT_REGISTRY.get(state as WeakKey);

  if (!target) {
    logger.error('Cannot create snapshot of non-existence state:', state);
  }

  return clone(target ?? state) as T;
};

// Export the assign function.
anchorFn.assign = assign;
anchorFn.remove = remove;
anchorFn.clear = clear;

export const anchor = anchorFn as AnchorFn;
