import { ARRAY_MUTATIONS, BATCH_MUTATIONS, MAP_MUTATIONS, OBJECT_MUTATIONS, SET_MUTATIONS } from './constant.js';
import { type input, type output, type ZodArray, type ZodObject } from 'zod/v4';
import type { Linkables } from './enum.js';

export type Primitive = string | number | boolean | bigint | symbol | undefined | null | MethodLike | Date | RegExp;

export type Recursive = boolean | 'flat';
export type MethodLike = (...args: unknown[]) => unknown;
export type KeyLike = string | number | symbol;
export type ObjLike = {
  [key: KeyLike]: unknown;
};

export type Linkable = object | unknown[] | Set<unknown> | Map<KeyLike, unknown>;
export type LinkableSchema = ZodObject | ZodArray;
export type ModelInput<S> = input<S>;
export type ModelOutput<S> = output<S>;
export type ImmutableOutput<S> = Immutable<ModelOutput<S>>;
export type ReadonlyLink = Immutable<Linkable>;

export type StateObserver = {
  readonly id: string;
  readonly states: WeakMap<State, Set<KeyLike>>;
  readonly onChange: (event: StateChange) => void;
  readonly onDestroy: (fn: () => void) => void;
  readonly destroy: () => void;
  readonly onTrack?: (state: Linkable, key: KeyLike) => void;
  run<R>(fn: () => R): R | undefined;
  name?: string;
};

export type BatchMutation = (typeof BATCH_MUTATIONS)[number];
export type SetMutation = (typeof SET_MUTATIONS)[number];
export type MapMutation = (typeof MAP_MUTATIONS)[number];
export type ArrayMutation = (typeof ARRAY_MUTATIONS)[number];
export type ObjectMutation = (typeof OBJECT_MUTATIONS)[number];
export type StateMutation = ArrayMutation | ObjectMutation | SetMutation | MapMutation | BatchMutation;

export type StateBaseOptions = {
  cloned?: boolean;
  strict?: boolean;
  ordered?: boolean;
  deferred?: boolean;
  recursive?: Recursive;
  immutable?: boolean;
  observable?: boolean;
  compare?: (a: unknown, b: unknown) => number;
};
export type StateOptions<S extends LinkableSchema = LinkableSchema> = StateBaseOptions & { schema?: S };

export type AnchorSettings = StateBaseOptions & {
  production: boolean;
};

export type StateSubscriber<T> = (snapshot: T, event: StateChange, emitter?: string) => void;
export type StateUnsubscribe = () => void;
export type StateDestroyer = () => void;
export type StateSubscribeFn<T> = (
  handle: StateSubscriber<T>,
  receiver?: Linkable,
  recursive?: boolean
) => StateUnsubscribe;
export type StateSubscriberList<T extends Linkable = Linkable> = Set<StateSubscriber<T>>;
export type StateObserverList = Set<StateObserver>;
export type StateSubscriptionMap = Map<Linkable, StateUnsubscribe>;
export type StateLinkFn = (childKey: KeyLike, childState: Linkable, receiver?: Linkable) => void;
export type StateUnlinkFn = (childState: Linkable) => void;

export type State<T extends Linkable = Linkable> = T;
export type StateMetadata<
  T extends Linkable = Linkable,
  S extends LinkableSchema = LinkableSchema,
  RootType extends Linkable = Linkable,
  RootSchema extends LinkableSchema = LinkableSchema,
  ParentType extends Linkable = Linkable,
  ParentSchema extends LinkableSchema = LinkableSchema,
> = {
  id: string;
  type: Linkables;
  cloned: boolean;
  configs: StateBaseOptions;
  observers: StateObserverList;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
  root?: StateMetadata<RootType, RootSchema>;
  parent?: StateMetadata<ParentType, ParentSchema>;
  schema?: S;
};

export type MapMutator<K, V> = {
  set(key: K, value: V): void;
  delete(key: K): void;
  clear(): void;
};

export type SetMutator<V> = {
  add(value: V): void;
  delete(value: V): void;
  clear(): void;
};

export type ArrayMutator<T> = {
  push(...items: T[]): void;
  pop(): T | undefined;
  shift(): T | undefined;
  unshift(...items: T[]): void;
  splice(start: number, deleteCount?: number, ...items: T[]): T[];
  reverse(): T[];
  sort(compareFn?: (a: T, b: T) => number): T[];
  fill(value: T, start?: number, end?: number): T[];
  copyWithin(target: number, start: number, end?: number): T[];
};

