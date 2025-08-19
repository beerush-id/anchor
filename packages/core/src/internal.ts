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
