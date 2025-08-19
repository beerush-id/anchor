import type { ArrayMutation, KeyLike, Linkable, ObjLike, StateChange } from '../types.js';
import { anchor } from '../anchor.js';
import { derive } from '../derive.js';
import { assign } from '../helper.js';
import { STATE_BUSY_LIST } from '../registry.js';
import { ARRAY_MUTATIONS } from '../constant.js';
import { microtask } from '../utils/index.js';
import { captureStack } from '../exception.js';

export type HistoryOptions = {
  debounce?: number;
  maxHistory?: number;
};

export const DEFAULT_HISTORY_OPTION = {
  debounce: 100,
  maxHistory: 100,
};

export function setDefaultOptions(options: HistoryOptions) {
  Object.assign(DEFAULT_HISTORY_OPTION, options);
}
export function getDefaultOptions() {
  return DEFAULT_HISTORY_OPTION;
}

export type HistoryState = {
  readonly backwardList: StateChange[];
  readonly forwardList: StateChange[];
  canBackward: boolean;
  canForward: boolean;
  backward(): void;
  forward(): void;
  destroy(): void;
  clear(): void;
  reset(): void;
};

/**
 * Creates a history management system for a reactive state object.
 *
 * This function tracks state changes and provides undo/redo functionality.
 * It maintains backward and forward stacks of state changes, allowing users
 * to navigate through the history of modifications.
 *
 * @template T - The type of the state object
 * @param state - The reactive state object to track
 * @param options - Configuration options for the history management
 * @param options.debounce - Debounce time in milliseconds for collecting changes (default: 100ms)
 * @param options.maxHistory - Maximum number of history states to keep (default: 100)
 * @returns A HistoryState object with methods and properties for history management
 *
 * @example
 * ```typescript
 * const state = anchor({ count: 0 });
 * const history = history(state);
 *
 * state.count = 1;
 * state.count = 2;
 *
 * history.backward(); // Undo last change, state.count becomes 1
 * history.forward();  // Redo change, state.count becomes 2 again
 * ```
 */
export function history<T>(state: T, options?: HistoryOptions): HistoryState {
  const { maxHistory = DEFAULT_HISTORY_OPTION.maxHistory, debounce = DEFAULT_HISTORY_OPTION.debounce } = options ?? {};

  const backwardList: StateChange[] = [];
  const forwardList: StateChange[] = [];
  const [schedule] = microtask<StateChange>(debounce);
  const changeList = new Set<StateChange>();
  const controller = derive.resolve(state);
  let snapshot: T;

  if (typeof controller?.subscribe !== 'function') {
    const error = new Error('Object is not reactive.');
    captureStack.error.external('Cannot create history state from non-reactive object.', error, history);
    snapshot = state;
  } else {
    snapshot = anchor.snapshot(state);
  }

  let isBusy = false;

  const backward = () => {
    isBusy = true;

    const event = backwardList.pop();

    if (event) {
      forwardList.unshift(event);
      undoChange(state, event);
      assign(historyState, {
        canForward: forwardList.length > 0,
        canBackward: backwardList.length > 0,
      });
    }

    isBusy = false;
  };

  const forward = () => {
    isBusy = true;

    const event = forwardList.shift();

    if (event) {
      backwardList.push(event);
      redoChange(state, event);
      assign(historyState, {
        canForward: forwardList.length > 0,
        canBackward: backwardList.length > 0,
      });
    }

    isBusy = false;
  };

  const clear = () => {
    isBusy = true;

    backwardList.length = 0;
    forwardList.length = 0;

    assign(historyState, {
      canForward: forwardList.length > 0,
      canBackward: backwardList.length > 0,
    });

    isBusy = false;
  };

  const reset = () => {
    isBusy = true;

    anchor.assign(state as ObjLike, snapshot as ObjLike);
    clear();

    isBusy = false;
  };

  const destroy = () => {
    unsubscribe?.();
    clear();
  };

  // Subscribe for state changes and push the event to the backward stack, then clears the forward stack.
  const unsubscribe = controller?.subscribe((snap, event) => {
    if (event.type !== 'init' && !isBusy) {
      changeList.add(event);

      schedule(() => {
        if (maxHistory && backwardList.length >= maxHistory) {
          backwardList.shift();
        }

        backwardList.push(...createChanges(changeList));
        forwardList.length = 0;
        changeList.clear();

        assign(historyState, {
          canForward: forwardList.length > 0,
          canBackward: backwardList.length > 0,
        });
      }, event);
    }
  });

  const historyState = anchor.raw<HistoryState>(
    {
      get backwardList() {
        return backwardList;
      },
      get forwardList() {
        return forwardList;
      },
      canBackward: false,
      canForward: false,
      backward,
      forward,
      destroy,
      reset,
      clear,
    },
    { recursive: false }
  );

  return historyState;
}