export type StateMutator<T extends Linkable> =
  T extends Set<infer U>
    ? SetMutator<U>
    : T extends Map<infer K, infer V>
      ? MapMutator<K, V>
      : T extends Array<infer U>
        ? ArrayMutator<U>
        : never;

export type StateGetter<T extends Linkable> = (target: T, prop: keyof T | KeyLike, receiver?: unknown) => unknown;
export type StateSetter<T extends Linkable> = (
  target: T,
  prop: keyof T | KeyLike,
  value?: unknown,
  receiver?: unknown
) => unknown;
export type StateRemover<T extends Linkable> = (target: T, prop: keyof T | KeyLike, receiver?: unknown) => unknown;

export type StateRelation = {
  link: StateLinkFn;
  unlink: StateUnlinkFn;
};

export type StateGateway<T extends Linkable = Linkable> = {
  getter: StateGetter<T>;
  setter: StateSetter<T>;
  remover: StateRemover<T>;
  broadcaster: Broadcaster;
  mutator?: StateMutator<T>;
};

export type StateController<T extends Linkable = Linkable, S extends LinkableSchema = LinkableSchema> = {
  meta: StateMetadata<T, S>;
  destroy: StateDestroyer;
  subscribe: StateSubscribeFn<T>;
};

export type StatePropGetter<T extends Linkable = Linkable> = (
  target: T,
  prop: keyof T,
  receiver?: unknown
) => T[keyof T];

export type TrapOverrides = {
  configs: StateBaseOptions;
  mutator?: WeakMap<WeakKey, MethodLike>;
};

export type StateChange = {
  type: 'init' | StateMutation;
  keys: KeyLike[];
  prev?: unknown;
  value?: unknown;
  emitter?: string;
};

export type PipeTransformer<T, R> = (value: T) => Partial<R>;

export type SubscribeFactoryInit = {
  link: StateLinkFn;
  unlink: StateUnlinkFn;
};

export type Immutable<T> = T extends Primitive
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<Immutable<K>, Immutable<V>>
    : T extends Set<infer U>
      ? ReadonlySet<Immutable<U>>
      : T extends object
        ? {
            readonly [P in keyof T]: Immutable<T[P]>;
          }
        : T extends Array<infer U>
          ? ReadonlyArray<Immutable<U>>
          : T;

export type Mutable<T> =
  T extends ReadonlyMap<infer K, infer V>
    ? Map<K, V>
    : T extends ReadonlySet<infer U>
      ? Set<U>
      : T extends ReadonlyArray<infer U>
        ? {
            -readonly [P in keyof T]: P extends keyof Array<U> ? Array<U>[P] : never;
          }
        : {
            -readonly [P in keyof T]: T[P];
          };

export type MutationKey<T> =
  T extends ReadonlyMap<unknown, unknown>
    ? MapMutation
    : T extends ReadonlySet<unknown>
      ? SetMutation
      : T extends ReadonlyArray<unknown>
        ? ArrayMutation
        : keyof T;

export type MergedType<T> = { [P in keyof T]: T[P] } & {};

export type MutablePart<T, K extends MutationKey<T>[]> =
  T extends ReadonlyMap<infer M, infer V>
    ? T & {
        -readonly [P in K[number]]: P extends keyof Map<M, V> ? Map<M, V>[P] : never;
      }
    : T extends ReadonlySet<infer U>
      ? T & {
          -readonly [P in K[number]]: P extends keyof Set<U> ? Set<U>[P] : never;
        }
      : T extends ReadonlyArray<infer U>
        ? T & {
            -readonly [P in K[number]]: P extends keyof Array<U> ? Array<U>[P] : never;
          }
        : MergedType<
            Omit<T, K[number]> & {
              -readonly [P in K[number]]: P extends keyof T ? T[P] : never;
            }
          >;

/**
 * Extracts the keys of an object that are not readonly.
 *
 * This type uses conditional types to determine which properties of T are writable:
 * 1. For each property P in T, it creates a test object with P as the only property
 * 2. It then checks if this property can be made non-readonly
 * 3. If it can, the key P is included in the result
 *
 * @template T - The object type to extract writable keys from
 * @returns A union of keys that are not readonly in T
 */
