import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser } from '../shared/env.js';
import type { AnyType } from '../types.js';
import { microtask } from '../utils/task.js';
import { onInteractive } from './interactive.js';

/**
 * Interface representing the reactive scroll state.
 */
export interface LiveScroll<E extends Element | Document | Window = Element> {
  x: number;
  y: number;
  direction: 'up' | 'down' | 'left' | 'right' | 'none';
  isScrolling: boolean;
  current: E | undefined;
}

const SCROLL_STATE = scrollRef<Window>();
/**
 * Reactive window scroll state.
 * Used to track global scroll position and direction for animations or sticky UI elements.
 */
export const LIVE_SCROLL = {} as LiveScroll<Window>;

let SCROLL_WATCHED = false;

for (const key of ['x', 'y', 'direction', 'isScrolling', 'current'] as const) {
  Object.defineProperty(LIVE_SCROLL, key, {
    get() {
      watchScroll();
      return SCROLL_STATE[key as keyof LiveScroll];
    },
  });
}

/**
 * Creates a reactive scroll state tracker for a specific element or the window.
 * @param element - The element to track scroll events on.
 * @returns {LiveScroll<E>} A reactive scroll state object.
 */
export function scrollRef<E extends Element | Document | Window = Element>(element?: E): LiveScroll<E> {
  let currentTarget: E | undefined;
  let cleanup: (() => void) | undefined;

  const state = mutable({
    x: 0,
    y: 0,
    get current() {
      return currentTarget;
    },
    set current(el: E | undefined) {
      if (cleanup) {
        cleanup();
        cleanup = undefined;
      }

      currentTarget = el;

      if (el) {
        cleanup = attachScrollListener(state, el);
      } else {
        anchor.assign(state, {
          x: 0,
          y: 0,
          direction: 'none',
          isScrolling: false,
        });
      }
    },
    direction: 'none' as 'up' | 'down' | 'left' | 'right' | 'none',
    isScrolling: false,
  }) as LiveScroll<E>;

  if (element) {
    state.current = element;
  }

  if (isBrowser()) {
    onCleanup(() => cleanup?.());
  }

  return state;
}

function watchScroll() {
  if (SCROLL_WATCHED || !isBrowser()) return;
  SCROLL_WATCHED = true;

  onInteractive(() => {
    SCROLL_STATE.current = window;
    return () => {
      SCROLL_STATE.current = undefined;
    };
  });
}

function attachScrollListener(state: LiveScroll<AnyType>, target: Window | Document | Element) {
  const [schedule, cancel] = microtask(150);

  const scrollHandler = () => {
    const isWin = target === window;
    const currentX = isWin ? (target as Window).scrollX : (target as Element).scrollLeft;
    const currentY = isWin ? (target as Window).scrollY : (target as Element).scrollTop;

    const raw = anchor.get(state, true) as LiveScroll<AnyType>;
    const { direction: currentDirection, x, y } = raw;
    let direction = currentDirection;
    if (currentY > y) direction = 'down';
    else if (currentY < y) direction = 'up';
    else if (currentX > x) direction = 'right';
    else if (currentX < x) direction = 'left';

    anchor.assign(state, {
      x: currentX,
      y: currentY,
      direction,
      isScrolling: true,
    });

    schedule(() => {
      state.isScrolling = false;
    });
  };

  const isWin = target === window;
  state.x = isWin ? (target as Window).scrollX : (target as Element).scrollLeft;
  state.y = isWin ? (target as Window).scrollY : (target as Element).scrollTop;

  target.addEventListener('scroll', scrollHandler, { passive: true });

  return () => {
    target.removeEventListener('scroll', scrollHandler);
    cancel();
  };
}
