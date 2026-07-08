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

export const NAMESPACE_KEY = Symbol.for('ANCHOR-NAMESPACE');
export const $ROOT = globalThis as AnyType;

const NAMESPACE = {
  version,

  /* -- RAW REGISTRIES --  */
  /* Store for the raw value of the state */
  INIT_REGISTRY: new WeakMap<Linkable, State>(),
  /* Store for the metadata of raw value */
  META_REGISTRY: new WeakMap<Linkable, StateMetadata>(),
  /* Store for the sorting handler of raw value */
  SORTER_REGISTRY: new WeakMap<Linkable, (a: unknown, b: unknown) => number>(),
  /* Store for the relation of raw value */
  RELATION_REGISTRY: new WeakMap<Linkable, StateRelation>(),
  /* Store for the write handlers of raw value */
  MUTATOR_REGISTRY: new WeakMap<
    Linkable,
    ReturnType<typeof createArrayMutator> | ReturnType<typeof createCollectionMutator>
  >(),
  /* Store for the broadcast handler of the raw value */
  BROADCASTER_REGISTRY: new WeakMap<Linkable, Broadcaster>(),
  /* Store for the initialization gateways of raw value */
  INIT_GATEWAY_REGISTRY: new WeakMap<Linkable, StateGateway>(),

  /* -- PROCESSED REGISTRIES --  */
  /* Store for the relation map between the state and raw value */
  STATE_REGISTRY: new WeakMap<State, Linkable>(),
  /* Store for the controller of the state */
  CONTROLLER_REGISTRY: new WeakMap<State, StateController>(),
  /* Store for the busy state of the state */
  STATE_BUSY_LIST: new WeakSet<State>(),
  /* Store for the metadata of the state */
  META_INIT_REGISTRY: new WeakMap<StateMetadata, Linkable>(),
  /* Store for the exception handlers of the state */
  EXCEPTION_HANDLER_REGISTRY: new WeakMap<State, StateExceptionHandlerList>(),
};

if ($ROOT[NAMESPACE_KEY]) {
  if ($ROOT[NAMESPACE_KEY].version !== version) {
    const error = new Error(`Anchor version mismatch.`);
    captureStack.violation.general('Version mismatch detected.', 'Anchor version mismatch detected.', error, [
      'Anchor is already initialized with a different version.',
      'Please check your import order and make sure you are using the same version of Anchor.',
    ]);
  }

  const error = new Error(`Anchor namespace already initialized.`);
  captureStack.violation.general(
    'Namespace re-initialization detected.',
    'Attempted to initialize Anchor namespace that already initialized.',
    error,
    [
      'Anchor namespace is already initialized.',
      'Please check your import order and make sure you are using the same version of Anchor.',
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
