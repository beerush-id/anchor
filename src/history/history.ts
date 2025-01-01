import { type Init, type Rec, type State, type StateEvent, type Writable, writable } from '../core/index.js';
import type { Part } from '../core/base.js';
import { clone, remove, write } from '../utils/index.js';

export type History<T extends Init> = {
  state: State<T>;
  changes: Part<T>;
  hasChanges: boolean;
  backwards: StateEvent<T>[];
  forwards: StateEvent<T>[];
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  clear: () => void;
  reset: () => void;
  destroy: () => void;
};

export type HistoryState<T extends Init> = Writable<History<T>>;
export type HistoryOptions = {
  maxHistory?: number;
  debounce?: number;
};

export function stateHistory<T extends Init>(
  state: State<T>,
  options: HistoryOptions = { debounce: 500 }
): HistoryState<T> {
  if (typeof state?.subscribe !== 'function' || typeof (state as State<Rec>)?.set !== 'function') {
    throw new Error('Expected init state to be a writable store.');
  }

  const init = clone(state);
  const backwards: StateEvent<T>[] = [];
  const forwards: StateEvent<T>[] = [];
  const queues = new Map<string, number>();
  let stopPropagation = false;

  const updateRecord = (changes?: Part<T>) => {
    if (changes) {
      record.changes = changes;
    }

    record.set({
      hasChanges: backwards.length > 0,
      canUndo: backwards.length > 0,
      canRedo: forwards.length > 0,
    });
  };

  const undo = () => {
    if (backwards.length === 0) return;
    const event = backwards.pop();

    if (event) {
      stopPropagation = true;
      write(state, event.path as never, event.oldValue as never);

      if (backwards.length === 0) {
        remove(record.changes, event.path as never);
      }

      forwards.push(event);
      updateRecord();
    }
  };

  const redo = () => {
    if (forwards.length === 0) return;
    const event = forwards.shift();

    if (event) {
      stopPropagation = true;
      write(state, event.path as never, event.value as never);
      write(record.changes, event.path as never, event.value as never);
      backwards.push(event);
      updateRecord();
    }
  };

  const clear = () => {
    backwards.splice(0, backwards.length);
    forwards.splice(0, forwards.length);
    updateRecord({});
  };

  const reset = () => {
    (state as State<Rec>).set(clone(init) as never);
    clear();
  };

  const [record] = writable({
    changes: {},
    backwards,
    forwards,
    hasChanges: false,
    canUndo: false,
    canRedo: false,
    undo,
    redo,
    clear,
    reset,
    state,
    destroy: () => {
      clear();
      unsubscribe();
    },
  });

  const unsubscribe = state.subscribe((d, event) => {
    if (stopPropagation) {
      stopPropagation = false;
      return;
    }
    const { path } = event;
    const { debounce, maxHistory } = options;

    if (!path) return;

    const queue = queues.get(path) ?? 0;
    if (queue) {
      clearTimeout(queue);
    }

    const propagate = () => {
      if (maxHistory && backwards.length >= maxHistory) {
        backwards.shift();
      }

      backwards.push(event as never);
      forwards.splice(0, forwards.length);

      if (event.type === 'delete') {
        remove(record.changes, path as never);
      } else {
        if (Array.isArray(event.emitter)) {
          write(record.changes, event.prop as never, [...event.emitter] as never);
        } else {
          write(record.changes, path as never, event.value as never);
        }
      }

      updateRecord();
    };

    if (debounce) {
      queues.set(path, setTimeout(propagate, debounce) as never);
    } else {
      propagate();
    }
  }, false);

  return record as never;
}

// @deprecated
export const history = stateHistory;
