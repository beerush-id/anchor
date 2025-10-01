import { type PipeTransformer, type State, type StateUnsubscribe, subscribe as derive } from '@anchorlib/core';
import { customRef, isRef, onUnmounted, type Ref } from 'vue';
import type { ConstantRef } from './types.js';
import { REF_REGISTRY } from './ref.js';

/**
 * Creates a derived ref from a state or ref without a transform function.
 * The returned ref will have the same type as the input state.
 *
 * @template T - The type of the state
 * @param state - The state or ref to derive from
 * @returns A constant ref with the same type as the input state
 */
export function derivedRef<T extends State>(state: T | Ref<T>): ConstantRef<T>;

/**
 * Creates a derived ref from a state or ref with a transform function.
 * The returned ref will have the type returned by the transform function.
 *
 * @template T - The type of the state
 * @template R - The type of the transformed value
 * @param state - The state or ref to derive from
 * @param transform - A function that transforms the state into a different type
 * @returns A constant ref with the type returned by the transform function
 */
export function derivedRef<T extends State, R>(state: T | Ref<T>, transform: PipeTransformer<T, R>): ConstantRef<R>;

export function derivedRef<T extends State, R>(
  state: T | Ref<T>,
  transform?: PipeTransformer<T, R>
): ConstantRef<T | R> {
  const _isRef = isRef(state);
  state = _isRef ? (REF_REGISTRY.get(state as Ref<T>) as T) : state;
  const value = () => (_isRef ? (state as Ref<T>).value : state) as T;

  let unsubscribe: StateUnsubscribe;
  let current = typeof transform === 'function' ? transform(value()) : state;

  onUnmounted(() => {
    unsubscribe?.();
  });

  return customRef((track, trigger) => {
    const subscribe = () => {
      if (typeof unsubscribe === 'function') return;

      unsubscribe = derive(state, (_, event) => {
        if (event.type !== 'init') {
          current = typeof transform === 'function' ? transform(value()) : state;
          trigger();
        }
      });
    };

    return {
      get() {
        track();
        subscribe();
        return current;
      },
      set() {
        // No-op
      },
    };
  }) as ConstantRef<T>;
}
