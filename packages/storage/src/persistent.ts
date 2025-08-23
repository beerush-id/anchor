import { session, SessionStorage, STORAGE_KEY } from './session.js';
import type { AnchorOptions, LinkableSchema, ObjLike } from '@anchor/core';
import type { PersistentFn } from './types.js';

const hasLocalStorage = () => typeof sessionStorage !== 'undefined';

/**
 * PersistentStorage class that extends SessionStorage to provide persistent storage functionality.
 * This class uses localStorage to persist data across browser sessions.
 *
 * @template T - The type of the stored object, extending Record<string, unknown>
 */
export class PersistentStorage<T extends Record<string, unknown> = Record<string, unknown>> extends SessionStorage<T> {
  public static key(name: string, version = '1.0.0') {
    return `${STORAGE_KEY}-persistent://${name}@${version}`;
  }

  /**
   * Gets the storage key for the current version.
   * The key format is `${STORAGE_KEY}-persistent://${name}@${version}`
   */
  public get key(): string {
    return PersistentStorage.key(this.name, this.version);
  }

  /**
   * Gets the storage key for the previous version.
   * The key format is `${STORAGE_KEY}-persistent://${name}@${previousVersion}`
   */
  public get oldKey(): string {
    return PersistentStorage.key(this.name, this.previousVersion);
  }

  /**
   * Creates a new instance of PersistentStorage.
   *
   * @param name - The name of the storage instance
   * @param init - Optional initial data for the storage
   * @param version - The version of the storage schema (default: '1.0.0')
   * @param previousVersion - Optional previous version for migration purposes
   */
  constructor(
    protected name: string,
    protected init?: T,
    protected version = '1.0.0',
    protected previousVersion?: string
  ) {
    super(name, init, version, previousVersion, hasLocalStorage() ? localStorage : undefined);
  }
}

/**
 * Creates a persistent storage instance that automatically syncs with localStorage.
 *
 * @template T - The type of the initial data object
 * @template S - The type of the linkable schema
 * @param {string} name - The unique name for the persistent storage instance
 * @param {T} init - The initial data to populate the storage with
 * @param {AnchorOptions<S>} [options] - Optional configuration options for the storage
 * @returns {T} A reactive object that persists data to localStorage
 */
export const persistent = (<T extends ObjLike, S extends LinkableSchema = LinkableSchema>(
  name: string,
  init: T,
  options?: AnchorOptions<S>
): T => {
  return session(name, init, options, PersistentStorage);
}) as PersistentFn;

/**
 * Disconnects a reactive persistent object from localStorage synchronization.
 *
 * @template T - The type of the object to disconnect
 * @param {T} state - The reactive object to stop syncing with localStorage
 */
persistent.leave = <T extends ObjLike>(state: T) => {
  return session.leave(state);
};
