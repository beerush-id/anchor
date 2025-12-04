import { captureStack, isBrowser } from '@anchorlib/core';
import type { FunctionComponent, memo, useEffect, useMemo, useRef, useState } from 'react';

/**
 * ⚠️⚠️⚠️ LOW-LEVEL APIS - AVOID DIRECT USAGE ⚠️⚠️⚠️
 *
 * THIS FILE CONTAINS LOW-LEVEL ANCHOR APIS THAT SHOULD NOT BE USED
 * IN STANDARD APPLICATION DEVELOPMENT.
 *
 * THESE APIS ARE PROVIDED FOR INTERNAL USE AND ADVANCED CUSTOM INTEGRATIONS ONLY.
 * ANCHOR IS DESIGNED TO WORK WITHOUT DIRECT HOOK MANIPULATION WHERE POSSIBLE.
 * USING THESE APIS MAY RESULT IN UNEXPECTED BEHAVIOR OR BREAKAGES.
 *
 * REFER TO OFFICIAL DOCUMENTATION FOR RECOMMENDED USAGE PATTERNS.
 */

/**
 * Internal effect hook implementation that safely no-ops on the server.
 * On the client, this throws an error if used before initialization.
 * This hook is replaced by the actual React useEffect hook when setEffectHook is called.
 */
let effectHook = (() => {
  if (isBrowser()) {
    const error = new Error('createEffect hook binding is not initialized.');
    captureStack.violation.general(
      'Uninitialized createEffect hook detected.',
      'Attempted to use createEffect before the React hook binding is initialized. This usually happens when @anchorlib/react/client is not imported in your client entry file.',
      error,
      [
        'Import "@anchorlib/react/client" at the top of your client entry file (e.g., app/layout.tsx or pages/_app.tsx).',
        'Ensure the import runs before any components that use createEffect.',
        'Documentation: https://anchorlib.dev/docs/react/installation#client',
      ],
      effectHook
    );
  }
}) as typeof useEffect;

/**
 * Internal state hook implementation that safely no-ops on the server.
 * On the client, this throws an error if used before initialization.
 * This hook is replaced by the actual React useState hook when setStateHook is called.
 */
let stateHook = ((init) => {
  if (isBrowser()) {
    const error = new Error('createState hook binding is not initialized.');
    captureStack.violation.general(
      'Uninitialized createState hook detected.',
      'Attempted to use createState before the React hook binding is initialized. This usually happens when @anchorlib/react/client is not imported in your client entry file.',
      error,
      [
        'Import "@anchorlib/react/client" at the top of your client entry file (e.g., app/layout.tsx or pages/_app.tsx).',
        'Ensure the import runs before any components that use createState.',
        'Documentation: https://anchorlib.dev/docs/react/installation#client',
      ],
      stateHook
    );
  }

  let current = typeof init === 'function' ? (init as () => unknown)() : init;
  const setCurrent = (value: unknown | ((current: unknown) => unknown)) => {
    current = value;
  };

  return [current, setCurrent];
}) as typeof useState;

/**
 * Internal ref hook implementation that safely no-ops on the server.
 * On the client, this throws an error if used before initialization.
 * This hook is replaced by the actual React useRef hook when setRefHook is called.
 *
 * @template T - The type of the ref value
 * @param init - The initial value for the ref
 * @returns A ref object with a current property
 */
let refHook = <T>(init: T) => {
  if (isBrowser()) {
    const error = new Error('createRef hook binding is not initialized.');
    captureStack.violation.general(
      'Uninitialized createRef hook detected.',
      'Attempted to use createRef before the React hook binding is initialized. This usually happens when @anchorlib/react/client is not imported in your client entry file.',
      error,
      [
        'Import "@anchorlib/react/client" at the top of your client entry file (e.g., app/layout.tsx or pages/_app.tsx).',
        'Ensure the import runs before any components that use createRef.',
        'Documentation: https://anchorlib.dev/docs/react/installation#client',
      ],
      refHook
    );
  }

  return {
    get current() {
      return init;
    },
    set current(value: T) {
      init = value;
    },
  };
};

