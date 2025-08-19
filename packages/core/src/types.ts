import { ARRAY_MUTATIONS, BATCH_MUTATIONS, MAP_MUTATIONS, OBJECT_MUTATIONS, SET_MUTATIONS } from './constant.js';
import { type input, type output, type ZodArray, type ZodObject } from 'zod/v4';
import type { LogLevel } from './logger.js';

export type LoggerConfig = {
  level: LogLevel;
  verbose: boolean;
  traceDebug: boolean;
  traceVerbose: boolean;
};
export type Logger = {
  create: {
    error(...args: unknown[]): unknown[];
    warn(...args: unknown[]): unknown[];
    info(...args: unknown[]): unknown[];
    debug(...args: unknown[]): unknown[];
    verbose(...args: unknown[]): unknown[];
  };
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  verbose: (...args: unknown[]) => void;
  configure: (config: Partial<LoggerConfig>) => void;
};

export type Recursive = boolean | 'flat';
export type MethodLike = (...args: unknown[]) => unknown;
export type KeyLike = string | number | symbol;
export type ObjLike = {
  [key: KeyLike]: unknown;
};

export type Linkable = object | unknown[] | Set<unknown> | Map<KeyLike, unknown>;
export type LinkableSchema = ZodObject | ZodArray;
export type ReadonlyLink = Immutable<Linkable>;

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
};
export type AnchorOptions<S extends LinkableSchema = LinkableSchema> = AnchorConfig & { schema?: S };

export type StateSubscriber<T> = (snapshot: T, event: StateChange, emitter?: string) => void;
export type StateUnsubscribe = () => void;
export type StateSubscribeFn<T> = (handle: StateSubscriber<T>, receiver?: Linkable) => StateUnsubscribe;
export type StateSubscriberList<T> = Set<StateSubscriber<T>>;
export type StateSubscriptionMap = Map<Linkable, StateUnsubscribe>;
export type StateLinkFn = (childKey: KeyLike, childState: Linkable, receiver?: Linkable) => void;
export type StateUnlinkFn = (childState: Linkable) => void;

export type StatePropGetter<T extends Linkable = Linkable> = (
  target: T,
  prop: keyof T,
  receiver?: unknown
) => T[keyof T];

export type StateReferences<T extends Linkable, S extends LinkableSchema> = {
  id: string;
  link: StateLinkFn;
  unlink: StateUnlinkFn;
  configs: AnchorOptions<S>;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
  getter?: StatePropGetter<T>;
  schema?: S;
  mutator?: WeakMap<WeakKey, MethodLike>;
};

export type StateChange = {
  type: 'init' | StateMutation;
  keys: KeyLike[];
  prev?: unknown;
  value?: unknown;
  emitter?: string;
};
export type StateController<T> = {
  id: string;
  destroy: StateUnsubscribe;
  subscribe: StateSubscribeFn<T>;
};

export type PipeTransformer<T, R> = (value: T) => Partial<R>;

export type LinkFactoryInit<T> = {
  id: string;
  init: T;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
};
export type UnlinkFactoryInit = {
  id: string;
  subscriptions: StateSubscriptionMap;
};

export type DestroyFactoryInit<T> = LinkFactoryInit<T> & {
  state: T;
};
export type SubscribeFactoryInit<T> = AnchorConfig &
  DestroyFactoryInit<T> &
  LinkFactoryInit<T> & {
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

export interface AnchorFn {
  <T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): T;
  <S extends LinkableSchema, T extends input<S>>(init: T, schema: S, options?: AnchorConfig): output<S>;
  <S extends LinkableSchema, T extends input<S>>(
    init: T,
    schema: S,
    options?: AnchorConfig & { immutable: true }
  ): Immutable<output<S>>;

  // Initializer methods.

  raw<T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): T;
  flat<T extends Linkable, S extends LinkableSchema = LinkableSchema>(init: T, options?: AnchorOptions<S>): T;
  model<S extends LinkableSchema, T extends input<S>>(init: T, schema: S, options?: AnchorConfig): output<S>;

  immutable<T extends Linkable, S extends LinkableSchema = LinkableSchema>(
    init: T,
    options?: AnchorOptions<S>
  ): Immutable<T>;
  immutable<S extends LinkableSchema, T extends input<S>>(
    init: T,
    schema: S,
    options?: AnchorConfig
  ): Immutable<output<S>>;

  // Accessibility methods.

  get<T>(state: T): T;
  snapshot<T>(state: T): T;

  writable<T extends ReadonlyLink>(state: T): Mutable<T>;
  writable<T, K extends MutationKey<T>[]>(init: T, contracts?: K): MutablePart<T, K>;

  // Utility methods.

  assign<T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>): void;
  assign<T extends Array<unknown>>(target: T, source: { [key: string]: T[number] } | Record<string, T[number]>): void;
  assign<T extends object>(target: T, source: Partial<T>): void;

  remove<T, K>(target: Map<T, K>, ...keys: Array<T>): void;
  remove<T extends Array<unknown>>(target: T, ...keys: Array<string>): void;
  remove<T extends object>(target: T, ...keys: Array<keyof T>): void;

  clear<T>(target: T): void;

  configure(config: Partial<AnchorConfig>): void;
}
