import { Anchor, crate, linkable, Pointer } from './anchor.js';
import type { Subscribe, Subscriber } from './base.js';
import { Rec } from './base.js';
import { Schema, validate } from '../schema/index.js';
import { logger } from '../utils/index.js';

type Getter<T> = ((compute?: (current: T) => T) => T) & { set: Setter<T>; subscribe: Subscribe<T> };
type Setter<T> = (newValue: T | ((current: T) => T)) => void;
type Destroy = () => void;

export type Signal<T> = [Getter<T>, Setter<T>, Subscribe<T>, Destroy];

export function signal<T>(init: T, schema?: Schema<T>): Signal<T> {
  return linkable(init) ? anchorSignal(init, schema) : createSignal(init, schema);
}

function anchorSignal<T>(init: T, schema?: Schema<T>): Signal<T> {
  const state = crate(init as Rec, true, false, schema as never) as Anchor<Rec>;

  let storedValue = state[Pointer.STATE];
  const controller = state[Pointer.MANAGER];

  const value: Getter<T> = ((compute?: (current: T) => T) => {
    return typeof compute === 'function' ? compute(storedValue as never) : storedValue;
  }) as never;

  const set: Setter<T> = (newValue: T | ((current: T) => T)) => {
    if (typeof newValue === 'function') {
      newValue = (newValue as (v: T) => T)(storedValue as T);
    }

    controller.set(newValue as never);
  };

  const subscribe: Subscribe<T> = (callback: Subscriber<T>, emitNow = true) => {
    return controller.subscribe(callback as never, emitNow);
  };

  const destroy: Destroy = () => {
    controller.destroy();
    storedValue = undefined as never;
  };

  Object.assign(value, { set, subscribe });

  return [value, set, subscribe, destroy];
}

function createSignal<T>(init: T, schema?: Schema<T>): Signal<T> {
  if (schema) {
    const validation = validate(schema, init);

    if (!validation.valid) {
      throw new TypeError(`[anchor:signal] The initial value does not conform to the schema.`);
    }
  }

  let storedValue: T = init;
  const subscribers = new Set<Subscriber<T>>();

  const value: Getter<T> = ((compute?: (current: T) => T) => {
    return typeof compute === 'function' ? compute(storedValue) : storedValue;
  }) as never;

  const set: Setter<T> = (newValue: T | ((current: T) => T)) => {
    if (typeof newValue === 'function') {
      newValue = (newValue as (v: T) => T)(storedValue);
    }

    if (newValue === storedValue) return;

    if (schema) {
      const validation = validate(schema, newValue);

      if (!validation.valid) {
        logger.error(`[anchor:signal] The new value does not conform to the schema.`);
        return;
      }
    }

    storedValue = newValue as T;
    subscribers.forEach((emit) => emit(storedValue, { type: 'update' }));
  };

  const subscribe: Subscribe<T> = (callback: Subscriber<T>, emitNow = true) => {
    if (emitNow) {
      callback(storedValue, { type: 'init' });
    }

    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
    };
  };

  const destroy: Destroy = () => {
    subscribers.clear();
    storedValue = undefined as never;
  };

  Object.assign(value, { set, subscribe });

  return [value, set, subscribe, destroy];
}
