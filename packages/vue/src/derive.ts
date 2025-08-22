import { anchor, createObserver, type PipeTransformer, setObserver, type State } from '@anchor/core';
import { customRef, onRenderTracked, onUnmounted, type Ref } from 'vue';

const REF_REGISTRY = new WeakMap<WeakKey, State>();

/**
 * Creates a Vue ref that derives its value from an Anchor state.
 *
 * This function creates a reactive reference that automatically updates when the
 * source Anchor state changes. It can optionally transform the state value
 * using a provided transformer function.
 *
 * @template T - The type of the source state
 * @template R - The type of the transformed value (if a transformer is provided)
 *
 * @param state - The Anchor state to derive from
 * @param transform - Optional function to transform the state value
 *
 * @returns A Vue ref that tracks the (possibly transformed) state value
 */
export function derivedRef<T extends State>(state: T): Ref<T>;
export function derivedRef<T extends State, R>(state: T, transform: PipeTransformer<T, R>): Ref<R>;
export function derivedRef<T extends State, R>(state: T, transform?: PipeTransformer<T, R>): Ref<T | R> {
  const observer = createObserver(() => {
    applyChanges?.();
  });

  let destroyed = false;
  let unobserve: (() => void) | undefined;
  let applyChanges: (() => void) | undefined;

  // When passing an existing reference as the input, we need to get the actual state
  // to make sure we're creating a new reference that points to the same state.
  if (REF_REGISTRY.has(state)) {
    state = REF_REGISTRY.get(state) as T;
  }

  onUnmounted(() => {
    destroyed = true;
    applyChanges = undefined;
    observer.destroy();
    REF_REGISTRY.delete(ref);
  });

  onRenderTracked(() => {
    unobserve?.();
  });

  const ref = customRef((track, trigger) => {
    if (!applyChanges) {
      applyChanges = trigger;
    }

    return {
      get() {
        if (!destroyed) {
          track();
          unobserve = setObserver(observer);
        }

        if (typeof transform === 'function') {
          return transform(anchor.get(state));
        }

        return state;
      },
      set() {
        // No op.
      },
    };
  });

  // Store the reference in the registry for future use.
  REF_REGISTRY.set(ref, state);

  return ref as Ref<T>;
}
