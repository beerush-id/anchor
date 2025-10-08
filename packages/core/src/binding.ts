import type { Binding, ObjLike, StateUnsubscribe } from './types.js';
import { subscribe } from './subscription.js';
import { anchor } from './anchor.js';
import { captureStack } from './exception.js';

/**
 * Creates a two-way binding between a source and target reactive object properties.
 *
 * This function establishes a bidirectional data flow where changes to either the source
 * or target property will automatically update the other. Both objects must be reactive
 * (created with the anchor system) for the binding to work properly.
 *
 * Note: This binding is only for a single property and is non-recursive. For object
 * properties, only the reference is bound, not the object's internal properties.
 *
 * @template T - The type of the source value
 * @template B - The type of the source binding key (defaults to 'value')
 * @template S extends ObjLike - The type of the target object
 *
 * @param source - The source binding which can be either:
 *   - A reactive object (defaulting to bind to its 'value' property)
 *   - A tuple of [reactiveObject, propertyName] to specify a custom property
 * @param target - The target reactive object
 * @param targetKey - The property name in the target object to bind to
 *
 * @returns A function that can be called to unsubscribe and remove the binding
 * @throws Will throw an error if either source or target objects are not reactive
 */
export function binding<T, B, S extends ObjLike = ObjLike>(
  source: Binding<T, B>,
  target: S,
  targetKey: keyof S
): StateUnsubscribe {
  const _source = (Array.isArray(source) ? source[0] : source) as ObjLike;
  const sourceKey = (Array.isArray(source) ? source[1] : 'value') as string;

  if (!anchor.has(_source)) {
    const error = new Error('State is not reactive.');
    captureStack.violation.derivation('Attempted to bind state from a non-reactive state.', error);
    return () => {};
  }

  if (!anchor.has(target)) {
    const error = new Error('State is not reactive.');
    captureStack.violation.derivation('Attempted to bind state to a non-reactive state.', error);
    return () => {};
  }

  const rawSource = anchor.get(_source);
  const rawTarget = anchor.get(target);

  let updatingSource = false;
  let updatingTarget = false;

  const leaveSource = subscribe(
    _source,
    () => {
      if (updatingSource) return;
      if (rawTarget[targetKey] === rawSource[sourceKey]) return;

      updatingTarget = true;
      target[targetKey] = rawSource[sourceKey] as never;
      updatingTarget = false;
    },
    false
  );

  const leaveTarget = subscribe(
    target,
    (_, event) => {
      if (updatingTarget || event.type === 'init') return;

      updatingSource = true;
      _source[sourceKey] = rawTarget[targetKey] as never;
      updatingSource = false;
    },
    false
  );

  return () => {
    leaveSource();
    leaveTarget();
  };
}
