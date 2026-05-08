import { getScope, setScope } from '../scope/index.js';
import { captureStack } from '../shared/index.js';
import type { StateObserver } from '../types.js';

export const OBSERVER_SYMBOL = Symbol('state-observer');

const switchableDefaults = {
  getObserver(): StateObserver | undefined {
    return getScope(OBSERVER_SYMBOL);
  },
  untrack<T>(fn: () => T) {
    const prev = getScope(OBSERVER_SYMBOL) as StateObserver;
    setScope(OBSERVER_SYMBOL, undefined);

    try {
      return fn() as T;
    } catch (error) {
      captureStack.error.external('Unable to execute the outside of observer function', error as Error);
    } finally {
      setScope(OBSERVER_SYMBOL, prev);
    }
  },
};
export const switchable = { ...switchableDefaults };

export function suspendSwitch() {
  switchable.getObserver = () => undefined;
  switchable.untrack = (fn) => fn();
}

export function restoreSwitch() {
  Object.assign(switchable, switchableDefaults);
}