/**
 * Internal memo hook implementation that safely no-ops on the server.
 * On the client, this throws an error if used before initialization.
 * This hook is replaced by the actual React useMemo hook when setMemoHook is called.
 */
let memoHook = ((fn) => {
  if (isBrowser()) {
    const error = new Error('createMemo hook binding is not initialized.');
    captureStack.violation.general(
      'Uninitialized createMemo hook detected.',
      'Attempted to use createMemo before the React hook binding is initialized. This usually happens when @anchorlib/react/client is not imported in your client entry file.',
      error,
      [
        'Import "@anchorlib/react/client" at the top of your client entry file (e.g., app/layout.tsx or pages/_app.tsx).',
        'Ensure the import runs before any components that use createMemo.',
        'Documentation: https://anchorlib.dev/docs/react/installation#client',
      ],
      memoHook
    );
  }

  return fn();
}) as typeof useMemo;

/**
 * Internal memo HOC implementation that safely no-ops on the server.
 * On the client, this throws an error if used before initialization.
 * This HOC is replaced by the actual React memo HOC when setMemoHOC is called.
 */
let memoHOC = ((Component: FunctionComponent) => {
  if (isBrowser()) {
    const error = new Error('memoize HOC binding is not initialized.');
    captureStack.violation.general(
      'Uninitialized memoize HOC detected.',
      'Attempted to use memoize before the React hook binding is initialized. This usually happens when @anchorlib/react/client is not imported in your client entry file.',
      error,
      [
        'Import "@anchorlib/react/client" at the top of your client entry file (e.g., app/layout.tsx or pages/_app.tsx).',
        'Ensure the import runs before any components that use memoize.',
        'Documentation: https://anchorlib.dev/docs/react/installation#client',
      ],
      memoHook
    );
  }

  return ((props) => {
    return Component(props);
  }) as FunctionComponent;
}) as typeof memo;

/**
 * Sets the memo HOC implementation to use React's memo.
 * This should be called during initialization by @anchorlib/react/client.
 *
 * @param hook - The React memo HOC to use
 */
export const setMemoHOC = (hook: typeof memo) => {
  memoHOC = hook;
};

/**
 * Sets the effect hook implementation to use React's useEffect.
 * This should be called during initialization by @anchorlib/react/client.
 *
 * @param hook - The React useEffect hook to use
 */
export const setEffectHook = (hook: typeof useEffect) => {
  effectHook = hook;
};

/**
 * Sets the state hook implementation to use React's useState.
 * This should be called during initialization by @anchorlib/react/client.
 *
 * @template T - The type of the state value
 * @param hook - The React useState hook to use
 */
export const setStateHook = <T>(hook: typeof useState<T>) => {
  stateHook = hook;
};

/**
 * Sets the ref hook implementation to use React's useRef.
 * This should be called during initialization by @anchorlib/react/client.
 *
 * @template T - The type of the ref value
 * @param hook - The React useRef hook to use
 */
export const setRefHook = <T>(hook: typeof useRef<T>) => {
  refHook = hook;
};

/**
 * Sets the memo hook implementation to use React's useMemo.
 * This should be called during initialization by @anchorlib/react/client.
 *
 * @template T - The type of the memoized value
 * @param hook - The React useMemo hook to use
 */
export const setMemoHook = <T>(hook: typeof useMemo<T>) => {
  memoHook = hook as typeof memoHook;
};

/**
 * ⚠️ LOW-LEVEL API - NOT RECOMMENDED FOR STANDARD USAGE ⚠️
 *
 * Creates a side effect that runs after render, similar to React's useEffect.
 * This hook can be used in both server and client components, enabling component reusability.
 * On the server, this safely no-ops since effects don't run during SSR.
 * On the client, the effect runs after render and is cleaned up on unmount or before re-running.
 *
 * WARNING: Using this API directly may cause unexpected behavior, particularly with
 * Anchor's reactive system. For example, using state-mutating functions will trigger re-renders
 * of setup components, breaking the purpose of setup components which should be
 * pure and not reactive.
 *
 * Standard applications should avoid using this hook directly.
 *
 * @param cb - The effect callback function, optionally returning a cleanup function
 * @param deps - Optional array of dependencies that trigger the effect when changed
 * @returns void
 */
