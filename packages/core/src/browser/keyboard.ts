import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { MOUSE_MODIFIERS, type MouseModifier } from './cursor.js';
import { onInteractive } from './interactive.js';

const MODIFIERS = mutable(new Set<MouseModifier>(), { recursive: false });

const KEYBOARD_INIT = {
  key: '',
  modifiers: MODIFIERS,
  target: undefined as HTMLElement | undefined,
  is: (...keys: string[]) => {
    if (!keys.length) return false;
    const main = keys.pop()?.toLowerCase();

    if (KEYBOARD_STATE.key.toLowerCase() !== main) {
      return false;
    }

    for (const mod of keys) {
      if (!MODIFIERS.has(mod as MouseModifier)) return false;
    }

    return keys.length === MODIFIERS.size;
  },
};

export type LiveKeyboard = typeof KEYBOARD_INIT;

const KEYBOARD_STATE = mutable(KEYBOARD_INIT, { recursive: false }) as LiveKeyboard;
export const LIVE_KEYBOARD = {} as LiveKeyboard;

let KEYBOARD_WATCHED = false;

for (const key of Object.keys(KEYBOARD_INIT)) {
  Object.defineProperty(LIVE_KEYBOARD, key, {
    get() {
      if (!KEYBOARD_WATCHED && isBrowser()) {
        watchKeyboard();
      }
      return KEYBOARD_STATE[key as keyof LiveKeyboard];
    },
  });
}

function watchKeyboard() {
  KEYBOARD_WATCHED = true;

  onInteractive(() => {
    const keydownHandler = (e: KeyboardEvent) => {
      anchor.assign(KEYBOARD_STATE, {
        key: e.key,
        target: e.target as HTMLElement,
      });

      if (e.altKey) MODIFIERS.add(MOUSE_MODIFIERS.alt);
      if (e.ctrlKey) MODIFIERS.add(MOUSE_MODIFIERS.ctrl);
      if (e.metaKey) MODIFIERS.add(MOUSE_MODIFIERS.meta);
      if (e.shiftKey) MODIFIERS.add(MOUSE_MODIFIERS.shift);
    };

    const keyupHandler = (e: KeyboardEvent) => {
      if (KEYBOARD_STATE.key === e.key) {
        anchor.assign(KEYBOARD_STATE, {
          key: '',
          target: undefined,
        });
      }

      if (!e.altKey) MODIFIERS.delete(MOUSE_MODIFIERS.alt);
      if (!e.ctrlKey) MODIFIERS.delete(MOUSE_MODIFIERS.ctrl);
      if (!e.metaKey) MODIFIERS.delete(MOUSE_MODIFIERS.meta);
      if (!e.shiftKey) MODIFIERS.delete(MOUSE_MODIFIERS.shift);
    };

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    return () => {
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
    };
  });
}
