import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

type NetworkInfo = EventTarget & {
  rtt: number;
  type: string;
  downlink: number;
  effectiveType: string;
};

type NavWithConnection = Navigator & {
  connection?: NetworkInfo;
  mozConnection?: NetworkInfo;
  webkitConnection?: NetworkInfo;
};

const NETWORK_INIT = {
  rtt: 0,
  type: 'unknown',
  downlink: 0,
  isOnline: true,
  effectiveType: 'unknown',
};

/**
 * Interface representing the reactive network connection state.
 */
export type LiveNetwork = typeof NETWORK_INIT;

const NETWORK_STATE = mutable(NETWORK_INIT) as LiveNetwork;

/**
 * Reactive network connection state.
 * Used to detect online status, connection type, and speed to adapt data fetching or offline behaviors.
 */
export const LIVE_NETWORK = {} as LiveNetwork;

let NETWORK_WATCHED = false;

for (const key of Object.keys(NETWORK_INIT)) {
  Object.defineProperty(LIVE_NETWORK, key, {
    get() {
      watchNetwork();
      return NETWORK_STATE[key as keyof LiveNetwork];
    },
  });
}

function watchNetwork() {
  if (NETWORK_WATCHED || !isBrowser()) return;
  NETWORK_WATCHED = true;

  onInteractive(() => {
    const nav = navigator as NavWithConnection;
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;

    const updateState = () => {
      anchor.assign(NETWORK_STATE, {
        rtt: conn?.rtt || 0,
        type: conn?.type || 'unknown',
        downlink: conn?.downlink || 0,
        isOnline: navigator.onLine,
        effectiveType: conn?.effectiveType || 'unknown',
      });
    };

    updateState();

    window.addEventListener('online', updateState);
    window.addEventListener('offline', updateState);

    if (conn) {
      conn.addEventListener('change', updateState);
    }

    return () => {
      window.removeEventListener('online', updateState);
      window.removeEventListener('offline', updateState);
      if (conn) {
        conn.removeEventListener('change', updateState);
      }
    };
  });
}
