import { Anchor, crate, linkable, Pointer } from './anchor.js';
import type { Subscribe, Subscriber } from './base.js';
import { Rec } from './base.js';
import { Schema, validate } from '../schema/index.js';
import { logger } from '../utils/index.js';

type Getter<T> = ((compute?: (current: T) => T) => T) & { set: Setter<T>, subscribe: Subscribe<T> };
type Setter<T> = (newValue: T | ((current: T) => T)) => void;
type Destroy = () => void;

export type Signal<T> = [ Getter<T>, Setter<T>, Subscribe<T>, Destroy ];

export function signal<T>(init: T, schema?: Schema<T>): Signal<T> {
  return linkable(init) ? anchorSignal(init, schema) : createSignal(init, schema);
}

function anchorSignal<T>(init: T, schema?: Schema<T>): Signal<T> {
  const state = crate(init as Rec, true, false, schema as never) as Anchor<Rec>;

  let value = state[Pointer.STATE];
  const controller = state[Pointer.MANAGER];

  const get: Getter<T> = ((compute?: (current: T) => T) => {
    return typeof compute === 'function' ? compute(value as never) : value;
  }) as never;

  const set: Setter<T> = (newValue: T | ((current: T) => T)) => {
    if (typeof newValue === 'function') {
      newValue = (newValue as (v: T) => T)(value as T);
    }

    controller.set(newValue as never);
  };

  const subscribe: Subscribe<T> = (callback: Subscriber<T>, emitNow = true) => {
    return controller.subscribe(callback as never, emitNow);
  };

  const destroy: Destroy = () => {
    controller.destroy();
    value = undefined as never;
  };

  Object.assign(get, { set, subscribe });

  return [ get, set, subscribe, destroy ];
}

function createSignal<T>(init: T, schema?: Schema<T>): Signal<T> {
  if (schema) {
    const validation = validate(schema, init);

    if (!validation.valid) {
      throw new TypeError(`[anchor:signal] The initial value does not conform to the schema.`);
    }
  }

  let value: T = init;
  const subscribers = new Set<Subscriber<T>>();

  const get: Getter<T> = ((compute?: (current: T) => T) => {
    return typeof compute === 'function' ? compute(value) : value;
  }) as never;

  const set: Setter<T> = (newValue: T | ((current: T) => T)) => {
    if (typeof newValue === 'function') {
      newValue = (newValue as (v: T) => T)(value);
    }

    if (newValue === value) return;

    if (schema) {
      const validation = validate(schema, newValue);

      if (!validation.valid) {
        logger.error(`[anchor:signal] The new value does not conform to the schema.`);
        return;
      }
    }

    value = newValue as T;
    subscribers.forEach(emit => emit(value, { type: 'update' }));
  };

  const subscribe: Subscribe<T> = (callback: Subscriber<T>, emitNow = true) => {
    if (emitNow) {
      callback(value, { type: 'init' });
    }

    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
    };
  };

  const destroy: Destroy = () => {
    subscribers.clear();
    value = undefined as never;
  };

  Object.assign(get, { set, subscribe });

  return [ get, set, subscribe, destroy ];
}
