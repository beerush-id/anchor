import type { Linkable, StateChange, StateSubscriber } from './types.js';
import { LINKABLE } from './constant.js';
import { typeOf } from '@beerush/utils';

export function broadcast(subscribers: Set<unknown>, snapshot: unknown, event: StateChange, emitter?: string) {
  for (const subscriber of subscribers) {
    if (typeof subscriber === 'function') {
      const receiver = (subscriber as never as { __internal_id__: string }).__internal_id__;

      if (receiver) {
        if (receiver !== emitter) {
          (subscriber as StateSubscriber<unknown>)(snapshot, event, emitter);
        }
      } else {
        (subscriber as StateSubscriber<unknown>)(snapshot, event);
      }
    }
  }
}

export function linkable(value: unknown): value is Linkable {
  return LINKABLE.has(typeOf(value));
}

export function createLinkableTargets<T>(value: T) {
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
