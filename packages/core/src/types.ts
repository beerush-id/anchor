import { ARRAY_MUTATIONS, BATCH_MUTATIONS, MAP_MUTATIONS, OBJECT_MUTATIONS, SET_MUTATIONS } from './constant.js';
import { type input, type output, type ZodArray, type ZodObject } from 'zod/v4';

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
  readonly states: WeakMap<State, Set<KeyLike>>;
  readonly onChange: (event: StateChange) => void;
  readonly onDestroy: (fn: () => void) => void;
  readonly destroy: () => void;
  readonly onTrack?: (state: Linkable, key: KeyLike) => void;
  run<R>(fn: () => R): R | undefined;
};

export type BatchMutation = (typeof BATCH_MUTATIONS)[number];
export type SetMutation = (typeof SET_MUTATIONS)[number];
export type MapMutation = (typeof MAP_MUTATIONS)[number];
export type ArrayMutation = (typeof ARRAY_MUTATIONS)[number];
export type ObjectMutation = (typeof OBJECT_MUTATIONS)[number];
export type StateMutation = ArrayMutation | ObjectMutation | SetMutation | MapMutation | BatchMutation;

export type AnchorConfig = {
  cloned?: boolean;
  strict?: boolean;
  deferred?: boolean;
  recursive?: Recursive;
  immutable?: boolean;
  observable?: boolean;
};
export type AnchorOptions<S extends LinkableSchema = LinkableSchema> = AnchorConfig & { schema?: S };

export type StateSubscriber<T> = (snapshot: T, event: StateChange, emitter?: string) => void;
export type StateUnsubscribe = () => void;
export type StateSubscribeFn<T> = (handle: StateSubscriber<T>, receiver?: Linkable) => StateUnsubscribe;
export type StateSubscriberList<T extends Linkable = Linkable> = Set<StateSubscriber<T>>;
export type StateObserverList = Set<StateObserver>;
export type StateSubscriptionMap = Map<Linkable, StateUnsubscribe>;
export type StateLinkFn = (childKey: KeyLike, childState: Linkable, receiver?: Linkable) => void;
export type StateUnlinkFn = (childState: Linkable) => void;

export type State<T extends Linkable = Linkable> = T;
export type StateMetadata<
  T extends Linkable = LinkableSchema,
  S extends LinkableSchema = LinkableSchema,
  RootType extends Linkable = Linkable,
  RootSchema extends LinkableSchema = LinkableSchema,
  ParentType extends Linkable = Linkable,
  ParentSchema extends LinkableSchema = LinkableSchema,
> = {
  id: string;
  cloned: boolean;
  configs: AnchorConfig;
  observers: StateObserverList;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
  root?: StateMetadata<RootType, RootSchema>;
  parent?: StateMetadata<ParentType, ParentSchema>;
  schema?: S;
};

export type StateController<T extends Linkable = Linkable, S extends LinkableSchema = LinkableSchema> = {
  meta: StateMetadata<T, S>;
  destroy: StateUnsubscribe;
  subscribe: StateSubscribeFn<T>;
};

export type StatePropGetter<T extends Linkable = Linkable> = (
  target: T,
  prop: keyof T,
  receiver?: unknown
) => T[keyof T];

export type StateReferences<T extends Linkable = Linkable, S extends LinkableSchema = LinkableSchema> = {
  meta: StateMetadata<T, S>;
  link: StateLinkFn;
  unlink: StateUnlinkFn;
  configs: AnchorConfig;
  getter?: StatePropGetter<T>;
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

export type Immutable<T> = T extends MethodLike
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
  <T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): State<T>;

  /**
   * Creates a reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options
   * @returns Validated reactive state object
   */
  <S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema: S, options?: AnchorConfig): ModelOutput<S>;

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
    options?: AnchorConfig & { immutable: true }
  ): ImmutableOutput<S>;

  // Initializer methods.

  /**
   * Creates a raw reactive state without making a clone of the initial state.
   *
   * @param init - Initial state value
   * @param options - Configuration options
   * @returns Raw reactive state object
   */
  raw<T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): State<T>;

  /**
   * Creates a flat reactive state that only tracks top-level properties.
   *
   * @param init - Initial array state
   * @param options - Configuration options
   * @returns Flat reactive array state
   */
  flat<T extends unknown[], S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): State<T>;

  /**
   * Creates a reactive state with schema validation.
   *
   * @param init - Initial state value
   * @param schema - Zod schema for validation
   * @param options - Configuration options
   * @returns Validated reactive state object
   */
  model<S extends LinkableSchema, T extends ModelInput<S>>(init: T, schema: S, options?: AnchorConfig): ModelOutput<S>;

  /**
   * Creates an immutable reactive state.
   *
   * @param init - Initial state value
   * @param options - Configuration options
   * @returns Immutable reactive state object
   */
  immutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
    init: T,
    options?: AnchorOptions<S>
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
    options?: AnchorConfig
  ): ImmutableOutput<S>;

  // Accessibility methods.

  /**
   * Gets the current state value.
   *
   * @param state - The reactive state
   * @returns Current state value
   */
  get<T extends Linkable>(state: State<T>): T;

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
   * Configures global Anchor settings.
   *
   * @param config - Partial configuration object
   */
  configure(config: Partial<AnchorConfig>): void;

  /**
   * Gets the global Anchor settings.
   * @returns {AnchorConfig}
   */
  configs(): AnchorConfig;
}

export type AnchorInternalFn = <T extends Linkable, S extends LinkableSchema>(
  init: T,
  options: AnchorOptions<S>,
  root?: StateMetadata,
  parent?: StateMetadata
) => State<T>;
