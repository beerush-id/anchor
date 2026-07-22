import { mutable } from '../reactive/ref.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser, type ValueGetterType, valueGetter } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const MEDIA_SELECTORS = {
  isDark: '(prefers-color-scheme: dark)',
  isLight: '(prefers-color-scheme: light)',
  isMobile: '(max-width: 639px)',
  isTablet: '(min-width: 640px) and (max-width: 1023px)',
  isDesktop: '(min-width: 1024px)',
  isLandscape: '(orientation: landscape)',
  isPortrait: '(orientation: portrait)',
  isTouch: '(pointer: coarse)',
  isHover: '(hover: hover)',
  isReducedMotion: '(prefers-reduced-motion: reduce)',
  isHighContrast: '(prefers-contrast: more)',
  isRetina: '(resolution >= 2dppx)',
};

/**
 * Interface representing the reactive state of common media queries.
 */
export type LiveMediaQueries = {
  [K in keyof typeof MEDIA_SELECTORS]: boolean;
};

const MEDIA_QUERY_INIT = {} as Record<string, boolean>;
const MEDIA_QUERY_STATE = mutable(MEDIA_QUERY_INIT);
const WATCHED_MEDIA_QUERIES = new Map<string, ValueGetterType<boolean> | boolean>();

/**
 * Reactive common media query states.
 * Used to adapt UI based on device characteristics like screen size, color scheme, or orientation.
 */
export const LIVE_MEDIA = {} as LiveMediaQueries;

/**
 * Creates a reactive value getter for a specific CSS media query.
 * @param query - The CSS media query string to match.
 * @param disposable - Whether the listener should be automatically cleaned up on component unmount.
 * @returns {ValueGetterType<boolean>} A reactive value getter returning true if the query matches.
 */
export function mediaQuery(query: string, disposable = true): ValueGetterType<boolean> {
  const state = mutable(false);

  if (isBrowser()) {
    onInteractive(() => {
      const media = window.matchMedia(query);
      state.value = media.matches;

      const handler = (e: MediaQueryListEvent) => (state.value = e.matches);
      media.addEventListener('change', handler);

      if (disposable) {
        onCleanup(() => {
          media.removeEventListener('change', handler);
        });
      }
    });
  }

  return valueGetter(state);
}

for (const [key, query] of Object.entries(MEDIA_SELECTORS)) {
  const qQuery = `@internal-${query}`;

  MEDIA_QUERY_INIT[key] = false;

  Object.defineProperty(LIVE_MEDIA, key, {
    get() {
      if (!WATCHED_MEDIA_QUERIES.has(qQuery) && isBrowser()) {
        watchMediaQuery(key, query, qQuery);
      }

      return MEDIA_QUERY_STATE[key];
    },
  });
}

function watchMediaQuery(key: string, query: string, qQuery: string) {
  WATCHED_MEDIA_QUERIES.set(qQuery, true);

  onInteractive(() => {
    const media = window.matchMedia(query);
    MEDIA_QUERY_STATE[key] = media.matches;

    const listener = (e: MediaQueryListEvent) => {
      MEDIA_QUERY_STATE[key] = e.matches;
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  });
}
