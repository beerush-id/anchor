import { entries, isObject, logger, merge, typeOf } from '@beerush/utils';

export type Part<T> = Partial<T>;
export type KeyOf<T> = Extract<keyof T, string>;
export type ItemTypeOf<T> = T extends readonly (infer U)[] ? U : never;

export type ObjectAction = 'set' | 'delete';
export type ArrayAction =
  'copyWithin'
  | 'fill'
  | 'pop'
  | 'push'
  | 'shift'
  | 'unshift'
  | 'splice'
  | 'sort'
  | 'reverse';
export type Action = ObjectAction | ArrayAction;
export const OBJECT_MUTATIONS: ObjectAction[] = [ 'set', 'delete' ];
export const ARRAY_MUTATIONS: ArrayAction[] = [
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
export const LINKABLE = [ 'array', 'object' ];
export const INTERNAL_KEY = 'anchor:internal';

export type Unsubscribe = () => void;
export type Subscriber<T> = (state: T, event: StateEvent<T>) => void;
export type SubscriberList<T> = Subscriber<T>[];
export type SubscriptionMap<T> = Map<T[keyof T], Unsubscribe>;

export type Rec = {
  [key: string]: unknown;
}
export type Init = Rec | Array<Rec | unknown> | Map<unknown, unknown>;
export type State<T, R extends boolean = true> = (
  R extends true
  ? T extends Rec[]
    ? Array<State<ItemTypeOf<T>, R>>
    // eslint-disable-next-line @typescript-eslint/ban-types
    : T extends Function
      ? T
      : T extends Rec
        ? { [K in keyof T]: T[K] extends Init ? State<T[K], R> : T[K] }
        : T
  : T
  ) & (
  T extends Map<infer K, infer V> | Set<infer V>
  ? {
    readonly subscribe: (
      run: Subscriber<State<T extends Map<K, V> ? Map<K, V> : Set<V>, R>>,
      emit?: boolean,
      receiver?: unknown,
    ) => Unsubscribe
  }
  : {
    readonly set: (value: Part<T> | Part<T>[]) => void;
    readonly subscribe: (run: Subscriber<State<T, R>>, emit?: boolean, receiver?: unknown) => Unsubscribe;
  }
  );
export type StateEvent<T> = {
  readonly type: 'init' | 'subscribe' | 'update' | 'destroy' | ObjectAction | ArrayAction | 'map:set' | 'map:delete' | 'map:clear' | 'unknown';
  readonly prop?: keyof T;
  readonly path?: string;
  readonly paths?: string[];
  readonly value?: unknown;
  readonly params?: unknown[];
  readonly oldValue?: unknown;
  readonly emitter?: unknown;
};
export type Controller<T> = {
  readonly set: (value: Part<T>) => void;
  readonly emit: (event: StateEvent<T>) => void;
  readonly update: (updater: (value: T) => T) => void;
  readonly destroy: () => void;
  readonly subscribe: (run: Subscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
};

export enum Pointer {
  STATE,
  MANAGER,
  SUBSCRIBERS,
  SUBSCRIPTIONS,
}

export type Anchor<T, R extends boolean = true> = [ State<T, R>, Controller<T>, SubscriberList<T>, SubscriptionMap<T> ];

export const Registry: Map<Init, Anchor<Init>> = new Map();
export const StateRegistry: Map<Init, Anchor<Init>> = new Map();
export const InitsRegistry: Map<Init, Anchor<Init>> = new Map();

const read = <T extends Init>(init: T): Anchor<T> | undefined => {
  const pointer = (StateRegistry.get(init as Init) || InitsRegistry.get(init)) as never;

  if (pointer) {
    logger.debug('[anchor:exist] Anchor exists, reusing it.');
  }

  return pointer;
};

const write = <T extends Init>(init: T, state: T, pointer: Anchor<T>) => {
  InitsRegistry.set(init, pointer as never);
  StateRegistry.set(state, pointer as never);

  logger.debug('[anchor:register] Anchor created.');
};

const revoke = <T extends Init>(init: T, state: T) => {
  InitsRegistry.delete(init);
  StateRegistry.delete(state);

  logger.debug('[anchor:unregister] Anchor revoked for garbage collector.');
};

export function crate<T extends Init>(init: T): Anchor<T>;
export function crate<T extends Init>(init: T, recursive: boolean): Anchor<T, false>;
export function crate<T extends Init>(init: T, recursive = true): Anchor<T> {
  const registered = read(init);
  if (registered) {
    return registered as never;
  }

  const subscribers: Subscriber<T>[] = [];
  const subscriptions: Map<State<T[keyof T]>, Unsubscribe> = new Map();
  let stopPropagation = false;

  const link = (childInit: T[keyof T], prop?: keyof T): T[keyof T] => {
    let ref = read(childInit as Init);

    if (!ref) {
      ref = crate(childInit as Init) as never;
    }

    const childState = ref[Pointer.STATE];

    if (!subscriptions.has(childState as never)) {
      const unsubscribe = ref[Pointer.MANAGER].subscribe((s, e) => {
        if (e) {
          if (!prop && Array.isArray(state)) {
            prop = `${ state.indexOf(childState as never) }` as keyof T;
          }

          const { type, value, path, paths, params, oldValue, emitter } = e;

          publish({
            type,
            value,
            prop,
            path: path ? `${ (prop ?? '') as string }.${ path }` : (prop ?? '') as string,
            paths: paths?.map(p => `${ (prop ?? '') as string }.${ p }`),
            params,
            oldValue,
            emitter,
          });

          // logger.info(`[anchor:publish] Anchor sub-event propagated. { ${ type }:${ path } }`);
        } else {
          publish({ type: 'unknown', value: s });
        }
      }, false, INTERNAL_KEY);

      subscriptions.set(childState as never, unsubscribe);
    }

    logger.debug('[anchor:link] Anchor linked to child state.');
    return childState as T[keyof T];
  };

  const unlink = (current: State<T[keyof T]>) => {
    const unsubscribe = subscriptions.get(current);

    if (typeof unsubscribe === 'function') {
      unsubscribe();
      subscriptions.delete(current);
      logger.debug('[anchor:unlink] Anchor unlinked from child state.');
    }
  };

  const subscribe = (handler: Subscriber<T>, emit = true, receiver?: unknown) => {
    if (emit) {
      const event: StateEvent<T> = { type: 'init', value: state, emitter: init };
      handler(state, event);
    }

    // Store the subscriber to emit events.
    subscribers.push(handler);

    if (receiver !== INTERNAL_KEY && !Registry.has(state)) {
      Registry.set(state, pointer as never);
      logger.debug('[anchor:subscribe] Anchor is now being used.');
    }

    // Return an unsubscribe function.
    return () => {
      const index = subscribers.indexOf(handler);

      if (index > -1) {
        subscribers.splice(index, 1);
      }

      // Unsubscribe from all linkable child states if no more subscribers.
      if (!subscribers.length) {
        if (receiver !== INTERNAL_KEY) {
          Registry.delete(state);
          logger.debug('[anchor:unsubscribe] Anchor is now idle.');
        }

        revoke(init, state);

        if (subscriptions.size && recursive) {
          for (const [ s, unsubscribe ] of subscriptions) {
            unsubscribe();
            subscriptions.delete(s);
          }
        }
      }
    };
  };

  const publish = (event: StateEvent<T>) => {
    if (stopPropagation) {
      // logger.debug('[anchor:publish] Anchor event propagation stopped.');
      return;
    }

    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(state, event);
      }
    }

    // logger.debug('[anchor:publish] Anchor event emitted.');
  };

  const set = (value: Part<T> | Part<T>[], emit = true) => {
    stopPropagation = true;

    const oldValue = Array.isArray(state) ? [ ...(state as never[]) ] : { ...state };

    if (Array.isArray(value) && Array.isArray(state)) {
      state.splice(0, state.length, ...(value as never[]));
    } else {
      merge(state, value);
    }

    stopPropagation = false;

    if (emit) {
      publish({ type: 'update', paths: Object.keys(value), value, oldValue, emitter: init });
    }

    // logger.debug('[anchor:set] Anchor updated using setter.');
  };

  const update = (updater: (value: T) => T | void, emit = true) => {
    const value = updater(state);

    if (value) {
      // logger.debug('[anchor:update] Anchor updater invoked.');
      set(value, emit);
    }
  };

  const destroy = () => {
    for (const [ s, unsubscribe ] of subscriptions) {
      unsubscribe();
      subscriptions.delete(s);
    }

    subscribers.splice(0, subscribers.length);

    revoke(init, state);
  };

  if (Array.isArray(init)) {
    if (recursive) {
      init.forEach((item, prop) => {
        if (typeof item === 'object' && linkable(item)) {
          const childData = link(item as T[keyof T]);
          init.splice(prop, 1, childData as ItemTypeOf<T>);
        }
      });
    }

    for (const method of ARRAY_MUTATIONS) {
      const fn = init[method] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        init[method as never] = (...args: unknown[]) => {
          const current = [ ...(state as Rec[]) ];

          if (recursive) {
            args.forEach((item, i) => {
              if (typeof item === 'object' && linkable(item)) {
                const childData = link(item as never);
                args.splice(i, 1, childData);
              }
            });
          }

          const result = fn.bind(init)(...(args as unknown[]));

          for (const item of current) {
            if (!init.includes(item) && typeof item === 'object' && linkable(item)) {
              const ref = read(item as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          publish({ type: method, value: [ ...(state as Rec[]) ], params: args, oldValue: current, emitter: init });
          return result;
        };

        Object.defineProperty(init, method, { enumerable: false });
      }
    }
  }

  if (init instanceof Map) {
    if (recursive) {
      for (const [ key, value ] of init.entries()) {
        if (typeof value === 'object' && linkable(value)) {
          const childData = link(value as never, key as keyof T);
          init.set(key, childData);
        }
      }
    }

    for (const method of [ 'set', 'delete', 'clear' ]) {
      const fn = init[method as never] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        init[method as never] = ((...args: unknown[]) => {
          const current = [ ...init.entries() ];

          if (method === 'set' && recursive) {
            const [ key, value ] = args as [ unknown, unknown ];

            if (typeof value === 'object' && linkable(value)) {
              args.splice(1, 1, link(value as never, key as keyof T));
            }
          } else if (method === 'delete' && recursive) {
            const ref = read(init.get(args[0] as never) as Init);

            if (ref) {
              unlink(ref[Pointer.STATE] as never);
            }
          } else if (method === 'clear' && recursive) {
            for (const [ , value ] of init.entries()) {
              const ref = read(value as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          const result = fn.bind(init)(...(args as unknown[]));
          publish({
            type: `map:${ method }` as never,
            value: [ ...init.entries() ],
            params: args,
            oldValue: current,
            emitter: init,
          });
          return result;
        }) as never;

        Object.defineProperty(init, method, { enumerable: false });
      }
    }
  }

  if (init instanceof Set) {
    if (recursive) {
      for (const value of init.values()) {
        if (typeof value === 'object' && linkable(value)) {
          const childData = link(value as never);
          init.delete(value);
          init.add(childData);
        }
      }
    }

    for (const method of [ 'add', 'delete', 'clear' ]) {
      const fn = init[method as never] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        init[method as never] = ((...args: unknown[]) => {
          const current = [ ...init.entries() ];

          if (method === 'add' && recursive) {
            const [ value ] = args as [ unknown ];

            if (typeof value === 'object' && linkable(value)) {
              args.splice(0, 1, link(value as never));
            }
          } else if (method === 'delete' && recursive) {
            const ref = read(args[0] as Init);

            if (ref) {
              unlink(ref[Pointer.STATE] as never);
            }
          } else if (method === 'clear' && recursive) {
            for (const value of init.values()) {
              const ref = read(value as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          const result = fn.bind(init)(...(args as unknown[]));
          publish({
            type: `set:${ method }` as never,
            value: [ ...init.entries() ],
            params: args,
            oldValue: current,
            emitter: init,
          });
          return result;
        }) as never;

        Object.defineProperty(init, method, { enumerable: false });
      }
    }
  }

  if (isObject(init) && recursive) {
    for (const [ prop, value ] of entries(init)) {
      if (typeof value === 'object' && linkable(value)) {
        init[prop] = link(value, prop);
      }
    }
  }

  const state = !transformable(init) ? init : new Proxy(init, {
    set(target: T, prop: keyof T, value: T[keyof T]) {
      const current = Reflect.get(target, prop) as State<T[keyof T]>;

      // Skip if value is the same.
      if (current === value) {
        return true;
      }

      // Remove current subscription if the current value is a linkable state.
      if (typeof current === 'object' && linkable(current) && recursive) {
        unlink(current);
      }

      // Add new child subscription if the new value is a linkable state.
      if (typeof value === 'object' && linkable(value) && recursive) {
        link(value, prop);
      }

      Reflect.set(target, prop, value);
      publish({ type: 'set', value, prop, path: prop as string, oldValue: current, emitter: init });

      return true;
    },
    deleteProperty(target: T, prop: keyof T): boolean {
      const current = Reflect.get(target, prop) as State<T[keyof T]>;

      if (typeof current === 'object' && linkable(current) && recursive) {
        unlink(current);
      }

      Reflect.deleteProperty(target, prop);
      publish({ type: 'delete', prop, path: prop as string, oldValue: current, emitter: init });

      return true;
    },
  } as never);
  const manager: Controller<T> = { destroy, emit: publish, set, subscribe, update };
  const pointer = [ state, manager, subscribers, subscriptions ] as Anchor<T>;

  if (replaceable(init)) {
    Object.assign(state, { set });
    Object.defineProperty(state, 'set', { enumerable: false });
  }

  Object.assign(state, { subscribe });
  Object.defineProperty(state, 'subscribe', { enumerable: false });

  write(init, state, pointer);

  return pointer;
}

export function anchor<T extends Init>(init: T): State<T>;
export function anchor<T extends Init>(init: T, recursive: boolean): State<T, false>;
export function anchor<T extends Init>(init: T, recursive = true): State<T> {
  return crate(init, recursive)[Pointer.STATE] as never;
}

export type Publisher<T> = (event: StateEvent<T>) => void;
export type Readable<T> = T & {
  readonly subscribe: (run: Subscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
}
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
}

export function readable<T extends Init>(init: T): [ Readable<T>, Publisher<T> ] {
  const instance = Array.isArray(init) ? [ ...(init as never[]) ] : { ...init };
  const subscribers: Subscriber<T>[] = [];

  const subscribe = (handler: Subscriber<T>, emit = true) => {
    if (emit) {
      const event: StateEvent<T> = { type: 'init', value: instance, emitter: instance };
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

  const publish: Publisher<T> = (event: StateEvent<T>) => {
    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(instance as T, event);
      }
    }
  };

  Object.defineProperty(instance, 'subscribe', { value: subscribe, enumerable: false });

  return [ instance as Readable<T>, publish ];
}

export function writable<T extends Init>(init: T): [ Writable<T>, Publisher<T> ] {
  const [ instance, publish ] = readable(init);

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

function linkable(value: unknown): boolean {
  return LINKABLE.includes(typeOf(value));
}

function replaceable(value: unknown): boolean {
  return !(value instanceof Map || value instanceof Set);
}

function transformable(value: unknown): boolean {
  return !(value instanceof Map || value instanceof Set || Array.isArray(value));
}
