import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { onInteractive } from './interactive.js';

const CURSOR_INIT = {
  x: 0,
  y: 0,
  pageX: 0,
  pageY: 0,
  screenX: 0,
  screenY: 0,
  modifiers: mutable(new Set<MouseModifier>()),
};
export type LiveCursor = typeof CURSOR_INIT & {
  button?: MouseButton;
  target?: HTMLElement;
};
export type MouseButton = (typeof MOUSE_BUTTON)[keyof typeof MOUSE_BUTTON];
export type MouseModifier = (typeof MOUSE_MODIFIERS)[keyof typeof MOUSE_MODIFIERS];

export const LIVE_CURSOR = {} as LiveCursor;
export const MOUSE_BUTTON = {
  left: 'left',
  right: 'right',
  middle: 'middle',
} as const;
export const MOUSE_MODIFIERS = {
  alt: 'alt',
  ctrl: 'ctrl',
  meta: 'meta',
  shift: 'shift',
} as const;

const BUTTON_MAP = ['left', 'middle', 'right'];
const CURSOR_STATE = mutable(CURSOR_INIT, { recursive: false }) as LiveCursor;

let CURSOR_WATCHED = false;

for (const key of ['button', 'target', ...Object.keys(CURSOR_INIT)]) {
  Object.defineProperty(LIVE_CURSOR, key, {
    get() {
      if (!CURSOR_WATCHED && isBrowser()) {
        watchCursors();
      }
      return CURSOR_STATE[key as keyof LiveCursor];
    },
  });
}

function watchCursors() {
  CURSOR_WATCHED = true;

  onInteractive(() => {
    const mouseMoveHandler = (e: MouseEvent) => {
      anchor.assign(CURSOR_STATE, {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        screenX: e.screenX,
        screenY: e.screenY,
      });
    };

    const mouseDownHandler = (e: MouseEvent) => {
      anchor.assign(CURSOR_STATE, {
        button: BUTTON_MAP[e.button] as MouseButton,
        target: e.target as HTMLElement,
      });

      if (e.altKey) CURSOR_STATE.modifiers.add(MOUSE_MODIFIERS.alt);
      if (e.ctrlKey) CURSOR_STATE.modifiers.add(MOUSE_MODIFIERS.ctrl);
      if (e.metaKey) CURSOR_STATE.modifiers.add(MOUSE_MODIFIERS.meta);
      if (e.shiftKey) CURSOR_STATE.modifiers.add(MOUSE_MODIFIERS.shift);
    };
    const mouseUpHandler = () => {
      anchor.assign(CURSOR_STATE, {
        button: undefined,
        target: undefined,
      });
      CURSOR_STATE.modifiers.clear();
    };

    document.addEventListener('mouseup', mouseUpHandler);
    document.addEventListener('mousedown', mouseDownHandler);
    document.addEventListener('mousemove', mouseMoveHandler);

    return () => {
      document.removeEventListener('mouseup', mouseUpHandler);
      document.removeEventListener('mousedown', mouseDownHandler);
      document.removeEventListener('mousemove', mouseMoveHandler);
    };
  });
}
