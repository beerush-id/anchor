import { entries, isObject, isObjectLike, logger, merge, typeOf } from '../utils/index.js';
import {
  ArraySchema,
  COMMON_SCHEMA_TYPES,
  DetailedValidation,
  flattenSchema,
  ObjectSchema,
  satisfy,
  Schema,
  validate,
} from '../schema/index.js';

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

export type AnchorConfig = {
  strictIterable?: boolean;
  circularDetection?: boolean;
  circularExit?: boolean;
  leakageDetection?: boolean;
  leakageDetectionBounce?: number;
  validationExit?: boolean;
  safeInit?: boolean;
  safeObject?: boolean;
  safeObjectWarning?: boolean;
}

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
export const LINKABLE = [ 'array', 'object' ];
export const INTERNAL_KEY = 'anchor:internal';
export const ANCHOR_CONFIG: AnchorConfig = {};

export type Quench = () => void;
export type Beacon<T> = (state: T, event: SailShift<T>) => void;
export type BeaconSet<T> = Set<Beacon<T>>;

export type Rec = {
  [key: string]: unknown;
}
export type Init = Rec | Array<Rec | unknown> | Map<unknown, unknown> | Set<unknown>;
export type Sail<T, R extends boolean = true> = (
  R extends true
  ? T extends Rec[]
    ? Array<Sail<ItemTypeOf<T>, R>>
    // eslint-disable-next-line @typescript-eslint/ban-types
    : T extends Function
      ? T
      : T extends Rec
        ? { [K in keyof T]: T[K] extends Init ? Sail<T[K], R> : T[K] }
        : T
  : T
  ) & (
  T extends Map<infer K, infer V> | Set<infer V>
  ? {
    readonly subscribe: (
      run: Beacon<Sail<T extends Map<K, V> ? Map<K, V> : Set<V>, R>>,
      emit?: boolean,
      receiver?: unknown,
    ) => Quench
  }
  : {
    readonly set: (value: Part<T> | Part<T>[]) => void;
    readonly subscribe: (run: Beacon<Sail<T, R>>, emit?: boolean, receiver?: unknown) => Quench;
  }
  );

export type SailShift<T> = {
  readonly type: 'init' | 'subscribe' | 'update' | 'destroy' | ObjectMutation | ArrayMutation | 'map:set' | 'map:delete' | 'map:clear' | 'unknown' | 'validation';
  readonly prop?: keyof T;
  readonly path?: string;
  readonly paths?: string[];
  readonly value?: unknown;
  readonly params?: unknown[];
  readonly oldValue?: unknown;
  readonly emitter?: unknown;
};

export type Navigator<T> = {
  readonly set: (value: Part<T>) => void;
  readonly emit: (event: SailShift<T>) => void;
  readonly update: (updater: (value: T) => T) => void;
  readonly destroy: () => void;
  readonly subscribe: (run: Beacon<T>, emit?: boolean, receiver?: unknown) => Quench;
};
export type TowLiner<T> = (parent: Sail<unknown>, fn: Beacon<T>) => Quench;

// Commonly used aliases.
export type State<T, R extends boolean = true> = Sail<T, R>;
export type StateEvent<T> = SailShift<T>;
export type Controller<T> = Navigator<T>;
export type Inheritor<T> = TowLiner<T>;
export type Unsubscribe = Quench;
export type Subscriber<T> = Beacon<T>;
export type SubscriberList<T> = BeaconSet<T>;

export enum Pointer {
  STATE,
  MANAGER,
  SUBSCRIBERS,
  CHILDREN,
  PARENTS,
  INHERIT,
  VALIDATION
}

export type ParentMap<T> = Map<Sail<T>, Beacon<T>>;
export type ChildrenMap<T> = Map<Sail<T>, Quench>;
export type StateTree<T> = {
  id: number;
  parents: ParentMap<T>;
  children: ChildrenMap<T>;
}

export type Anchor<T, R extends boolean = true> = [ Sail<T, R>, Navigator<T>, BeaconSet<T>, ChildrenMap<T[keyof T]>, ParentMap<unknown> ];
export type AnchorSchema<T> = Schema<T> & {
  refKey?: string;
  refPath?: string;
}

