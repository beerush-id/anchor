import { anchor, captureStack, createObserver, createStack, microtask, withStack } from '@anchorlib/core';
import type { FunctionComponent, ReactNode } from 'react';
import { createEffect, createState, memoize } from './hooks.js';
import { createLifecycle } from './lifecycle.js';
import { getProps, proxyProps, withProps } from './props.js';
import type { SetupComponent, SetupProps, Snippet, StableComponent, Template } from './types.js';

const RENDERER_INIT_VERSION = 1;
const CLEANUP_DEBOUNCE_TIME = 0;

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
export function setup<P>(Component: SetupComponent<P>, displayName?: string): StableComponent<P> {
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
    return Factory as StableComponent<P>;
  }

  if (displayName && !(Component as FunctionComponent).displayName) {
    (Component as FunctionComponent).displayName = displayName;
  }

  const componentName = displayName || (Component as FunctionComponent).displayName || Component.name || 'Anonymous';

  const render = Component as (props: unknown) => ReactNode;
  const propsMap = new WeakMap();

  const Factory = (currentProps: Record<string, unknown>) => {
    const [[scheduleMount, cancelMount]] = createState(() => microtask(CLEANUP_DEBOUNCE_TIME));
    const [[scheduleCleanup, cancelCleanup]] = createState(() => microtask(CLEANUP_DEBOUNCE_TIME));
    const [scope] = createState(() => createStack());
    const [lifecycle] = createState(() => createLifecycle());
    const [baseProps] = createState(() => anchor({ ...currentProps }, { recursive: false }));

    propsMap.set(currentProps, baseProps);
    const props = proxyProps(baseProps);

    createEffect(() => {
      cancelMount();
      cancelCleanup();

      scheduleMount(() => {
        lifecycle.mount();
      });

      return () => {
        scheduleCleanup(() => {
          // @important Actual cleanup should be scheduled to prevent cleaning up the current effects in strict-mode.
          propsMap.delete(currentProps);
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

  Factory.displayName = `Component(${componentName})`;

  const Setup = memoize(Factory, (prevProps, nextProps) => {
    const prevPropsRef = propsMap.get(prevProps);

    if (prevPropsRef) {
      anchor.assign(prevPropsRef, nextProps);
    }

    return true;
  });

  Setup.displayName = componentName;
  return Setup as StableComponent<P>;
}

/**
 * Creates a reactive snippet that has access to parent component's props and context.
 *
 * The `snippet` HOC creates a reactive view that can be used within a setup component.
 * It has access to the parent component's props through closure, making it ideal for
 * creating smaller reactive pieces within a larger component.
 *
 * Key characteristics:
 * - Scoped to the parent component's context
 * - Has access to parent component's props
 * - Reactive to state changes within its scope
 * - Automatically manages its own lifecycle and cleanup
 *
 * @template P - The props type for the snippet
 * @template SP - The setup props type extending SetupProps
 * @param {Snippet<P, SP>} factory - A function that receives props and parent props, returning React nodes
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @param needSetup - Whether to force a strict scope for the snippet (internal use).
 * @param scopeName - The scope name for the snippet (internal use).
 * @returns {FunctionComponent<P>} A memoized functional component that re-executes when dependencies change
 */
export function snippet<P, SP extends SetupProps = SetupProps>(
  factory: Snippet<P, SP>,
  displayName?: string,
  scopeName = 'Snippet',
  needSetup = true
): FunctionComponent<P> {
  if (typeof factory !== 'function') {
    const error = new Error('Renderer must be a function.');
    captureStack.violation.general(
      `${scopeName} factory violation detected:`,
      `Attempted to use ${scopeName} on a non-functional component.`,
      error,
      undefined,
      snippet
    );

    const Template = () => error.message;
    Template.displayName = `Error(${displayName || 'Anonymous'})`;
    return Template;
  }

  const viewName = displayName || (factory as FunctionComponent).name || 'Anonymous';
  const parentProps = getProps<SP>();

  if (!parentProps && needSetup) {
    const error = new Error('Out of component scope.');
    captureStack.violation.general(
      `${scopeName} violation detected:`,
      `Attempted to use ${scopeName} outside of a component.`,
      error,
      [
        `${scopeName} must be declared inside a component (setup)`,
        '- Use template if the view is meant to be reusable across application',
      ],
      snippet
    );
  }

  const Template = memoize((props: P) => {
    const [[scheduleCleanup, cancelCleanup]] = createState(() => microtask(CLEANUP_DEBOUNCE_TIME));
    const [, setVersion] = createState(RENDERER_INIT_VERSION);
    const [observer] = createState(() => {
      return createObserver(() => {
        observer.reset();
        setVersion((c) => c + 1);
      });
    });
    observer.name = `${scopeName}(${viewName})`;

    createEffect(() => {
      cancelCleanup();

      return () => {
        scheduleCleanup(() => {
          observer.destroy();
        });
      };
    }, []);

    return observer.run(() => factory(proxyProps({ ...props }, false) as P, parentProps as SP));
  });

  Template.displayName = `${scopeName}(${viewName})`;
  return Template as FunctionComponent<P>;
}

/**
 * Creates a standalone reactive template component that relies only on its own props.
 *
 * The `template` HOC creates a reactive view that is independent of parent context.
 * It functions as a standalone reactive component that responds only to changes in
 * its own props, making it reusable across different parts of an application.
 *
 * Key characteristics:
 * - Standalone component with no dependency on parent context
 * - Relies purely on its own props for reactivity
 * - Can be used anywhere in the application like a regular component
 * - Maintains its own reactive lifecycle
 *
 * @template P - The props type for the template
 * @param {Template<P>} factory - A function that receives props and returns React nodes
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @returns {FunctionComponent<P>} A memoized functional component that re-executes when its props change
 */
export function template<P>(factory: Template<P>, displayName?: string): FunctionComponent<P> {
  const parentProps = getProps();

  if (parentProps) {
    captureStack.warning.external(
      'Using template inside a component',
      'Template should not be used inside a component. Use snippet instead for better clarity of the concern.',
      ['Template should be used outside of a component'].join('\n'),
      template
    );
  }

  return snippet(factory, displayName, 'Template', false) as FunctionComponent<P>;
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
 * @param {Snippet<SetupProps>} Component - A function that receives props and returns React nodes
 * @param {string} [displayName] - Optional display name for debugging purposes
 * @returns {ReactNode} The rendered output of the reactive component
 */
export function render(Component: Snippet<never>, displayName?: string): ReactNode {
  const Snippet = snippet<Record<string, unknown>>(Component as Snippet<unknown>, displayName);
  return <Snippet />;
}
