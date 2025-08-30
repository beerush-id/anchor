import { type ComponentType, useEffect, useMemo, useRef, useState } from 'react';
import {
  createDebugger,
  createObserver,
  derive,
  getDebugger,
  type Linkable,
  microtask,
  type ObjLike,
  setObserver,
  type StateObserver,
} from '@anchor/core';
import type { Bindable } from './types.js';
import { DEV_MODE, STRICT_MODE } from './dev.js';

export type AnchoredProps = {
  _state_version: number;
};

/**
 * `useObserverRef` is a custom React hook that provides a stable `StateObserver` instance
 * and a version counter for triggering re-renders. It's designed to manage the lifecycle
 * of an observer in a React component, especially considering React's Strict Mode.
 *
 * The observer tracks changes in reactive dependencies and notifies the component to re-render.
 * It handles dependency updates and ensures the observer is properly destroyed on unmount.
 *
 * @param deps An optional array of `Linkable` dependencies. Changes in these dependencies
 *             will cause the observer to be re-established.
 * @param displayName An optional name for the observer, useful for debugging.
 * @returns A tuple containing:
 *          - `StateObserver`: The observer instance used for tracking.
 *          - `number`: A version counter that increments on state changes, forcing re-renders.
 */
export function useObserverRef(deps: Linkable[] = [], displayName?: string): [StateObserver, number] {
  const [version, setVersion] = useState(1);

  // Creates an observer instance to be used as a tracking context.
  // It's used to track changes to the state and trigger re-renders.
  // The observer should be only created once during the component setup.
  const [observer] = useState(() => {
    const current = createObserver(() => {
      // Trigger re-render when there is a change notification from the reactive system.
      setVersion((prev) => prev + 1);
    });
    current.name = displayName ?? '(Anon)';
    return current;
  });

  if (!DEV_MODE) {
    // In production, we rely on React's memo to handle cleanup during render phase when
    // there is a change in the dependencies. Check the @IMPORTANT note below for details
    // why this step is necessary.
    useMemo(() => {
      observer.destroy();
    }, deps);

    // In production, observer will be permanently destroyed only in the cleanup phase (unmount).
    useEffect(() => {
      return () => {
        observer.destroy();
      };
    }, []);

    return [observer, version];
  }

  // -- BEGIN_DEV_MODE -- //
  // Dedicated logics to handle observer in development mode,
  // respecting the strict-mode and fast-refresh (HMR).
  const debug = createDebugger('[useObserverRef]', getDebugger());
  const [schedule] = useRef(microtask(0)).current;
  const depsRef = useRef<Set<Linkable>>(null);
  const stableRef = useRef(!STRICT_MODE);

  useEffect(() => {
    schedule(() => {
      // Schedule to mark the observer as stable.
      // This step to make sure it's survive in the strict-mode.
      stableRef.current = true;
      debug.ok('Observer is stable:', observer.name);
    });

    return () => {
      debug.check('Observer need destroy?', stableRef.current, observer.name);
      // Should destroy the observer only when the component is unmounted.
      // It prevents the strict-mode to destroy it on the second render.
      if (stableRef.current) {
        debug.ok('Observer destroyed:', observer.name);
        observer.destroy();
      }
    };
  }, []);

  /**
   * Store the dependency reference when the observer is stable (mounted, strict-mode complete).
   * @IMPORTANT: Dependency changes are handled in the render phase (not in an effect) to ensure
   * proper reactivity. If observer destruction happened in an effect, it would clean up the
   * active observation maps after render, causing reactivity to fail.
   **/
  if (stableRef.current) {
    if (depsRef.current) {
      // Check if the dependencies have changed.
      const newDeps = depsChanged(depsRef.current, deps);
      debug.check('Observer need update?', newDeps as never, observer.name);

      if (newDeps) {
        // Update the dependencies and destroy the observer to establish a new observations.
        depsRef.current = newDeps;
        observer.destroy();
        debug.ok('Observer updated:', observer.name);
      }
    } else {
      // Store the dependencies
      depsRef.current = new Set<Linkable>(deps);
    }
  }

  return [observer, version];
  // -- END_DEV_MODE -- //
}

