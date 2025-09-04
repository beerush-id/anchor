export let DEV_MODE = true;
export let STRICT_MODE = true;
export let DEBUG_RENDERER = false;

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

export function setDebugRenderer(enabled: boolean) {
  DEBUG_RENDERER = enabled;
}

export function isDebugRenderer() {
  return DEBUG_RENDERER;
}

export function debugRender<T extends HTMLElement>(element?: T | null) {
  if (!DEBUG_RENDERER || !element) return;

  element.style.boxShadow = '0 0 0 3px rgba(255, 50, 50, 0.75)';
  setTimeout(() => {
    element.style.boxShadow = '';
  }, 100);
}
