import { isArray, isFunction, isMap, isObject, isSet } from '@beerush/utils';
import type {
  Anchor,
  AnchorSettings,
  ArrayMutation,
  ExceptionMap,
  Immutable,
  Linkable,
  LinkableSchema,
  ModelError,
  ModelObject,
  ObjLike,
  SetMutation,
  State,
  StateController,
  StateExceptionHandlerList,
  StateGateway,
  StateGetter,
  StateMetadata,
  StateMutator,
  StateObserverList,
  StateOptions,
  StateRelation,
  StateRemover,
  StateSetter,
  StateSubscriberList,
  StateSubscriptionMap,
} from './types.js';
import { ANCHOR_SETTINGS, ARRAY_MUTATION_KEYS, COLLECTION_MUTATION_PROPS } from './constant.js';
import {
  BROADCASTER_REGISTRY,
  CONTROLLER_REGISTRY,
  EXCEPTION_HANDLER_REGISTRY,
  INIT_GATEWAY_REGISTRY,
  INIT_REGISTRY,
  META_INIT_REGISTRY,
  META_REGISTRY,
  MUTATOR_REGISTRY,
  RELATION_REGISTRY,
  SORTER_REGISTRY,
  STATE_GATEWAY_REGISTRY,
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
import { createGetter, createRemover, createSetter } from './trap.js';
import { ArrayMutations, Linkables } from './enum.js';
import { createBroadcaster } from './broadcast.js';

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
  schemaOptions?: S | StateOptions<S>,
  options?: StateOptions<S>,
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
    options = schemaOptions as StateOptions<S>;
  }

  const cloned = options?.cloned ?? ANCHOR_SETTINGS.cloned;
  const schema = (schemaOptions as LinkableSchema)?._zod
    ? (schemaOptions as S)
    : (schemaOptions as StateOptions<S>)?.schema;
  const configs: StateOptions<S> = {
    cloned: false,
    deferred: true,
    strict: options?.strict ?? ANCHOR_SETTINGS.strict,
    ordered: (options?.ordered ?? false) && isFunction(options?.compare),
    recursive: options?.recursive ?? ANCHOR_SETTINGS.recursive,
    immutable: options?.immutable ?? ANCHOR_SETTINGS.immutable,
    observable: options?.observable ?? ANCHOR_SETTINGS.observable,
    silentInit: options?.silentInit ?? ANCHOR_SETTINGS.silentInit,
  };
  const observers: StateObserverList = new Set();
  const subscribers: StateSubscriberList<T> = new Set();
  const subscriptions: StateSubscriptionMap = new Map();
  const exceptionHandlers: StateExceptionHandlerList = new Set();

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
      } else if (!configs.silentInit) {
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

  // Sort the initial array and register the compare function
  // if the state is marked as ordered and the given compare option is a function
  if (configs.ordered && Array.isArray(init)) {
    init.sort(options?.compare);
    SORTER_REGISTRY.set(init, options?.compare as (a: unknown, b: unknown) => number);
  }

  const type = isArray(init)
    ? Linkables.ARRAY
    : isSet(init)
      ? Linkables.SET
      : isMap(init)
        ? Linkables.MAP
        : Linkables.OBJECT;
  const meta: StateMetadata<T, S> = {
    id: shortId(),
    root,
    type,
    parent,
    cloned,
    schema,
    configs,
    observers,
    subscribers,
    subscriptions,
    exceptionHandlers,
  };
  META_REGISTRY.set(init, meta as never as StateMetadata);
  META_INIT_REGISTRY.set(meta as never as StateMetadata, init);

  // State broadcasting helpers.
  const broadcaster = createBroadcaster(init, meta);
  BROADCASTER_REGISTRY.set(init, broadcaster);

  // State relationship helpers.
  const link = createLinkFactory(init, meta);
  const unlink = createUnlinkFactory(meta);
  const relation: StateRelation = { link, unlink };
  RELATION_REGISTRY.set(init, relation);

  let mutators: ReturnType<typeof createArrayMutator> | ReturnType<typeof createCollectionMutator>;

  if (Array.isArray(init)) {
    mutators = createArrayMutator(init);
    MUTATOR_REGISTRY.set(init, mutators);
  } else if (init instanceof Map || init instanceof Set) {
    mutators = createCollectionMutator(init);
    MUTATOR_REGISTRY.set(init, mutators);
  }

  const gateway: StateGateway<T> = {
    getter: createGetter(init) as StateGetter<T>,
    setter: createSetter(init) as StateSetter<T>,
    remover: createRemover(init) as StateRemover<T>,
    mutator: mutators?.mutator as StateMutator<T>,
    broadcaster,
  };
  INIT_GATEWAY_REGISTRY.set(init, gateway as StateGateway);

  const proxyHandler = createProxyHandler<T>(init, gateway, meta);
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
  EXCEPTION_HANDLER_REGISTRY.set(state, exceptionHandlers);
  STATE_GATEWAY_REGISTRY.set(state, gateway as StateGateway);

  // Trigger dev tool if it is available.
  getDevTool()?.onInit?.(init, meta);

  // Return the proxied state object
  return state;
}

anchorFn.immutable = <T extends Linkable, S extends LinkableSchema>(
  init: T,
  schemaOptions?: StateOptions<S> | S,
  options?: StateOptions<S>
): Immutable<T> => {
  if ((schemaOptions as ModelObject)?._zod) {
    return anchorFn(init, schemaOptions, { ...options, immutable: true }) as Immutable<T>;
  }

  return anchorFn(init, { ...schemaOptions, immutable: true }) as Immutable<T>;
};

