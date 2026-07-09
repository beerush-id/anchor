import { $symbol, getScope, isBrowser, onCleanup, setScope } from '@anchorlib/core';
import type { Component, JSX } from 'solid-js';

const HEADING_SET_CLOSURE = $symbol('head-map-closure');

/**
 * Defines a heading reference to be injected into the document head.
 */
export type HeadingRef = {
  name: string;
  props: Record<string, string>;
  Renderer: Component;
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
  let store = getScope<HeadingMap>(HEADING_SET_CLOSURE);

  if (!store) {
    store = new Map();
    setScope(HEADING_SET_CLOSURE, store);
  }

  return store as HeadingMap;
}

/**
 * Attaches a heading element to the document head or collects it for SSR.
 *
 * @param name The tag name (e.g., 'title', 'meta').
 * @param props The attributes to apply to the tag.
 * @param Renderer The Solid component used to render the tag during SSR.
 */
export function attachHeading(name: string, props: Record<string, string>, Renderer: Component) {
  if (!isBrowser()) {
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
    document.title = props.children;
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

  onCleanup(() => {
    element.remove();
  });
}

/**
 * Sets the document title.
 */
export function Title(props: JSX.IntrinsicElements['title']) {
  const Renderer = () => <title {...props} />;
  attachHeading('title', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a meta tag in the document head.
 */
export function Meta(props: JSX.IntrinsicElements['meta']) {
  const Renderer = () => <meta {...props} />;
  attachHeading('meta', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a link tag in the document head.
 */
export function HeadLink(props: JSX.IntrinsicElements['link']) {
  const Renderer = () => <link {...props} />;
  attachHeading('link', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}

/**
 * Sets a style tag in the document head.
 */
export function Style(props: JSX.IntrinsicElements['style']) {
  const Renderer = () => <style {...props} />;
  attachHeading('style', props as Record<string, string>, Renderer);
  return null as unknown as JSX.Element;
}
