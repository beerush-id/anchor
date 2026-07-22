import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const LOCATION_INIT = {
  path: '',
  hash: '',
  host: '',
  search: '',
};

/**
 * Interface representing the reactive window location state.
 */
export type LiveLocation = typeof LOCATION_INIT;

const LOCATION_STATE = mutable(LOCATION_INIT, { recursive: false }) as LiveLocation;

/**
 * Reactive browser location state.
 * Used to track and react to URL changes (path, hash, search) without polling the window location.
 */
export const LIVE_LOCATION = {} as LiveLocation;

let LOCATION_WATCHED = false;

for (const key of Object.keys(LOCATION_INIT)) {
  Object.defineProperty(LIVE_LOCATION, key, {
    get() {
      watchLocation();
      return LOCATION_STATE[key as keyof LiveLocation];
    },
  });
}

function watchLocation() {
  if (LOCATION_WATCHED || !isBrowser()) return;
  LOCATION_WATCHED = true;

  onInteractive(() => {
    const updateLocation = () => {
      anchor.assign(LOCATION_STATE, {
        path: window.location.pathname,
        hash: window.location.hash,
        host: window.location.host,
        search: window.location.search,
      });
    };

    updateLocation();

    window.addEventListener('popstate', updateLocation);
    window.addEventListener('hashchange', updateLocation);

    return () => {
      window.removeEventListener('popstate', updateLocation);
      window.removeEventListener('hashchange', updateLocation);
    };
  });
}
