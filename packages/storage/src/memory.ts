import { anchor, type KeyLike } from '@anchor/core';
import { isObject } from '@beerush/utils';

export type StorageEvent = {
  type: 'set' | 'assign' | 'delete' | 'clear';
  name: KeyLike;
  value?: unknown;
};

export type StorageSubscriber = (event: StorageEvent) => void;

export class MemoryStorage<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly #storage: T = {} as T;
  readonly #subscribers: Set<StorageSubscriber> = new Set();

  public get length() {
    return Object.keys(this.#storage).length;
  }

  public get keys() {
    return Object.keys(this.#storage) as (keyof T)[];
  }

  constructor(init?: T) {
    if (isObject(init)) {
      this.#storage = init;
    }
  }

  public get(key: keyof T): T[keyof T] | undefined {
    return this.#storage[key] as T[keyof T] | undefined;
  }

  public set(key: keyof T, value: T[keyof T]) {
    this.#storage[key] = value;
    this.publish({ type: 'set', name: key, value });
  }

  public delete(key: keyof T) {
    delete this.#storage[key];
    this.publish({ type: 'delete', name: key });
  }

  public assign(data: Record<string, unknown>) {
    Object.assign(this.#storage, data);
    this.publish({ type: 'assign', name: '', value: data });
  }

  public clear() {
    anchor.clear(this.#storage);
    this.publish({ type: 'clear', name: '' });
  }

  public subscribe(callback: StorageSubscriber) {
    this.#subscribers.add(callback);

    return () => {
      this.#subscribers.delete(callback);
    };
  }

  public publish(event: StorageEvent) {
    this.#subscribers.forEach((callback) => callback(event));
  }

  public json(space?: string | number, replacer?: (key: string, value: unknown) => unknown) {
    return JSON.stringify(this.#storage, replacer, space);
  }
}
