import { createMemo, untrack, type JSX } from 'solid-js';

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
      const isRenderProp = typeof child === 'function' && child.length > 0;

      return isRenderProp ? untrack(() => (child as any)(value as NonNullable<T>)) : child;
    }
    return props.fallback;
  }) as unknown as JSX.Element;
}