/**
 * `useObserver` is a custom React hook that leverages `useObserverRef` to manage
 * a `StateObserver` instance and provides a mechanism to set and restore the
 * current observing context within the React component tree.
 *
 * It returns a special `Unobserve` component that, when rendered, restores the
 * observer context to its previous state (or `undefined` if no previous context existed).
 * This ensures that reactive tracking only occurs within the intended scope
 * (typically during the render phase of components that consume reactive state).
 *
 * @param deps An optional array of `Linkable` dependencies. Changes in these dependencies
 *             will cause the underlying observer to be re-established.
 * @param displayName An optional name for the observer, useful for debugging.
 * @returns A tuple containing:
 *          - `ComponentType`: An `Unobserve` component that restores the observer context.
 *          - `number`: A version counter that increments on state changes, forcing re-renders.
 */
export function useObserver(deps: Linkable[] = [], displayName?: string): [ComponentType, number] {
  const [observer, version] = useObserverRef(deps, displayName);

  // Setting the observer as the current observing context.
  const restore = setObserver(observer);

  const Unobserve = () => {
    return <>{restore() as never}</>;
  };

  return [Unobserve, version];
}

/**
 * `observed` is a Higher-Order Component (HOC) that wraps a React component
 * to make it reactive to changes in observable state.
 *
 * It automatically sets up and manages a `StateObserver` instance for the
 * wrapped component. When any observable dependencies used within the component's
 * render phase change, the component will automatically re-render.
 *
 * The HOC also injects an internal `_state_version` prop into the wrapped component.
 * This prop is used internally to force re-renders and should typically be
 * filtered out before passing props to native DOM elements or other components
 * that don't expect it (e.g., using `cleanProps`).
 *
 * @template T The type of the original component's props.
 * @param Component The React component to be made observable. It should accept
 *                  its original props `T` plus an `_state_version: number` prop.
 * @param displayName An optional string to be used as the display name for the
 *                    wrapped component in React DevTools. If not provided, it
 *                    will derive from the original component's display name or name.
 * @returns A new React component that is reactive to observable state changes.
 */
export function observed<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string) {
  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }

  const Observed: ComponentType<T> = (props: T) => {
    // Creates a dependency used to track changes to the component's props.
    // This list will then be used to determine if the observer need to be re-created
    // to make sure there is no obsolete states are being tracked.
    const dependencies = useMemo(() => {
      return Object.values(props as ObjLike).filter((v) => derive.resolve(v as Linkable)) as Linkable[];
    }, [props]);

    // Creates an observer instance to be used as a tracking context.
    const [Unobserve, version] = useObserver(dependencies, displayName);

    // Trigger the `Unobserve` component to make sure the current context is either restored
    // to the previous context, or set to undefined so no tracking is allowed after.
    // This make sure that the tracking is happening only in the rendering phase,
    // to prevent unnecessary tracking (not being used by the UI/logics).
    return (
      <>
        <Component {...{ ...props, _state_version: version }} />
        <Unobserve />
      </>
    );
  };

  Observed.displayName = `Observed(${displayName || Component.displayName || Component.name || 'Component'})`;
  return Observed;
}

/**
 * `cleanProps` is a utility function designed to remove the internal
 * `_state_version` prop from a component's props object.
 *
 * When a component is wrapped by the `observed` HOC, it receives an
 * additional `_state_version` prop. This prop is used internally by the
 * `observed` HOC to force re-renders and should typically not be passed
 * down to native DOM elements or other components that don't expect it.
 *
 * Use this function to filter out `_state_version` before spreading props
 * onto child components or DOM elements.
 *
 * @template T The type of the props object, which must extend `Bindable`.
 * @param props The props object that might contain `_state_version`.
 * @returns A new object containing all original props except `_state_version`.
 */
export function cleanProps<T extends Bindable>(props: T) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { _state_version, ...rest } = props as T & AnchoredProps;
  return rest;
}

/**
 * Compares two arrays for shallow equality, ignoring the order of elements.
 *
 * This function checks if two arrays contain the same elements by comparing:
 * 1. Their lengths
 * 2. Whether all elements in one array exist in the other array
 *
 * It's used to determine if the dependencies of an observer have changed,
 * where the position of elements doesn't matter but their presence does.
 *
 * @param prev - The previous array of dependencies
 * @param next - The next array of dependencies
 * @returns true if the arrays are different, false if they contain the same elements
 */
function depsChanged(prev: Set<Linkable>, next: Linkable[]): Set<Linkable> | void {
  const nextSet = new Set(next);
  if (nextSet.size !== prev.size) return nextSet;

  for (const item of nextSet) {
    if (!prev.has(item)) return nextSet;
  }
}
