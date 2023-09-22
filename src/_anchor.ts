import { entries, logger, merge, read, typeOf, write } from '@beerush/utils';

export type GenericType = 'string' | 'number' | 'object' | 'array' | 'date' | 'function' | 'boolean';
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
export const OBJECT_MUTATIONS: ObjectAction[] = [ 'set', 'delete' ];

export type SubscribeFn<T> = ((handler: Subscriber<T>, init?: boolean) => Unsubscribe) & {
  destroy: (replacement: T) => void;
  subscribers: Subscriber<T>[];
  subscriptions: WeakMap<State<object>, Unsubscribe>;
};
export type Unsubscribe = () => void;
export type Subscriber<T> = (state: T, event: StateEvent<T>) => void;

export type Writable<T, R extends boolean = true> = T & {
  emit: (event: StateEvent<R extends true ? State<T> : T>) => void;
  set: (value: R extends true ? State<T> : T) => void;
  subscribe: SubscribeFn<R extends true ? State<T> : T>;
  update: (updater: (value: R extends true ? State<T> : T) => T) => void;
};

export type State<T> = T extends object[]
                       ? State<ItemTypeOf<T>>[] & Writable<T>
                       : T extends object
                         ? { [K in keyof T]: State<T[K]> } & Writable<T>
                         : T;

export type StateEvent<T> = {
  type: 'init' | 'subscribe' | 'idle' | 'active' | 'update' | 'destroy' | ObjectAction | ArrayAction | 'unknown';
  prop?: keyof T;
  path?: string;
  value?: unknown;
  emitter?: unknown;
};
export type StateInitEvent<T extends Init | Init[]> = {
  type: 'init';
  value: State<T>;
  emitter: State<T>;
};
export type StateSubscribeEvent<T extends Init | Init[]> = {
  type: 'subscribe';
  emitter: State<T>;
};
export type StateIdleEvent<T extends Init | Init[]> = {
  type: 'idle';
  value: State<T>;
  emitter: State<T>;
}
export type StateActiveEvent<T extends Init | Init[]> = {
  type: 'active';
  value: State<T>;
  emitter: State<T>;
}
export type StateUpdateEvent<T extends Init | Init[]> = {
  type: 'update';
  value: State<T>;
  emitter: State<T>;
}
export type StateDestroyEvent<T extends Init | Init[]> = {
  type: 'destroy';
  value: State<T>;
  emitter: State<T>;
}
export type StateObjectEvent<T extends Init | Init[]> = {
  type: ObjectAction;
  prop: keyof T;
  path: string;
  value: unknown
  emitter: State<T>;
}
export type StateArrayEvent<T extends Init | Init[]> = {
  type: ArrayAction;
  value: unknown[];
  emitter: State<T>;
}

export type Init = {
  [key: string]: unknown;
};

const RESERVED_KEYS = [ 'emit', 'set', 'update', 'subscribe' ];
const LINKABLE = [ 'array', 'object' ];

function linkable(value: unknown): boolean {
  return LINKABLE.includes(typeOf(value));
}

