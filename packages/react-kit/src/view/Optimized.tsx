import { type FunctionComponent, type ReactNode } from 'react';
import { type ActionRef, resolveProps, useActions, useObserverRef, type VariableRef } from '@anchorlib/react-classic';
import { classx, stylex } from '@utils/index.js';
import type { ClassList, ClassName, ExtendedProps, ReactiveProps, RefProps } from '@base/index.js';
import { useClassName, useStyle } from '@actions/index.js';
import { captureStack, type Linkable } from '@anchorlib/core';

/**
 * A higher-order component that optimizes a given component by wrapping it with reactive capabilities.
 * This function enhances the provided component with dynamic class and style handling, as well as
 * ref management through observer patterns.
 *
 * This function is particularly useful for components that need to dynamically adjust their appearance
 * based on its state. Instead of re-rendering the entire component to change class and styles, this
 * function uses observer patterns to update only the necessary parts of the DOM directly.
 *
 * @template T - The props type of the component being wrapped
 * @param {ComponentType<T>} Component - The React component to be optimized
 * @param {string} [displayName] - Optional display name for the wrapped component
 * @param {ClassName | ClassList} [initClassName] - Initial class names to apply to the component
 * @returns {ComponentType<ReactiveProps<T>>} A new component with enhanced reactive capabilities
 */
export function optimized<T>(
  Component: FunctionComponent<T>,
  displayName?: string,
  initClassName?: ClassName | ClassList
): FunctionComponent<ExtendedProps<ReactiveProps<T>>> {
  if (typeof Component !== 'function') {
    const error = new Error('[optimized] Component must be a function component.');
    captureStack.violation.general(
      'Factory violation detected:',
      'Attempted to use optimized HOC on a non-functional component.',
      error,
      undefined,
      optimized
    );

    const Observed = () => <>{error.message}</>;
    Observed.displayName = `Error(${displayName || 'Anonymous'})`;
    return Observed;
  }

  if (displayName && !Component.displayName) {
    Component.displayName = displayName;
  }

  const render = Component as (props: T) => ReactNode;

  const Optimized = ({ ref, className, style, ...props }: ReactiveProps<T> & RefProps<HTMLElement>) => {
    const [observer] = useObserverRef([className as Linkable, style as Linkable]);

    const classRef = useClassName<HTMLElement>(initClassName, className as VariableRef<string>);
    const styleRef = useStyle<HTMLElement>(style);
    const refLists = useActions(classRef, styleRef, ref as ActionRef<HTMLElement>);

    return observer.run(() =>
      render({
        ...resolveProps(props as ReactiveProps<T>),
        ref: refLists,
        className: classx(initClassName, className as VariableRef<string>),
        style: stylex(style) as never,
      } as T)
    );
  };

  Optimized.displayName = `Optimized(${displayName || Component.displayName || Component.name})`;
  return Optimized as FunctionComponent<ExtendedProps<ReactiveProps<T>>>;
}

export const rfc = optimized;
