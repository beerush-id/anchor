import { createObserver, type Immutable, type PipeTransformer, setObserver, type State } from '@anchor/core';
import { customRef, onMounted, onUnmounted, onUpdated, type Ref } from 'vue';
import { isServer } from './utils.js';

const REF_REGISTRY = new WeakMap<WeakKey, State>();

let activeObserver: (() => void) | undefined = undefined;

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
export function derivedRef<T extends State>(state: T | Ref<T>): Ref<T>;
export function derivedRef<T extends State, R>(state: T | Ref<T>, transform: PipeTransformer<T, R>): Ref<Immutable<R>>;
export function derivedRef<T extends State, R>(
  state: T | Ref<T>,
  transform?: PipeTransformer<T, R>
): Ref<T | Immutable<R>> {
  const observer = createObserver(() => {
    if (typeof transform === 'function') {
      const _unobserve = setObserver(observer);
      computed = transform(state as T) as R;
      _unobserve();
    }

    applyChanges?.();
  });

  let computed: R | undefined = undefined;
  let destroyed = false;
  let unobserve: (() => void) | undefined;
  let applyChanges: (() => void) | undefined;

  // When passing an existing reference as the input, we need to get the actual state
  // to make sure we're creating a new reference that points to the same state.
  if (REF_REGISTRY.has(state)) {
    state = REF_REGISTRY.get(state) as T;
  }

  if (typeof transform === 'function') {
    const _unobserve = setObserver(observer);
    computed = transform(state as T) as R;
    _unobserve();
  }

  onUnmounted(() => {
    destroyed = true;
    applyChanges = undefined;
    observer.destroy();
    REF_REGISTRY.delete(ref);
  });

  const startObservation = () => {
    if (isServer() || typeof unobserve === 'function') return;

    if (typeof activeObserver === 'function') {
      activeObserver();
    }

    unobserve = setObserver(observer);
    activeObserver = stopObservation;
  };

  const stopObservation = () => {
    if (isServer() || typeof unobserve !== 'function') return;

    unobserve();
    unobserve = undefined;
  };

  onMounted(() => {
    stopObservation();
  });

  onUpdated(() => {
    stopObservation();
  });

  const ref = customRef((track, trigger) => {
    if (!applyChanges) {
      applyChanges = trigger;
    }

    return {
      get() {
        if (!destroyed) {
          startObservation();
          track();
        }

        if (typeof transform === 'function') {
          return computed;
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