anchorFn.model = ((schema, init, options) => {
  return anchorFn(init, schema, options);
}) as Anchor['model'];

anchorFn.flat = ((init, options) => {
  return anchorFn(init, { ...options, recursive: 'flat' });
}) as Anchor['flat'];

anchorFn.ordered = ((init, compare, options) => {
  return anchorFn(init, { ...options, ordered: true, compare });
}) as Anchor['ordered'];

anchorFn.catch = ((state, handler) => {
  const controller = CONTROLLER_REGISTRY.get(state);

  if (!controller) {
    const error = new Error('Object is not a state.');
    captureStack.error.external(
      'Attempted to capture exception of a state that does not exist.',
      error,
      anchorFn.destroy
    );
    return () => {};
  }

  if (typeof handler !== 'function') {
    const errors: ExceptionMap<ObjLike> = {};
    const unsubscribe = controller.subscribe.all((_, event) => {
      if (event.type !== 'init') {
        const key = event.keys.join('.');

        if (event.error) {
          exceptionMap.errors[key] = {
            error: event.error,
            message: (event.error as ModelError).issues.map((error) => error.message).join('\n'),
          };
        } else {
          delete exceptionMap.errors[key];
        }
      }
    });
    const destroy = () => {
      anchorFn.destroy(exceptionMap.errors);
      anchorFn.destroy(exceptionMap);
      unsubscribe();
    };

    const exceptionMap = anchorFn({ errors, destroy });
    return exceptionMap;
  }

  const { exceptionHandlers } = controller.meta;
  exceptionHandlers.add(handler);

  return () => {
    exceptionHandlers.delete(handler);
  };
}) as Anchor['catch'];

anchorFn.raw = ((init, options) => {
  return anchorFn(init, { ...options, cloned: false });
}) as Anchor['raw'];

anchorFn.has = ((state) => {
  return CONTROLLER_REGISTRY.has(state);
}) satisfies Anchor['has'];

anchorFn.get = ((state, silent = false) => {
  // This to make sure we can find a state that defined using write contract.
  const target = META_INIT_REGISTRY.get(CONTROLLER_REGISTRY.get(state)?.meta as StateMetadata);

  if (!target && !silent) {
    const error = new Error('State does not exist.');
    captureStack.error.external('Attempt to get the underlying object on non-existence state:', error, anchorFn.get);
  }

  return (target ?? state) as typeof state;
}) as Anchor['get'];

anchorFn.find = ((init) => {
  return INIT_REGISTRY.get(init) as typeof init;
}) satisfies Anchor['find'];

anchorFn.read = ((state) => {
  if (anchorFn.has(state)) state = anchorFn.get(state);

  const handler = {
    get: (target, prop, receiver) => {
      const value = Reflect.get(target, prop, receiver);

      if (linkable(value)) {
        return anchorFn.read(value);
      }

      if (ARRAY_MUTATION_KEYS.has(prop as ArrayMutations)) {
        const fn = (...args: unknown[]) => {
          captureStack.violation.methodCall(prop as ArrayMutation, fn);
          return (createArrayMutator.mock?.[prop as never] as Array<unknown>['push'])?.(target, ...args);
        };

        return fn;
      }

      if (COLLECTION_MUTATION_PROPS.has(prop as SetMutation)) {
        const fn = (...args: unknown[]) => {
          captureStack.violation.methodCall(prop as SetMutation, fn);
          return (createCollectionMutator.mock?.[prop as never] as Array<unknown>['push'])?.(target, ...args);
        };

        return fn;
      }

      return value;
    },
    set: (target, prop) => {
      captureStack.violation.setter(prop, handler.set);
      return true;
    },
    deleteProperty: (target, prop) => {
      captureStack.violation.remover(prop, handler.deleteProperty);
      return true;
    },
  } as ProxyHandler<typeof state>;

  return new Proxy(state, handler) as Immutable<typeof state>;
}) satisfies Anchor['read'];

anchorFn.snapshot = ((state, recursive = true) => {
  const target = META_INIT_REGISTRY.get(CONTROLLER_REGISTRY.get(state)?.meta as StateMetadata);

  if (!target) {
    const error = new Error('State does not exist.');
    captureStack.error.external('Cannot create snapshot of non-existence state.', error, anchorFn.snapshot);
  }

  return softClone(target ?? state, recursive) as typeof state;
}) as Anchor['snapshot'];

anchorFn.destroy = ((state, silent?: boolean) => {
  const controller = CONTROLLER_REGISTRY.get(state);

  if (!controller) {
    if (!silent) {
      const error = new Error('Object is not a state.');
      captureStack.error.external('Attempted to destroy a state that does not exist.', error, anchorFn.destroy);
    }
    return;
  }

  controller.destroy();
}) as Anchor['destroy'];

anchorFn.configure = ((config: Partial<AnchorSettings>) => {
  Object.assign(ANCHOR_SETTINGS, config);
}) as Anchor['configure'];

anchorFn.configs = ((): AnchorSettings => {
  return ANCHOR_SETTINGS;
}) as Anchor['configs'];

// Assign utility functions.
anchorFn.writable = writeContract;
anchorFn.assign = assign;
anchorFn.remove = remove;
anchorFn.clear = clear;

export const anchor = anchorFn as Anchor;

export const model = anchorFn.model as Anchor['model'];
export const mutable = anchorFn as Anchor;
export const ordered = anchorFn.ordered as Anchor['ordered'];
export const writable = anchorFn.writable as Anchor['writable'];
export const immutable = anchorFn.immutable as Anchor['immutable'];
export const exception = anchorFn.catch as Anchor['catch'];
