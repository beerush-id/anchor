import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const GEO_INIT = {
  lat: 0,
  lng: 0,
  error: '',
  speed: 0,
  accuracy: 0,
  isTracking: false,
};

/**
 * Interface representing the reactive geolocation state.
 */
export type LiveGeo = typeof GEO_INIT;

const GEO_STATE = mutable(GEO_INIT, { recursive: false }) as LiveGeo;

/**
 * Reactive geolocation state.
 * Used to track the user's physical location, speed, and accuracy via the browser's Geolocation API.
 */
export const LIVE_GEO = {} as LiveGeo;

let GEO_WATCHED = false;

for (const key of Object.keys(GEO_INIT)) {
  Object.defineProperty(LIVE_GEO, key, {
    get() {
      watchGeo();
      return GEO_STATE[key as keyof LiveGeo];
    },
  });
}

function watchGeo() {
  if (GEO_WATCHED || !isBrowser()) return;
  GEO_WATCHED = true;

  onInteractive(() => {
    if (!navigator.geolocation) {
      anchor.assign(GEO_STATE, { error: 'Geolocation is not supported by this browser.' });
      return;
    }

    const successHandler = (position: GeolocationPosition) => {
      anchor.assign(GEO_STATE, {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        error: '',
        speed: position.coords.speed || 0,
        accuracy: position.coords.accuracy,
        isTracking: true,
      });
    };

    const errorHandler = (error: GeolocationPositionError) => {
      anchor.assign(GEO_STATE, {
        error: error.message,
        isTracking: false,
      });
    };

    const watchId = navigator.geolocation.watchPosition(successHandler, errorHandler, {
      enableHighAccuracy: true,
    });

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  });
}
