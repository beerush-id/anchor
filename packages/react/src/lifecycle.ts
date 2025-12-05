import { captureStack, closure, setCleanUpHandler, untrack } from '@anchorlib/core';
import type { CleanupHandler, Lifecycle, MountHandler } from './types.js';

const MOUNT_HANDLER_SYMBOL = Symbol('mount-handler');
const CLEANUP_HANDLER_SYMBOL = Symbol('mount-cleanup');

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
  const cleanupHandlers = new Set<CleanupHandler>();

  return {
    mount() {
      mountHandlers.forEach((mount) => {
        const cleanup = mount();

        if (typeof cleanup === 'function') {
          cleanupHandlers.add(cleanup);
        }
      });
    },
    cleanup() {
      cleanupHandlers.forEach((cleanup) => {
        cleanup();
      });

      mountHandlers.clear();
      cleanupHandlers.clear();
    },
    render<R>(fn: () => R) {
      const prevMountHandlers = closure.get<Set<MountHandler>>(MOUNT_HANDLER_SYMBOL),
        prevCleanupHandlers = closure.get<Set<CleanupHandler>>(CLEANUP_HANDLER_SYMBOL);

      closure.set(MOUNT_HANDLER_SYMBOL, mountHandlers);
      closure.set(CLEANUP_HANDLER_SYMBOL, cleanupHandlers);

      try {
        return untrack(fn) as R;
      } finally {
        closure.set(MOUNT_HANDLER_SYMBOL, prevMountHandlers);
        closure.set(CLEANUP_HANDLER_SYMBOL, prevCleanupHandlers);
      }
    },
  };
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
  const currentCleanupHandlers = closure.get<Set<CleanupHandler>>(CLEANUP_HANDLER_SYMBOL);
  currentCleanupHandlers?.add(fn);
}

// Hook up cleanup handler to the Anchor's core lifecycle.
setCleanUpHandler(onCleanup);
