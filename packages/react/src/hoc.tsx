import { anchor, captureStack, createObserver, createStack, microtask, withStack } from '@anchorlib/core';
import type { FunctionComponent, ReactNode } from 'react';
import { createEffect, createState, memoize } from './hooks.js';
import { createLifecycle } from './lifecycle.js';
import { getProps, setupProps, withProps } from './props.js';
import type { ViewProps, ViewRenderer } from './types.js';

const RENDERER_INIT_VERSION = 1;

/**
 * Higher-Order Component that creates a stable setup component following the modern component lifecycle.
 *
 * The `setup` HOC implements a modern rendering approach where components render once and maintain
 * stable behavior. It ensures that:
 * - The component only re-renders when its props actually change
 * - Lifecycle events (mount/unmount) are properly managed
 * - Setup and cleanup operations are handled automatically
 *
 * This HOC aligns with the modern component lifecycle philosophy where components render once
 * and updates are controlled through explicit prop changes rather than internal state.
 *
 * @template C - The component type being wrapped
 * @param {C} Component - The function component to wrap with stable lifecycle management
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @returns {C} A memoized component that only re-renders when props change
 */
export function setup<C>(Component: C, displayName?: string): C {
  if (typeof Component !== 'function') {
    const error = new Error('Component must be a function.');
    captureStack.violation.general(
      'Setup factory violation detected:',
      'Attempted to use setup() HOC on a non-functional component.',
      error,
      undefined,
      setup
    );

    const Factory = () => error.message;
    Factory.displayName = `Error(${displayName || 'Anonymous'})`;
    return Factory as FunctionComponent as C;
  }

  if (displayName && !(Component as FunctionComponent).displayName) {
    (Component as FunctionComponent).displayName = displayName;
  }

  const componentName = displayName || (Component as FunctionComponent).displayName || Component.name || 'Anonymous';

  const render = Component as (props: unknown) => ReactNode;
  const propsMap = new WeakMap();

  const Factory = (currentProps: Record<string, unknown>) => {
    const [[scheduleMount, cancelMount]] = createState(() => microtask(5));
    const [[scheduleCleanup, cancelCleanup]] = createState(() => microtask(5));
    const [scope] = createState(() => createStack());
    const [lifecycle] = createState(() => createLifecycle());
    const [baseProps] = createState(() => anchor({ ...currentProps }, { recursive: false }));

    propsMap.set(currentProps, baseProps);
    const props = setupProps(baseProps);

    createEffect(() => {
      cancelMount();
      cancelCleanup();

      scheduleMount(() => {
        lifecycle.mount();
      });

      return () => {
        propsMap.delete(currentProps);

        scheduleCleanup(() => {
          // @important Actual cleanup should be scheduled to prevent cleaning up the current effects.
          lifecycle.cleanup();
          scope.states.clear();
        });
      };
    }, []);

    scope.index = 0;

    /**
     * Cleanup the previous effect handlers to make sure each render is isolated.
     * This also necessary to cover HMR (Fast Refresh) where re-render is expected.
     */
    lifecycle.cleanup();

    return withStack(scope, () => {
      return withProps(props, () => {
        return lifecycle.render(() => {
          return render(props);
        });
      });
    });
  };

  Factory.displayName = `Setup(${componentName})`;

  const Setup = memoize(Factory, (prevProps, nextProps) => {
    const prevPropsRef = propsMap.get(prevProps);

    if (prevPropsRef) {
      Object.assign(prevPropsRef, nextProps);
    }

    return true;
  });

  Setup.displayName = componentName;
  return Setup as FunctionComponent as C;
}

/**
 * Higher-Order Component that creates a reactive renderer following the modern component lifecycle.
 *
 * The `template` HOC implements a renderer that reacts to state changes while maintaining the
 * modern component lifecycle approach where components render once. It:
 * - Wraps a renderer function with reactive state management using an observer pattern
 * - Automatically re-renders when observable state accessed within the renderer changes
 * - Separates the stable setup component from the reactive template renderer
 *
 * This HOC is designed to work with the `setup` HOC to implement a modern component architecture:
 * - `setup` creates stable components that only re-render when props change
 * - `template` creates reactive renderers that respond to state changes
 * - Together they enable a clean separation of concerns in modern React applications
 *
 * @template P - The props type for the component
 * @param {ViewRenderer<P>} render - A function that receives props and returns React nodes
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @returns {FunctionComponent<P>} A reactive renderer that auto-updates on state changes
 */
export function template<P, VP extends ViewProps = ViewProps>(
  render: ViewRenderer<P, VP>,
  displayName?: string
): FunctionComponent<VP> {
  if (typeof render !== 'function') {
    const error = new Error('Renderer must be a function.');
    captureStack.violation.general(
      'View factory violation detected:',
      'Attempted to use view() HOC on a non-functional component.',
      error,
      undefined,
      template
    );

    const Template = () => error.message;
    Template.displayName = `Error(${displayName || 'Anonymous'})`;
    return Template;
  }

  const viewName = displayName || (render as FunctionComponent).name || 'Anonymous';
  const setupProps = getProps() ?? {};

  const Template = memoize((props: VP) => {
    const [, setVersion] = createState(RENDERER_INIT_VERSION);
    const [observer] = createState(() => {
      return createObserver(() => {
        observer.destroy();
        setVersion((c) => c + 1);
      });
    });

    createEffect(() => {
      return () => observer.destroy();
    }, []);

    return observer.run(() => render(setupProps as P, props as VP));
  });

  Template.displayName = `View(${viewName})`;
  return Template as FunctionComponent<VP>;
}

/**
 * @deprecated Use `template` instead. This alias will be removed in a future version.
 */
export const view = template;

/**
 * Higher-Order Component that creates and immediately renders a reactive component.
 *
 * The `render` function combines the functionality of `template` with immediate execution,
 * creating a reactive renderer and returning its rendered output. This is useful when you
 * want to create and render a reactive component in a single step rather than defining
 * it separately and then using it in JSX.
 *
 * This function follows the same reactive principles as `template`, responding to state
 * changes and maintaining the modern component lifecycle approach.
 *
 * @template P - The props type for the component
 * @param {ViewRenderer<P, ViewProps>} Component - A function that receives props and returns React nodes
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @returns {ReactNode} The rendered output of the reactive component
 */
export function render<P>(Component: ViewRenderer<P, ViewProps>, displayName?: string): ReactNode {
  const Template = template(Component, displayName);
  return <Template />;
}