/**
 * Reverts a state change by applying the previous value to the target.
 *
 * This function is used internally by the history management system to undo state changes.
 * It handles various types of state mutations including set, add, delete, assign, clear,
 * and array mutations by restoring the previous state.
 *
 * @template T - The type of the state object
 * @param state - The reactive state object
 * @param event - The state change event containing information about the change to undo
 *
 * @internal
 */
export function undoChange<T>(state: T, event: StateChange) {
  const { type, prev } = event;
  const { key, target } = getTarget(state, ...event.keys);

  STATE_BUSY_LIST.add(state as Linkable);

  if (type === 'set') {
    if (target instanceof Map) {
      if (typeof prev === 'undefined') {
        target.delete(key);
      } else {
        target.set(key, prev);
      }
    } else {
      target[key as never] = prev as never;
    }
  } else if (type === 'add') {
    (target[key as never] as Set<unknown>).delete(event.value);
  } else if (type === 'delete') {
    if (target instanceof Map) {
      target.set(key, prev);
    } else if ((target as ObjLike)[key] instanceof Set) {
      (target[key as never] as Set<unknown>).add(prev);
    } else {
      (target as ObjLike)[key] = prev;
    }
  } else if (type === 'assign') {
    assign(target as never, prev as never);
  } else if (type === 'clear') {
    if (target instanceof Map) {
      for (const [key, value] of prev as [[unknown, unknown]]) {
        target.set(key as never, value);
      }
    } else if (target instanceof Set) {
      for (const value of prev as [unknown]) {
        target.add(value);
      }
    }
  } else if (ARRAY_MUTATIONS.includes(type as never)) {
    const items = target[key as never] as unknown[];

    if (type === 'shift') {
      items.unshift(prev);
    } else if (type === 'pop') {
      items.push(prev);
    } else if (type === 'push') {
      items.pop();
    } else if (type === 'unshift') {
      items.shift();
    } else {
      items.splice(0, items.length, ...(prev as unknown[]));
    }
  }

  STATE_BUSY_LIST.delete(state as Linkable);
}

/**
 * Re-applies a state change by applying the new value to the target.
 *
 * This function is used internally by the history management system to redo state changes.
 * It handles various types of state mutations including set, add, delete, assign, clear,
 * and array mutations by re-applying the change that was previously undone.
 *
 * @template T - The type of the state object
 * @param state - The reactive state object
 * @param event - The state change event containing information about the change to redo
 *
 * @internal
 */
