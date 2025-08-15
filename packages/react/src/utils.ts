import type { StateChange } from '@anchor/core';
import type { Dependency } from './types.js';

export const shouldRender = <T>(event: StateChange, dependencies?: Dependency<T>[]) => {
  if (!dependencies) return true;
  const path = event.keys.join('.');

  for (const dep of dependencies) {
    if (typeof dep === 'string') {
      if (path === dep || event.type === dep) {
        return true;
      }
    } else if (typeof dep === 'object') {
      const { path, type } = dep;

      if (path && type) {
        if (path === path && event.type === type) {
          return true;
        }
      } else {
        if (event.type === type || path === path) {
          return true;
        }
      }
    }
  }

  return false;
};
