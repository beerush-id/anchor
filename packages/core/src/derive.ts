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
import { anchor } from './anchor.js';

/**
 * Derives a new subscription from an existing anchored state.
 * This is a convenience function to subscribe to changes of an already anchored state.
 *
 * @template T The type of the state.
 * @param state - The anchored state object to derive from.
 * @param handler - The subscriber function to call on state changes.
 * @param recursive - Whether to recursively subscribe to child states (Default: follow).
 * @returns A function to unsubscribe from the derived state.
 */
function deriveFn<T extends Linkable>(
  state: State<T>,
  handler: StateSubscriber<T>,
  recursive?: boolean
): StateUnsubscribe {
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

  return ctrl?.subscribe(handler as StateSubscriber<unknown>, undefined, recursive);
}

deriveFn.log = ((state) => {
  return deriveFn(state, console.log);
}) satisfies DeriveFn['log'];

deriveFn.resolve = ((state) => {
  return CONTROLLER_REGISTRY.get(state) as never;
}) satisfies DeriveFn['resolve'];

deriveFn.pipe = ((source, target, transform) => {
  if (!anchor.has(source)) {
    const error = new Error('State is not reactive.');
    captureStack.violation.derivation('Attempted to pipe state from a non-reactive state.', error);
    return () => {};
  }

  if (typeof target !== 'object' || target === null) {
    const error = new Error('Target is not an assignable object.');
    captureStack.violation.derivation('Attempted to pipe state to a non-assignable target.', error);
    return () => {};
  }

  if (!isFunction(transform)) {
    return deriveFn(source, (current) => {
      assign(target as ObjLike, current as ObjLike);
    });
  }

  return deriveFn(source, (current) => {
    assign(target as ObjLike, transform(current));
  });
}) satisfies DeriveFn['pipe'];

deriveFn.bind = ((left, right, transformLeft, transformRight) => {
  if (!anchor.has(left)) {
    const error = new Error('State is not reactive.');
    captureStack.violation.derivation('Attempted to bind state from a non-reactive state.', error);
    return () => {};
  }

  if (!anchor.has(right)) {
    const error = new Error('State is not reactive.');
    captureStack.violation.derivation('Attempted to bind state to a non-reactive state.', error);
    return () => {};
  }

  let updatingLeft = false;
  let updatingRight = false;

  const unsubscribeLeft = deriveFn(left, (current) => {
    if (updatingLeft) return;

    updatingRight = true;

    if (isFunction(transformLeft)) {
      const result = transformLeft(current);

      if (result) {
        anchor.assign(right, result);
      } else {
        captureStack.warning.external(
          'Invalid binding transformation:',
          'The transformation function returned an invalid value. Please check your transformation function.',
          'Undefined is not assignable value.'
        );
      }
    } else {
      anchor.assign(right as ObjLike, current as ObjLike);
    }

    updatingRight = false;
  });

  const unsubscribeRight = deriveFn(right, (current) => {
    if (updatingRight) return;

    updatingLeft = true;

    if (isFunction(transformRight)) {
      const result = transformRight(current);

      if (result) {
        anchor.assign(left, result);
      } else {
        captureStack.warning.external(
          'Invalid binding transformation:',
          'The transformation function returned an invalid value. Please check your transformation function.',
          'Undefined is not assignable value.'
        );
      }
    } else {
      assign(left as ObjLike, current as ObjLike);
    }

    updatingLeft = false;
  });

  return () => {
    unsubscribeLeft();
    unsubscribeRight();
  };
}) satisfies DeriveFn['bind'];

export interface DeriveFn {
  /**
   * Derives a new subscription from an existing anchored state.
   * This is a convenience function to subscribe to changes of an already anchored state.
   *
   * @template T The type of the state.
   * @param state - The anchored state object to derive from.
   * @param handler - The subscriber function to call on state changes.
   * @param recursive - Whether to recursively subscribe to child states (Default: follow).
   * @returns A function to unsubscribe from the derived state.
   */
  <T>(state: T, handler: StateSubscriber<T>, recursive?: boolean): StateUnsubscribe;

  /**
   * Subscribe to changes in the provided state and log it to the console.
   * This is a convenience method that uses `console.log` as the subscriber function.
   *
   * @template T The type of the state.
   * @param state The anchored state object to subscribe to.
   * @returns A function to unsubscribe from the logging subscription.
   */
  log<T extends Linkable>(state: State<T>): StateUnsubscribe;

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
   */
  pipe<Source extends State, Target extends Linkable>(
    source: Source,
    target: Target,
    transform?: PipeTransformer<Source, Target>
  ): StateUnsubscribe;

  /**
   * Bind two states together, synchronizing changes between them.
   * This function allows you to keep two states in sync, with optional transformation functions
   * to modify the data during the transfer in both directions.
   *
   * @template Left The type of the left state.
   * @template Right The type of the right state.
   * @param left The left state object to bind.
   * @param right The right state object to bind.
   * @param transformLeft An optional function to transform the left state before assigning it to the right.
   * @param transformRight An optional function to transform the right state before assigning it to the left.
   * @returns A function to unsubscribe from the binding operation.
   */
  bind<Left extends State, Right extends State>(
    left: Left,
    right: Right,
    transformLeft?: PipeTransformer<Left, Right>,
    transformRight?: PipeTransformer<Right, Left>
  ): StateUnsubscribe;

  /**
   * Resolves the [StateController] for a given anchored state.
   * This allows direct access to the [set] methods of the controller.
   *
   * @template T The type of the state.
   * @param state The anchored state object.
   * @returns The [StateController] if not found.
   */
  resolve<T extends Linkable>(state: State<T>): StateController<T> | undefined;
}

export const derive = deriveFn as DeriveFn;