export const Registry: Map<Init, Anchor<Init>> = new Map();
export const InitsRegistry: Map<Init, Anchor<Init>> = new Map();
export const StateRegistry: Map<Sail<Init>, Anchor<Init>> = new Map();
export const StateHierarchy: Map<Sail<Init>, StateTree<Init>> = new Map();
export const StateLeakage: Map<Init, { start: number, count: number }> = new Map();
export const ExternalSubscriptions: Map<Init, Set<Beacon<Init>>> = new Map();

const read = <T extends Init>(init: T): Anchor<T> | undefined => {
  const pointer = (StateRegistry.get(init as Sail<T>) || InitsRegistry.get(init)) as never;

  if (pointer) {
    logger.debug('[anchor:exist] Anchor exists, reusing it.');
  }

  return pointer;
};

const write = <T extends Init>(init: T, state: Sail<T>, pointer: Anchor<T>) => {
  InitsRegistry.set(init, pointer as never);
  StateRegistry.set(state, pointer as never);

  logger.debug('[anchor:register] Anchor created.');
};

const revoke = <T extends Init>(init: T, state: Sail<T>) => {
  InitsRegistry.delete(init);
  StateRegistry.delete(state);

  logger.debug('[anchor:unregister] Anchor revoked for garbage collector.');
};

const isDescendant = (state: Sail<Init>, target: Sail<Init>): boolean => {
  const hierarchy = StateHierarchy.get(target);

  if (hierarchy) {
    if (hierarchy.children.has(state)) {
      return true;
    }

    for (const [ next ] of hierarchy.children) {
      if (isDescendant(state, next)) {
        return true;
      }
    }
  }

  return false;
};

const isAncestor = (state: Sail<Init>, target: Sail<Init>): boolean => {
  const hierarchy = StateHierarchy.get(target);

  if (hierarchy) {
    if (hierarchy.parents.has(state)) {
      return true;
    }

    for (const [ next ] of hierarchy.parents) {
      if (isAncestor(state, next)) {
        return true;
      }
    }
  }

  return false;
};

