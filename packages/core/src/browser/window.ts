import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const WINDOW_INIT = {
  width: 0,
  height: 0,
  isIdle: false,
  isVisible: true,
  isFocused: true,
  lastActive: 0,
};

/**
 * Interface representing the reactive window and document state.
 */
export type LiveWindow = typeof WINDOW_INIT & {
  /**
   * Sets the duration before the window is considered idle.
   * @param duration - The idle timeout duration in minutes.
   */
  setIdleTimeout(duration: number): void;
};

let IDLE_TIMEOUT = 5; // in minutes

const WINDOW_STATE = mutable(WINDOW_INIT, { recursive: false }) as LiveWindow;
/**
 * Reactive window and document state.
 * Used to track window dimensions, visibility, focus, and user idle status.
 */
export const LIVE_WINDOW = {} as LiveWindow;

let WINDOW_WATCHED = false;

for (const key of Object.keys(WINDOW_INIT)) {
  Object.defineProperty(LIVE_WINDOW, key, {
    get() {
      watchWindow();
      return WINDOW_STATE[key as keyof LiveWindow];
    },
  });
}

LIVE_WINDOW.setIdleTimeout = (duration) => {
  IDLE_TIMEOUT = duration;
};

function watchWindow() {
  if (WINDOW_WATCHED || !isBrowser()) return;
  WINDOW_WATCHED = true;

  onInteractive(() => {
    const resizeHandler = () => {
      anchor.assign(WINDOW_STATE, { width: window.innerWidth, height: window.innerHeight });
    };

    anchor.assign(WINDOW_STATE, {
      width: window.innerWidth,
      height: window.innerHeight,
      isVisible: !document.hidden,
      isFocused: document.hasFocus(),
    });

    const focusHandler = () => {
      anchor.assign(WINDOW_STATE, { isFocused: true });
      activityHandler();
    };
    const blurHandler = () => anchor.assign(WINDOW_STATE, { isFocused: false });
    const visibilityHandler = () => {
      anchor.assign(WINDOW_STATE, { isVisible: !document.hidden });
      if (!document.hidden) activityHandler();
    };

    let idleTimeout: ReturnType<typeof setTimeout>;

    const activityHandler = () => {
      const now = Date.now();
      const raw = anchor.get(WINDOW_STATE, true) as typeof WINDOW_STATE;

      if (now - raw.lastActive > 1000 || raw.isIdle) {
        anchor.assign(WINDOW_STATE, { isIdle: false, lastActive: now });
      }

      clearTimeout(idleTimeout);
      idleTimeout = setTimeout(() => {
        anchor.assign(WINDOW_STATE, { isIdle: true });
      }, 60000 * IDLE_TIMEOUT);
    };

    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    for (const ev of activityEvents) {
      document.addEventListener(ev, activityHandler, { passive: true });
    }

    window.addEventListener('focus', focusHandler);
    window.addEventListener('blur', blurHandler);
    window.addEventListener('resize', resizeHandler);
    document.addEventListener('visibilitychange', visibilityHandler);

    return () => {
      window.removeEventListener('resize', resizeHandler);
      window.removeEventListener('focus', focusHandler);
      window.removeEventListener('blur', blurHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);

      for (const ev of activityEvents) {
        document.removeEventListener(ev, activityHandler);
      }
      clearTimeout(idleTimeout);
    };
  });
}
