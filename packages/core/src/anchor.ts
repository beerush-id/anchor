import type { ZodObject, ZodType } from 'zod/v4';
import { isArray, isObject } from '@beerush/utils';
import type {
  AnchorConfig,
  AnchorFn,
  AnchorOptions,
  Immutable,
  ObjLike,
  StateChildrenMap,
  StateController,
  StateReferences,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';
import { ANCHOR_CONFIG } from './constant.js';
import {
  INIT_REGISTRY,
  REFERENCE_REGISTRY,
  REFLECT_REGISTRY,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
  SUBSCRIPTION_REGISTRY,
} from './registry.js';
import { createLinkableRefs, linkable } from './internal.js';
import { createDestroyFactory, createLinkFactory, createSubscribeFactory, createUnlinkFactory } from './factory.js';
import { createProxyHandler, writeContract } from './proxy.js';
import { assign, clear, remove } from './helper.js';
import { shortId } from './utils/index.js';
import { createArrayMutator } from './array.js';
import { createCollectionMutator } from './collection.js';
import { captureStack } from './exception.js';
import { softClone } from './utils/clone.js';

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
 * @param schemaOptions
 * @param options Optional configuration for anchoring, including schema, strict mode, and recursive anchoring.
 * @returns The proxied, reactive version of the input value.
 * @throws If `strict` mode is enabled and schema validation fails during initialization.
 * @throws If `strict` mode is enabled and schema validation fails during property updates or array mutations.
 */
function anchorFn<T, S extends ZodType>(init: T, schemaOptions?: S | AnchorOptions<S>, options?: AnchorOptions<S>): T {
  if (STATE_REGISTRY.has(init as WeakKey)) {
    return init;
  }

  if (INIT_REGISTRY.has(init as WeakKey)) {
    return STATE_REGISTRY.get(init as WeakKey) as T;
  }

  if (!linkable(init)) {
    captureStack.violation.init(init, anchorFn);
    return init;
  }

  if (!(schemaOptions as ZodType)?._zod) {
    options = schemaOptions as AnchorOptions<S>;
  }

  // @TODO: Revisit the non-deferred implementation once the core is stable.
  // Force enable deferred mode and make eager mode less priority since eager mode is mostly poor for performance.
  if (options?.deferred === false) {
    options.deferred = true;
  }

  const id = shortId();
  const {
    strict = ANCHOR_CONFIG.strict,
    cloned = ANCHOR_CONFIG.cloned,
    deferred = ANCHOR_CONFIG.deferred,
    recursive = ANCHOR_CONFIG.recursive,
    immutable = ANCHOR_CONFIG.immutable,
  } = options ?? {};

  const schema = (schemaOptions as ZodType)?._zod ? (schemaOptions as S) : (schemaOptions as AnchorOptions<S>)?.schema;
  const configs: AnchorOptions<S> = { deferred, cloned: false, strict, recursive, immutable };
  const children: StateChildrenMap = new WeakMap();
  const subscribers: StateSubscriberList<T> = new Set();
  const subscriptions: StateSubscriptionMap = new Map();

  if (cloned && !immutable) {
    init = softClone(init);
  }

  if (schema) {
    if (!isObject(init) && !isArray(init)) {
      captureStack.violation.schema('(object | array)', schema.type, strict ?? false, anchorFn);
    }

    try {
      const result = schema.safeParse(init);

      if (result.success) {
        if (Array.isArray(init)) {
          init.splice(0, init.length, ...(result.data as unknown[]));
        } else if (isObject(init)) {
          Object.assign(init, result.data);
        }
      } else {
        captureStack.error.validation(
          'Attempted to initialize state with schema:',
          result.error,
          strict ?? false,
          anchorFn
        );
      }
    } catch (error) {
      captureStack.error.validation('Something went wrong when validating schema.', error as Error, strict, anchorFn);
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

  const link = createLinkFactory({ init, subscribers, subscriptions });
  const unlink = createUnlinkFactory({ subscriptions });

  const references: StateReferences<T, S> = {
    link,
    unlink,
    schema,
    configs,
    children,
    subscribers,
    subscriptions,
  };
  REFERENCE_REGISTRY.set(init as WeakKey, references as StateReferences<unknown, ZodType>);

  if (Array.isArray(init)) {
    references.mutator = createArrayMutator(init, references);
  } else if (init instanceof Map || init instanceof Set) {
    references.mutator = createCollectionMutator(init);
  }

  const proxyHandler = createProxyHandler<T>(init, references);
  state = new Proxy(state as ObjLike, proxyHandler) as T;

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
    const error = new Error('State does not exist.');
    captureStack.error.external('Attempt to get the underlying object on non-existence state:', error, anchorFn.get);
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
    const error = new Error('State does not exist.');
    captureStack.error.external('Cannot create snapshot of non-existence state.', error, anchorFn.snapshot);
  }

  return structuredClone(target ?? state) as T;
};

/**
 * This function is used to configure the Anchor's default options.
 * @param {Partial<AnchorConfig>} config
 */
anchorFn.configure = (config: Partial<AnchorConfig>) => {
  Object.assign(ANCHOR_CONFIG, config);
};

/**
 * This function is used to create a reactive object that is immutable.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {Immutable<T>}
 */
anchorFn.immutable = <T, S extends ZodType>(init: T, options?: AnchorOptions<S>): Immutable<T> => {
  return anchorFn(init, { ...options, immutable: true }) as Immutable<T>;
};

// Assign utility functions.
anchorFn.writable = writeContract;
anchorFn.assign = assign;
anchorFn.remove = remove;
anchorFn.clear = clear;

export const anchor = anchorFn as AnchorFn;
