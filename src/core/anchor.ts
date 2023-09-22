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
export type AnchorSubscriber<T> = (state: T, event: StateEvent<T>) => void;
export type AnchorSubscriberList<T> = AnchorSubscriber<T>[];
export type AnchorSubscriptionMap<T> = Map<T[keyof T], Unsubscribe>;

export type Rec = {
  [key: string]: unknown;
}

export type Init = Rec | Rec[];

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
  ) & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
  readonly subscribe: (run: AnchorSubscriber<State<T, R>>, emit?: boolean, receiver?: unknown) => Unsubscribe;
}

export type StateEvent<T> = {
  readonly type: 'init' | 'subscribe' | 'update' | 'destroy' | ObjectAction | ArrayAction | 'unknown';
  readonly prop?: keyof T;
  readonly path?: string;
  readonly paths?: string[];
  readonly value?: unknown;
  readonly params?: unknown[];
  readonly oldValue?: unknown;
  readonly emitter?: unknown;
};

export type AnchorManager<T> = {
  readonly set: (value: Part<T>) => void;
  readonly emit: (event: StateEvent<T>) => void;
  readonly update: (updater: (value: T) => T) => void;
  readonly destroy: () => void;
  readonly subscribe: (run: AnchorSubscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
};

export enum Pointer {
  STATE,
  MANAGER,
  SUBSCRIBERS,
  SUBSCRIPTIONS,
}

export type Anchor<T, R extends boolean = true> = [ State<T, R>, AnchorManager<T>, AnchorSubscriberList<T>, AnchorSubscriptionMap<T> ];

export const Registry: Map<Init, Anchor<Init>> = new Map();
const StateRegistry: WeakMap<Init, Anchor<Init>> = new WeakMap();
const InitsRegistry: WeakMap<Init, Anchor<Init>> = new WeakMap();

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

  const subscribers: AnchorSubscriber<T>[] = [];
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

    return childState as T[keyof T];
  };

  const unlink = (current: State<T[keyof T]>) => {
    const unsubscribe = subscriptions.get(current);

    if (typeof unsubscribe === 'function') {
      unsubscribe();
      subscriptions.delete(current);
    }
  };

  const subscribe = (handler: AnchorSubscriber<T>, emit = true, receiver?: unknown) => {
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
      // logger.info('[anchor:publish] Anchor event propagation stopped.');
      return;
    }

    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(state, event);
      }
    }

    // logger.info('[anchor:publish] Anchor event emitted.');
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
      set(value, emit);
      // logger.debug('[anchor:update] Anchor updated using updater.');
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
        Object.defineProperty(init, method, {
          value: (...args: unknown[]) => {
            const length = state.length;
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

            if (length !== state.length) {
              publish({ type: method, value: [ ...(state as Rec[]) ], params: args, oldValue: current, emitter: init });
            }
            // else {
            //   logger.debug('[anchor:array] Array mutation did not cause a change. Skipping publish.');
            // }

            return result;
          },
          enumerable: false,
        });
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

  const state = Array.isArray(init) ? init : new Proxy(init, {
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

      if (typeof current === 'object' && linkable(current)) {
        const unsubscribe = subscriptions.get(current);

        if (typeof unsubscribe === 'function') {
          unsubscribe();
          subscriptions.delete(current);
        }
      }

      Reflect.deleteProperty(target, prop);
      publish({ type: 'delete', prop, path: prop as string, oldValue: current, emitter: init });

      return true;
    },
  } as never);
  const manager: AnchorManager<T> = { destroy, emit: publish, set, subscribe, update };
  const pointer = [ state, manager, subscribers, subscriptions ] as Anchor<T>;

  Object.defineProperty(state, 'set', { value: set, enumerable: false });
  Object.defineProperty(state, 'subscribe', { value: subscribe, enumerable: false });

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
  readonly subscribe: (run: AnchorSubscriber<T>, emit?: boolean, receiver?: unknown) => Unsubscribe;
}
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
}

export function readable<T extends Init>(init: T): [ Readable<T>, Publisher<T> ] {
  const instance = Array.isArray(init) ? [ ...(init as never[]) ] : { ...init };
  const subscribers: AnchorSubscriber<T>[] = [];

  const subscribe = (handler: AnchorSubscriber<T>, emit = true) => {
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
