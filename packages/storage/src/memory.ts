import { anchor, isObject } from '@anchorlib/core';
import type { StorageEvent, StorageSubscriber } from './types.js';

/**
 * A memory-based storage implementation that provides a key-value store with subscription capabilities.
 *
 * @template T - The type of the storage object, defaults to Record<string, unknown>
 */
export class MemoryStorage<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly #storage: T = {} as T;
  readonly #subscribers: Set<StorageSubscriber> = new Set();

  /**
   * Gets the number of items in the storage.
   * @returns The number of stored items
   */
  public get length() {
    return Object.keys(this.#storage).length;
  }

  /**
   * Gets all the keys in the storage.
   * @returns An array of all storage keys
   */
  public get keys() {
    return Object.keys(this.#storage) as (keyof T)[];
  }

  /**
   * Creates a new MemoryStorage instance.
   * @param init - Optional initial data to populate the storage
   */
  constructor(init?: T) {
    if (isObject(init)) {
      this.#storage = init;
    }
  }

  /**
   * Gets a value from storage by key.
   * @param key - The key to retrieve
   * @returns The stored value or undefined if not found
   */
  public get(key: keyof T): T[keyof T] | undefined {
    return this.#storage[key] as T[keyof T] | undefined;
  }

  /**
   * Sets a value in storage by key.
   * @param key - The key to set
   * @param value - The value to store
   */
  public set(key: keyof T, value: T[keyof T]) {
    this.#storage[key] = value;
    this.publish({ type: 'set', name: key, value });
  }

  /**
   * Deletes a value from storage by key.
   * @param key - The key to delete
   */
  public delete(key: keyof T) {
    delete this.#storage[key];
    this.publish({ type: 'delete', name: key });
  }

  /**
   * Assigns multiple values to the storage.
   * @param data - The data to merge into storage
   */
  public assign(data: Record<string, unknown>) {
    Object.assign(this.#storage, data);
    this.publish({ type: 'assign', name: '', value: data });
  }

  /**
   * Clears all values from the storage.
   */
  public clear() {
    anchor.clear(this.#storage);
    this.publish({ type: 'clear', name: '' });
  }

  /**
   * Subscribes to storage events.
   * @param callback - The function to call when storage events occur
   * @returns A function to unsubscribe from events
   */
  public subscribe(callback: StorageSubscriber) {
    this.#subscribers.add(callback);

    return () => {
      this.#subscribers.delete(callback);
    };
  }

  /**
   * Publishes a storage event to all subscribers.
   * @param event - The event to publish
   */
  public publish(event: StorageEvent) {
    this.#subscribers.forEach((callback) => callback(event));
  }

  /**
   * Converts the storage to a JSON string.
   * @param space - Adds indentation, white space, and line break characters to the return-value JSON text
   * @param replacer - A function that alters the behavior of the stringification process
   * @returns A JSON string representation of the storage
   */
  public json(space?: string | number, replacer?: (key: string, value: unknown) => unknown) {
    return JSON.stringify(this.#storage, replacer, space);
  }
}
