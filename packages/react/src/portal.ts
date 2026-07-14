import { isBrowser } from '@anchorlib/core';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders the provided content into a different part of the DOM (portal) if running in a browser environment.
 * If running on the server, it simply returns the content directly without portaling.
 *
 * @param content - The React node(s) to render.
 * @param target - An optional DOM Element or a CSS selector string indicating where to mount the portal. Defaults to `document.body`.
 * @returns The portaled content if in a browser environment, otherwise the original content.
 */
export function teleport(content: ReactNode, target?: string | Element) {
  if (!isBrowser()) return content;
  const container = typeof target === 'string' ? document.querySelector(target) : target;
  return createPortal(content, container ?? document.body);
}
