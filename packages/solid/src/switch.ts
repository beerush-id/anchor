import { createMemo, type JSX } from 'solid-js';
import { render } from './hoc.tsx';

export type ShowProps<T> = {
  when: T;
  children: JSX.Element | ((value: NonNullable<T>) => JSX.Element);
  fallback?: JSX.Element;
};

/**
 * Conditionally renders children based on a truthy condition.
 * Passes the unwrapped truthy value to the children render prop.
 *
 * @param props.when - The condition to evaluate.
 * @param props.children - The content to render when the condition is truthy.
 * @param props.fallback - Optional content to render when the condition is falsy.
 * @returns The rendered content or null.
 */
export function Show<T>(props: ShowProps<T>): JSX.Element {
  const condition = createMemo(() => props.when);
  return createMemo(() => {
    const value = condition();
    if (value) {
      const child = props.children;
      return typeof child === 'function' ? child(value as NonNullable<T>) : child;
    }
    return props.fallback;
  }) as unknown as JSX.Element;
}

export type SnippetProps<T> = {
  data?: T;
  children: (data: T) => JSX.Element;
};

/**
 * A snippet renderer component that allows for dynamic data rendering and destructure access
 * without losing the fine-grained reactivity.
 *
 * Each property of the data object is proxied to a function that returns the corresponding value.
 *
 * @param props.data - The data to render.
 * @param props.children - The render function that takes the data and returns a JSX element.
 * @returns A JSX element.
 */
export function Snippet<T>(props: SnippetProps<T>): JSX.Element {
  const data = createMemo(() => props.data);
  return render(({ children }) => {
    if (typeof children !== 'function') {
      return `[Snippet Error: Snippet must pass function as the children]`;
    }
    return children(data() as T);
  }, props) as unknown as JSX.Element;
}

export type SlotProps = {
  for: JSX.Element;
  children?: JSX.Element | (() => JSX.Element);
};

/**
 * Renders content based on a slot function or expression.
 *
 * @param props.for - The slot content or function to render.
 * @param props.children - Optional content to render if no slot content is provided.
 * @returns The rendered content from the slot function or children.
 */
export function Slot(props: SlotProps): JSX.Element {
  const content = createMemo(() => props.for);
  return createMemo(() => {
    const value = content();
    if (value !== undefined && value !== null) {
      return value;
    }
    const fallback = props.children;
    return typeof fallback === 'function' ? (fallback as () => JSX.Element)() : fallback;
  }) as unknown as JSX.Element;
}
