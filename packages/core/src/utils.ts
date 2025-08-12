import type { Linkable, StateChange, StateSubscriber } from './types.js';
import { LINKABLE } from './constant.js';
import { typeOf } from '@beerush/utils';

export function createLinkableRefs<T>(value: T) {
  const linkableRefs = new Map<string, Linkable>();

  if (Array.isArray(value)) {
    const length = value.length;

    for (let i = 0; i < length; i++) {
      if (linkable(value[i])) {
        linkableRefs.set(`${i}`, value[i]);
      }
    }
  } else if (value instanceof Set) {
    let i = 0;

    for (const item of value) {
      if (linkable(item)) {
        linkableRefs.set(`${i}`, item);
      }

      i++;
    }
  } else if (value instanceof Map) {
    for (const [key, item] of value.entries()) {
      if (linkable(item)) {
        linkableRefs.set(key, item);
      }
    }
  } else if (typeof value === 'object' && value !== null) {
    for (const [key, item] of Object.entries(value)) {
      if (linkable(item)) {
        linkableRefs.set(key, item);
      }
    }
  }

  return linkableRefs;
}

export function broadcast(subscribers: Set<unknown>, value: unknown, event: StateChange) {
  for (const subscriber of subscribers) {
    (subscriber as StateSubscriber<unknown>)(value, event);
  }
}

export function linkable(value: unknown): value is Linkable {
  return LINKABLE.has(typeOf(value));
}

export function shouldProxy(value: unknown): boolean {
  return !(value instanceof Map || value instanceof Set);
}

export function shortId() {
  return Math.random().toString(36).substring(2, 15);
}
