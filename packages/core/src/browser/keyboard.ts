import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser } from '../shared/env.js';
import type { AnyType } from '../types.js';
import { MOUSE_MODIFIERS, type MouseModifier } from './cursor.js';
import { onInteractive } from './interactive.js';

/**
 * Interface representing the reactive keyboard state.
 */
export interface LiveKeyboard<E extends Element | Document | Window = Element> {
  /**
   * Checks if a specific key combination is currently pressed.
   * @param keys - The keys to check (modifiers followed by the main key).
   * @returns True if the combination is active, false otherwise.
   */
  is(...keys: string[]): boolean;
  key: string;
  target?: Element;
  modifiers: Set<MouseModifier>;
  current: E | undefined;
}

const KEYBOARD_STATE = keyboardRef<Document>();
/**
 * Reactive global keyboard state.
 * Used to detect active key presses, combinations, and modifiers across the document.
 */
export const LIVE_KEYBOARD = {} as LiveKeyboard<Document>;

let KEYBOARD_WATCHED = false;

for (const key of ['is', 'key', 'target', 'current', 'modifiers'] as const) {
  Object.defineProperty(LIVE_KEYBOARD, key, {
    get() {
      watchKeyboard();
      return KEYBOARD_STATE[key as keyof LiveKeyboard];
    },
  });
}

/**
 * Creates a reactive keyboard state tracker for a specific element or the document.
 * @param element - The element to track keyboard events on.
 * @returns {LiveKeyboard<E>} A reactive keyboard state object.
 */
export function keyboardRef<E extends Element | Document | Window = Element>(element?: E): LiveKeyboard<E> {
  let currentTarget: E | undefined;
  let cleanup: (() => void) | undefined;
  const mods = mutable(new Set<MouseModifier>(), { recursive: false });

  const state = mutable(
    {
      is(...keys: string[]) {
        if (!keys.length) return false;
        const main = keys.pop()?.toLowerCase();

        if (this.key.toLowerCase() !== main) {
          return false;
        }

        for (const mod of keys) {
          if (!this.modifiers.has(mod as MouseModifier)) return false;
        }

        return keys.length === this.modifiers.size;
      },
      key: '',
      target: undefined,
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
          cleanup = attachKeyboardListener(state, el, mods);
        } else {
          mods.clear();
          anchor.assign(state, {
            key: '',
            target: undefined,
          });
        }
      },
      modifiers: mods,
    },
    { recursive: false }
  ) as LiveKeyboard<E>;

  if (element) {
    state.current = element;
  }

  if (isBrowser()) {
    onCleanup(() => cleanup?.());
  }

  return state;
}

function watchKeyboard() {
  if (KEYBOARD_WATCHED || !isBrowser()) return;
  KEYBOARD_WATCHED = true;

  onInteractive(() => {
    KEYBOARD_STATE.current = document;
    return () => {
      KEYBOARD_STATE.current = undefined;
    };
  });
}

function attachKeyboardListener(
  state: LiveKeyboard<AnyType>,
  target: Window | Document | Element,
  modifiers: Set<MouseModifier>
) {
  const keydownHandler = (e: KeyboardEvent) => {
    anchor.assign(state, {
      key: e.key,
      target: (e.target === document ? undefined : e.target) as Element | undefined,
    });

    if (e.altKey) modifiers.add(MOUSE_MODIFIERS.alt);
    if (e.ctrlKey) modifiers.add(MOUSE_MODIFIERS.ctrl);
    if (e.metaKey) modifiers.add(MOUSE_MODIFIERS.meta);
    if (e.shiftKey) modifiers.add(MOUSE_MODIFIERS.shift);
  };

  const keyupHandler = (e: KeyboardEvent) => {
    const raw = anchor.get(state, true) as LiveKeyboard<AnyType>;
    if (raw.key === e.key) {
      anchor.assign(state, {
        key: '',
        target: undefined,
      });
    }

    if (!e.altKey) modifiers.delete(MOUSE_MODIFIERS.alt);
    if (!e.ctrlKey) modifiers.delete(MOUSE_MODIFIERS.ctrl);
    if (!e.metaKey) modifiers.delete(MOUSE_MODIFIERS.meta);
    if (!e.shiftKey) modifiers.delete(MOUSE_MODIFIERS.shift);
  };

  const blurHandler = () => {
    anchor.assign(state, {
      key: '',
      target: undefined,
    });
    modifiers.clear();
  };

  target.addEventListener('keydown', keydownHandler as EventListener);
  target.addEventListener('keyup', keyupHandler as EventListener);

  if (target === document) {
    window.addEventListener('blur', blurHandler);
  }

  return () => {
    target.removeEventListener('keydown', keydownHandler as EventListener);
    target.removeEventListener('keyup', keyupHandler as EventListener);
    if (target === document) {
      window.removeEventListener('blur', blurHandler);
    }
  };
}
