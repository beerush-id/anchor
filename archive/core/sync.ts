import { logger, read, write } from '../../src/utils/index.js';
import { Init, State } from '../../src/core/anchor.js';
import {
  ARRAY_MUTATIONS,
  ArrayMutation,
  OBJECT_MUTATIONS,
  ObjectMutation,
  StateChange,
  StateMutation,
  Unsubscribe,
} from '../../src/core/base.js';

/**
 * Reflects the state event to another state or object.
 */
export function reflect<S extends Init, T extends Init>(event: StateChange<S>, target: T): void {
  if (event && [...OBJECT_MUTATIONS, ...ARRAY_MUTATIONS].includes(event.type as StateMutation)) {
    if (OBJECT_MUTATIONS.includes(event.type as ObjectMutation)) {
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
    } else if (ARRAY_MUTATIONS.includes(event.type as ArrayMutation)) {
      if (event.path) {
        const next: Array<unknown> | void = read(target as never, event.path as never);

        if (Array.isArray(next)) {
          const fn = next[event.type as keyof Array<unknown>] as (...args: unknown[]) => unknown;

          if (typeof fn === 'function') {
            fn.bind(next)(...(event.value as never[]));
          } else {
            logger.warn(`[anchor:reflect] Invalid array event!`, next, event);
          }
        } else {
          if (Array.isArray(event.emitter)) {
            write(target as never, event.path as never, [...event.emitter] as never);
          } else {
            logger.warn(`[anchor:reflect] Trying to call array methods on non array object!`, next, event);
          }
        }
      } else if (typeof target[event.type as never] === 'function' && Array.isArray(event.value)) {
        const fn = target[event.type as never] as (...args: unknown[]) => unknown;

        if (typeof fn === 'function') {
          fn.bind(target)(...(event.value as never[]));
        } else {
          logger.warn(`[anchor:reflect] Invalid array event!`, target, event);
        }
      }
    }
  }
}

/**
 * Mirrors the state event into another state/object.
 * @param {State<S>} source
 * @param {T} target
 * @return {Unsubscribe}
 */
export function mirror<S extends Init, T extends Init, R extends boolean = true>(
  source: State<S, R>,
  target: T
): Unsubscribe {
  return source.subscribe((s: unknown, event) => {
    reflect(event as never, target);
  });
}

/**
 * Syncs the state event between two states.
 * @param {State<S>} source
 * @param {State<T>} target
 * @return {Unsubscribe}
 */
export function sync<S extends Init, T extends Init, R extends boolean = true>(
  source: State<S, R>,
  target: State<T, R>
): Unsubscribe {
  const unsubSource = source.subscribe((s: unknown, event) => {
    reflect(event as never, target);
  });
  const unsubTarget = target.subscribe((s: unknown, event) => {
    reflect(event as never, source);
  });

  return () => {
    unsubSource();
    unsubTarget();
  };
}