export type WritableKeys<T> = {
  [P in keyof T]-?: (<Q>() => Q extends { [K in P]: T[K] } ? 1 : 2) extends <R>() => R extends {
    -readonly [K in P]: T[K];
  }
    ? 1
    : 2
    ? P
    : never;
}[keyof T];

/**
 * Creates a new type containing only the writable properties of T.
 *
 * This type combines WritableKeys with Pick to create a new object type
 * that only includes the properties of T that are not readonly.
 *
 * @template T - The object type to pick writable properties from
 * @returns A new object type with only the writable properties of T
 */
export type Writable<T> = Pick<T, WritableKeys<T>>;

/**
 * Anchor function interface that provides state management capabilities.
 *
 * @template T - The type of the initial state
 * @template S - The schema type for validation
 */
export interface AnchorFn {
  /**
   * Creates a reactive state with optional configuration.
   *
   * @param init - Initial state value
   * @param options - Configuration options for the state
   * @returns Reactive state object
   */
  <T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): State<T>;

  /**
   * Creates a reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options
   * @returns Validated reactive state object
   */
  <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema: S, options?: StateBaseOptions): ModelOutput<S>;

  /**
   * Creates an immutable reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options with immutable flag
   * @returns Immutable validated reactive state object
   */
  <S extends LinkableSchema, T extends ModelInput<S>>(
    init: T,
    schema: S,
    options?: StateBaseOptions & { immutable: true }
  ): ImmutableOutput<S>;

  // Initializer methods.

  /**
   * Creates a raw reactive state without making a clone of the initial state.
   *
   * @param init - Initial state value
   * @param options - Configuration options
   * @returns Raw reactive state object
   */
  raw<T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): State<T>;

  /**
   * Creates a flat reactive state that only tracks top-level properties.
   *
   * @param init - Initial array state
   * @param options - Configuration options
   * @returns Flat reactive array state
   */
  flat<T extends unknown[], S extends LinkableSchema = LinkableSchema>(init: T, options?: StateOptions<S>): State<T>;

  /**
   * Creates an ordered reactive array that maintains sort order based on the provided comparison function.
   *
   * @template T - The type of the array elements
   * @template S - The schema type for validation
   * @param init - Initial array state
   * @param compare - Comparison function to determine sort order
   * @param options - Configuration options
   * @returns Ordered reactive array state
   */
  ordered<T extends unknown[], S extends LinkableSchema = LinkableSchema>(
    init: T,
    compare: (a: T[number], b: T[number]) => number,
    options?: StateOptions<S>
  ): State<T>;

  /**
   * Creates a reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options
   * @returns Validated reactive state object
   */
  model<S extends LinkableSchema, T extends ModelInput<S>>(
    init: T,
    schema: S,
    options?: StateBaseOptions
  ): ModelOutput<S>;

  /**
   * Creates an immutable reactive state.
   *
   * @param init - Initial state value
   * @param options - Configuration options
   * @returns Immutable reactive state object
   */
  immutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
    init: T,
    options?: StateOptions<S>
  ): Immutable<T>;

  /**
   * Creates an immutable reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options
   * @returns Immutable validated reactive state object
   */
  immutable<S extends LinkableSchema, T extends ModelInput<S>>(
    init: T,
    schema: S,
    options?: StateBaseOptions
  ): ImmutableOutput<S>;

  // Accessibility methods.

  /**
   * Checks if a given state is reactive.
   *
   * @template T - The type of the state
   * @param state - The state to check
   * @returns True if the state is reactive, false otherwise
   */
  has<T extends State>(state: T): boolean;

  /**
   * Gets the current state value.
   *
   * @param state - The reactive state
   * @returns Current state value
   */
  get<T extends Linkable>(state: State<T>): T;

  /**
   * Finds and returns a reactive state instance that matches the given initial state.
   *
   * This method is used to retrieve an existing reactive state instance when you have
   * a reference to the original state object. It's particularly useful when you need
   * to access a state that was previously created but don't have a direct reference
   * to its reactive wrapper.
   *
   * @template T - The type of the state object
   * @param {T} init - The initial state object to find the reactive instance for
   * @returns {T} The reactive state instance if found, otherwise the original object
   */
  find<T extends Linkable>(init: T): T;

  /**
   * Creates a snapshot of the current state.
   *
   * @param state - The reactive state
   * @returns State snapshot
   */
  snapshot<T extends Linkable>(state: State<T>): T;

  /**
   * Makes a readonly state writable.
   *
   * @param state - The readonly state
   * @returns Writable state object
   */
  writable<T extends ReadonlyLink>(state: T): Mutable<T>;

  /**
   * Makes a readonly state writable with specific contracts.
   *
   * @param init - The readonly state
   * @param contracts - Keys that should be mutable
   * @returns Partially writable state object
   */
  writable<T extends ReadonlyLink, K extends MutationKey<T>[]>(init: T, contracts?: K): MutablePart<T, K>;

  // Utility methods.

  /**
   * Assigns properties from source to target object.
   *
   * @param target - Target object
   * @param source - Source object with properties to assign
   */
  assign<T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>): void;
  assign<T extends unknown[]>(target: T, source: { [key: string]: T[number] } | Record<string, T[number]>): void;
  assign<T extends object>(target: T, source: Partial<T>): void;

  /**
   * Removes keys from a collection.
   *
   * @param target - Target collection
   * @param keys - Keys to remove
   */
  remove<T, K>(target: Map<T, K>, ...keys: Array<T>): void;
  remove<T extends unknown[]>(target: T, ...keys: Array<string>): void;
  remove<T extends object>(target: T, ...keys: Array<keyof T>): void;

  /**
   * Clears all entries from a collection.
   *
   * @param target - Target collection to clear
   */
  clear<T>(target: T): void;

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
  destroy<T extends State>(state: T): void;

  /**
   * Configures global Anchor settings.
   *
   * @param {Partial<AnchorSettings>} config - Partial configuration object
   */
  configure(config: Partial<AnchorSettings>): void;

  /**
   * Gets the global Anchor settings.
   * @returns {AnchorSettings}
   */
  configs(): AnchorSettings;
}

