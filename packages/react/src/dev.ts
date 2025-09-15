import { microbatch } from '@anchorlib/core';
import type { RefObject } from 'react';

export let DEV_MODE = true;
export let STRICT_MODE = true;
export let DEBUG_RENDERER = false;
export let DEBUG_RENDERER_DURATION = 300;

export function setDevMode(enabled: boolean, strict?: boolean) {
  DEV_MODE = enabled;
  STRICT_MODE = strict ?? STRICT_MODE;
}

export function isDevMode() {
  return DEV_MODE;
}

export function isStrictMode() {
  return STRICT_MODE;
}

export function setDebugRenderer(enabled: boolean, duration?: number) {
  DEBUG_RENDERER = enabled;
  DEBUG_RENDERER_DURATION = duration ?? DEBUG_RENDERER_DURATION;
}

export function isDebugRenderer() {
  return DEBUG_RENDERER;
}

const [schedule] = microbatch(0);
export function debugRender<T extends HTMLElement>(element: RefObject<T | null>) {
  if (!DEBUG_RENDERER) return;

  if (!element?.current) {
    return schedule(() => {
      if (!(element?.current instanceof HTMLElement)) return;
      flashNode(element?.current, 'rgba(252,75,75,0.75)');
    });
  }

  if (element?.current instanceof HTMLElement) {
    schedule(() => flashNode(element?.current));
  }
}

function flashNode(element: HTMLElement | null = null, color = 'rgba(0,140,255,0.75)') {
  if (!element) return;

  element.style.boxShadow = `0 0 0 1px ${color}`;

  setTimeout(() => {
    element.style.boxShadow = '';
  }, DEBUG_RENDERER_DURATION);
}
