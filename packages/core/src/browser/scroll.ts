import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const SCROLL_INIT = {
  x: 0,
  y: 0,
  direction: 'none' as 'up' | 'down' | 'left' | 'right' | 'none',
  isScrolling: false,
};

export type LiveScroll = typeof SCROLL_INIT;

const SCROLL_STATE = mutable(SCROLL_INIT) as LiveScroll;
export const LIVE_SCROLL = {} as LiveScroll;

let SCROLL_WATCHED = false;

for (const key of Object.keys(SCROLL_INIT)) {
  Object.defineProperty(LIVE_SCROLL, key, {
    get() {
      if (!SCROLL_WATCHED && isBrowser()) {
        watchScroll();
      }
      return SCROLL_STATE[key as keyof LiveScroll];
    },
  });
}

function watchScroll() {
  SCROLL_WATCHED = true;

  onInteractive(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const scrollHandler = () => {
      const currentX = window.scrollX;
      const currentY = window.scrollY;

      let direction = SCROLL_STATE.direction;
      if (currentY > SCROLL_STATE.y) direction = 'down';
      else if (currentY < SCROLL_STATE.y) direction = 'up';
      else if (currentX > SCROLL_STATE.x) direction = 'right';
      else if (currentX < SCROLL_STATE.x) direction = 'left';

      anchor.assign(SCROLL_STATE, {
        x: currentX,
        y: currentY,
        direction,
        isScrolling: true,
      });

      clearTimeout(timeout);
      timeout = setTimeout(() => {
        SCROLL_STATE.isScrolling = false;
      }, 150);
    };

    // Initialize values immediately when watched.
    SCROLL_STATE.x = window.scrollX;
    SCROLL_STATE.y = window.scrollY;

    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      window.removeEventListener('scroll', scrollHandler);
      clearTimeout(timeout);
    };
  });
}
