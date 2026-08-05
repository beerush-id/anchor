import { $symbol, getScope, isBrowser, onCleanup, setScope } from '@anchorlib/core';
import type { FC, HTMLAttributes } from 'react';
import { createPortal } from 'react-dom';

const HEADING_SET_CLOSURE = $symbol('head-map-closure');

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
  let store = getScope<HeadingMap>(HEADING_SET_CLOSURE);

  if (!store) {
    store = new Map();
    setScope(HEADING_SET_CLOSURE, store);
  }

  return store as HeadingMap;
}

/**
 * Collects a heading element for SSR.
 */
function ssrHeading(name: string, props: Record<string, string>, Renderer: FC) {
  headings().set(name, { name, props, Renderer });
  onCleanup(() => headings().delete(name));
}

/**
 * Sets the document title.
 */
export const Title: FC<HTMLAttributes<HTMLTimeElement> & { children: string }> = ({ children }) => {
  const Renderer = () => <title>{children}</title>;

  if (!isBrowser()) {
    ssrHeading('title', { children }, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a meta tag in the document head.
 */
export const Meta: FC<HTMLAttributes<HTMLMetaElement> & { name?: string; property?: string; content?: string }> = (
  props
) => {
  const Renderer = () => <meta {...props} />;

  if (!isBrowser()) {
    const key = `meta:${props.name || props.property}`;
    ssrHeading(key, props as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a link tag in the document head.
 */
export const HeadLink: FC<HTMLAttributes<HTMLLinkElement> & { href?: string; rel?: string; as?: string }> = (props) => {
  const Renderer = () => <link {...props} />;

  if (!isBrowser()) {
    const key = `link:${props.href}`;
    ssrHeading(key, props as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};

/**
 * Sets a style tag in the document head.
 */
export const Style: FC<HTMLAttributes<HTMLStyleElement> & { children?: string }> = (props) => {
  const Renderer = () => <style {...props} />;

  if (!isBrowser()) {
    const key = `style:${performance.now()}`;
    ssrHeading(key, props as Record<string, string>, Renderer);
    return null;
  }

  return createPortal(<Renderer />, document.head);
};
