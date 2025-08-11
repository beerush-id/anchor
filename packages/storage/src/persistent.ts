import { session, SessionStorage, STORAGE_KEY } from './session.js';
import type { AnchorOptions, ObjLike } from '@anchor/core';
import type { ZodType } from 'zod/v4';

const hasLocalStorage = () => typeof sessionStorage !== 'undefined';

export class PersistentStorage<T extends Record<string, unknown> = Record<string, unknown>> extends SessionStorage<T> {
  public get key(): string {
    return `${STORAGE_KEY}-persistent://${this.name}@${this.version}`;
  }

  public get oldKey(): string {
    return `${STORAGE_KEY}-persistent://${this.name}@${this.previousVersion ?? '-1.0.0'}`;
  }
  constructor(
    protected name: string,
    protected init?: T,
    protected version = '1.0.0',
    protected previousVersion?: string
  ) {
    super(name, init, version, previousVersion, hasLocalStorage() ? localStorage : undefined);
  }
}

export interface PersistentFn {
  /**
   * Create a reactive persistent object.
   * Persistent object will sync with local storage.
   * @param {string} name
   * @param {T} init
   * @param {AnchorOptions<S>} options
   * @returns {T}
   */
  <T extends ObjLike, S extends ZodType = ZodType>(name: string, init: T, options?: AnchorOptions<S>): T;

  /**
   * Leave a reactive persistent object.
   * Leaving a reactive persistent object will stop syncing with local storage.
   * @param {T} state
   */
  leave<T extends ObjLike>(state: T): void;
}

export const persistent = (<T extends ObjLike, S extends ZodType = ZodType>(
  name: string,
  init: T,
  options?: AnchorOptions<S>
): T => {
  return session(name, init, options, PersistentStorage);
}) as PersistentFn;

persistent.leave = <T extends ObjLike>(state: T) => {
  return session.leave(state);
};