export function redoChange<T>(state: T, event: StateChange) {
  const { type, prev, value } = event;
  const { key, target } = getTarget(state, ...event.keys);

  STATE_BUSY_LIST.add(state as Linkable);

  if (type === 'set') {
    setValue(target as never, key as keyof T, value as never);
  } else if (type === 'add') {
    (target[key as never] as Set<unknown>).add(value);
  } else if (type === 'delete') {
    if (target instanceof Map) {
      target.delete(key);
    } else if ((target as ObjLike)[key] instanceof Set) {
      (target[key as never] as Set<unknown>).delete(prev);
    } else {
      delete (target as ObjLike)[key];
    }
  } else if (type === 'assign') {
    assign(target as never, value as never);
  } else if (type === 'clear') {
    (target as Set<unknown>).clear();
  } else if (ARRAY_MUTATIONS.includes(type as never)) {
    const items = target[key as never] as unknown[];
    (items[type as ArrayMutation] as (...args: unknown[]) => unknown)(...(value as unknown[]));
  }

  STATE_BUSY_LIST.delete(state as Linkable);
}

/**
 * Retrieves the target object and key for a nested property access.
 *
 * This function is used internally by the history management system to
 * locate the specific object and property that was modified. It takes
 * a state object and a path of keys, then traverses the object hierarchy
 * to find the parent object and the final key.
 *
 * @template T - The type of the state object
 * @param state - The root state object to traverse
 * @param keys - The path of keys leading to the target property
 * @returns An object containing the final key and its parent target object
 *
 * @internal
 */
function getTarget<T>(state: T, ...keys: KeyLike[]) {
  if (!keys.length) {
    return { key: '', target: state as Linkable };
  }

  const parentKeys = [...keys];
  const key = parentKeys.pop() as KeyLike;

  if (!parentKeys.length) {
    return { key, target: state as Linkable };
  }

  const target = parentKeys.reduce((parent, key) => {
    return getValue(parent, key) as T;
  }, state) as Linkable;

  return { key, target };
}

/**
 * Retrieves a value from a target object using a specified key.
 *
 * This function is used internally by the history management system to
 * access values in various data structures including Maps and plain objects.
 * It provides a unified interface for value retrieval regardless of the
 * underlying data structure.
 *
 * @template T - The type of the target object
 * @param target - The target object from which to retrieve the value
 * @param key - The key used to access the value
 * @returns The value associated with the key, or undefined if not found
 *
 * @internal
 */
function getValue<T>(target: T, key: KeyLike) {
  if (target instanceof Map) {
    return target.get(key);
  }

  return (target as Record<KeyLike, unknown>)[key];
}

/**
 * Sets a value on a target object using a specified key.
 *
 * This function is used internally by the history management system to
 * apply values to various data structures including Maps and plain objects.
 * It provides a unified interface for value assignment regardless of the
 * underlying data structure.
 *
 * @template T - The type of the target object
 * @param target - The target object on which to set the value
 * @param key - The key used to set the value
 * @param value - The value to be set
 *
 * @internal
 */
function setValue<T>(target: T, key: keyof T, value: T[keyof T]) {
  if (target instanceof Map) {
    target.set(key, value);
  } else if (typeof target === 'object' && target !== null) {
    target[key as keyof T] = value as never;
  }
}

/**
 * Creates a consolidated list of state changes by merging multiple changes to the same key.
 *
 * This function processes a set of state changes and consolidates them so that each unique
 * key path only appears once in the resulting array. When multiple changes affect the same
 * key path, only the first change (earliest in the set) is kept, but its value is updated
 * to the latest value for that key path.
 *
 * This is used internally by the history management system to optimize history entries,
 * ensuring that rapid successive changes to the same property result in a single history
 * entry with the final value rather than multiple intermediate states.
 *
 * @param changeList - A set of state change events to consolidate
 * @returns An array of consolidated state change events
 *
 * @internal
 */
function createChanges(changeList: Set<StateChange>) {
  const prevChanges = new Map<string, StateChange>();
  const nextChanges = new Map<string, unknown>();

  for (const change of changeList) {
    const key = change.keys.join('.');

    if (!prevChanges.has(key)) {
      prevChanges.set(key, change);
    }

    nextChanges.set(key, change.value);
  }

  return Array.from(prevChanges.entries()).map(([key, change]) => {
    return {
      ...change,
      value: nextChanges.get(key),
    };
  });
}
