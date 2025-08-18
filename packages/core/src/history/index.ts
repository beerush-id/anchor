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

function getValue<T>(target: T, key: KeyLike) {
  if (target instanceof Map) {
    return target.get(key);
  }

  return (target as Record<KeyLike, unknown>)[key];
}

function setValue<T>(target: T, key: keyof T, value: T[keyof T]) {
  if (target instanceof Map) {
    target.set(key, value);
  } else if (typeof target === 'object' && target !== null) {
    target[key as keyof T] = value as never;
  }
}

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

  return prevChanges.entries().map(([key, change]) => {
    return {
      ...change,
      value: nextChanges.get(key),
    };
  });
}
