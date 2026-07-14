// @ts-expect-error
import { version } from '../package.json';
import type { createArrayMutator, createCollectionMutator } from './engine/index.js';
import type { AsyncScope, AsyncStore } from './scope/index.js';
import { captureStack } from './shared/exception.js';
import type {
  AnyType,
  Broadcaster,
  Linkable,
  State,
  StateController,
  StateExceptionHandlerList,
  StateGateway,
  StateMetadata,
  StateRelation,
} from './types.js';

export function $symbol(name: string, suffix?: string) {
  if (suffix) return Symbol.for(`--anchor-${name}-${suffix}`);
  return Symbol.for(`--anchor-${name}`);
}

export const NAMESPACE_KEY = $symbol('namespace');
export const IS_VALUE_GETTER = $symbol('value-getter');
export const $ROOT = globalThis as AnyType;

/**
 * Check if the given value is a value getter.
 * @param value - The value to check.
 * @returns {boolean} - True if the value is a value getter, false otherwise.
 */
export function isValueGetter<T = AnyType>(value: unknown): value is { get value(): T } {
  return typeof value === 'object' && value !== null && (value as AnyType)[IS_VALUE_GETTER] === true;
}

const NAMESPACE = {
  version,

  /* -- RAW REGISTRIES --  */
  /**
   * Store for the relation map between raw value and the state.
   * @example object -> Proxy(object).
   */
  INIT_REGISTRY: new WeakMap<Linkable, State>(),

  /**
   * Store for the metadata of raw value.
   * @example object -> StateMetadata { id, type, configs, observers, ... }
   */
  META_REGISTRY: new WeakMap<Linkable, StateMetadata>(),

  /**
   * Store for the sorting handler of raw value.
   * @example object -> (a, b) => a.id - b.id
   */
  SORTER_REGISTRY: new WeakMap<Linkable, (a: unknown, b: unknown) => number>(),

  /**
   * Store for the relation handlers of raw value.
   * @example object -> { link: StateLinkFn, unlink: StateUnlinkFn }
   */
  RELATION_REGISTRY: new WeakMap<Linkable, StateRelation>(),

  /**
   * Store for the write handlers of raw value.
   * @example array/map/set -> { push, pop, ... } or { set, delete, ... }
   */
  MUTATOR_REGISTRY: new WeakMap<
    Linkable,
    ReturnType<typeof createArrayMutator> | ReturnType<typeof createCollectionMutator>
  >(),

  /**
   * Store for the broadcast handler of the raw value.
   * @example object -> { emit: EmitFn, catch: (error, event) => boolean }
   */
  BROADCASTER_REGISTRY: new WeakMap<Linkable, Broadcaster>(),

  /**
   * Store for the initialization gateways of raw value.
   * @example object -> { getter, setter, remover, broadcaster, mutator }
   */
  INIT_GATEWAY_REGISTRY: new WeakMap<Linkable, StateGateway>(),

  /* -- PROCESSED REGISTRIES --  */
  /**
   * Store for the relation map between the state and raw value.
   * @example Proxy(object) -> object
   */
  STATE_REGISTRY: new WeakMap<State, Linkable>(),

  /**
   * Store for the controller of the state.
   * @example Proxy(object) -> { meta, destroy, subscribe }
   */
  CONTROLLER_REGISTRY: new WeakMap<State, StateController>(),

  /**
   * Store for the busy state of the state.
   * @example Proxy(object) -> boolean (present/absent in WeakSet)
   */
  STATE_BUSY_LIST: new WeakSet<State>(),

  /**
   * Store for the metadata of the state mapped to its raw value.
   * @example StateMetadata -> object
   */
  META_INIT_REGISTRY: new WeakMap<StateMetadata, Linkable>(),

  /**
   * Store for the exception handlers of the state.
   * @example Proxy(object) -> Set<StateExceptionHandler>
   */
  EXCEPTION_HANDLER_REGISTRY: new WeakMap<State, StateExceptionHandlerList>(),
};

if ($ROOT[NAMESPACE_KEY]) {
  if ($ROOT[NAMESPACE_KEY].version !== version) {
    const existing = $ROOT[NAMESPACE_KEY].version;
    const error = new Error(`Anchor version mismatch.`);
    captureStack.violation.general(
      'Version mismatch detected.',
      `Attempted to initialize Anchor with a different version: "${existing}" to "${version}"`,
      error,
      [
        'This happens when you are using different versions of Anchor in your application.',
        '- Use a fixed version range of Anchor in your package.json.',
        '- Avoid using dynamic version ranges like "^" or "~".',
        '- Clean up your package manager cache and reinstall dependencies.',
      ]
    );
  }

  const error = new Error(`Anchor namespace already initialized.`);
  captureStack.violation.general(
    'Namespace re-initialization detected.',
    'Attempted to initialize Anchor namespace that already initialized.',
    error,
    [
      'This happens when you are importing Anchor multiple times in your application.',
      '- Ensure that you are only importing Anchor once in your application.',
      '- Avoid manual Anchor invalidation in your HMR application.',
    ]
  );
} else {
  $ROOT[NAMESPACE_KEY] = NAMESPACE;
}

export const $module = $ROOT[NAMESPACE_KEY] as typeof NAMESPACE & {
  async: AsyncScope<AsyncStore>;
} & Record<string | symbol, AnyType>;

/**
 * Check if the current environment is a browser.
 * @returns {boolean}
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

if (!isBrowser()) {
  await import('./server/index.js');
}
