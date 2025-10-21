import { captureStack, createObserver, microtask, untrack, withinGlobalContext } from '@anchorlib/core';
import type { CleanupHandler, EffectCleanup, EffectHandler, Lifecycle, MountHandler } from './types.js';

let currentMountHandlers: Set<MountHandler> | null = null;
let currentCleanupHandlers: Set<CleanupHandler> | null = null;
let currentEffectHandlers: Set<EffectHandler> | null = null;

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
  const destroyHandlers = new Set<CleanupHandler>();
  const effectHandlers = new Set<EffectHandler>();
  const effectCleanups = new Set<EffectCleanup>();

  const observer = createObserver(() => {
    effectCleanups.forEach((effectCleanup) => {
      effectCleanup();
    });

    effectCleanups.clear();
    effectHandlers.forEach((effectHandler) => {
      const effectCleanup = observer.run(effectHandler);
      if (typeof effectCleanup === 'function') {
        effectCleanups.add(effectCleanup);
      }
    });
  });

  return {
    mount() {
      cancelCleanup();
      scheduleMount(() => {
        mountHandlers.forEach((mount) => {
          const cleanup = mount();

          if (typeof cleanup === 'function') {
            destroyHandlers.add(cleanup);
          }
        });

        effectHandlers.forEach((effectHandler) => {
          const effectCleanup = observer.run(effectHandler);
          if (typeof effectCleanup === 'function') {
            effectCleanups.add(effectCleanup);
          }
        });
      });
    },
    cleanup() {
      cancelMount();
      scheduleCleanup(() => {
        destroyHandlers.forEach((cleanup) => {
          cleanup();
        });
      });

      mountHandlers.clear();
      destroyHandlers.clear();
    },
    render<R>(fn: () => R) {
      const [prevMountHandlers, prevEffectHandlers, prevCleanupHandlers] = [
        currentMountHandlers,
        currentEffectHandlers,
        currentCleanupHandlers,
      ];

      currentMountHandlers = mountHandlers;
      currentEffectHandlers = effectHandlers;
      currentCleanupHandlers = destroyHandlers;

      try {
        return withinGlobalContext(() => untrack(fn) ?? '') as R;
      } finally {
        currentMountHandlers = prevMountHandlers;
        currentEffectHandlers = prevEffectHandlers;
        currentCleanupHandlers = prevCleanupHandlers;
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
 * @throws {Error} If called outside of a Setup component context
 */
export function effect(fn: EffectHandler) {
  if (!currentEffectHandlers) {
    const error = new Error('Out of Setup component.');
    captureStack.violation.general(
      'Effect handler declaration violation detected:',
      'Attempted to use effect handler outside of Setup component.',
      error,
      undefined,
      effect
    );
  }

  currentEffectHandlers?.add(fn);
}

/**
 * Registers a mount handler function that will be executed when the component is mounted.
 *
 * Mount handlers are executed when the component is being set up and can optionally
 * return a cleanup function that will be called when the component is unmounted.
 *
 * @param fn - The mount handler function to register
 *
 * @throws {Error} If called outside of a Setup component context
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
 * @throws {Error} If called outside of a Setup component context
 */
export function onCleanup(fn: CleanupHandler) {
  if (!currentCleanupHandlers) {
    const error = new Error('Out of Setup component.');
    captureStack.violation.general(
      'Cleanup handler declaration violation detected:',
      'Attempted to use cleanup handler outside of Setup component.',
      error,
      undefined,
      onCleanup
    );
  }

  currentCleanupHandlers?.add(fn);
}
