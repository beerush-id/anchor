import { createObserver, isBrowser } from '@anchorlib/core';
import type { HTMLAttributes, InputHTMLAttributes } from 'react';
import { onCleanup } from './lifecycle.js';

/**
 * A reference object that holds an HTML element and its props.
 * Provides reactive updates when props change.
 *
 * @template E - The HTMLElement type
 * @template P - The HTML attributes type
 */
export type PropsRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>> = {
  /** Get the current HTML element */
  get current(): E;
  /** Set the current HTML element and trigger prop updates */
  set current(value: E);
  /** Get the current props */
  get props(): P;
  /** Destroy the observer and clean up resources */
  destroy(): void;
};

/**
 * Mapping of React prop names to HTML attribute names.
 */
const propsMap = {
  className: 'class',
  htmlFor: 'for',
};

/**
 * Creates a reactive reference to an HTML element and its props.
 * Automatically updates the element's attributes when props change.
 *
 * @template E - The HTMLElement type
 * @template P - The HTML attributes type
 * @param factory - A function that produces props for the element
 * @returns A PropsRef object with reactive prop updates
 */
export function propsRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>>(
  factory: (node?: E) => P
): PropsRef<E, P> {
  let current: E;
  let prevProps: Record<string, unknown> = {};

  const observer = createObserver(() => {
    observer.destroy();
    update();
  });

  const update = () => {
    const nextProps = escapeProps(observer.run(() => factory(current))) as Record<string, unknown>;
    applyProps(current as HTMLElement, nextProps, prevProps);

    props = nextProps;
    prevProps = nextProps;
  };

  let props = escapeProps(observer.run(() => factory(current))) as Record<string, unknown>;
  prevProps = props;

  onCleanup(() => {
    observer.destroy();
  });

  return {
    get props() {
      return props as P;
    },
    get current() {
      return current;
    },
    set current(value: E) {
      current = value;
      update();
    },
    destroy() {
      observer.destroy();
    },
  };
}

/**
 * Processes props to make them compatible with server-side rendering.
 * Removes event handlers and converts value props to defaultValue for inputs.
 *
 * @template P - The props type
 * @param props - The props to process
 * @returns Processed props suitable for SSR
 */
export function escapeProps<P>(props: P) {
  if (isBrowser()) return props;

  for (const key of Object.keys(props as Record<string, unknown>)) {
    if (key.startsWith('on')) {
      delete props[key as keyof P];
    }

    if (key === 'value') {
      (props as InputHTMLAttributes<HTMLInputElement>).defaultValue =
        (props as InputHTMLAttributes<HTMLInputElement>).defaultValue || (props[key as keyof P] as string);
    }
  }

  return props;
}

/**
 * Applies props to an HTML element by setting attributes.
 * Handles style objects and attribute mapping.
 *
 * @template E - The HTMLElement type
 * @template P - The props type
 * @param element - The HTML element to apply props to
 * @param props - The props to apply
 * @param prevProps - The previous props for diffing (optional)
 */
export function applyProps<E extends HTMLElement, P>(element: E, props: P, prevProps: P = {} as P) {
  if (!(element instanceof HTMLElement)) return;

  const next = props as Record<string, unknown>;
  const prev = prevProps as Record<string, unknown>;

  for (const key of Object.keys(prev)) {
    if (key.startsWith('on')) continue;
    if (!(key in next)) {
      if (key === 'style') {
        element.removeAttribute('style');
      } else {
        element.removeAttribute(propsMap[key as keyof typeof propsMap] ?? key);
      }
    }
  }

  for (const [key, value] of Object.entries(next)) {
    if (key.startsWith('on')) continue;
    if (prev[key] === value) continue;

    if (key === 'style') {
      const nextStyle = value as Record<string, string | number>;
      const prevStyle = (prev[key] ?? {}) as Record<string, string | number>;

      for (const styleKey of Object.keys(prevStyle)) {
        if (!(styleKey in nextStyle)) {
          element.style.removeProperty(styleKey);
        }
      }

      for (const [styleKey, styleValue] of Object.entries(nextStyle)) {
        if (prevStyle[styleKey] === styleValue) continue;
        if (styleKey.startsWith('--')) {
          element.style.setProperty(styleKey, String(styleValue));
        } else {
          element.style[styleKey as never] = String(styleValue);
        }
      }
    } else {
      element.setAttribute(propsMap[key as keyof typeof propsMap] ?? key, String(value));
    }
  }
}

/**
 * Converts a style object to a CSS string.
 * Transforms camelCase properties to kebab-case.
 *
 * @param styles - The style object to convert
 * @returns A CSS string representation of the styles
 */
export function flattenStyles(styles: Record<string, string | number>) {
  return Object.entries(styles)
    .map(([key, value]) => {
      const kebabKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${kebabKey}: ${value};`;
    })
    .join(' ');
}
