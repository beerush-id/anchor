import type { AnyType } from '@anchorlib/core';
import { createMemo, type JSX, untrack } from 'solid-js';

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

export type SnippetProxy<T extends Record<string | symbol, AnyType>> = {
  [K in keyof T]: T[K] extends object ? () => T[K] : T[K];
};
export type SnippetProps<T extends Record<string | symbol, AnyType>> = {
  data?: T;
  children: (data: SnippetProxy<T>) => JSX.Element;
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
export function Snippet<T extends Record<string | symbol, AnyType>>(props: SnippetProps<T>) {
  const dataProxy = new Proxy(props.data ?? ({} as T), {
    get(target, prop) {
      return () => (target as object)[prop as never];
    },
  });

  return props.children(dataProxy as T);
}
