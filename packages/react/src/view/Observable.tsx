import { type ComponentType, type ReactNode, type RefObject, useEffect, useRef, useState } from 'react';
import type { AnchoredProps } from '@base/index.js';
import { CLEANUP_DEBOUNCE_TIME, RENDERER_INIT_VERSION, useMicrotask, useObserverRef } from '@base/index.js';
import { anchor, createObserver, type Linkable, type ObjLike, setObserver } from '@anchorlib/core';

/**
 * `useObserverNode` is a custom React hook that leverages `useObserverRef` to manage
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
export function useObserverNode(deps: Linkable[] = [], displayName?: string): [ComponentType, number] {
  const [observer, version] = useObserverRef(deps, displayName);

  // Setting the observer as the current observing context.
  const restore = setObserver(observer);

  const Unobserve = () => {
    return <>{restore() as never}</>;
  };

  return [Unobserve, version];
}

/**
 * **`observable`** is a Higher-Order Component (HOC) that wraps a React component
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
 *
 * @remarks This HOC will re-render the wrapped component whenever there are changes
 * to the observed states. Thus, this HOC is most suitable for use case where
 * a full re-render is needed such as wrapping a 3rd party components,
 * or need a simple component setup without manually declare a selective rendering.
 */
export function observable<T>(Component: ComponentType<T & AnchoredProps>, displayName?: string) {
  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }

  const Observed: ComponentType<T> = (props: T) => {
    // Creates a dependency used to track changes to the component's props.
    // This list will then be used to determine if the observer need to be re-created
    // to make sure there is no obsolete states are being tracked.
    const dependencies = (Object.values(props as ObjLike) as Linkable[]).filter((v) => anchor.has(v));

    // Creates an observer instance to be used as a tracking context.
    const [Unobserve, version] = useObserverNode(dependencies, displayName);

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

  Observed.displayName = `Observed(${displayName || Component.displayName || Component.name || 'Anonymous'})`;
  return Observed;
}

/**
 * **`observe`** is a utility function that creates a React component which
 * automatically re-renders when any observable state accessed within the provided
 * `factory` function changes.
 *
 * @param factory A callback function that returns a `ReactNode`. This function will be
 *           executed within an observing context.
 * @param displayName An optional string to be used as the display name for the
 *                    returned component in React DevTools.
 * @returns A new React component that is reactive to observable state changes.
 *
 * @remarks This HOC doesn't wrap a component in a way that **`observable`** does, and expect
 * the factory function to returns a React Node or any value that can be rendered directly. Thus,
 * the factory function should be pure and neither have any side effects nor use any React Hook inside.
 * This HOC is most suitable for selective rendering, acting as the **View** in the **DSV** pattern.
 */
export function observe<R>(factory: (ref: RefObject<R | null>) => ReactNode, displayName?: string) {
  const ObservedNode: ComponentType = () => {
    const ref = useRef<R>(null);
    const [, setVersion] = useState(RENDERER_INIT_VERSION);
    const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
    const [observer] = useState(() => {
      return createObserver(() => {
        setVersion((c) => c + 1);
      });
    });

    useEffect(() => {
      cancelCleanup();

      return () => {
        cleanup(() => {
          observer.destroy();
        });
      };
    }, []);

    return observer.run(() => factory(ref));
  };

  ObservedNode.displayName = `Reactive(${displayName || factory.name || 'Anonymous'})`;
  return ObservedNode;
}
