import { captureStack, createObserver, microtask, untrack } from '@anchorlib/core';
import type { CleanupHandler, Lifecycle, MountHandler, SideEffectCleanup, SideEffectHandler } from './types.js';

let currentMountHandlers: Set<MountHandler> | null = null;
let currentMountCleanups: Set<CleanupHandler> | null = null;
let currentEffectCleanups: Set<SideEffectCleanup> | null = null;

/**
 * Creates a new lifecycle manager for handling component mount, cleanup, and rendering operations.
 *
 * The lifecycle manager provides three core methods:
 * - `mount()`: Schedules and executes mount handlers and effects
 * - `cleanup()`: Schedules and executes cleanup handlers and clears all handlers
 * - `render()`: Executes a render function within the component's context
 *
 * This function manages:
 * - Mount handlers registered via `onMount()`
 * - Cleanup handlers registered via `onCleanup()`
 * - Effects registered via `effect()`
 *
 * It also handles the proper execution order and cleanup of effects with their cleanup functions.
 *
 * @returns A Lifecycle object with mount, cleanup, and render methods
 */
export function createLifecycle(): Lifecycle {
  const [scheduleMount, cancelMount] = microtask(0);
  const [scheduleCleanup, cancelCleanup] = microtask(0);

  const mountHandlers = new Set<MountHandler>();
  const mountCleanups = new Set<CleanupHandler>();
  const effectHandlers = new Set<SideEffectHandler>();
  const effectCleanups = new Set<SideEffectCleanup>();

  return {
    mount() {
      cancelCleanup();
      scheduleMount(() => {
        mountHandlers.forEach((mount) => {
          const cleanup = mount();

          if (typeof cleanup === 'function') {
            mountCleanups.add(cleanup);
          }
        });
      });
    },
    cleanup() {
      cancelMount();
      scheduleCleanup(() => {
        mountCleanups.forEach((cleanup) => {
          cleanup();
        });
        effectCleanups.forEach((effectCleanup) => {
          effectCleanup();
        });

        mountHandlers.clear();
        mountCleanups.clear();
        effectHandlers.clear();
      });
    },
    render<R>(fn: () => R) {
      const prevMountHandlers = currentMountHandlers,
        prevCleanupHandlers = currentMountCleanups,
        prevEffectCleanups = currentEffectCleanups;

      currentMountHandlers = mountHandlers;
      currentMountCleanups = mountCleanups;
      currentEffectCleanups = effectCleanups;

      try {
        return untrack(fn) as R;
      } finally {
        currentMountHandlers = prevMountHandlers;
        currentMountCleanups = prevCleanupHandlers;
        currentEffectCleanups = prevEffectCleanups;
      }
    },
  };
}

/**
 * Registers an effect handler function that will be executed during the component's lifecycle.
 *
 * Effects are used for side effects that need to be cleaned up, such as subscriptions or timers.
 * They are executed after the component is mounted and will re-run when any state accessed within
 * the effect handler changes. Effects can optionally return a cleanup function which will be
 * executed before the effect runs again or when the component is unmounted.
 *
 * Note: Effects should typically not mutate state that they also observe, as this can lead to
 * circular updates and infinite loops.
 *
 * @param fn - The effect handler function to register
 *
 * @throws {Error} If called outside a Setup component context
 */
export function effect(fn: SideEffectHandler) {
  if (!currentEffectCleanups) {
    const error = new Error('Out of Setup component.');
    captureStack.violation.general(
      'Effect handler declaration violation detected:',
      'Attempted to use effect handler outside of Setup component.',
      error,
      undefined,
      effect
    );
  }

  let cleanup: SideEffectCleanup | void;

  const observer = createObserver((event) => {
    cleanup?.();
    runEffect(event);
  });

  const runEffect: SideEffectHandler = (event) => {
    cleanup = observer.run(() => fn(event));
  };
  const leaveEffect = () => {
    cleanup?.();
  };

  if (typeof window !== 'undefined') {
    runEffect({ type: 'init', keys: [] });
  }

  currentEffectCleanups?.add(leaveEffect);
}

/**
 * Registers a mount handler function that will be executed when the component is mounted.
 *
 * Mount handlers are executed when the component is being set up and can optionally
 * return a cleanup function that will be called when the component is unmounted.
 *
 * @param fn - The mount handler function to register
 *
 * @throws {Error} If called outside a Setup component context
 */
export function onMount(fn: MountHandler) {
  if (!currentMountHandlers) {
    const error = new Error('Out of Setup component.');
    captureStack.violation.general(
      'Mount handler declaration violation detected:',
      'Attempted to use mount handler outside of Setup component.',
      error,
      undefined,
      onMount
    );
  }

  currentMountHandlers?.add(fn);
}

/**
 * Registers a cleanup handler function that will be executed when the component is cleaned up.
 *
 * Cleanup handlers are executed when the component is being torn down, typically to
 * clean up resources like event listeners, timers, or subscriptions.
 *
 * @param fn - The cleanup handler function to register
 *
 * @throws {Error} If called outside a Setup component context
 */
export function onCleanup(fn: CleanupHandler) {
  if (!currentMountCleanups) {
    const error = new Error('Out of Setup component.');
    captureStack.violation.general(
      'Cleanup handler declaration violation detected:',
      'Attempted to use cleanup handler outside of Setup component.',
      error,
      undefined,
      onCleanup
    );
  }

  currentMountCleanups?.add(fn);
}
