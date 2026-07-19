import { anchor } from '../engine/anchor.js';
import { mutable } from '../reactive/ref.js';
import { isBrowser } from '../shared/env.js';
import { microtask } from '../utils/task.js';
import { onInteractive } from './interactive.js';

const SELECTION_INIT = {
  rect: null as DOMRect | null,
  size: 0,
  text: '',
};

export type LiveSelection = typeof SELECTION_INIT;

const SELECTION_STATE = mutable(SELECTION_INIT, { recursive: false }) as LiveSelection;
export const LIVE_SELECTION = {} as LiveSelection;

let SELECTION_WATCHED = false;

for (const key of Object.keys(SELECTION_INIT)) {
  Object.defineProperty(LIVE_SELECTION, key, {
    get() {
      if (!SELECTION_WATCHED && isBrowser()) {
        watchSelection();
      }
      return SELECTION_STATE[key as keyof LiveSelection];
    },
  });
}

function watchSelection() {
  SELECTION_WATCHED = true;

  onInteractive(() => {
    const [schedule, cancel] = microtask(250);

    const assignSelection = (selection: Selection) => {
      const text = selection.toString();
      let rect: DOMRect | null = null;

      if (selection.rangeCount > 0) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      }

      anchor.assign(SELECTION_STATE, {
        rect,
        size: text.length,
        text,
      });
    };
    const clearSelection = () => {
      anchor.assign(SELECTION_STATE, {
        rect: null,
        size: 0,
        text: '',
      });
    };

    const selectionHandler = () => {
      const selection = window.getSelection();

      if (!selection?.rangeCount || selection.isCollapsed) {
        return clearSelection();
      }

      schedule(() => assignSelection(selection));
    };

    const selection = window.getSelection();
    if (selection?.rangeCount) {
      assignSelection(selection);
    }

    document.addEventListener('selectionchange', selectionHandler);

    return () => {
      document.removeEventListener('selectionchange', selectionHandler);
      cancel();
    };
  });
}