export function anchor<T extends Init | Init[]>(init: T): State<T>;
export function anchor<T extends Init | Init[]>(init: T, recursive: false): Writable<T, false>;
export function anchor<T extends Init | Init[]>(init: T, recursive = true): State<T> {
  if (!linkable(init)) {
    throw new Error('[ANCHOR:ERR-INVALID-VALUE] Initial value should be an object or an array!');
  }

  let instance: State<T> = init as never;
  let destroyed = false;

  const subscribers: Subscriber<T>[] = [];
  const subscriptions: Map<unknown, Unsubscribe> = new Map();
  const subscriptionQueues: Map<unknown, () => void> = new Map();

  const set = (state: T): void => {
    if (destroyed) {
      logger.warn(`[anchor:stale-set] State has been destroyed!`, instance);
      return;
    }

    if (Array.isArray(instance)) {
      for (const s of instance) {
        if (linkable(s)) {
          const unsubscribe = subscriptions.get(s as State<Init>);

          if (typeof unsubscribe === 'function') {
            unsubscribe();
            subscriptions.delete(s as State<Init>);
          }
        }
      }

      (instance as Init[]).splice(0, (instance as Init[]).length, ...(state as Init[]));
    } else {
      for (const [ , value ] of entries(instance)) {
        if (linkable(value)) {
          const unsubscribe = subscriptions.get(value as State<Init>);

          if (typeof unsubscribe === 'function') {
            unsubscribe();
            subscriptions.delete(value as State<Init>);
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
    emit({ type: 'init', value: state, emitter: instance });
  };

  const update = (updater: (value: State<T>) => T): void => {
    if (destroyed) {
      logger.warn(`[anchor:stale-update] State has been destroyed!`, instance);
      return;
    }

    const result = updater(instance as never);

    if (result) {
      merge(instance, result);
      emit({ type: 'update', value: instance, emitter: instance });
    } else {
      throw new Error('[ERR-INVALID-VALUE] Updater should return a value!');
    }

    logger.debug(`[anchor:Update]`, updater);
  };

  const subscribe: SubscribeFn<T> = (handler: Subscriber<T>, init = true): Unsubscribe => {
    if (init) {
      handler(instance as T, { type: 'subscribe' });
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
    emit({ type: 'active', value: instance, emitter: instance });

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

        emit({ type: 'idle', value: instance, emitter: instance });
        logger.debug(`[anchor:unsubscribe] Recursive subscription idle!`, instance);
      }
    };
  };

  subscribe.subscribers = subscribers;
  subscribe.subscriptions = subscriptions;
  subscribe.destroy = (replacement: T) => {
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
        run(instance as T, event);
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
      if (linkable(prev) && (prev as State<T>).subscribe) {
        const unsubscribe = subscriptions.get(prev as State<Init>);

        if (typeof unsubscribe === 'function') {
          unsubscribe();
          subscriptions.delete(prev as State<Init>);

          logger.debug(`[anchor:set] Exiting previous subscription.`, instance, prev);
        }
      }

      if (linkable(value) && recursive) {
        let state = value as State<Init>;
        if (!state.subscribe) {
          state = anchor(value as never);
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

                logger.debug('[anchor:event] Recursive subscription event.', event);
              }
            } else {
              emit({ type: 'set', value: state as never });

              logger.debug('[anchor:unknown-event] Recursive subscription event.', event);
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
        const unsubscribe = subscriptions.get(value);

        if (typeof unsubscribe === 'function') {
          unsubscribe();
          subscriptions.delete(value);
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
      const self = instance as Init[];
      self.forEach((item, prop) => {
        if (linkable(item)) {
          let state = item as State<ItemTypeOf<T>>;

          if (!state.subscribe) {
            state = anchor(item as never);
            self.splice(prop, 1, state as never);
          }

          subscriptionQueues.set(state, () => {
            const unsubscribe = state.subscribe((state: unknown, event) => {
              if (event) {
                const { type, path, value, emitter } = event;

                if (type !== 'subscribe') {
                  emit({
                    type,
                    value,
                    prop,
                    path: path ? `${ prop }.${ path }` : `${ prop }`,
                    emitter,
                  });

                  logger.debug('[anchor:event] Recursive subscription event.', event);
                }
              } else {
                emit({ type: 'unknown', value: state as never });

                logger.debug('[anchor:unknown-event] Recursive subscription event.', event);
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
              let state = item as State<Init[]>;

              if (!state.subscribe) {
                state = anchor(item as never);
                args.splice(prop, 1, state);
              }

              const queue = () => {
                const unsubscribe = state.subscribe((state: unknown, event) => {
                  if (event) {
                    const { type, path, value, emitter } = event;

                    if (type !== 'subscribe') {
                      emit({
                        type,
                        value,
                        prop,
                        path: path ? `${ prop }.${ path }` : `${ prop }`,
                        emitter,
                      });

                      logger.debug('[anchor:event] Recursive subscription event.', event);
                    }
                  } else {
                    emit({ type: 'unknown', value: state as never });

                    logger.debug('[anchor:unknown-event] Recursive subscription event.', event);
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

        emit({
          type: method,
          value: args,
          emitter: instance,
        });

        return result;
      };
    }
  } else {
    if (recursive) {
      for (const [ prop, value ] of entries(instance as T)) {
        if (linkable(value)) {
          let state = value as State<Init>;

          if (!state.subscribe) {
            state = anchor(value as never);
            instance[prop as never] = state as never;
          }

          subscriptionQueues.set(state, () => {
            const unsubscribe = state.subscribe((state: unknown, event) => {
              if (event) {
                const { type, value, path, emitter } = event;

                if (type !== 'subscribe') {
                  emit({
                    type,
                    value,
                    prop,
                    path: path ? `${ prop as string }.${ path }` : `${ prop as string }`,
                    emitter,
                  });

                  logger.debug('[anchor:event] Recursive subscription event.', event);
                }
              } else {
                emit({ type: 'unknown', value: state as never });

                logger.debug('[anchor:unknown-event] Recursive subscription event.', event);
              }
            });
            subscriptions.set(state as never, unsubscribe);
          });
        }
      }
    }

    instance = new Proxy(instance, handler as never) as State<T>;
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
export function assign<T extends Init>(state: State<T>, value: Partial<T>) {
  for (const [ key, val ] of entries(value)) {
    if (!RESERVED_KEYS.includes(key as string)) {
      (state as T)[key] = val as never;
    }
  }
}

/**
 * Reflects the state event to another state.
 */
export function reflect<S, T extends object>(event: StateEvent<S>, target: T): void {
  if (event && [ ...OBJECT_MUTATIONS, ...ARRAY_MUTATIONS ].includes(event.type as Action)) {
    if (OBJECT_MUTATIONS.includes(event.type as ObjectAction)) {
      if (event.type === 'set') {
        const value = typeof event.value === 'object' ? { ...event.value } : event.value;
        write(target as never, event.path as never, value as never);
      } else if (event.type === 'delete') {
        const paths = event.path?.split('.') as never[];
        const last = paths.pop() as never;

        if (paths.length) {
          const parent = read(target as never, paths.join('.') as never);
          delete parent[last];
        } else if (last) {
          delete target[last];
        }
      }
    } else if (ARRAY_MUTATIONS.includes(event.type as ArrayAction)) {
      if (event.path) {
        const next: Array<unknown> | void = read(target as never, event.path as never);

        if (Array.isArray(next)) {
          const fn = next[event.type as keyof Array<unknown>] as (...args: unknown[]) => unknown;

          if (typeof fn === 'function') {
            fn.bind(next)(...(event.value as never[]));
          } else {
            logger.warn(`[ANCHOR:WARN-INVALID-REFLECT] Invalid array event!`, next, event);
          }
        } else {
          if (Array.isArray(event.emitter)) {
            write(target as never, event.path as never, [ ...event.emitter ] as never);
          } else {
            logger.warn(`[ANCHOR:WARN-INVALID-REFLECT] Trying to call array methods on non array object!`, next, event);
          }
        }
      } else if (typeof target[event.type as never] === 'function' && Array.isArray(event.value)) {
        const fn = target[event.type as never] as (...args: unknown[]) => unknown;

        if (typeof fn === 'function') {
          fn.bind(target)(...(event.value as never[]));
        } else {
          logger.warn(`[ANCHOR:WARN-INVALID-REFLECT] Invalid array event!`, target, event);
        }
      }
    }
  }
}

/**
 * Mirrors the state event into another object.
 * @param {S} source
 * @param {T} target
 * @return {Unsubscribe}
 */
export function mirror<S, T extends object>(source: Writable<S> | State<S>, target: T): Unsubscribe {
  return (source as State<Init>).subscribe((s: unknown, event) => {
    reflect(event as never, target);
  });
}

/**
 * Syncs the state event between two states.
 * @param {State<S>} source
 * @param {State<T>} target
 * @return {Unsubscribe}
 */
export function sync<S, T>(
  source: Writable<S> | State<S>,
  target: Writable<T> | State<T>,
): Unsubscribe {
  const unsubSource = (source as State<Init>).subscribe((s: unknown, event) => {
    reflect(event as never, target as State<Init>);
  });
  const unsubTarget = (target as State<Init>).subscribe((s: unknown, event) => {
    reflect(event as never, source as State<Init>);
  });

  return () => {
    unsubSource();
    unsubTarget();
  };
}
