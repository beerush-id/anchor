import { $symbol, isBrowser } from '../module.js';
import { getScope, setScope } from '../scope/index.js';
import type { StateObserver } from '../types.js';

export const OBSERVER_SYMBOL = $symbol('state-observer');

const switchableDefaults = {
  getObserver(): StateObserver | undefined {
    return getScope(OBSERVER_SYMBOL);
  },
  untrack<T>(fn: () => T) {
    const prev = getScope(OBSERVER_SYMBOL) as StateObserver;
    setScope(OBSERVER_SYMBOL, undefined);

    try {
      return fn() as T;
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

if (!isBrowser()) {
  suspendSwitch();
}

export function restoreSwitch() {
  Object.assign(switchable, switchableDefaults);
}
