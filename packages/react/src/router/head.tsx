import { closure, onCleanup } from '@anchorlib/core';
import type { FC, HTMLAttributes } from 'react';
import { createEffect } from '../hooks.js';

const HEADING_SET_CLOSURE = Symbol('head-map-closure');

/**
 * Defines a heading reference to be injected into the document head.
 */
export type HeadingRef = {
  name: string;
  props: Record<string, string>;
  Renderer: FC;
};

/**
 * A map of active heading references keyed by their identifier.
 */
export type HeadingMap = Map<string, HeadingRef>;

/**
 * Retrieves the request-isolated map of active heading references.
 *
 * @returns The heading map for the current execution context.
 */
export function headings() {
  let store = closure.get<HeadingMap>(HEADING_SET_CLOSURE);

  if (!store) {
    store = new Map();
    closure.set(HEADING_SET_CLOSURE, store);
  }

  return store as HeadingMap;
}

/**
 * Attaches a heading element to the document head or collects it for SSR.
 *
 * @param name The tag name (e.g., 'title', 'meta').
 * @param props The attributes to apply to the tag.
 * @param Renderer The React component used to render the tag during SSR.
 */
export function attachHeading(name: string, props: Record<string, string>, Renderer: FC) {
  if (typeof window === 'undefined') {
    if (name === 'meta') name = `${name}:${props.name || props.property}`;
    if (name === 'link') name = `${name}:${props.href}`;
    if (name === 'style') name = `${name}:${performance.now()}`;

    headings().set(name, { name, props, Renderer });

    onCleanup(() => {
      headings().delete(name);
    });

    return;
  }

  if (name === 'title') {
    const currentTitle = document.title;
    document.title = props.children;

    createEffect(() => () => {
      document.title = currentTitle;
    });

    return;
  }

  const element = document.createElement(name);

  for (const [key, value] of Object.entries(props)) {
    if (key === 'children') {
      element.textContent = value;
    } else {
      element.setAttribute(key, value);
    }
  }

  document.head.appendChild(element);

  createEffect(() => () => {
    element.remove();
  });
}

/**
 * Sets the document title.
 */
export const Title: FC<HTMLAttributes<HTMLTimeElement> & { children: string }> = ({ children }) => {
  const Renderer = () => <title>{children}</title>;
  attachHeading('title', { children }, Renderer);
  return null;
};

/**
 * Sets a meta tag in the document head.
 */
export const Meta: FC<HTMLAttributes<HTMLMetaElement> & { name?: string; property?: string; content?: string }> = (
  props
) => {
  const Renderer = () => <meta {...props} />;
  attachHeading('meta', props as Record<string, string>, Renderer);
  return null;
};

/**
 * Sets a link tag in the document head.
 */
export const HeadLink: FC<HTMLAttributes<HTMLLinkElement> & { href?: string; rel?: string; as?: string }> = (props) => {
  const Renderer = () => <link {...props} />;
  attachHeading('link', props as Record<string, string>, Renderer);
  return null;
};

/**
 * Sets a style tag in the document head.
 */
export const Style: FC<HTMLAttributes<HTMLStyleElement> & { children?: string }> = (props) => {
  const Renderer = () => <style {...props} />;
  attachHeading('style', props as Record<string, string>, Renderer);
  return null;
};
