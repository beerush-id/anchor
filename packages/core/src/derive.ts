import type {
  Linkable,
  ObjLike,
  PipeTransformer,
  State,
  StateController,
  StateSubscriber,
  StateUnsubscribe,
} from './types.js';
import { CONTROLLER_REGISTRY } from './registry.js';
import { isFunction } from '@beerush/utils';
import { assign } from './helper.js';
import { captureStack } from './exception.js';

/**
 * Derives a new subscription from an existing anchored state.
 * This is a convenience function to subscribe to changes of an already anchored state.
 *
 * @template T The type of the state.
 * @param state The anchored state object to derive from.
 * @param handler The subscriber function to call on state changes.
 * @returns A function to unsubscribe from the derived state.
 */
function deriveFn<T extends Linkable>(state: State<T>, handler: StateSubscriber<T>): StateUnsubscribe {
  const ctrl = CONTROLLER_REGISTRY.get(state);

  if (typeof ctrl?.subscribe !== 'function') {
    captureStack.warning.external(
      'Invalid subscription target:',
      'Attempted to subscribe to non-reactive state.',
      'Object is not reactive',
      deriveFn,
      deriveFn.pipe
    );

    try {
      handler(state, { type: 'init', keys: [] });
    } catch (error) {
      captureStack.error.external(
        'Unable to execute the subscription handler function.',
        error as Error,
        deriveFn,
        deriveFn.pipe
      );
    }

    return () => {
      // No-op, as there is no subscription to unsubscribe from.
    };
  }

  return ctrl?.subscribe(handler as StateSubscriber<unknown>);
}

/**
 * Subscribe to changes in the provided state and log it to the console.
 * This is a convenience method that uses `console.log` as the subscriber function.
 *
 * @template T The type of the state.
 * @param state The anchored state object to subscribe to.
 * @returns A function to unsubscribe from the logging subscription.
 */
deriveFn.log = <T>(state: T): StateUnsubscribe => {
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
deriveFn.resolve = <T extends Linkable>(state: State<T>): StateController<T> | undefined => {
  return CONTROLLER_REGISTRY.get(state) as never;
};

/**
 * Pipe changes of the source state to a target state.
 * This function allows you to synchronize changes from a source state to a target state,
 * with an optional transformation function to modify the data during the transfer.
 *
 * @template Source The type of the source state.
 * @template Target The type of the target state.
 * @param source The source state object to pipe from.
 * @param target The target state object to pipe to.
 * @param transform An optional function to transform the source state before assigning it to the target.
 * @returns A function to unsubscribe from the piping operation.
 * @throws {Error} If either source or target is not an object.
 */
deriveFn.pipe = <Source extends Linkable, Target extends Linkable>(
  source: Source,
  target: Target,
  transform?: PipeTransformer<Source, Target>
): StateUnsubscribe => {
  if (typeof source !== 'object' || typeof target !== 'object') {
    throw new Error('Both source and target must be objects');
  }

  if (!isFunction(transform)) {
    return deriveFn(source, (snapshot) => {
      assign(target as ObjLike, snapshot as ObjLike);
    });
  }

  return deriveFn(source, (snapshot) => {
    assign(target as ObjLike, transform(snapshot as Source));
  });
};

export interface DeriveFn {
  <T>(state: T, handler: StateSubscriber<T>): StateUnsubscribe;

  log<T extends Linkable>(state: State<T>): StateUnsubscribe;
  pipe<Source, Target>(source: Source, target: Target, transform?: PipeTransformer<Source, Target>): StateUnsubscribe;
  resolve<T extends Linkable>(state: State<T>): StateController<T> | undefined;
}

export const derive = deriveFn as DeriveFn;
