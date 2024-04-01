import { Rec, State, StateEvent, writable } from '../core/index.js';
import { Part } from '../core/base.js';
import { remove, write } from '../utils/index.js';

export type History<T extends Rec> = {
  changes: Part<T>;
  changed: boolean;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  reset: () => void;
  destroy: () => void;
}

export type HistoryOptions = {
  maxHistory?: number;
  debounce?: number;
}

export function history<T extends Rec>(state: State<T>, options: HistoryOptions = { debounce: 500 }): History<T> {
  if (typeof state?.subscribe !== 'function') {
    throw new Error('Expected init state to be a writable store.');
  }

  const init = JSON.parse(JSON.stringify(state));
  const backwards: StateEvent<T>[] = [];
  const forwards: StateEvent<T>[] = [];
  const queues = new Map<string, number>();

  let stopPropagation = false;

  const undo = () => {
    const event = backwards.pop();

    if (event) {
      stopPropagation = true;
      write(state, event.path as never, event.oldValue as never);

      forwards.push(event);
      record.set({
        changed: backwards.length > 0 || forwards.length > 0,
        canUndo: backwards.length > 0,
        canRedo: forwards.length > 0,
      });
    }
  };

  const redo = () => {
    const event = forwards.shift();

    if (event) {
      stopPropagation = true;
      write(state, event.path as never, event.value as never);

      backwards.push(event);
      record.set({
        changed: backwards.length > 0 || forwards.length > 0,
        canUndo: backwards.length > 0,
        canRedo: forwards.length > 0,
      });
    }
  };

  const clear = () => {
    backwards.splice(0, backwards.length);
    forwards.splice(0, forwards.length);

    record.set({
      changes: {},
      changed: false,
      canUndo: false,
      canRedo: false,
    });
  };

  const reset = () => {
    state.set(init);
    clear();
  };

  const [ record ] = writable<History<T>>({
    changes: {},
    changed: false,
    canUndo: false,
    canRedo: false,
    undo,
    redo,
    clear,
    reset,
    destroy: () => {
      unsubscribe();
    },
  });

  const unsubscribe = state.subscribe((d, event) => {
    if (stopPropagation) {
      stopPropagation = false;
      return;
    }

    if (event.path) {
      const { debounce, maxHistory } = options ?? { debounce: 500 };
      const queue = queues.get(event.path) ?? 0;

      if (queue) {
        clearTimeout(queue);
      }

      queues.set(event.path, setTimeout(() => {
        if (maxHistory && backwards.length >= maxHistory) {
          backwards.shift();
        }

        backwards.push(event as never);
        forwards.splice(0, forwards.length);

        if (event.type === 'delete') {
          remove(record.changes, event.path as never);
        } else {
          write(record.changes, event.path as never, event.value as never);
        }

        record.set({
          changed: backwards.length > 0 || forwards.length > 0,
          canUndo: backwards.length > 0,
          canRedo: forwards.length > 0,
        });
      }, debounce) as never);
    }
  }, false);

  return record as never;
}
