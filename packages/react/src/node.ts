import { createObserver, isBrowser } from '@anchorlib/core';
import type { HTMLAttributes, InputHTMLAttributes, RefObject } from 'react';
import { onCleanup } from './lifecycle.js';
import type { NodeRef } from './types.js';

/**
 * Mapping of React prop names to HTML attribute names.
 */
const propsMap = {
  className: 'class',
  htmlFor: 'for',
};

/**
 * Creates a reactive reference to an HTML element and its attributes.
 * Automatically updates the element's attributes when reactive state changes.
 *
 * @template E - The HTMLElement type
 * @template P - The HTML attributes type
 * @param factory - A function that produces attributes for the element
 * @param displayName - The display name for the reference (optional for debugging)
 * @returns A NodeRef object with reactive attribute updates
 */
export function nodeRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>>(
  factory: (node?: E) => P | void,
  displayName?: string
): NodeRef<E, P> {
  let current: E;
  let prevProps: Record<string, unknown> = {};

  const observer = createObserver(() => {
    observer.reset();
    update();
  });
  observer.name = `Attribute(${displayName ?? 'Anonymous'})`;

  const update = () => {
    const nextProps = (escapeAttributes(observer.run(() => factory(current))) ?? {}) as Record<string, unknown>;
    applyAttributes(current as HTMLElement, nextProps, prevProps);

    props = nextProps;
    prevProps = nextProps;
  };

  let props = escapeAttributes(observer.run(() => factory(current))) as Record<string, unknown>;
  prevProps = props;

  onCleanup(() => {
    observer.destroy();
  });

  return {
    get attributes() {
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
 * Creates a combined ref that can manage multiple refs at once.
 * This function accepts multiple refs and returns a single ref object that,
 * when set, will update all the provided refs with the same value.
 * When reading the current value, it returns the first non-null value among the refs.
 *
 * @template E - The HTMLElement type that the refs refer to
 * @param refs - A list of React RefObjects or NodeRefs to be combined
 * @returns A RefObject that represents the combined refs
 */
export function multiRef<E extends HTMLElement>(...refs: Array<RefObject<E> | NodeRef<E>>): RefObject<E> {
  return {
    get current() {
      return refs.map((ref) => ref.current).filter(Boolean)[0];
    },
    set current(value) {
      for (const ref of refs) {
        if (typeof ref === 'object' && ref !== null) {
          ref.current = value;
        }
      }
    },
  };
}

/**
 * Processes attributes to make them compatible with server-side rendering.
 * Removes event handlers and converts value props to defaultValue for inputs.
 *
 * @template P - The attributes type
 * @param props - The attributes to process
 * @returns Processed attributes suitable for SSR
 */
export function escapeAttributes<P>(props: P) {
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
 * Applies attributes to an HTML element.
 * Handles style objects and attribute mapping.
 *
 * @template E - The HTMLElement type
 * @template P - The attributes type
 * @param element - The HTML element to apply attributes to
 * @param props - The attributes to apply
 * @param prevProps - The previous attributes for diffing (optional)
 */
export function applyAttributes<E extends HTMLElement, P>(element: E, props: P, prevProps: P = {} as P) {
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
