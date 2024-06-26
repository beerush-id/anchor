import { isObject } from '../utils/index.js';

export type Rec = {
  [key: string]: unknown;
};
export type Part<T> = Partial<T>;
export type KeyOf<T> = Extract<keyof T, string>;
export type ItemTypeOf<T> = T extends readonly (infer U)[] ? U : never;

export type ObjectMutation = 'set' | 'delete';
export type ArrayMutation =
  | 'copyWithin'
  | 'fill'
  | 'pop'
  | 'push'
  | 'shift'
  | 'unshift'
  | 'splice'
  | 'sort'
  | 'reverse';
export type StateMutation = ObjectMutation | ArrayMutation;

export const OBJECT_MUTATIONS: ObjectMutation[] = ['set', 'delete'];
export const ARRAY_MUTATIONS: ArrayMutation[] = [
  'copyWithin',
  'fill',
  'pop',
  'push',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
];

export type Subscriber<T> = (state: T, event: StateChange<T>) => void;
export type SubscriberList<T> = Readable<Set<Subscriber<T>>>;
export type Subscribe<T> = (callback: Subscriber<T>, emitNow?: boolean) => Unsubscribe;
export type Unsubscribe = () => void;

export type StateChange<T> = {
  readonly type:
    | 'init'
    | 'subscribe'
    | 'update'
    | 'destroy'
    | ObjectMutation
    | ArrayMutation
    | 'map:set'
    | 'map:delete'
    | 'map:clear'
    | 'set:add'
    | 'set:delete'
    | 'unknown'
    | 'validation';
  readonly prop?: keyof T;
  readonly path?: string;
  readonly paths?: string[];
  readonly value?: unknown;
  readonly params?: unknown[];
  readonly oldValue?: unknown;
  readonly emitter?: unknown;
};
export type Publisher<T> = (event: StateChange<T>) => void;

export const BASE_EVENT: {
  [key: string]: StateChange<unknown>;
} = {
  CHANGE: { type: 'set' } as const,
  DELETE: { type: 'delete' } as const,
  SET_ADD: { type: 'set:add' } as const,
  SET_DELETE: { type: 'set:delete' } as const,
  MAP_SET: { type: 'map:set' } as const,
  MAP_DELETE: { type: 'map:delete' } as const,
};

export type Readable<T> = T & {
  readonly subscribe: (run: Subscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
};
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
};

const READABLE_STORE = new WeakMap();
const SUBSCRIBER_STORE = new WeakMap();

export class WeakReadable<T> {
  constructor(init: T, frozen = true) {
    if (typeof init !== 'object' || init === null) {
      throw new TypeError('Readable state must be an object.');
    }

    READABLE_STORE.set(this as never, frozen ? freeze(init) : init);
  }

  public get(): T {
    return READABLE_STORE.get(this as never) as T;
  }

  public subscribe(handler: Subscriber<T>, emitNow = true): Unsubscribe {
    let subscribers = SUBSCRIBER_STORE.get(this as never) as Subscriber<T>[];

    if (!subscribers) {
      subscribers = [];
      SUBSCRIBER_STORE.set(this as never, subscribers);
    }

    const value = READABLE_STORE.get(this as never) as T;

    if (emitNow) {
      const event: StateChange<T> = { type: 'init', value, emitter: this };
      handler(value, event);
    }

    subscribers.push(handler);

    return () => {
      const index = subscribers.indexOf(handler);

      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  }
}

export class WeakWritable<T> extends WeakReadable<T> {
  public set(value: T, emit = true): void {
    READABLE_STORE.set(this as never, value);

    if (emit) {
      const event: StateChange<T> = { type: 'update', value, emitter: this };
      publishTo(this as never, event);
    }
  }

  public update(handler: (current: T) => T) {
    const instance = READABLE_STORE.get(this as never) as T;
    const value = handler(instance);

    this.set(value);
  }
}

const publishTo = <T>(instance: WeakReadable<T>, event: StateChange<T>) => {
  const subscribers = SUBSCRIBER_STORE.get(instance as never) as Set<Subscriber<T>>;

  for (const run of subscribers) {
    if (typeof run === 'function') {
      run(instance.get(), event);
    }
  }
};

export function weakReadable<T>(init: T, frozen = true): [WeakReadable<T>, T, Publisher<T>] {
  const instance = new WeakReadable(init, frozen);
  const publish: Publisher<T> = (event: StateChange<T>) => publishTo(instance, event);

  return [instance, instance.get(), publish];
}

export function weakWritable<T>(init: T, frozen = true): [WeakWritable<T>, T, Publisher<T>] {
  const instance = new WeakWritable(init, frozen);
  const publish: Publisher<T> = (event: StateChange<T>) => publishTo(instance, event);

  return [instance, instance.get(), publish];
}

export function readable<T>(init: T, frozen = true): [Readable<T>, Publisher<T>] {
  if (typeof init !== 'object') {
    throw new TypeError('Readable state must be an object.');
  }

  const instance = frozen ? freeze(init) : init;
  const subscribers: Subscriber<T>[] = [];

  const subscribe = (handler: Subscriber<T>, emitNow = true) => {
    if (emitNow) {
      const event: StateChange<T> = { type: 'init', value: instance, emitter: instance };
      handler(instance as T, event);
    }

    // Store the subscriber to emit events.
    subscribers.push(handler);

    // Return an unsubscribe function.
    return () => {
      const index = subscribers.indexOf(handler);

      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  };

  const publish: Publisher<T> = (event: StateChange<T>) => {
    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(instance as T, event);
      }
    }
  };

  Object.defineProperty(instance, 'subscribe', { value: subscribe, enumerable: false });

  return [instance as Readable<T>, publish];
}

export function writable<T>(init: T, frozen = true): [Writable<T>, Publisher<T>] {
  const [instance, publish] = readable(init, frozen);

  const set = (value: Part<T> | Part<T>[], emit = true) => {
    if (Array.isArray(value) && Array.isArray(instance)) {
      instance.splice(0, instance.length, ...(value as never[]));
    } else {
      Object.assign(instance, value);
    }

    if (emit) {
      publish({ type: 'update', value, emitter: instance });
    }
  };

  Object.defineProperty(instance, 'set', { value: set, enumerable: false });

  return [instance as Writable<T>, publish];
}

export function freeze<T>(init: T): T {
  if (Array.isArray(init)) {
    return [...init] as T;
  }

  if (init instanceof Map) {
    return new Map(init) as T;
  }

  if (init instanceof Set) {
    return new Set(init) as T;
  }

  if (init instanceof Date) {
    return new Date(init) as T;
  }

  if (isObject(init)) {
    return { ...init } as T;
  }

  return init;
}

export function isSafeObject(value: unknown) {
  return Array.isArray(value) || value instanceof Set || value instanceof Map || isObject(value);
}

export function isSerializable(value: unknown): boolean {
  if (!Array.isArray(value) && !isObject(value)) return false;

  if (Array.isArray(value)) {
    return value.every(isSerializable);
  } else if (typeof value === 'object') {
    for (const key in value) {
      if (!isSerializable(value[key as never])) return false;
    }
  }

  return true;
}