export type AnchorInternalFn = <T extends Linkable, S extends LinkableSchema>(
  init: T,
  options: StateOptions<S>,
  root?: StateMetadata,
  parent?: StateMetadata
) => State<T>;

/**
 * Function type for broadcasting state changes to subscribers.
 *
 * @param snapshot - The current state snapshot
 * @param event - The state change event details
 * @param emitter - Optional emitter identifier
 */
export type BroadcastFn = (snapshot: Linkable, event: StateChange, emitter?: string) => void;

/**
 * Function type for emitting state changes to subscribers.
 *
 * @param event - The state change event details
 * @param prop - Optional property key that was changed
 */
export type EmitFn = (event: StateChange, prop?: KeyLike) => void;

/**
 * Interface for broadcasting state changes to subscribers.
 */
export type Broadcaster = {
  /**
   * Emits a state change event.
   *
   * @param event - The state change event details
   * @param prop - Optional property key that was changed
   */
  emit: EmitFn;

  /**
   * Broadcasts a state change to all subscribers.
   *
   * @param snapshot - The current state snapshot
   * @param event - The state change event details
   * @param emitter - Optional emitter identifier
   */
  broadcast: BroadcastFn;
};

export interface DeriveFn {
  /**
   * Derives a new subscription from an existing anchored state.
   * This is a convenience function to subscribe to changes of an already anchored state.
   *
   * @template T The type of the state.
   * @param state - The anchored state object to derive from.
   * @param handler - The subscriber function to call on state changes.
   * @param recursive - Whether to recursively subscribe to child states (Default: follow).
   * @returns A function to unsubscribe from the derived state.
   */ <T>(state: T, handler: StateSubscriber<T>, recursive?: boolean): StateUnsubscribe;

  /**
   * Subscribe to changes in the provided state and log it to the console.
   * This is a convenience method that uses `console.log` as the subscriber function.
   *
   * @template T The type of the state.
   * @param state The anchored state object to subscribe to.
   * @returns A function to unsubscribe from the logging subscription.
   */
  log<T extends Linkable>(state: State<T>): StateUnsubscribe;

