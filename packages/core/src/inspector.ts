import { anchor } from './anchor.ts';
import { ANCHOR_SETTINGS } from './constant.js';
import { captureStack } from './exception.ts';
import { onCleanup } from './lifecycle.ts';
import { subscribe } from './subscription.ts';
import type { StateInspector } from './types.ts';

/**
 * Implementation of the StateInspector interface.
 * This function allows you to subscribe to state changes and log or trace them.
 * This function only works in development mode.
 *
 * @param state - The state object to inspect
 * @param trace - Optional flag to enable stack tracing for state changes (default: false)
 * @returns A cleanup function to unsubscribe from state changes
 */
const inspectFn = ((state, trace?: boolean) => {
  if (ANCHOR_SETTINGS.production) return () => {};

  // Check if the provided state is a valid state object
  if (!anchor.has(state)) {
    const error = new Error('Invalid state.');
    captureStack.error.argument('The given state is not a valid state object.', error, inspectFn.trace, inspectFn);
    console.log(state);
    return () => {};
  }

  // Subscribe to the state changes
  const unsubscribe = subscribe(state, (target, event) => {
    if (trace) {
      // Log with stack trace when trace is enabled
      console.trace(`[${event.type}]: `, target, event);
    } else {
      // Just log the state change
      console.log(`[${event.type}]: `, target, event);
    }
  });

  // Clean up the subscription when the component is destroyed
  onCleanup(() => {
    unsubscribe();
  });

  return unsubscribe;
}) as StateInspector;

// Add the trace method to the inspectFn
inspectFn.trace = ((state) => {
  // Call the main function with trace enabled
  return (inspectFn as (state: unknown, trace: unknown) => unknown)(state, true);
}) as StateInspector['trace'];

export const inspect = inspectFn as StateInspector;
