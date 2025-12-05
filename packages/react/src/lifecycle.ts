import { captureStack, closure, createObserver, setCleanUpHandler, untrack } from '@anchorlib/core';
import type { CleanupHandler, EffectCleanup, EffectHandler, Lifecycle, MountHandler } from './types.js';

const MOUNT_HANDLER_SYMBOL = Symbol('mount-handler');
const MOUNT_CLEANUP_SYMBOL = Symbol('mount-cleanup');
const EFFECT_CLEANUP_SYMBOL = Symbol('effect-cleanup');

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
  const mountHandlers = new Set<MountHandler>();
  const mountCleanups = new Set<CleanupHandler>();
  const effectCleanups = new Set<EffectCleanup>();

  return {
    mount() {
      mountHandlers.forEach((mount) => {
        const cleanup = mount();

        if (typeof cleanup === 'function') {
          mountCleanups.add(cleanup);
        }
      });
    },
    cleanup() {
      mountCleanups.forEach((cleanup) => {
        cleanup();
      });
      effectCleanups.forEach((effectCleanup) => {
        effectCleanup();
      });

      mountHandlers.clear();
      mountCleanups.clear();
      effectCleanups.clear();
    },
    render<R>(fn: () => R) {
      const prevMountHandlers = closure.get<Set<MountHandler>>(MOUNT_HANDLER_SYMBOL),
        prevCleanupHandlers = closure.get<Set<CleanupHandler>>(MOUNT_CLEANUP_SYMBOL),
        prevEffectCleanups = closure.get<Set<EffectCleanup>>(EFFECT_CLEANUP_SYMBOL);

      closure.set(MOUNT_HANDLER_SYMBOL, mountHandlers);
      closure.set(MOUNT_CLEANUP_SYMBOL, mountCleanups);
      closure.set(EFFECT_CLEANUP_SYMBOL, effectCleanups);

      try {
        return untrack(fn) as R;
      } finally {
        closure.set(MOUNT_HANDLER_SYMBOL, prevMountHandlers);
        closure.set(MOUNT_CLEANUP_SYMBOL, prevCleanupHandlers);
        closure.set(EFFECT_CLEANUP_SYMBOL, prevEffectCleanups);
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
 * @param handler - The effect handler function to register
 * @throws {Error} If called outside a Setup component context
 */
export function effect(handler: EffectHandler) {
  const currentEffectCleanups = closure.get<Set<CleanupHandler>>(EFFECT_CLEANUP_SYMBOL);

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

  let cleanup: EffectCleanup | void;

  const observer = createObserver((event) => {
    cleanup?.();
    observer.destroy();
    runEffect(event);
  });

  const runEffect: EffectHandler = (event): undefined => {
    const result = observer.run<EffectCleanup>(() => handler(event) as EffectCleanup);

    if (typeof result === 'function') {
      cleanup = result;
    } else {
      cleanup = undefined;
    }
  };
  const leaveEffect = () => {
    cleanup?.();
    observer.destroy();
  };

  runEffect({ type: 'init', keys: [] });
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
  const currentMountHandlers = closure.get<Set<MountHandler>>(MOUNT_HANDLER_SYMBOL);

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
  const currentMountCleanups = closure.get<Set<CleanupHandler>>(MOUNT_CLEANUP_SYMBOL);
  currentMountCleanups?.add(fn);
}

// Hook up cleanup handler to the Anchor's core lifecycle.
setCleanUpHandler(onCleanup);
