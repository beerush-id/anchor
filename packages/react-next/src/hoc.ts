import { anchor, captureStack, createObserver, createStack, microtask, withinStack } from '@anchorlib/core';
import type { FunctionComponent, ReactNode } from 'react';
import { memo } from 'react';
import { createEffect, createState } from './hooks.js';
import { createLifecycle } from './lifecycle.js';
import type { ViewRenderer } from './types.js';

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

    const Observed = () => error.message;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed as FunctionComponent as C;
  }

  if (displayName && !(Component as FunctionComponent).displayName) {
    (Component as FunctionComponent).displayName = displayName;
  }

  const componentName = displayName || (Component as FunctionComponent).displayName || Component.name || 'Anonymous';

  const render = Component as (props: unknown) => ReactNode;
  const propsMap = new WeakMap();

  const Setup = memo(
    (currentProps: Record<string, unknown>) => {
      const [[scheduleCleanup, cancelCleanup]] = createState(() => microtask(5));
      const [scope] = createState(() => createStack());
      const [lifecycle] = createState(() => createLifecycle());
      const [reactiveProps] = createState(() => anchor({ ...currentProps }, { recursive: false }));

      propsMap.set(currentProps, reactiveProps);

      createEffect(() => {
        cancelCleanup();
        lifecycle.mount();

        return () => {
          propsMap.delete(currentProps);
          lifecycle.cleanup();

          scheduleCleanup(() => {
            scope.states.clear();
          });
        };
      }, []);

      scope.index = 0;

      return withinStack(scope, () => lifecycle.render(() => render(reactiveProps)));
    },
    (prevProps, nextProps) => {
      const prevPropsRef = propsMap.get(prevProps);

      if (prevPropsRef) {
        Object.assign(prevPropsRef, nextProps);
      }

      return true;
    }
  );

  Setup.displayName = `Setup(${componentName})`;
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
export function templateFn<P>(render: ViewRenderer<P>, displayName?: string): FunctionComponent<P> {
  if (typeof render !== 'function' && (typeof render !== 'object' || render === null)) {
    const error = new Error('Renderer must be a function.');
    captureStack.violation.general(
      'View factory violation detected:',
      'Attempted to use view() HOC on a non-functional component.',
      error,
      undefined,
      templateFn
    );

    const Template = () => error.message;
    Template.displayName = `Error(${displayName || 'Anonymous'})`;
    return Template;
  }

  const Template = memo((props: P) => {
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

    return observer.run(() => render(props));
  });

  Template.displayName = `View(${displayName || render.name || 'Anonymous'})`;
  return Template as FunctionComponent<P>;
}

export const view = templateFn;
export const template = templateFn;
