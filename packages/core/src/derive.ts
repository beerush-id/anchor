import type {
  Linkable,
  PipeTransformer,
  PlainObject,
  StateController,
  StateSubscriber,
  StateUnsubscribe,
} from './types.js';
import { STATE_CLEANUP_QUEUES, STATE_REGISTRY } from './registry.js';
import { logger } from './logger.js';
import { isFunction } from '@beerush/utils';
import { assign } from './helper.js';

/**
 * Derives a new subscription from an existing anchored state.
 * This is a convenience function to subscribe to changes of an already anchored state.
 *
 * @template T The type of the state.
 * @param state The anchored state object to derive from.
 * @param handler The subscriber function to call on state changes.
 * @returns A function to unsubscribe from the derived state.
 */
function deriveFn<T>(state: T, handler: StateSubscriber<T>): StateUnsubscribe {
  const ctrl = STATE_REGISTRY.get(state as WeakKey);

  if (typeof ctrl?.subscribe !== 'function') {
    logger.warn('Ignoring subscription to non reactive state:', state);

    handler(state, { type: 'init', keys: [] });
    return () => {
      // No-op, as there is no subscription to unsubscribe from.
    };
  }

  return ctrl?.subscribe(handler as StateSubscriber<unknown>);
}

deriveFn.log = <T>(state: T) => {
  return deriveFn(state, console.log);
};

/**
 * Resolves the `StateController` for a given anchored state.
 * This allows direct access to the `set`, `subscribe`, and `destroy` methods of the controller.
 *
 * @template T The type of the state.
 * @param state The anchored state object.
 * @returns The `StateController` for the given state, or `undefined` if not found.
 */
deriveFn.resolve = <T>(state: T): StateController<T> | undefined => {
  return STATE_REGISTRY.get(state as WeakKey) as StateController<T>;
};

/**
 * Pipe changes of the source state to a target state.
 * @template Source The type of the source state.
 * @template Target The type of the target state.
 * @param source The source state.
 * @param target The target state.
 * @param {PipeTransformer} transform The transform function.
 * @returns {StateUnsubscribe}
 */
deriveFn.pipe = <Source, Target>(
  source: Source,
  target: Target,
  transform?: PipeTransformer<Source, Target>
): StateUnsubscribe => {
  if (typeof source !== 'object' || typeof target !== 'object') {
    throw new Error('Both source and target must be objects');
  }

  if (!isFunction(transform)) {
    return deriveFn(source, (snapshot) => {
      assign(target as PlainObject, snapshot as PlainObject);
    });
  }

  return deriveFn(source, (newValue) => {
    Object.assign(target as PlainObject, transform(newValue as Source));
  });
};

export interface DeriveFn {
  <T>(state: T, handler: StateSubscriber<T>): StateUnsubscribe;

  log<T>(state: T): StateUnsubscribe;
  pipe<Source, Target>(source: Source, target: Target, transform?: PipeTransformer<Source, Target>): StateUnsubscribe;
  resolve<T>(state: T): StateController<T> | undefined;
}

export const derive = deriveFn as DeriveFn;

const CLEANUP_SCHEDULER_WINDOW = 100;

export function scheduleCleanup<T extends Linkable>(state: T): void {
  if (!STATE_REGISTRY.has(state)) return;

  const controller = STATE_REGISTRY.get(state);
  if (!controller || STATE_CLEANUP_QUEUES.has(controller)) return;

  const scheduler = setTimeout(() => {
    if (STATE_CLEANUP_QUEUES.has(controller)) {
      controller.destroy();
    }
  }, CLEANUP_SCHEDULER_WINDOW) as never;

  STATE_CLEANUP_QUEUES.set(controller, scheduler);
}

export function cancelCleanup<T extends Linkable>(state: T) {
  const controller = STATE_REGISTRY.get(state);

  if (controller && STATE_CLEANUP_QUEUES.has(controller)) {
    clearTimeout(STATE_CLEANUP_QUEUES.get(controller));
    STATE_CLEANUP_QUEUES.delete(controller);
  }
}
