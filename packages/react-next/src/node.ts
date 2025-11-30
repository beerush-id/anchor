import { createObserver, isBrowser } from '@anchorlib/core';
import type { HTMLAttributes } from 'react';

export type PropsRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>> = {
  get current(): E;
  set current(value: E);
  get props(): P;
  destroy(): void;
};

const propsMap = {
  className: 'class',
  htmlFor: 'for',
};

export function propsRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>>(
  factory: (node?: E) => P
): PropsRef<E, P> {
  let current: E;
  let prevProps: Record<string, unknown> = {};

  const observer = createObserver(() => {
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

export function escapeProps<P>(props: P) {
  if (isBrowser()) return props;

  for (const key of Object.keys(props as Record<string, unknown>)) {
    if (key.startsWith('on')) {
      delete props[key as keyof P];
    }
  }

  return props;
}

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

export function flattenStyles(styles: Record<string, string | number>) {
  return Object.entries(styles)
    .map(([key, value]) => {
      const kebabKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
      return `${kebabKey}: ${value};`;
    })
    .join(' ');
}