export const createEffect = ((cb, deps) => {
  return effectHook(cb, deps);
}) as typeof useEffect;

/**
 * ⚠️ LOW-LEVEL API - NOT RECOMMENDED FOR STANDARD USAGE ⚠️
 *
 * Creates a stateful value that persists across renders, similar to React's useState.
 * This hook can be used in both server and client components, enabling component reusability.
 * On the server, this returns the initial value without state management.
 * On the client, this provides full stateful behavior with re-rendering on updates.
 *
 * WARNING: Using this API directly may cause unexpected behavior, particularly with
 * Anchor's reactive system. For example, using state-mutating functions will trigger re-renders
 * of setup components, breaking the purpose of setup components which should be
 * pure and not reactive.
 *
 * Standard applications should avoid using this hook directly.
 *
 * @template T - The type of the state value
 * @param init - The initial state value or a function that returns the initial state
 * @returns A tuple of [state, setState]
 */
export const createState = <T>(init: T | (() => T)) => {
  return stateHook(init);
};

/**
 * ⚠️ LOW-LEVEL API - NOT RECOMMENDED FOR STANDARD USAGE ⚠️
 *
 * Creates a mutable ref object that persists across renders, similar to React's useRef.
 * This hook can be used in both server and client components, enabling component reusability.
 * On the server, this returns a simple object with the initial value.
 * On the client, this provides a persistent ref object that survives re-renders.
 *
 * WARNING: Using this API directly may cause unexpected behavior, particularly with
 * Anchor's reactive system. For example, using state-mutating functions will trigger re-renders
 * of setup components, breaking the purpose of setup components which should be
 * pure and not reactive.
 *
 * Standard applications should avoid using this hook directly.
 *
 * @template T - The type of the ref value
 * @param init - The initial value for the ref
 * @returns A ref object with a current property
 */
export const createRef = <T>(init: T) => {
  return refHook(init);
};

/**
 * ⚠️ LOW-LEVEL API - NOT RECOMMENDED FOR STANDARD USAGE ⚠️
 *
 * Creates a memoized value that only recomputes when dependencies change, similar to React's useMemo.
 * This hook can be used in both server and client components, enabling component reusability.
 * On the server, this simply executes the function and returns the value without memoization.
 * On the client, this caches the computed value and only recomputes when dependencies change.
 *
 * WARNING: Using this API directly may cause unexpected behavior, particularly with
 * Anchor's reactive system. For example, using state-mutating functions will trigger re-renders
 * of setup components, breaking the purpose of setup components which should be
 * pure and not reactive.
 *
 * Standard applications should avoid using this hook directly.
 *
 * @param fn - A function that computes and returns the memoized value
 * @param deps - Optional array of dependencies that trigger recomputation when changed
 * @returns The memoized value
 */
export const createMemo = ((fn, deps) => {
  return memoHook(fn, deps);
}) as typeof useMemo;

/**
 * ⚠️ LOW-LEVEL API - NOT RECOMMENDED FOR STANDARD USAGE ⚠️
 *
 * Memoizes a functional component to prevent unnecessary re-renders.
 * This HOC can be used in both server and client components, enabling component reusability.
 * On the server, this simply returns the component without memoization.
 * On the client, this uses React's memo functionality to optimize performance.
 *
 * WARNING: Using this API directly may cause unexpected behavior, particularly with
 * Anchor's reactive system. For example, using state-mutating functions will trigger re-renders
 * of setup components, breaking the purpose of setup components which should be
 * pure and not reactive.
 *
 * Standard applications should avoid using this HOC directly.
 *
 * @param Component - The functional component to memoize
 * @param propsAreEqual - Optional function to customize props comparison logic
 * @returns A memoized version of the component
 */
export const memoize = ((Component: FunctionComponent, propsAreEqual: () => boolean) => {
  return memoHOC(Component, propsAreEqual);
}) as typeof memo;
