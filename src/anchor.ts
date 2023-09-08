import { entries, logger, typeOf } from '@beerush/utils';

export const ARRAY_MUTATIONS: Array<keyof Array<unknown>> = [
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

export type SubscribeFn<T, R extends boolean> = ((handler: Subscriber<T, R>, init?: boolean) => Unsubscribe) & {
  destroy: (replacement: State<T, R>) => void;
  subscribers: Subscriber<T, R>[];
  subscriptions: WeakMap<State<T[keyof T], R>, Unsubscribe>;
};
export type Unsubscribe = () => void;
export type Subscriber<T, R extends boolean> = (state: State<T, R>, event: StateEvent<T>) => void;

export type Readable<T, R extends boolean> = {
  subscribe: SubscribeFn<T, R>;
};

export type Writable<T, R extends boolean> = Readable<T, R> & {
  emit: (event: StateEvent<T>) => void;
  set: (value: T) => void;
  update: (updater: (value: State<T, R>) => T) => void;
};

export type RecursiveWritable<T, R extends boolean> = {
  [K in keyof T]: T[K] extends object[]
                  ? Writable<T[K], R> & RecursiveWritable<T[K], R>
    // eslint-disable-next-line @typescript-eslint/ban-types
                  : T[K] extends Function
                    ? T[K]
                    : T[K] extends object
                      ? Writable<T, R> & RecursiveWritable<T[K], R>
                      : T[K];
}

export type SimpleState<T> = Writable<T, false> & T;
export type RecursiveState<T> = Writable<T, true> & RecursiveWritable<T, true>;

export type State<T, R extends boolean = true> = R extends true ? RecursiveState<T> : SimpleState<T>;
export type StateEvent<T> = {
  type: 'init' | 'subscribe' | 'set' | 'update' | 'delete' | 'destroy';
  prop?: keyof T;
  path?: string;
  value?: T[keyof T];
  emitter?: unknown;
};

export type Init = {
  [key: string]: unknown;
};

const RESERVED_KEYS = [ 'emit', 'set', 'update', 'subscribe' ];
const LINKABLE = [ 'array', 'object' ];

function linkable(value: unknown): boolean {
  return LINKABLE.includes(typeOf(value));
}

export function anchor<T extends Init | Init[], R extends boolean = true>(init: T, recursive = true): State<T, R> {
  if (!linkable(init)) {
    throw new Error('[ANCHOR:ERR-INVALID-VALUE] Initial value should be an object or an array!');
  }

  let instance: State<T, R> = init as never;
  let destroyed = false;
  const subscribers: Subscriber<T, R>[] = [];
  const subscriptions: Map<State<T[keyof T], R>, Unsubscribe> = new Map();
  const subscriptionQueues: Map<State<T[keyof T], R>, () => void> = new Map();

  const set = (state: T): void => {
    if (destroyed) {
      logger.warn(`[anchor:stale-set] State has been destroyed!`, instance);
      return;
    }

    if (Array.isArray(instance)) {
      for (const s of instance) {
        if (linkable(s)) {
          const unsubscribe = subscriptions.get(s as State<T[keyof T], R>);

          if (typeof unsubscribe === 'function') {
            unsubscribe();
            subscriptions.delete(s as State<T[keyof T], R>);
          }
        }
      }

      (instance as Init[]).splice(0, (instance as Init[]).length, ...(state as Init[]));
    } else {
      for (const [ , value ] of entries(instance)) {
        if (linkable(value)) {
          const unsubscribe = subscriptions.get(value as State<T[keyof T], R>);

          if (typeof unsubscribe === 'function') {
            unsubscribe();
            subscriptions.delete(value as State<T[keyof T], R>);
          }
        }

      }

      for (const [ key, value ] of entries(state)) {
        if (RESERVED_KEYS.includes(key as string)) {
          logger.warn(`[ANCHOR:WARN-RESERVED-KEY] Key "${ key as string }" is reserved!`);
        } else {
          (instance as T)[key] = value;
        }
      }
    }

    logger.debug(`[anchor:Set]`, state);
    emit({ type: 'init', value: state as never });
  };

  const update = (updater: (value: State<T, R>) => T): void => {
    if (destroyed) {
      logger.warn(`[anchor:stale-update] State has been destroyed!`, instance);
      return;
    }

    const result = updater(instance as never);

    if (result) {
      set(result);
    } else {
      throw new Error('[ERR-INVALID-VALUE] Updater should return a value!');
    }

    logger.debug(`[anchor:Update]`, updater);
  };

  const subscribe: SubscribeFn<T, R> = (handler: Subscriber<T, R>, init = true): Unsubscribe => {
    if (init) {
      handler(instance, { type: 'subscribe' });
    }

    if (destroyed) {
      logger.warn(`[anchor:stale-subscribe] State has been destroyed!`, instance);
      return () => undefined;
    }

    subscribers.push(handler);

    if (!subscriptions.size && subscriptionQueues.size && recursive) {
      for (const [ , run ] of subscriptionQueues) {
        run();
      }

      logger.debug(`[anchor:subscribe] Recursive subscription active.`, instance);
    }

    logger.debug(`[anchor:subscribe]`, handler);

    return () => {
      const index = subscribers.indexOf(handler);

      if (index > -1) {
        subscribers.splice(index, 1);
      }

      if (!subscribers.length && subscriptions.size && recursive) {
        for (const [ state, unsubscribe ] of subscriptions) {
          unsubscribe();
          subscriptions.delete(state);
        }

        logger.debug(`[anchor:unsubscribe] Recursive subscription idle!`, instance);
      }
    };
  };

  subscribe.subscribers = subscribers;
  subscribe.subscriptions = subscriptions;
  subscribe.destroy = (replacement: State<T, R>) => {
    destroyed = true;
    emit({ type: 'destroy', value: replacement as never });

    for (const [ state, unsubscribe ] of subscriptions) {
      unsubscribe();
      subscriptions.delete(state);
    }

    subscriptionQueues.clear();
    subscribers.splice(0, subscribers.length);

    logger.debug(`[anchor:destroy]`, instance);
  };

  const emit = (event: StateEvent<T>) => {
    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(instance, event);
      }
    }

    logger.debug(`[anchor:Emit]`, event);
  };

  const handler: ProxyHandler<T> = {
    set: (target: T, prop: keyof T, value: T[keyof T], receiver: unknown): boolean => {
      if (RESERVED_KEYS.includes(prop as string)) {
        logger.warn(`[ANCHOR:WARN-RESERVED-KEY] Key "${ prop as string }" is reserved!`);
        return true;
      }

      // Skip if value is the same.
      if (target[prop] === value) {
        return true;
      }

      const prev = target[prop];
      if (linkable(prev) && (prev as State<T, R>).subscribe) {
        const unsubscribe = subscriptions.get(prev as State<T[keyof T], R>);

        if (typeof unsubscribe === 'function') {
          unsubscribe();
          subscriptions.delete(prev as State<T[keyof T], R>);

          logger.debug(`[anchor:set] Exiting previous subscription.`, instance, prev);
        }
      }

      if (linkable(value) && recursive) {
        let state = value as State<T[keyof T], R>;
        if (!state.subscribe) {
          state = anchor(value as never, recursive);
        }

        const queue = () => {
          const unsubscribe: Unsubscribe = state.subscribe((state: unknown, event) => {
            if (event) {
              const { type, path, emitter } = event;

              if (type !== 'subscribe') {
                emit({
                  type,
                  value: instance as never,
                  prop,
                  path: path ? `${ prop as string }.${ path }` : `${ prop as string }`,
                  emitter,
                });
              }
            } else {
              emit({ type: 'set', value: state as never });
            }
          });
          subscriptions.set(state, unsubscribe);
        };

        if (subscribers.length) {
          queue();
        } else {
          subscriptionQueues.set(state, queue);
        }

        logger.debug(`[anchor:set] Recursive state.`, instance, state);

        Reflect.set(target, prop, state, receiver);
      } else {
        Reflect.set(target, prop, value, receiver);
      }

      emit({ type: 'set', value, prop, path: prop as string, emitter: instance });

      return true;
    },
    deleteProperty(target: T, prop: keyof T): boolean {
      if (RESERVED_KEYS.includes(prop as string)) {
        logger.warn(`[ANCHOR:WARN-RESERVED-KEY] Key "${ prop as string }" is reserved!`);
        return true;
      }

      if (!(prop in target)) {
        return true;
      }

      const value = target[prop];
      if (typeof value === 'object') {
        const unsubscribe = subscriptions.get(value as State<T[keyof T], R>);

        if (typeof unsubscribe === 'function') {
          unsubscribe();
          subscriptions.delete(value as State<T[keyof T], R>);
        }
      }

      Reflect.deleteProperty(target, prop);
      emit({ type: 'delete', prop, path: prop as string, emitter: instance });

      return true;
    },
  } as never;

  Object.assign(instance, { emit, set, update, subscribe });

  Object.defineProperty(instance, 'emit', { enumerable: false });
  Object.defineProperty(instance, 'set', { enumerable: false });
  Object.defineProperty(instance, 'subscribe', { enumerable: false });
  Object.defineProperty(instance, 'update', { enumerable: false });

  if (Array.isArray(instance)) {
    if (recursive) {
      (instance as Init[]).forEach((item, prop) => {
        if (linkable(item)) {
          let state = item as State<T[keyof T], R>;

          if (!state.subscribe) {
            state = anchor(item as never, recursive);
            (instance as Init[]).splice(prop, 1, state as never);
          }

          subscriptionQueues.set(state, () => {
            const unsubscribe = state.subscribe((state: unknown, event) => {
              if (event) {
                const { type, path, value, emitter } = event;

                if (type !== 'subscribe') {
                  emit({
                    type,
                    value: value as never,
                    prop,
                    path: path ? `${ prop }.${ path }` : `${ prop }`,
                    emitter,
                  });
                }
              } else {
                emit({ type: 'set', value: state as never });
              }
            });
            subscriptions.set(state as never, unsubscribe);
          });
        }
      });
    }

    for (const method of ARRAY_MUTATIONS) {
      const fn = instance[method as never] as (...args: unknown[]) => unknown;

      (instance)[method as never] = (...args: unknown[]) => {
        if (recursive) {
          args.forEach((item, prop) => {
            if (linkable(item)) {
              let state = item as State<T[keyof T], R>;

              if (!state.subscribe) {
                state = anchor(item as never, recursive);
                args.splice(prop, 1, state as never);
              }

              const queue = () => {
                const unsubscribe = state.subscribe((state: unknown, event) => {
                  if (event) {
                    const { type, path, value, emitter } = event;

                    if (type !== 'subscribe') {
                      emit({
                        type,
                        value: value as never,
                        prop,
                        path: path ? `${ prop }.${ path }` : `${ prop }`,
                        emitter,
                      });
                    }
                  } else {
                    emit({ type: 'set', value: state as never });
                  }
                });
                subscriptions.set(state as never, unsubscribe);
              };

              if (subscribers.length) {
                queue();
              } else {
                subscriptionQueues.set(state, queue);
              }

              logger.debug(`[anchor:array] Recursive state.`, instance, state);
            }
          });
        }

        const result = fn.bind(instance)(...(args as unknown[]));

        let path;

        switch (method) {
          case 'push':
            path = `${ (instance as Init[]).length - 1 }`;
            break;
          case 'splice':
            path = `${ args[0] }`;
            break;
          default:
            break;
        }

        emit({
          type: method as never,
          value: args as never,
          path,
          emitter: instance,
        });

        return result;
      };
    }
  } else {
    if (recursive) {
      for (const [ prop, value ] of entries(instance as T)) {
        if (linkable(value)) {
          let state = value as State<T[keyof T], R>;

          if (!state.subscribe) {
            state = anchor(value as never, recursive);
            instance[prop] = state as never;
          }

          subscriptionQueues.set(state, () => {
            const unsubscribe = state.subscribe((state: unknown, event) => {
              if (event) {
                const { type, value, path, emitter } = event;

                if (type !== 'subscribe') {
                  emit({
                    type,
                    value: value as never,
                    prop,
                    path: path ? `${ prop as string }.${ path }` : `${ prop as string }`,
                    emitter,
                  });
                }
              } else {
                emit({ type: 'set', value: state as never });
              }
            });
            subscriptions.set(state as never, unsubscribe);
          });
        }
      }
    }

    instance = new Proxy(instance, handler as never) as State<T, R>;
  }

  logger.debug(`[anchor:Create]`, instance);
  return instance;
}

anchor.debug = (enabled?: boolean, stack?: boolean) => {
  logger.setDebug(enabled, stack);
};

/**
 * Assigns a value to a state without worrying the reserved properties.
 * @param {State<T>} state
 * @param {Partial<T>} value
 */
export function assign<T extends Init, R extends boolean = true>(state: State<T, R>, value: Partial<T>) {
  for (const [ key, val ] of entries(value)) {
    if (!RESERVED_KEYS.includes(key as string)) {
      state[key] = val as never;
    }
  }
}
