import { type FunctionComponent, memo, type ReactNode, useEffect, useState } from 'react';
import { anchor, captureStack, createObserver, type Linkable, type ObjLike } from '@anchorlib/core';
import type { ReactiveProps, ViewRenderer, ViewRendererFactory } from './types.js';
import { useObserverRef } from './observation.js';
import { resolveProps } from './props.js';
import { CLEANUP_DEBOUNCE_TIME, RENDERER_INIT_VERSION } from './constant.js';
import { useMicrotask } from './hooks.js';
import { createLifecycle } from './lifecycle.js';

/**
 * **`observer`** is a Higher-Order Component (HOC) that wraps a React component
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
export function observer<P>(Component: FunctionComponent<P>, displayName?: string) {
  if (typeof Component !== 'function') {
    const error = new Error('[observer] Component must be a function component.');
    captureStack.violation.general(
      'Observer factory violation detected:',
      'Attempted to use observer HOC on a non-functional component.',
      error,
      undefined,
      observer
    );

    const Observed = () => error.message;
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

  Observed.displayName = `Observer(${componentName})`;
  return Observed as FunctionComponent<ReactiveProps<P>>;
}

/**
 * **`observable`** is an alias for the `observer` function.
 *
 * This alias is provided for backward compatibility and convenience.
 *
 * @deprecated Use `observer` instead.
 *
 * @see {@link observer}
 */
export const observable = observer;

/**
 * **`stable`** is a Higher-Order Component (HOC) that wraps a React component
 * to make it stable by memoizing its output based on props and render it outside observer.
 *
 * It uses React's `useMemo` hook to prevent unnecessary re-renders of the wrapped
 * component when the props haven't changed. The component will only re-render
 * when one or more of its prop values have actually changed.
 *
 * The wrapped component will be rendered outside observer to make sure it's not affecting the parent
 * observers.
 *
 * @template P The type of the original component's props.
 * @param Component The React component to be made stable. It should accept
 *                  its original props `P`.
 * @param displayName An optional string to be used as the display name for the
 *                    wrapped component in React DevTools. If not provided, it
 *                    will derive from the original component's display name or name.
 * @returns A new React component that is memoized based on its props.
 *
 * @remarks This HOC is useful for optimizing performance by preventing re-renders
 * of components whose output doesn't change with the same props. It's particularly
 * effective for components that are expensive to render or are used frequently
 * in lists or other high-frequency rendering scenarios.
 */
export function setup<C>(Component: C, displayName?: string): C {
  if (typeof Component !== 'function') {
    const error = new Error('[setup] Component must be a function component.');
    captureStack.violation.general(
      'Stable factory violation detected:',
      'Attempted to use setup HOC on a non-functional component.',
      error,
      undefined,
      setup
    );

    const Observed = () => error.message;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed as FunctionComponent as C;
  }

  if (displayName && !(Component as FunctionComponent).displayName) {
    (Component as FunctionComponent).displayName = displayName;
  }

  // Creates a name for the setup component for debugging purposes.
  const componentName = displayName || (Component as FunctionComponent).displayName || Component.name || 'Anonymous';

  const render = Component as (props: unknown) => ReactNode;

  const Setup = memo((props) => {
    const lifecycle = createLifecycle();

    useEffect(() => {
      lifecycle.mount();

      return () => lifecycle.cleanup();
    }, Object.values(props));

    return lifecycle.render(() => render(props));
  });

  Setup.displayName = `Setup(${componentName})`;
  return Setup as FunctionComponent as C;
}

/**
 * **`view`** is a utility function that creates a React component which
 * automatically re-renders when any observable state accessed within the provided
 * `factory` function changes.
 *
 * @param factory A callback function that returns a `ReactNode` or a renderer factory object.
 * This function will be executed within an observing context.
 * @param displayName An optional string to be used as the display name for the
 *                    returned component in React DevTools.
 * @returns A new React component that is reactive to observable state changes.
 *
 * @remarks This HOC doesn't wrap a component in a way that **`observer`** does, and expect
 * the factory function to returns a React Node or any value that can be rendered directly. Thus,
 * the factory function should be pure and neither have any side effects nor use any React Hook inside.
 * This HOC is most suitable for selective rendering, acting as the **View** in the **DSV** pattern.
 */
export function view<P>(factory: ViewRenderer<P> | ViewRendererFactory<P>, displayName?: string) {
  if (typeof factory !== 'function' && (typeof factory !== 'object' || factory === null)) {
    const error = new Error('Factory must be a function or factory object.');
    captureStack.violation.general(
      'View observer factory violation detected:',
      'Attempted to use view() HOC with a non function and object factory.',
      error,
      undefined,
      view
    );

    const Observed = () => error.message;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed;
  }

  const ViewNode = (props: P) => {
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

      if (typeof factory === 'object' && factory !== null) {
        factory?.onMounted?.();
      }

      return () => {
        cleanup(() => {
          observer.destroy();

          if (typeof factory === 'object' && factory !== null) {
            factory?.onDestroy?.();
          }
        });
      };
    }, []);

    if (typeof factory === 'function') {
      return observer.run(() => factory(props));
    } else if (typeof factory?.render === 'function') {
      return observer.run(() => factory.render(props));
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
        ViewNode
      );

      return null;
    }
  };

  ViewNode.displayName = `View(${displayName || factory.name || 'Anonymous'})`;
  return ViewNode as FunctionComponent<P>;
}

/**
 * **`observe`** is an alias for the `view` function.
 *
 * This alias is provided for backward compatibility and convenience.
 *
 * @deprecated Use `view` instead.
 *
 * @see {@link view}
 */
export const observe = view;

/**
 * **`named`** is a utility function that assigns a display name to a React functional component.
 *
 * This is primarily used for debugging purposes in React DevTools to provide a meaningful
 * name for components that might otherwise appear as "Anonymous" components.
 *
 * @template P The type of the component's props.
 * @param Component The React functional component to be named.
 * @param name The display name to assign to the component.
 * @returns The same component with the assigned display name.
 *
 * @remarks This function directly modifies the `displayName` property of the component.
 * It's useful when you want to give a meaningful name to anonymous or higher-order components
 * for better debugging experience.
 */
export function named<P>(Component: FunctionComponent<P>, name: string) {
  if (typeof Component !== 'function') {
    const error = new Error('[named] Component must be a function component.');
    captureStack.violation.general(
      'Named factory violation detected:',
      'Attempted to use named utility on a non-functional component.',
      error,
      undefined,
      named
    );

    const Named = () => error.message;
    Named.displayName = `Error(${name || 'Anonymous'})`;
    return Named;
  }

  Component.displayName = name;
  return Component as FunctionComponent<P>;
}
