import { isArray, isObject } from '@beerush/utils';
import type {
  AnchorConfig,
  AnchorFn,
  AnchorOptions,
  Immutable,
  Linkable,
  LinkableSchema,
  ObjLike,
  State,
  StateController,
  StateMetadata,
  StateObserverList,
  StateReferences,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';
import { ANCHOR_CONFIG } from './constant.js';
import {
  CONTROLLER_REGISTRY,
  INIT_REGISTRY,
  META_REGISTRY,
  REFERENCE_REGISTRY,
  STATE_REGISTRY,
  SUBSCRIBER_REGISTRY,
  SUBSCRIPTION_REGISTRY,
} from './registry.js';
import { linkable } from './internal.js';
import { createDestroyFactory, createLinkFactory, createSubscribeFactory, createUnlinkFactory } from './factory.js';
import { createProxyHandler, writeContract } from './proxy.js';
import { assign, clear, remove } from './helper.js';
import { shortId } from './utils/index.js';
import { createArrayMutator } from './array.js';
import { createCollectionMutator } from './collection.js';
import { captureStack } from './exception.js';
import { softClone } from './utils/clone.js';
import { getDevTool } from './dev.js';

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
 * @param root - The root state's metadata.
 * @param parent - The parent state's metadata.
 * @returns The proxied, reactive version of the input value.
 * @throws If `strict` mode is enabled and schema validation fails during initialization.
 * @throws If `strict` mode is enabled and schema validation fails during property updates or array mutations.
 */
function anchorFn<T extends Linkable, S extends LinkableSchema>(
  init: T,
  schemaOptions?: S | AnchorOptions<S>,
  options?: AnchorOptions<S>,
  parent?: StateMetadata<Linkable>,
  root?: StateMetadata<Linkable>
): State<T> {
  // Return itself if the given object is a reactive state.
  if (CONTROLLER_REGISTRY.has(init)) {
    return init;
  }

  // Return the existing reactive state if the given init is already initialized.
  if (INIT_REGISTRY.has(init)) {
    return INIT_REGISTRY.get(init) as T;
  }

  if (!linkable(init)) {
    captureStack.violation.init(init, anchorFn);
    return init;
  }

  if (!(schemaOptions as LinkableSchema)?._zod) {
    options = schemaOptions as AnchorOptions<S>;
  }

  const cloned = options?.cloned ?? ANCHOR_CONFIG.cloned;
  const schema = (schemaOptions as LinkableSchema)?._zod
    ? (schemaOptions as S)
    : (schemaOptions as AnchorOptions<S>)?.schema;
  const configs: AnchorOptions<S> = {
    cloned: false,
    deferred: true,
    strict: options?.strict ?? ANCHOR_CONFIG.strict,
    recursive: options?.recursive ?? ANCHOR_CONFIG.recursive,
    immutable: options?.immutable ?? ANCHOR_CONFIG.immutable,
    observable: options?.observable ?? ANCHOR_CONFIG.observable,
  };
  const observers: StateObserverList = new Set();
  const subscribers: StateSubscriberList<T> = new Set();
  const subscriptions: StateSubscriptionMap = new Map();

  if (cloned && !configs.immutable) {
    init = softClone(init, configs.recursive);
  }

  if (schema) {
    if (!isObject(init) && !isArray(init)) {
      captureStack.violation.schema('(object | array)', schema.type, configs.strict as false, anchorFn);
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
          configs.strict,
          anchorFn
        );
      }
    } catch (error) {
      captureStack.error.validation(
        'Something went wrong when validating schema.',
        error as Error,
        configs.strict,
        anchorFn
      );
    }
  }

  const meta: StateMetadata<T, S> = {
    id: shortId(),
    cloned,
    schema,
    configs,
    observers,
    subscribers,
    subscriptions,
    root,
    parent,
  };
  META_REGISTRY.set(init, meta as never as StateMetadata);

  const link = createLinkFactory(init, meta);
  const unlink = createUnlinkFactory(meta);

  const references: StateReferences<T, S> = {
    meta,
    link,
    unlink,
    configs,
  };
  REFERENCE_REGISTRY.set(init, references as never as StateReferences<object, S>);

  if (Array.isArray(init)) {
    references.mutator = createArrayMutator(init, references as never as StateReferences<unknown[], S>);
  } else if (init instanceof Map || init instanceof Set) {
    references.mutator = createCollectionMutator(init);
  }

  const proxyHandler = createProxyHandler<T>(init, references);
  const state = new Proxy(init as ObjLike, proxyHandler) as State<T>;

  const controller: StateController<T, S> = {
    meta,
    destroy: createDestroyFactory(init, state, meta),
    subscribe: createSubscribeFactory(init, state, meta, { link, unlink }),
  };

  // Register the state with its controller for global access.
  INIT_REGISTRY.set(init, state);
  STATE_REGISTRY.set(state, init);
  CONTROLLER_REGISTRY.set(state, controller as never);
  SUBSCRIBER_REGISTRY.set(state, subscribers as never);
  SUBSCRIPTION_REGISTRY.set(state, subscriptions);

  // Trigger dev tool if it is available.
  getDevTool()?.onInit?.(init, meta);

  // Return the proxied state object
  return state;
}

