import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser } from '../shared/env.js';
import type { AnyType } from '../types.js';
import { onInteractive } from './interactive.js';

/**
 * Map of mouse button names to their corresponding event identifiers.
 */
export const MOUSE_BUTTON = {
  left: 'left',
  right: 'right',
  middle: 'middle',
} as const;

/**
 * Map of mouse modifier keys to their corresponding event identifiers.
 */
export const MOUSE_MODIFIERS = {
  alt: 'alt',
  ctrl: 'ctrl',
  meta: 'meta',
  shift: 'shift',
} as const;

/**
 * Type representing a mouse button.
 */
export type MouseButton = (typeof MOUSE_BUTTON)[keyof typeof MOUSE_BUTTON];

/**
 * Type representing a mouse modifier key.
 */
export type MouseModifier = (typeof MOUSE_MODIFIERS)[keyof typeof MOUSE_MODIFIERS];

const BUTTON_MAP = ['left', 'middle', 'right'];

/**
 * Interface representing the reactive cursor state.
 */
export interface LiveCursor<E extends Element | Document | Window = Element> {
  x: number;
  y: number;
  type: 'mouse' | 'touch' | 'pen' | '';
  pageX: number;
  pageY: number;
  button?: MouseButton;
  target?: Element;
  screenX: number;
  screenY: number;
  modifiers: Set<MouseModifier>;
  current: E | undefined;
}

const CURSOR_STATE = cursorRef<Document>();
/**
 * Reactive global cursor state.
 * Used to track the current mouse or touch position and active interactions across the document.
 */
export const LIVE_CURSOR = {} as LiveCursor<Document>;

let CURSOR_WATCHED = false;

for (const key of [
  'x',
  'y',
  'type',
  'pageX',
  'pageY',
  'button',
  'target',
  'screenX',
  'screenY',
  'current',
  'modifiers',
] as const) {
  Object.defineProperty(LIVE_CURSOR, key, {
    get() {
      watchCursors();
      return CURSOR_STATE[key as keyof LiveCursor];
    },
  });
}

/**
 * Creates a reactive cursor state tracker for a specific element or the document.
 * @param element - The element to track cursor events on.
 * @returns {LiveCursor<E>} A reactive cursor state object.
 */
export function cursorRef<E extends Element | Document | Window = Element>(element?: E): LiveCursor<E> {
  let currentTarget: E | undefined;
  let cleanup: (() => void) | undefined;
  const mods = mutable(new Set<MouseModifier>());

  const state = mutable(
    {
      x: 0,
      y: 0,
      type: '' as 'mouse' | 'touch' | 'pen' | '',
      pageX: 0,
      pageY: 0,
      button: undefined,
      target: undefined,
      screenX: 0,
      screenY: 0,
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
          cleanup = attachCursorListener(state, el, mods);
        } else {
          mods.clear();
          anchor.assign(state, {
            x: 0,
            y: 0,
            type: '',
            pageX: 0,
            pageY: 0,
            button: undefined,
            target: undefined,
            screenX: 0,
            screenY: 0,
          });
        }
      },
      modifiers: mods,
    },
    { recursive: false }
  ) as LiveCursor<E>;

  if (element) {
    state.current = element;
  }

  if (isBrowser()) {
    onCleanup(() => cleanup?.());
  }

  return state;
}

function watchCursors() {
  if (CURSOR_WATCHED || !isBrowser()) return;
  CURSOR_WATCHED = true;

  onInteractive(() => {
    CURSOR_STATE.current = document;
    return () => {
      CURSOR_STATE.current = undefined;
    };
  });
}

function attachCursorListener(
  state: LiveCursor<AnyType>,
  target: Window | Document | Element,
  modifiers: Set<MouseModifier>
) {
  const pointerMoveHandler = (e: PointerEvent) => {
    anchor.assign(state, {
      x: e.clientX,
      y: e.clientY,
      type: e.pointerType as 'mouse' | 'touch' | 'pen' | '',
      pageX: e.pageX,
      pageY: e.pageY,
      screenX: e.screenX,
      screenY: e.screenY,
    });
  };

  const pointerDownHandler = (e: PointerEvent) => {
    anchor.assign(state, {
      button: BUTTON_MAP[e.button] as MouseButton,
      target: (e.target === document ? undefined : e.target) as Element | undefined,
      type: e.pointerType as 'mouse' | 'touch' | 'pen' | '',
    });

    if (e.altKey) modifiers.add(MOUSE_MODIFIERS.alt);
    if (e.ctrlKey) modifiers.add(MOUSE_MODIFIERS.ctrl);
    if (e.metaKey) modifiers.add(MOUSE_MODIFIERS.meta);
    if (e.shiftKey) modifiers.add(MOUSE_MODIFIERS.shift);
  };

  const pointerUpHandler = () => {
    anchor.assign(state, {
      button: undefined,
      target: undefined,
    });
    modifiers.clear();
  };

  const blurHandler = () => {
    anchor.assign(state, {
      button: undefined,
      target: undefined,
    });
    modifiers.clear();
  };

  target.addEventListener('pointerup', pointerUpHandler as EventListener);
  target.addEventListener('pointerdown', pointerDownHandler as EventListener);
  target.addEventListener('pointermove', pointerMoveHandler as EventListener);
  target.addEventListener('contextmenu', pointerUpHandler as EventListener);

  if (target === document) {
    window.addEventListener('blur', blurHandler);
  }

  return () => {
    target.removeEventListener('pointerup', pointerUpHandler as EventListener);
    target.removeEventListener('pointerdown', pointerDownHandler as EventListener);
    target.removeEventListener('pointermove', pointerMoveHandler as EventListener);
    target.removeEventListener('contextmenu', pointerUpHandler as EventListener);
    if (target === document) {
      window.removeEventListener('blur', blurHandler);
    }
  };
}