  /**
   * Pipe changes of the source state to a target state.
   * This function allows you to synchronize changes from a source state to a target state,
   * with an optional transformation function to modify the data during the transfer.
   *
   * @template Source The type of the source state.
   * @template Target The type of the target state.
   * @param source The source state object to pipe from.
   * @param target The target state object to pipe to.
   * @param transform An optional function to transform the source state before assigning it to the target.
   * @returns A function to unsubscribe from the piping operation.
   */
  pipe<Source extends State, Target extends Linkable>(
    source: Source,
    target: Target,
    transform?: PipeTransformer<Source, Target>
  ): StateUnsubscribe;

  /**
   * Bind two states together, synchronizing changes between them.
   * This function allows you to keep two states in sync, with optional transformation functions
   * to modify the data during the transfer in both directions.
   *
   * @template Left The type of the left state.
   * @template Right The type of the right state.
   * @param left The left state object to bind.
   * @param right The right state object to bind.
   * @param transformLeft An optional function to transform the left state before assigning it to the right.
   * @param transformRight An optional function to transform the right state before assigning it to the left.
   * @returns A function to unsubscribe from the binding operation.
   */
  bind<Left extends State, Right extends State>(
    left: Left,
    right: Right,
    transformLeft?: PipeTransformer<Left, Right>,
    transformRight?: PipeTransformer<Right, Left>
  ): StateUnsubscribe;

  /**
   * Resolves the [StateController] for a given anchored state.
   * This allows direct access to the [set] methods of the controller.
   *
   * @template T The type of the state.
   * @param state The anchored state object.
   * @returns The [StateController] if not found.
   */
  resolve<T extends Linkable>(state: State<T>): StateController<T> | undefined;
}

export type DevTool = {
  /**
   * A callback that will be called when a property is accessed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike} prop
   */
  onGet?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  /**
   * A callback that will be called when a property is set.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike} prop
   * @param {unknown} value
   */
  onSet?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    prop: KeyLike,
    value: unknown
  ) => void;
  /**
   * A callback that will be called when a property is deleted.
   * @param {StateMetadata} meta
   * @param {KeyLike} prop
   */
  onDelete?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, prop: KeyLike) => void;
  /**
   * A callback that will be called when a method is called.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {string} method
   * @param {unknown[]} args
   */
  onCall?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    method: string,
    args: unknown[]
  ) => void;
  /**
   * A callback that will be called when a state is initialized.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onInit?: <T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a bulk assignment is performed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {ObjLike} source
   */
  onAssign?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, source: ObjLike) => void;
  /**
   * A callback that will be called when a bulk removal is performed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {KeyLike[]} props
   */
  onRemove?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, props: KeyLike[]) => void;
  /**
   * A callback that will be called when a state is cleared.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onClear?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a state is destroyed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   */
  onDestroy?: <T extends Linkable, S extends LinkableSchema>(init: T, meta: StateMetadata<T, S>) => void;
  /**
   * A callback that will be called when a subscriber is added.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {StateSubscriber<Linkable>} handler
   */
  onSubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  /**
   * A callback that will be called when a subscriber is removed.
   * @param {StateMetadata} meta - State metadata associated with the event.
   * @param {StateSubscriber<Linkable>} handler
   */
  onUnsubscribe?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    handler: StateSubscriber<T>,
    receiver?: Linkable
  ) => void;
  /**
   * A callback that will be called when a child reference is linked.
   * @param {StateMetadata} meta
   * @param {StateMetadata} child
   */
  onLink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  /**
   * A callback that will be called when a child reference is unlinked.
   * @param {StateMetadata} meta
   * @param {StateMetadata} child
   */
  onUnlink?: <T extends Linkable, S extends LinkableSchema>(meta: StateMetadata<T, S>, child: StateMetadata) => void;
  /**
   * A callback that will be called when a state is being tracked by an observer.
   * @param {StateMetadata} meta
   * @param {StateObserver} observer
   */
  onTrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver,
    key: KeyLike
  ) => void;
  /**
   * A callback that will be called when a state is no longer being tracked by an observer.
   * @param {StateMetadata} meta
   * @param {StateObserver} observer
   */
  onUntrack?: <T extends Linkable, S extends LinkableSchema>(
    meta: StateMetadata<T, S>,
    observer: StateObserver
  ) => void;
};

export type Assignable = ObjLike | Map<unknown, unknown> | Array<unknown>;
export type AssignablePart<T> = Partial<Record<keyof T, T[keyof T]>>;
