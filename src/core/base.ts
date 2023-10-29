import { isObject } from '../utils/index.js';

export type Rec = {
  [key: string]: unknown;
}
export type Part<T> = Partial<T>;
export type KeyOf<T> = Extract<keyof T, string>;
export type ItemTypeOf<T> = T extends readonly (infer U)[] ? U : never;

export type ObjectMutation = 'set' | 'delete';
export type ArrayMutation =
  'copyWithin'
  | 'fill'
  | 'pop'
  | 'push'
  | 'shift'
  | 'unshift'
  | 'splice'
  | 'sort'
  | 'reverse';
export type StateMutation = ObjectMutation | ArrayMutation;

export const OBJECT_MUTATIONS: ObjectMutation[] = [ 'set', 'delete' ];
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

export type Unsubscribe = () => void;
export type Subscriber<T> = (state: T, event: StateChange<T>) => void;
export type SubscriberList<T> = Readable<Set<Subscriber<T>>>;

export type StateChange<T> = {
  readonly type: 'init' |
    'subscribe' |
    'update' |
    'destroy' |
    ObjectMutation |
    ArrayMutation |
    'map:set' |
    'map:delete' |
    'map:clear' |
    'set:add' |
    'set:delete' |
    'unknown' |
    'validation';
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
  [key: string]: StateChange<unknown>
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
}
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
}

export function readable<T>(init: T, freeze = true): [ Readable<T>, Publisher<T> ] {
  if (typeof init !== 'object') {
    throw new TypeError('Readable state must be an object.');
  }

  const instance = freeze ? frozen(init) : init;
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

  return [ instance as Readable<T>, publish ];
}

export function writable<T>(init: T, freeze = true): [ Writable<T>, Publisher<T> ] {
  const [ instance, publish ] = readable(init, freeze);

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

  return [ instance as Writable<T>, publish ];
}

export function frozen<T>(init: T): T {
  if (Array.isArray(init)) {
    return [ ...init ] as T;
  }

  if (init instanceof Map) {
    return new Map(init) as T;
  }

  if (init instanceof Set) {
    return new Set(init) as T;
  }

  if (isObject(init)) {
    return { ...init } as T;
  }

  return init;
}
