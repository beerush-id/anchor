import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { onCleanup } from '../scope/lifecycle.js';
import { isBrowser } from '../shared/env.js';
import type { AnyType, StateUnsubscribe } from '../types.js';
import { onInteractive } from './interactive.js';

const CLIPBOARD_INIT = {
  text: undefined as string | undefined,
  data: undefined as AnyType,
  files: [] as File[],
  isSupported: false,
};
const CLIPBOARD_TAKERS = {
  text: new Set(),
  data: new Set(),
  files: new Set(),
};
/**
 * Type for a function that handles clipboard slot data.
 */
export type LiveClipboardTaker<T, K extends LiveClipboardSlot> = (value: LiveClipboard<T>[K]) => void;

/**
 * Valid slots for clipboard data.
 */
export type LiveClipboardSlot = 'data' | 'text' | 'files';

/**
 * Interface representing the reactive clipboard state and its operations.
 */
export type LiveClipboard<T = AnyType> = Omit<typeof CLIPBOARD_INIT, 'data'> & {
  data?: T;
  /**
   * Copies the provided payload to the clipboard.
   * @param payload - The data or string to copy.
   * @returns {Promise<boolean>} True if successful, false otherwise.
   */
  copy(payload: T | string): Promise<boolean>;
  /**
   * Registers a handler for a specific clipboard slot.
   * @param slot - The slot to listen to.
   * @param handler - The function to call when data is pasted.
   * @returns {StateUnsubscribe} A function to remove the taker.
   */
  take<K extends LiveClipboardSlot>(slot: K, handler: LiveClipboardTaker<T, K>): StateUnsubscribe;
  /**
   * Pastes data into the clipboard state.
   * @param payload - The data to paste.
   */
  paste(payload: T | string): void;
  /**
   * Clears the clipboard state for a specific slot, or all slots if none provided.
   * @param slot - Optional slot to clear.
   */
  clear(slot?: LiveClipboardSlot): void;
};

const CLIPBOARD_STATE = mutable(CLIPBOARD_INIT, { recursive: false }) as LiveClipboard;

/**
 * Reactive state of the system clipboard.
 * Used to read pasted content or copy data to the clipboard system-wide.
 */
export const LIVE_CLIPBOARD = {} as LiveClipboard;

LIVE_CLIPBOARD.copy = async (payload: AnyType): Promise<boolean> => {
  if (CLIPBOARD_STATE.isSupported) {
    try {
      const text = typeof payload === 'string' ? payload : anchor.stringify(payload);
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_e) {
      return false;
    }
  }
  return false;
};

LIVE_CLIPBOARD.take = (slot, taker) => {
  if (typeof taker !== 'function') {
    console.error(new Error('Clipboard taker must be a function.'));
    return () => {};
  }

  CLIPBOARD_TAKERS[slot]?.add(taker);
  const cleanup = () => {
    CLIPBOARD_TAKERS[slot]?.delete(taker);
  };
  onCleanup(cleanup);
  return cleanup;
};

LIVE_CLIPBOARD.paste = (payload: AnyType) => {
  let input = payload;

  if (typeof payload === 'string') {
    try {
      input = JSON.parse(payload);
    } catch {}
  }

  const isFiles = input instanceof FileList;
  const isString = typeof input === 'string';

  const slot: LiveClipboardSlot = isString ? 'text' : isFiles ? 'files' : 'data';
  const value = isFiles ? Array.from(input) : input;

  if (CLIPBOARD_TAKERS[slot].size > 0) {
    const takers = Array.from(CLIPBOARD_TAKERS[slot]);
    const lastTaker = takers[takers.length - 1];
    (lastTaker as AnyType)(value);
  } else {
    CLIPBOARD_STATE[slot] = value;
  }
};

LIVE_CLIPBOARD.clear = (slot) => {
  if (slot) {
    CLIPBOARD_STATE[slot] = slot === 'files' ? [] : undefined;
  } else {
    anchor.assign(CLIPBOARD_STATE, {
      text: undefined,
      data: undefined,
      files: [],
    });
  }
};

let CLIPBOARD_WATCHED = false;

for (const key of Object.keys(CLIPBOARD_INIT)) {
  Object.defineProperty(LIVE_CLIPBOARD, key, {
    get() {
      watchClipboard();
      return CLIPBOARD_STATE[key as keyof LiveClipboard];
    },
  });
}

function watchClipboard() {
  if (CLIPBOARD_WATCHED || !isBrowser()) return;
  CLIPBOARD_WATCHED = true;

  onInteractive(() => {
    anchor.assign(CLIPBOARD_STATE, {
      isSupported: !!navigator.clipboard,
    });

    const pasteHandler = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text/plain') ?? '';
      const files = e.clipboardData?.files;

      if (text) LIVE_CLIPBOARD.paste(text);
      if (files?.length) LIVE_CLIPBOARD.paste(files);
    };

    window.addEventListener('paste', pasteHandler);

    return () => {
      window.removeEventListener('paste', pasteHandler);
    };
  });
}