export function crate<T extends Init, R extends boolean = true>(
  init: T,
  recursive: R = true as R,
  strict?: boolean,
  schema?: AnchorSchema<T>,
  allowedTypes = COMMON_SCHEMA_TYPES,
): Anchor<T, R> {
  if (typeof init !== 'object') {
    throw new TypeError('[anchor:init] Initial value must be an object (object | array | set | map | etc).');
  }

  if ((ANCHOR_CONFIG.safeObject ?? true) && !isSafeObject(init)) {
    throw new TypeError('[anchor:init] Initial value must be a safe object (object | array | set | map).');
  }

  const registered = read(init);

  if (registered) {
    return registered as never;
  }
  const parents: ParentMap<Init> = new Map();
  const children: ChildrenMap<Init> = new Map();
  const subscribers: Set<Beacon<T>> = new Set();
  const internalSubscribers: Set<Beacon<T>> = new Set();
  const leakageMap = StateLeakage;

  const {
    circularDetection = false,
    circularExit = true,
    leakageDetection = true,
    leakageDetectionBounce = 100,
    validationExit = false,
    safeInit = true,
    safeObjectWarning = true,
  } = ANCHOR_CONFIG;
  const strictIterable = strict ?? ANCHOR_CONFIG.strictIterable ?? true;

  if (safeObjectWarning && !isSafeObject(init)) {
    logger.warn('[anchor:init] Initial value is not a safe object.', init);
  }

  let stopPropagation = true;
  let initialized = false;

  const clone: T = safeInit
                   ? (Array.isArray(init)
                      ? [ ...init ]
                      : init instanceof Map
                        ? new Map(init)
                        : init instanceof Set
                          ? new Set(init)
                          : isObject(init)
                            ? { ...init }
                            : init) as T
                   : init;

  let validation: DetailedValidation<T> | undefined = undefined;
  if (typeof schema === 'object') {
    satisfy(schema as Schema<T>, clone, false);
    validation = validate(schema as Schema<T>, clone, allowedTypes, false, schema?.refPath);

    if (!validation.valid) {
      if (validationExit) {
        throw new TypeError(`[anchor:init] Invalid initial value: ${ validation }`);
      }

      logger.error(`[anchor:init] Invalid initial value.`, validation);
    }
  }

  const link = (childInit: T[keyof T], prop?: keyof T, listen = true, sch?: AnchorSchema<object>): T[keyof T] => {
    let ref = read(childInit as Init);

    if (!ref) {
      if (sch) {
        const { refPath } = schema || {};
        sch = {
          ...sch,
          refPath: refPath ? `${ refPath }.${ sch.refPath ?? prop as string }` : sch.refPath ?? prop as string,
        };
      }

      ref = crate(childInit as Init, recursive, strictIterable, sch as never) as never;
    }

    const childState = ref[Pointer.STATE];

    if (circularDetection && isAncestor(childState, state as never)) {
      logger.error('[anchor:link] Circular dependency detected!');

      if (circularExit) {
        throw new Error('Ancestor should not be a descendant!');
      }

      return childInit;
    }

    if (children.has(childState as never)) {
      logger.warn('[anchor:link] Anchor already linked as a descendant.');
      return undefined as never;
    }

    const inherit: TowLiner<T> = ref[Pointer.INHERIT as never] as never;

    const detach = inherit(state as never, listen ? (s, e) => {
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
    } : null as never);

    if (typeof detach === 'function') {
      children.set(childState as never, detach);
      logger.debug('[anchor:link] Anchor linked to descendant.');
    }

    return childState as T[keyof T];
  };

  const unlink = (current: Sail<T[keyof T]>) => {
    const detach = children.get(current as never);

    if (typeof detach === 'function') {
      detach();
      children.delete(current as never);
      logger.debug('[anchor:unlink] Anchor unlinked from descendant.');
    }
  };

  const subscribe = (handler: Beacon<T>, emitNow = true) => {
    if (emitNow) {
      const event: SailShift<T> = { type: 'init', value: state, emitter: clone };
      handler(state, event);
    }

    // Store the subscriber to emit events.
    subscribers.add(handler);

    if (!Registry.has(state)) {
      Registry.set(state, pointer as never);
      logger.debug('[anchor:subscribe] Anchor is now being used.');
    }

    if (leakageDetection && !leakageMap.has(clone)) {
      leakageMap.set(clone, { start: performance.now(), count: 0 });

      setTimeout(() => {
        const { count = 0 } = leakageMap.get(clone) || ({} as never);

        if (count < leakageDetectionBounce) {
          leakageMap.delete(clone);
        }
      }, 500);
    }

    // Return an unsubscribe function.
    return () => {
      if (subscribers.has(handler)) {
        subscribers.delete(handler);
      }

      // Detach from registry, marking as unused state.
      if (!subscribers.size && Registry.has(state)) {
        if (leakageDetection) {
          const stat = leakageMap.get(clone) || ({} as never);
          const count = (stat.count ?? 0) + 1;

          if (count === leakageDetectionBounce) {
            const duration = Math.round(performance.now() - stat.start);
            logger.warn('[anchor] Possible leakage detected!');
            logger.warn(
              `[anchor] State is getting subscribed and unsubscribed too often (${ count } times) in a short period (${ duration }ms).`,
              state,
            );
          }

          stat.count = count;
        }

        Registry.delete(state);
        logger.debug('[anchor:unsubscribe] Anchor is now idle.');
      }
    };
  };

  const publish = (event: SailShift<T>) => {
    if (stopPropagation) {
      // logger.debug('[anchor:publish] Anchor event propagation stopped.');
      return;
    }

    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(clone, event);
      }
    }

    for (const [ , run ] of parents) {
      if (typeof run === 'function') {
        run(clone, event as SailShift<Init>);
      }
    }

    for (const run of internalSubscribers) {
      if (typeof run === 'function') {
        run(clone, event as SailShift<Init>);
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
      publish({ type: 'update', paths: Object.keys(value), value, oldValue, emitter: clone });
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
    for (const [ s, detach ] of children) {
      detach();
      children.delete(s);
    }

    subscribers.clear();

    revoke(clone, state as Sail<T>);

    for (const run of internalSubscribers) {
      if (typeof run === 'function') {
        run(clone, { type: 'destroy', emitter: clone });
      }
    }
  };

  const inherit = (parent: Sail<unknown>, fn: Beacon<T>) => {
    if (parents.has(parent)) {
      logger.warn('[anchor:inherit] Anchor already inherits from parent.');
      return;
    }

    if (circularDetection && isDescendant(parent, state as never)) {
      logger.error('[anchor:inherit] Circular dependency detected!');
      if (circularExit) {
        throw new Error('Descendant should not be an ancestor!');
      }

      return;
    }

    parents.set(parent, fn as never);
    logger.debug('[anchor:inherit] Anchor now inherits from parent.');

    return () => {
      parents.delete(parent);
      logger.debug('[anchor:inherit] Anchor no longer inherits from parent.');
    };
  };

  const dispatchValidation = (value: DetailedValidation<T>) => {
    for (const run of internalSubscribers) {
      if (typeof run === 'function') {
        run(clone, { type: 'validation', value });
      }
    }
  };

  const createPath = (key: string) => {
    return schema?.refPath ? `${ schema.refPath }.${ key }` : key;
  };

  let validateChildren: <T>(sch: AnchorSchema<T>, value: unknown, key?: string) => T = undefined as never;
  if (schema) {
    validateChildren = ((sch: AnchorSchema<unknown>, value: unknown, key?: string) => {
      if (!sch) {
        return value;
      }

      if (typeof sch === 'function') {
        sch = (sch as () => AnchorSchema<unknown>)();
      }

      const newValue = satisfy(sch, value, false);

      key = createPath(key ?? '');
      const validation = validate(sch, newValue, allowedTypes, false, key);

      dispatchValidation(validation as never);

      if (!validation.valid) {
        if (validationExit) {
          throw new TypeError(`[anchor:validate] Invalid value: ${ validation }`);
        }

        logger.error(`[anchor:validate] Invalid value.`, validation);
        return value;
      }

      if (newValue !== value) {
        value = newValue;
      }

      return value;
    }) as never;
  }

  let proxyHandler: ProxyHandler<T> = undefined as never;
  if (shouldProxy(clone)) {
    proxyHandler = {
      set(target: T, prop: keyof T, value: T[keyof T]) {
        const current = Reflect.get(target, prop) as Sail<T[keyof T]>;

        // Skip if value is the same.
        if (current === value) {
          return true;
        }

        if (initialized) {
          let sch: AnchorSchema<object> | undefined = undefined;

          if (schema) {
            const path = createPath(prop as string);
            const { properties, additionalProperties } = schema as ObjectSchema<T>;

            if (typeof properties === 'object' && !properties[prop as never] && !additionalProperties) {
              if (validationExit) {
                throw new TypeError(`[anchor:set:validate] property "${ prop as string }" in "${ path }" is not allowed.`);
              }

              logger.error(
                `[anchor:set:validate] property "${ prop as string }" in "${ path }" is not allowed.`,
                target,
              );

              return true;
            }

            sch = flattenSchema<object>(properties?.[prop as never] as never);
          }

          // Remove current subscription if the current value is a linkable state.
          if (typeof current === 'object' && linkable(current) && recursive) {
            unlink(current);
          }

          // Add new child subscription if the new value is a linkable state.
          if (typeof value === 'object' && linkable(value) && recursive) {
            if (sch) {
              sch = { ...sch, refPath: schema?.refPath ? `${ schema.refPath }.${ prop as string }` : prop as string };
            }

            const linked = link(value, prop, undefined, sch);

            if (linked && linked !== value) {
              value = linked;
            }
          } else if (typeof validateChildren === 'function' && sch) {
            const newValue = validateChildren(sch, value, prop as string);
            if (newValue !== value) {
              value = newValue as never;
            }
          }
        }

        Reflect.set(target, prop, value);
        publish({ type: 'set', value, prop, path: prop as string, oldValue: current, emitter: clone });

        return true;
      },
      deleteProperty(target: T, prop: keyof T): boolean {
        const current = Reflect.get(target, prop) as Sail<T[keyof T]>;

        if (typeof current === 'object' && linkable(current) && recursive) {
          unlink(current);
        }

        const sch = flattenSchema<object>((schema as ObjectSchema<T>)?.properties?.[prop as never] as never);

        if (sch && sch.readonly) {
          const path = schema?.refPath ? `${ schema.refPath }.${ prop as string }` : prop as string;

          if (validationExit) {
            throw new TypeError(`[anchor:validate] Cannot delete readonly property: ${ path }`);
          }

          logger.error(`[anchor:validate] Cannot delete readonly property: ${ path }`);
          return true;
        }

        Reflect.deleteProperty(target, prop);

        if (sch && sch.required && sch.default) {
          Reflect.set(target, prop, typeof sch.default === 'function' ? sch.default() : sch.default);
        }

        publish({ type: 'delete', prop, path: prop as string, oldValue: current, emitter: clone });

        return true;
      },
    } as never;
  }

  const state = shouldProxy(clone) ? new Proxy(clone, proxyHandler) : clone;
  const manager: Navigator<T> = { destroy, emit: publish, set, subscribe, update };
  const pointer: Anchor<T> = [ state, manager, subscribers, children, parents, inherit, validation ] as never;

  if (replaceable(clone)) {
    Object.assign(state, { set });
    Object.defineProperty(state, 'set', { enumerable: false });
  }

  Object.assign(state, { subscribe });
  Object.defineProperty(state, 'subscribe', { enumerable: false });

  StateHierarchy.set(state as Sail<T>, { id: Date.now(), parents, children });
  ExternalSubscriptions.set(state as Sail<T>, internalSubscribers as never);

  write(clone, state as Sail<T>, pointer);

  if (Array.isArray(clone)) {
    const sch = flattenSchema<object>((schema as ArraySchema<T>)?.items as never);

    if (recursive) {
      clone.forEach((item, prop) => {
        if (typeof item === 'object' && linkable(item)) {
          const linked = link(item as T[keyof T], undefined, !strictIterable, sch);

          if (linked) {
            clone.splice(prop, 1, linked as ItemTypeOf<T>);
          }
        }
      });
    }

    for (const method of ARRAY_MUTATIONS) {
      const fn = clone[method] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        clone[method as never] = (...args: unknown[]) => {
          const current = [ ...(state as Rec[]) ];

          if (sch) {
            if (method === 'splice') {
              const [ , , ...items ] = args as [ number, number, ...unknown[] ];
              items.forEach((item, i) => {
                if (!linkable(item)) {
                  args[i + 2] = validateChildren(sch, item);
                }
              });
            } else if (method === 'fill') {
              const [ value ] = args as [ unknown, number, number ];
              if (!linkable(value)) {
                args[0] = validateChildren(sch, value);
              }
            } else if (method === 'push' || method === 'unshift') {
              args.forEach((item, i) => {
                if (linkable(item)) {
                  args[i] = validateChildren(sch, item);
                }
              });
            }
          }

          if (recursive) {
            args.forEach((item, i) => {
              if (typeof item === 'object' && linkable(item)) {
                const linked = link(
                  item as never,
                  undefined,
                  !strictIterable,
                  sch,
                );

                if (linked) {
                  args.splice(i, 1, linked);
                }
              }
            });
          }

          const result = fn.bind(clone)(...(args as unknown[]));

          // Unlink items that's no longer in the array.
          for (const item of current) {
            if (!clone.includes(item) && typeof item === 'object' && linkable(item)) {
              const ref = read(item as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          publish({ type: method, value: [ ...(state as Rec[]) ], params: args, oldValue: current, emitter: clone });
          return result;
        };

        Object.defineProperty(clone, method, { enumerable: false });
      }
    }
  }

  if (clone instanceof Map) {
    if (recursive) {
      for (const [ key, value ] of clone.entries()) {
        const sch = flattenSchema<object>((schema as ObjectSchema<T>)?.properties?.[key as never] as never);

        if (typeof value === 'object' && linkable(value)) {
          const linked = link(value as never, key as keyof T, !strictIterable, sch);

          if (linked) {
            clone.set(key, linked);
          }
        }
      }
    }

    for (const method of [ 'set', 'delete', 'clear' ]) {
      const fn = clone[method as never] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        clone[method as never] = ((...args: unknown[]) => {
          const current = [ ...clone.entries() ];

          if (method === 'set' && recursive) {
            const [ key, value ] = args as [ unknown, unknown ];

            const sch = flattenSchema((schema as ObjectSchema<T>)?.properties?.[key as never] as never);

            if (typeof value === 'object' && linkable(value)) {
              const linked = link(value as never, key as keyof T, !strictIterable, sch as never);

              if (linked) {
                args.splice(1, 1, linked);
              }
            }
          } else if (method === 'delete' && recursive) {
            const ref = read(clone.get(args[0] as never) as Init);

            if (ref) {
              unlink(ref[Pointer.STATE] as never);
            }
          } else if (method === 'clear' && recursive) {
            for (const [ , value ] of clone.entries()) {
              const ref = read(value as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          const result = fn.bind(clone)(...(args as unknown[]));
          publish({
            type: `map:${ method }` as never,
            value: [ ...clone.entries() ],
            params: args,
            oldValue: current,
            emitter: clone,
          });
          return result;
        }) as never;

        Object.defineProperty(clone, method, { enumerable: false });
      }
    }
  }

  if (clone instanceof Set) {
    const sch = flattenSchema<object>((schema as ArraySchema<T>)?.items as never);

    if (recursive) {
      for (const value of clone.values()) {
        if (typeof value === 'object' && linkable(value)) {
          const linked = link(value as never, undefined, !strictIterable, sch);

          if (linked) {
            clone.delete(value);
            clone.add(linked);
          }
        }
      }
    }

    for (const method of [ 'add', 'delete', 'clear' ]) {
      const fn = clone[method as never] as (...args: unknown[]) => unknown;

      if (typeof fn === 'function') {
        clone[method as never] = ((...args: unknown[]) => {
          const current = [ ...clone.entries() ];

          if (method === 'add' && recursive) {
            const [ value ] = args as [ unknown ];

            if (typeof value === 'object' && linkable(value)) {
              const linked = link(value as never, undefined, !strictIterable, sch);

              if (linked) {
                args.splice(0, 1, linked);
              }
            }
          } else if (method === 'delete' && recursive) {
            const ref = read(args[0] as Init);

            if (ref) {
              unlink(ref[Pointer.STATE] as never);
            }
          } else if (method === 'clear' && recursive) {
            for (const value of clone.values()) {
              const ref = read(value as Init);

              if (ref) {
                unlink(ref[Pointer.STATE] as never);
              }
            }
          }

          const result = fn.bind(clone)(...(args as unknown[]));
          publish({
            type: `set:${ method }` as never,
            value: [ ...clone.entries() ],
            params: args,
            oldValue: current,
            emitter: clone,
          });
          return result;
        }) as never;

        Object.defineProperty(clone, method, { enumerable: false });
      }
    }
  }

  if (isObjectLike(clone) && recursive) {
    for (const [ prop, value ] of entries(clone)) {
      const sch = flattenSchema<object>((schema as ObjectSchema<T>)?.properties?.[prop as never] as never);

      if (typeof value === 'object' && linkable(value)) {
        const linked = link(value, prop, true, sch as never);

        if (linked) {
          state[prop] = linked;
        }
      }
    }
  }

  stopPropagation = false;
  initialized = true;

  return pointer as never;
}

export function anchor<T extends Init, R extends boolean = true>(
  init: T,
  recursive: R = true as R,
  strict?: boolean,
  schema?: AnchorSchema<T>,
): State<T, R> {
  return crate(init, recursive, strict, schema)[Pointer.STATE] as never;
}

export function isSail(value: unknown): boolean {
  return StateRegistry.has(value as Sail<Init>);
}

function linkable(value: unknown): boolean {
  return LINKABLE.includes(typeOf(value));
}

function replaceable(value: unknown): boolean {
  return !(value instanceof Map || value instanceof Set);
}

function shouldProxy(value: unknown): boolean {
  return !(value instanceof Map || value instanceof Set || Array.isArray(value));
}

function isSafeObject(value: unknown) {
  return (
    Array.isArray(value) ||
    value instanceof Set ||
    value instanceof Map ||
    isObject(value)
  );
}

function simplify<T extends Init>(value: T, recursive = true): T {
  if (recursive) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => {
        if (typeof item === 'object') {
          value[i] = simplify(item as never);
        }
      });
    } else if (value instanceof Map) {
      for (const [ key, item ] of value.entries()) {
        if (typeof item === 'object') {
          value.set(key, simplify(item as never));
        }
      }
    } else if (value instanceof Set) {
      for (const item of value.values()) {
        if (typeof item === 'object') {
          value.delete(item);
          value.add(simplify(item as never));
        }
      }
    } else if (isObject(value)) {
      for (const [ key, item ] of entries(value)) {
        if (typeof item === 'object') {
          value[key] = simplify(item as never);
        }
      }
    }
  }

  const set = () => undefined;
  const subscribe = (fn: (v: T) => void, emitNow = true) => {
    if (emitNow) {
      fn(value);
    }

    return () => undefined;
  };

  Object.assign(value as never, { set, subscribe });

  return value;
}

export function configure(config: AnchorConfig) {
  Object.assign(ANCHOR_CONFIG, { ...config });
}

export function getConfig(): AnchorConfig {
  return ANCHOR_CONFIG;
}
