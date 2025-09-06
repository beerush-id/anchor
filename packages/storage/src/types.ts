import type { KeyLike, LinkableSchema, ObjLike, StateOptions } from '@anchor/core';
import type { SessionStorage } from './session.js';

export type StorageEvent = {
  type: 'set' | 'assign' | 'delete' | 'clear';
  name: KeyLike;
  value?: unknown;
};
export type StorageSubscriber = (event: StorageEvent) => void;

export interface SessionFn {
  /**
   * Creates a reactive session object that automatically syncs with sessionStorage.
   * The session object will persist data across page reloads within the same browser session.
   *
   * @template T - The type of the initial data object
   * @template S - The schema type for anchor options
   *
   * @param name - Unique identifier for the session storage instance
   * @param init - Initial data to populate the session storage
   * @param options - Optional anchor configuration options
   * @param storageClass - Custom storage class to use (defaults to SessionStorage)
   *
   * @returns A reactive proxy object that syncs with sessionStorage
   */
  <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
    name: string,
    init: T,
    options?: StateOptions<S>,
    storageClass?: typeof SessionStorage
  ): T;

  /**
   * Disconnects a reactive session object from sessionStorage synchronization.
   *
   * @template T - The type of the session object
   * @param state - The reactive session object to disconnect
   *
   * @example
   * ```typescript
   * const userSession = session('user', { id: 1, name: 'John' });
   * session.leave(userSession);
   * // userSession is no longer synced with sessionStorage
   * ```
   */
  leave<T extends ObjLike>(state: T): void;
}

/**
 * Interface for the persistent function that provides methods for creating and managing persistent storage.
 */
export interface PersistentFn {
  /**
   * Creates a reactive persistent object that syncs with local storage.
   *
   * @template T - The type of the initial data object
   * @template S - The type of the linkable schema
   * @param {string} name - The unique name for the persistent storage instance
   * @param {T} init - The initial data to populate the storage with
   * @param {StateOptions<S>} [options] - Optional configuration options for the storage
   * @returns {T} A reactive object that persists data to localStorage
   */
  <T extends ObjLike, S extends LinkableSchema = LinkableSchema>(name: string, init: T, options?: StateOptions<S>): T;

  /**
   * Disconnects a reactive persistent object from localStorage synchronization.
   *
   * @template T - The type of the object to disconnect
   * @param {T} state - The reactive object to stop syncing with localStorage
   */
  leave<T extends ObjLike>(state: T): void;
}
