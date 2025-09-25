import type {
  ArrayMutation,
  ArrayMutator,
  KeyLike,
  Linkable,
  MapMutator,
  SetMutator,
  State,
  StateChange,
  StateGateway,
} from '../types.js';
import { anchor } from '../anchor.js';
import { derive } from '../derive.js';
import { assign } from '../helper.js';
import { INIT_GATEWAY_REGISTRY, STATE_REGISTRY } from '../registry.js';
import { ARRAY_MUTATION_KEYS, ARRAY_MUTATIONS, COLLECTION_MUTATION_KEYS } from '../constant.js';
import { microtask } from '../utils/index.js';
import { captureStack } from '../exception.js';
import { ArrayMutations, BatchMutations, MapMutations, ObjectMutations, SetMutations } from '../enum.js';
import { setInspector } from '../broadcast.js';

export type HistoryOptions = {
  debounce?: number;
  maxHistory?: number;
  resettable?: boolean;
};

export const DEFAULT_HISTORY_OPTION = {
  debounce: 100,
  maxHistory: 100,
  resettable: false,
};

function setDefaultOptions(options: HistoryOptions) {
  Object.assign(DEFAULT_HISTORY_OPTION, options);
}
function getDefaultOptions() {
  return DEFAULT_HISTORY_OPTION;
}

