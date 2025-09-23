import { type FunctionComponent, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  CLEANUP_DEBOUNCE_TIME,
  type ReactiveProps,
  RENDERER_INIT_VERSION,
  resolveProps,
  useMicrotask,
  useObserverRef,
} from '@base/index.js';
import { anchor, captureStack, createObserver, type Linkable, type ObjLike, setObserver } from '@anchorlib/core';
import type { ViewRenderer, ViewRendererFactory } from './Types.js';

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
 *          - `FunctionComponent`: An `Unobserve` component that restores the observer context.
 *          - `number`: A version counter that increments on state changes, forcing re-renders.
 */
export function useObserverNode(deps: Linkable[] = [], displayName?: string): [FunctionComponent, number] {
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
 * @template P The type of the original component's props.
 * @param Component The React component to be made observable. It should accept
 *                  its original props `P`.
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
export function observable<P>(Component: FunctionComponent<P>, displayName?: string) {
  if (typeof Component !== 'function') {
    const error = new Error('[observable] Component must be a function component.');
    captureStack.violation.general(
      'Observable factory violation detected:',
      'Attempted to use observable HOC on a non-functional component.',
      error,
      undefined,
      observable
    );

    const Observed = () => <>{error.message}</>;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed;
  }

  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }

  // Creates a name for the observed component for debugging purposes.
  const componentName = displayName || Component.displayName || Component.name || 'Anonymous';

  // Creates a rendered component that uses the provided factory function to render.
  const render = Component as (props: P) => ReactNode;

  const Observed = (props: ReactiveProps<P>) => {
    // Creates a dependency used to track changes to the component's props.
    // This list will then be used to determine if the observer need to be re-created
    // to make sure there is no obsolete states are being tracked.
    const dependencies = (Object.values(props as ObjLike) as Linkable[]).filter((v) => anchor.has(v));

    // Creates an observer instance to be used as a tracking context.
    const [observer] = useObserverRef(dependencies, componentName);

    // Runs the provided factory function within the observer context.
    return observer.run(() => render({ ...resolveProps(props) }));
  };

  Observed.displayName = `Observable(${componentName})`;
  return Observed as FunctionComponent<ReactiveProps<P>>;
}

/**
 * **`observe`** is a utility function that creates a React component which
 * automatically re-renders when any observable state accessed within the provided
 * `factory` function changes.
 *
 * @param factory A callback function that returns a `ReactNode` or a renderer factory object.
 * This function will be executed within an observing context.
 * @param displayName An optional string to be used as the display name for the
 *                    returned component in React DevTools.
 * @returns A new React component that is reactive to observable state changes.
 *
 * @remarks This HOC doesn't wrap a component in a way that **`observable`** does, and expect
 * the factory function to returns a React Node or any value that can be rendered directly. Thus,
 * the factory function should be pure and neither have any side effects nor use any React Hook inside.
 * This HOC is most suitable for selective rendering, acting as the **View** in the **DSV** pattern.
 */
export function observe<R>(factory: ViewRenderer<R> | ViewRendererFactory<R>, displayName?: string) {
  if (typeof factory !== 'function' && (typeof factory !== 'object' || factory === null)) {
    const error = new Error('Factory must be a function or factory object.');
    captureStack.violation.general(
      'View observer factory violation detected:',
      'Attempted to use observe() HOC with a non function and object factory.',
      error,
      undefined,
      observe
    );

    const Observed = () => <>{error.message}</>;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed;
  }

  const ObservedNode: FunctionComponent = () => {
    const factoryRef = useRef<R>(null);

    const [, setVersion] = useState(RENDERER_INIT_VERSION);
    const [cleanup, cancelCleanup] = useMicrotask(CLEANUP_DEBOUNCE_TIME);
    const [observer] = useState(() => {
      return createObserver(() => {
        setVersion((c) => c + 1);

        if (typeof factory !== 'function') {
          factory?.onUpdated?.();
        }
      });
    });

    useEffect(() => {
      cancelCleanup();

      if (typeof factory !== 'function') {
        factory?.onMounted?.();
      }

      return () => {
        cleanup(() => {
          observer.destroy();

          if (typeof factory !== 'function') {
            factory?.onDestroy?.();
          }
        });
      };
    }, []);

    if (typeof factory === 'function') {
      return observer.run(() => factory(factoryRef));
    } else if (typeof factory?.render === 'function') {
      return observer.run(() => factory.render(factoryRef));
    } else {
      captureStack.violation.general(
        'Unsupported view renderer factory detected:',
        'Attempted to observe a state using an invalid renderer factory.',
        new Error('Invalid renderer factory.'),
        [
          'Renderer factory must be either:',
          '- A function that returns a ReactNode.',
          '- A factory object with a "render()" property.',
        ],
        ObservedNode
      );

      return null;
    }
  };

  ObservedNode.displayName = `View(${displayName || factory.name || 'Anonymous'})`;
  return ObservedNode;
}
