import { ARRAY_MUTATIONS, BATCH_MUTATIONS, MAP_MUTATIONS, OBJECT_MUTATIONS, SET_MUTATIONS } from './constant.js';
import type { ZodType } from 'zod/v4';
import type { LogLevel } from './logger.js';

export type LoggerConfig = {
  level: LogLevel;
  verbose: boolean;
  traceDebug: boolean;
  traceVerbose: boolean;
};
export type Logger = {
  error: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
  verbose: (...args: unknown[]) => void;
  configure: (config: Partial<LoggerConfig>) => void;
};

export type KeyLike = string | number | symbol;
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
};
export type Recursive = boolean | 'flat';

export type StateSubscriber<T> = (snapshot: T, event: StateChange) => void;
export type StateUnsubscribe = () => void;
export type StateSubscribeFn<T> = (handle: StateSubscriber<T>) => StateUnsubscribe;
export type StateSubscriberList<T> = Set<StateSubscriber<T>>;
export type StateSubscriptionMap = Map<Linkable, StateUnsubscribe>;
export type StateChildrenMap = WeakMap<WeakKey, Linkable>;

export type StateChange = {
  type: 'init' | StateMutation;
  keys: KeyLike[];
  prev?: unknown;
  value?: unknown;
};
export type StateController<T> = {
  id: string;
  destroy: StateUnsubscribe;
  subscribe: StateSubscribeFn<T>;
};
export type ObjLike = {
  [key: KeyLike]: unknown;
};
export type Linkable = ObjLike | unknown[] | Set<unknown> | Map<KeyLike, unknown>;

export type AnchorOptions<S extends ZodType> = AnchorConfig & {
  schema?: S;
};

export type PipeTransformer<T, R> = (value: T) => Partial<R>;

export type GetTrapOptions<T, S extends ZodType> = AnchorOptions<S> & {
  init: T;
  link: (childPath: KeyLike, childState: Linkable) => void;
  anchor: <T, S extends ZodType>(init: T, options: AnchorOptions<S>) => T;
  mutator?: WeakMap<WeakKey, WeakKey>;
  children: StateChildrenMap;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
};
export type SetTrapOptions<T, S extends ZodType> = GetTrapOptions<T, S> & {
  unlink: (childState: Linkable) => void;
};

export type LinkFactoryInit<T> = {
  init: T;
  subscribers: StateSubscriberList<T>;
  subscriptions: StateSubscriptionMap;
};
export type UnlinkFactoryInit = {
  subscriptions: StateSubscriptionMap;
};

export type DestroyFactoryInit<T> = LinkFactoryInit<T> & {
  state: T;
};
export type SubscribeFactoryInit<T> = AnchorConfig &
  DestroyFactoryInit<T> &
  LinkFactoryInit<T> & {
    children: StateChildrenMap;
    link: (childPath: KeyLike, childState: Linkable) => void;
    unlink: (state: Linkable) => void;
  };

export interface AnchorFn {
  <T, S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T;

  raw<T, S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T;
  flat<T, S extends ZodType = ZodType>(init: T, options?: AnchorOptions<S>): T;

  assign<T, K>(target: Map<T, K>, source: Map<T, K> | Record<KeyLike, K>): void;
  assign<T extends Array<unknown>>(target: T, source: { [key: string]: T[number] } | Record<string, T[number]>): void;
  assign<T extends object>(target: T, source: Partial<T>): void;

  remove<T, K>(target: Map<T, K>, ...keys: Array<T>): void;
  remove<T extends Array<unknown>>(target: T, ...keys: Array<string>): void;
  remove<T extends object>(target: T, ...keys: Array<keyof T>): void;
  clear<T>(target: T): void;

  get<T>(state: T): T;
  snapshot<T>(state: T): T;
}
