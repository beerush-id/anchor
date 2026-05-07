import { anchor } from '../engine/anchor.js';
import { isReactive } from '../engine/config.js';
import { assign } from '../engine/helper.js';
import { CONTROLLER_REGISTRY } from '../engine/registry.js';
import { onGlobalCleanup } from '../scope/index.js';
import { captureStack } from '../shared/index.js';
import type { Linkable, ObjLike, State, StateSubscriber, StateUnsubscribe, SubscribeFn } from '../types.js';
import { isFunction } from '../utils/index.js';

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
  if (!isReactive()) {
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

    return () => {};
  }
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

  const unsubscribe = ctrl?.subscribe(handler as StateSubscriber<unknown>, undefined, recursive);
  onGlobalCleanup(unsubscribe);
  return unsubscribe;
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

  if (!isReactive()) {
    if (!isFunction(transform)) {
      assign(target as ObjLike, source as ObjLike);
      return () => {};
    }

    assign(target as ObjLike, transform(source as never));
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

  const handleLeft = (current: Linkable) => {
    if (updatingLeft) return;

    updatingRight = true;

    if (isFunction(transformLeft)) {
      const result = transformLeft(current as never);

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
  };
  const handleRight = (current: Linkable) => {
    if (updatingRight) return;

    updatingLeft = true;

    if (isFunction(transformRight)) {
      const result = transformRight(current as never);

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
  };

  if (!isReactive()) {
    handleLeft(left as never);
    handleRight(right as never);

    return () => {};
  }

  const unsubscribeLeft = subscribeFn(left, handleLeft);
  const unsubscribeRight = subscribeFn(right, handleRight);

  const unsubscribeAll = () => {
    unsubscribeLeft();
    unsubscribeRight();
  };

  onGlobalCleanup(unsubscribeAll);

  return unsubscribeAll;
}) satisfies SubscribeFn['bind'];

export const subscribe: SubscribeFn = subscribeFn as SubscribeFn;