/**
 * This function is used to create a reactive array that only react to changes in the array.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {T}
 */
anchorFn.flat = <T extends unknown[], S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: AnchorOptions<S>
): T => {
  return anchorFn(init, { ...options, recursive: 'flat' });
};

/**
 * This function is used to create a reactive object that mutates the original object.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {T}
 */
anchorFn.raw = <T extends Linkable, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: AnchorOptions<S>
): T => {
  return anchorFn(init, { ...options, cloned: false });
};

/**
 * This function is used to get the underlying object from the state.
 * @param {T} state
 * @returns {T}
 */
anchorFn.get = <T extends State>(state: T): T => {
  const target = STATE_REGISTRY.get(state);

  if (!target) {
    const error = new Error('State does not exist.');
    captureStack.error.external('Attempt to get the underlying object on non-existence state:', error, anchorFn.get);
  }

  return (target ?? state) as T;
};

/**
 * This function is used to find the state from the given object.
 * @param {T} init - The reactive state or plain object to find.
 * @returns {T | undefined} - The reactive state associated with the given object, or undefined if not found.
 */
anchorFn.find = <T extends Linkable>(init: T): T | undefined => {
  return INIT_REGISTRY.get(init) as T;
};

/**
 * Creates a deep copy snapshot of the given state.
 *
 * This function retrieves the underlying raw object from the state registry
 * and returns a structured clone of it. If the state is not found in the
 * registry, an error is logged.
 *
 * @template T The type of the state.
 * @param {T} state - The reactive state to create a snapshot from.
 * @param recursive - Whether to recursively clone the object.
 * @returns {T} A deep copy of the underlying object.
 */
anchorFn.snapshot = <T extends State>(state: T, recursive = true): T => {
  const target = STATE_REGISTRY.get(state);

  if (!target) {
    const error = new Error('State does not exist.');
    captureStack.error.external('Cannot create snapshot of non-existence state.', error, anchorFn.snapshot);
  }

  return softClone(target ?? state, recursive) as T;
};

/**
 * Destroys a reactive state and cleans up all associated resources.
 *
 * This function retrieves the controller associated with the given state
 * and calls its destroy method, effectively cleaning up all observers,
 * subscribers, and references. If the state does not exist, an error is logged.
 *
 * @template T The type of the state to destroy.
 * @param {T} state - The reactive state to destroy.
 */
anchorFn.destroy = <T extends State>(state: T) => {
  const controller = CONTROLLER_REGISTRY.get(state);

  if (!controller) {
    const error = new Error('Object is not a state');
    captureStack.error.external('Attempted to destroy a state that does not exist', error, anchorFn.destroy);
    return;
  }

  controller.destroy();
};

/**
 * This function is used to configure the Anchor's default options.
 * @param {Partial<AnchorConfig>} config
 */
anchorFn.configure = (config: Partial<AnchorConfig>) => {
  Object.assign(ANCHOR_CONFIG, config);
};

/**
 * This function is used to return the Anchor's default options.
 * @returns {AnchorConfig}
 */
anchorFn.configs = (): AnchorConfig => {
  return ANCHOR_CONFIG;
};

/**
 * This function is used to create a reactive object that is immutable.
 * @param {T} init
 * @param {AnchorOptions<S>} options
 * @returns {Immutable<T>}
 */
anchorFn.immutable = <T extends Linkable, S extends LinkableSchema>(
  init: T,
  options?: AnchorOptions<S>
): Immutable<T> => {
  return anchorFn(init, { ...options, immutable: true }) as Immutable<T>;
};

// Assign utility functions.
anchorFn.writable = writeContract;
anchorFn.assign = assign;
anchorFn.remove = remove;
anchorFn.clear = clear;

export const anchor = anchorFn as AnchorFn;