export type HistoryState = {
  readonly backwardList: StateChange[];
  readonly forwardList: StateChange[];
  canBackward: boolean;
  canForward: boolean;
  canReset: boolean;
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
 */
export function history<T extends State>(state: T, options?: HistoryOptions): HistoryState {
  const {
    maxHistory = DEFAULT_HISTORY_OPTION.maxHistory,
    debounce = DEFAULT_HISTORY_OPTION.debounce,
    resettable = DEFAULT_HISTORY_OPTION.resettable,
  } = options ?? {};

  const [schedule] = microtask<StateChange>(debounce);
  const changeList: StateChange[] = [];
  const backwardList: StateChange[] = [];
  const forwardList: StateChange[] = [];
  const mergeList = new Set<StateChange>();
  const controller = derive.resolve(state);

  if (!anchor.has(state)) {
    const error = new Error('Object is not reactive.');
    captureStack.error.external('Cannot create history state from non-reactive object.', error, history);
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
        canReset: changeList.length > 0,
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
        canReset: changeList.length > 0,
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
      canReset: changeList.length > 0,
    });

    isBusy = false;
  };

  const reset = () => {
    if (!options?.resettable) return;
    isBusy = true;

    while (changeList.length) {
      undoChange(state, changeList.pop() as StateChange);
    }

    clear();
    isBusy = false;
  };

  const destroy = () => {
    changeList.length = 0;
    unsubscribe?.();
    clear();
  };

  // Subscribe for state changes and push the event to the backward stack, then clears the forward stack.
  const unsubscribe = controller?.subscribe((snap, event) => {
    if (event.type !== 'init' && !isBusy) {
      mergeList.add(event);

      schedule(() => {
        if (maxHistory && backwardList.length >= maxHistory) {
          backwardList.shift();
        }

        for (const change of mergeChanges(mergeList)) {
          if (resettable) {
            changeList.push(change);
          }

          backwardList.push(change);
        }

        forwardList.length = 0;
        mergeList.clear();

        assign(historyState, {
          canForward: forwardList.length > 0,
          canBackward: backwardList.length > 0,
          canReset: changeList.length > 0,
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
      canReset: changeList.length > 0,
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

history.setDefaultOptions = setDefaultOptions;
history.getDefaultOptions = getDefaultOptions;

/**
 * Creates an undoable operation that can be executed and later reverted.
 *
 * This function wraps a given function execution and captures any state changes
 * that occur during its execution. It returns a tuple containing two functions:
 * the first one undoes the changes, and the second one clears the captured changes.
 *
 * @param operation - The function to execute and make undoable
 * @returns A tuple containing two functions: [undo, clear]
 *   - undo: A function that, when called, will undo the changes made by the original function
 *   - clear: A function that, when called, will clear the captured changes (marking as completed)
 */
export function undoable(operation: () => void): [() => void, () => void] {
  if (typeof operation !== 'function') {
    const error = new Error('Invalid argument.');
    captureStack.error.argument('The given argument is not a function.', error, undoable);

    return [() => {}, () => {}];
  }

  const changes: { state: State; change: StateChange }[] = [];

  setInspector((init: Linkable, event: StateChange) => {
    changes.unshift({ state: anchor.find(init), change: event });
  });

  try {
    operation();
  } catch (error) {
    captureStack.error.external('Undoable execution failed.', error as Error);
  } finally {
    setInspector(undefined);
  }

  const undo = () => {
    changes.forEach(({ state, change }) => {
      undoChange(state, change);
    });
    changes.length = 0;
  };

  const clear = () => {
    changes.length = 0;
  };

  return [undo, clear];
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
  const init = STATE_REGISTRY.get(state as Linkable) as Linkable;
  const { type, prev } = event;
  const { key, target } = getTarget(init, event);
  const gateway = INIT_GATEWAY_REGISTRY.get(target as Linkable) as StateGateway;

  if (type === ObjectMutations.SET) {
    if (typeof prev === 'undefined') {
      gateway.remover(target, key, target);
    } else {
      gateway.setter(target, key, prev, target);
    }
    // target[key as never] = prev as never;
  } else if (type === MapMutations.SET) {
    if (typeof prev === 'undefined') {
      // target.delete(key);
      (gateway.mutator as MapMutator<unknown, unknown>).delete(key);
    } else {
      // target.set(key, prev);
      (gateway.mutator as MapMutator<unknown, unknown>).set(key, prev);
    }
  } else if (type === SetMutations.ADD) {
    (gateway.mutator as SetMutator<unknown>).delete(event.value);
    // (target[key as never] as Set<unknown>).delete(event.value);
  } else if (type === ObjectMutations.DELETE) {
    // (target as ObjLike)[key] = prev;
    gateway?.setter(target, key, prev, target);
  } else if (type === MapMutations.DELETE || type === SetMutations.DELETE) {
    if (target instanceof Map) {
      // target.set(key, prev);
      (gateway.mutator as MapMutator<unknown, unknown>).set(key, prev);
    } else if (target instanceof Set) {
      // (target[key as never] as Set<unknown>).add(prev);
      (gateway.mutator as SetMutator<unknown>).add(prev);
    }
  } else if (type === BatchMutations.ASSIGN) {
    // assign(target as never, prev as never);
    assign(anchor.find(target) as never, prev as never);
  } else if (type === MapMutations.CLEAR || type === SetMutations.CLEAR) {
    if (target instanceof Map) {
      for (const [key, value] of prev as [[unknown, unknown]]) {
        // target.set(key as never, value);
        (gateway.mutator as MapMutator<unknown, unknown>).set(key, value);
      }
    } else if (target instanceof Set) {
      for (const value of prev as [unknown]) {
        // target.add(value);
        (gateway.mutator as SetMutator<unknown>).add(value);
      }
    }
  } else if (ARRAY_MUTATIONS.includes(type as never)) {
    const items = target as unknown[];

    if (type === 'shift') {
      // items.unshift(prev);
      (gateway.mutator as ArrayMutator<unknown>).unshift(prev);
    } else if (type === 'pop') {
      // items.push(prev);
      (gateway.mutator as ArrayMutator<unknown>).push(prev);
    } else if (type === 'push') {
      const initItems = (anchor.get as (item: unknown, silent: boolean) => unknown[])(items, true);
      for (const item of event.value as unknown[]) {
        const index = initItems.indexOf(item);
        if (index >= 0) {
          // items.splice(index, 1);
          (gateway.mutator as ArrayMutator<unknown>).splice(index, 1);
        }
      }
    } else if (type === 'unshift') {
      // items.shift();
      (gateway.mutator as ArrayMutator<unknown>).shift();
    } else {
      // items.splice(0, items.length, ...(prev as unknown[]));
      (gateway.mutator as ArrayMutator<unknown>).splice(0, items.length, ...(prev as unknown[]));
    }
  }
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
  const init = STATE_REGISTRY.get(state as Linkable);
  const { type, prev, value } = event;
  const { key, target } = getTarget(init, event);
  const gateway = INIT_GATEWAY_REGISTRY.get(target as Linkable) as StateGateway;

  if (type === ObjectMutations.SET) {
    gateway.setter(target, key, value, target);
  } else if (type === MapMutations.SET) {
    (gateway.mutator as MapMutator<unknown, unknown>).set(key, value);
  } else if (type === SetMutations.ADD) {
    (gateway.mutator as SetMutator<unknown>).add(value);
  } else if (type === ObjectMutations.DELETE) {
    gateway.remover(target, key, target);
  } else if (type === MapMutations.DELETE || type === SetMutations.DELETE) {
    if (target instanceof Map) {
      (gateway.mutator as MapMutator<unknown, unknown>).delete(key);
    } else if (target instanceof Set) {
      (gateway.mutator as SetMutator<unknown>).delete(prev);
    }
  } else if (type === BatchMutations.ASSIGN) {
    assign(anchor.find(target) as never, value as never);
  } else if (type === MapMutations.CLEAR || type === SetMutations.CLEAR) {
    if (target instanceof Map) {
      (gateway.mutator as MapMutator<unknown, unknown>).clear();
    } else if (target instanceof Set) {
      (gateway.mutator as SetMutator<unknown>).clear();
    }
  } else if (ARRAY_MUTATIONS.includes(type as ArrayMutations)) {
    ((gateway.mutator as ArrayMutator<unknown>)[type as ArrayMutation] as (...args: unknown[]) => unknown)(
      ...(value as unknown[])
    );
  }
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
 * @param event - The state change event containing information about the modified property
 * @returns An object containing the final key and its parent target object
 *
 * @internal
 */
function getTarget<T>(state: T, event: StateChange) {
  if (!event.keys.length) {
    return { key: '', target: state as Linkable };
  }

  const parentKeys = [...event.keys];
  const key = parentKeys.pop() as KeyLike;

  if (!parentKeys.length) {
    if (
      (ARRAY_MUTATION_KEYS.has(event.type as ArrayMutations) ||
        COLLECTION_MUTATION_KEYS.has(event.type as SetMutations)) &&
      event.type !== MapMutations.SET &&
      event.type !== MapMutations.DELETE
    ) {
      return { key: '', target: getValue(state, key) as Linkable };
    }

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
function mergeChanges(changeList: Set<StateChange>) {
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
