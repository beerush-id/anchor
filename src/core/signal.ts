import { Anchor, crate, linkable, Pointer } from './anchor.js';
import type { Readable, Subscribe, Subscriber } from './base.js';
import { Rec } from './base.js';
import { Schema, validate } from '../schema/index.js';
import { logger } from '../utils/index.js';

export type GetterFn<T> = (compute?: (current: T) => T) => T;
export type GetterProps<T> = { set: Setter<T>; subscribe: Subscribe<T> };
export type Getter<T> = GetterFn<T> & GetterProps<T>;
export type Setter<T> = (newValue: T | ((current: T) => T)) => void;
export type Destroy = () => void;

export type Signal<T> = [Getter<T>, Setter<T>, Subscribe<T>, Destroy];
export type DerivedSignal<T> = [Getter<T>, Destroy, Subscribe<T>];

export function signal<T>(init: T, schema?: Schema<T>): Signal<T> {
  return linkable(init) ? anchorSignal(init, schema) : primitiveSignal(init, schema);
}

export function derived<T, S>(state: S, fn: (state: S) => T): DerivedSignal<T> {
  const [value, set, subscribe, destroy] = signal(fn(state));

  const callback = (newState: S) => {
    const newValue = fn(newState);
    if (newValue === value()) return;

    console.log(newValue);
    set(fn(newState));
  };

  const unsubscribe = (state as never as Readable<unknown>).subscribe(callback as never);
  const destroyAll = () => {
    unsubscribe();
    destroy();
  };

  return [value, destroyAll, subscribe];
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

function primitiveSignal<T>(init: T, schema?: Schema<T>): Signal<T> {
  if (schema) {
    const validation = validate(schema, init);

    if (!validation.valid) {
      throw new TypeError(`[anchor:signal] The initial value does not conform to the schema.`);
    }
  }

  let storedValue: T = init;
  const subscribers = new Set<Subscriber<T>>();

  const value: Getter<T> = ((compute?: (current: T) => T) => {
    let returnedValue = storedValue;

    if (typeof compute === 'function') {
      returnedValue = compute(storedValue);

      if (schema) {
        const validation = validate(schema, returnedValue);

        if (!validation.valid) {
          logger.error(`[anchor:signal] The computed value does not conform to the schema.`);
          return storedValue;
        }
      }
    }

    return returnedValue;
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
