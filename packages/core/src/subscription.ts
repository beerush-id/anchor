import type { Linkable, ObjLike, State, StateSubscriber, StateUnsubscribe, SubscribeFn } from './types.js';
import { CONTROLLER_REGISTRY } from './registry.js';
import { isFunction } from '@beerush/utils';
import { assign } from './helper.js';
import { captureStack } from './exception.js';
import { anchor } from './anchor.js';

/**
 * Create a new subscription from an existing anchored state.
 * This is a convenience function to subscribe to changes of an already anchored state.
 *
 * @template T The type of the state.
 * @param state - The anchored state object to derive from.
 * @param handler - The subscriber function to call on state changes.
 * @param recursive - Whether to recursively subscribe to child states (Default: follow).
 * @returns A function to unsubscribe from the subscribed state.
 */
function subscribeFn<T extends Linkable>(
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
      subscribeFn,
      subscribeFn.pipe
    );

    try {
      handler(state, { type: 'init', keys: [] });
    } catch (error) {
      captureStack.error.external(
        'Unable to execute the subscription handler function.',
        error as Error,
        subscribeFn,
        subscribeFn.pipe
      );
    }

    return () => {
      // No-op, as there is no subscription to unsubscribe from.
    };
  }

  return ctrl?.subscribe(handler as StateSubscriber<unknown>, undefined, recursive);
}

subscribeFn.log = ((state) => {
  return subscribeFn(state, console.log);
}) satisfies SubscribeFn['log'];

subscribeFn.resolve = ((state) => {
  return CONTROLLER_REGISTRY.get(state) as never;
}) satisfies SubscribeFn['resolve'];

subscribeFn.pipe = ((source, target, transform) => {
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
    return subscribeFn(source, (current) => {
      assign(target as ObjLike, current as ObjLike);
    });
  }

  return subscribeFn(source, (current) => {
    assign(target as ObjLike, transform(current));
  });
}) satisfies SubscribeFn['pipe'];

subscribeFn.bind = ((left, right, transformLeft, transformRight) => {
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

  const unsubscribeLeft = subscribeFn(left, (current) => {
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

  const unsubscribeRight = subscribeFn(right, (current) => {
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
}) satisfies SubscribeFn['bind'];

export const subscribe: SubscribeFn = subscribeFn as SubscribeFn;

/**
 * @deprecated Use `subscribe` instead.
 * The `derive` function is an alias for the `subscribe` function.
 * @type {SubscribeFn}
 */
export const derive: SubscribeFn = subscribeFn as SubscribeFn;
