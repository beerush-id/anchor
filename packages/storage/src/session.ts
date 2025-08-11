import { MemoryStorage } from './memory.js';
import type { AnchorOptions, ObjLike, StateUnsubscribe } from '@anchor/core';
import { anchor, derive, logger } from '@anchor/core';
import { isBrowser } from '@beerush/utils';
import type { ZodType } from 'zod/v4';

export const STORAGE_KEY = 'anchor';
export const STORAGE_SYNC = new Map<string, ObjLike>();

const hasSessionStorage = () => typeof sessionStorage !== 'undefined';

export class SessionStorage<T extends Record<string, unknown> = Record<string, unknown>> extends MemoryStorage<T> {
  public get key(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.version}`;
  }

  public get oldKey(): string {
    return `${STORAGE_KEY}-session://${this.name}@${this.previousVersion ?? '-1.0.0'}`;
  }

  constructor(
    protected name: string,
    protected init?: T,
    protected version = '1.0.0',
    protected previousVersion?: string,
    protected adapter?: Storage
  ) {
    super(init);

    if (!adapter && hasSessionStorage()) {
      this.adapter = sessionStorage;
    }

    if (this.adapter) {
      if (this.previousVersion) {
        this.adapter.removeItem(this.oldKey);
      }

      const stored = this.adapter.getItem(this.key);

      if (stored) {
        try {
          const storedData = JSON.parse(stored) as Record<string, unknown>;
          this.assign(storedData);
        } catch (error) {
          logger.error(`Unable to initialize storage: "${this.key}".`, error);
        }
      } else if (this.length) {
        this.adapter.setItem(this.key, this.json());
      }
    }
  }

  public set(key: keyof T, value: T[keyof T]) {
    super.set(key, value);
    this.write();
  }

  public delete(key: keyof T) {
    super.delete(key);
    this.write();
  }

  public write() {
    if (typeof this.adapter === 'undefined') return;

    try {
      if (this.length > 0) {
        this.adapter?.setItem(this.key, this.json());
      } else {
        this.adapter?.removeItem(this.key);
      }
    } catch (error) {
      logger.error(`Unable to write storage: "${this.key}".`, error);
    }
  }
}

const STORAGE_REGISTRY = new WeakMap<ObjLike, SessionStorage>();
const STORAGE_SUBSCRIPTION_REGISTRY = new WeakMap<ObjLike, StateUnsubscribe>();

export interface SessionFn {
  /**
   * Create a reactive session object.
   * Session object will sync with session storage.
   * @param {string} name
   * @param {T} init
   * @param {AnchorOptions<S>} options
   * @param {typeof SessionStorage} storageClass
   * @returns {T}
   */
  <T extends ObjLike, S extends ZodType = ZodType>(
    name: string,
    init: T,
    options?: AnchorOptions<S>,
    storageClass?: typeof SessionStorage
  ): T;

  /**
   * Leave a reactive session object.
   * Leaving a reactive session object will stop syncing with session storage.
   * @param {T} state
   */
  leave<T extends ObjLike>(state: T): void;
}

export const session = (<T extends ObjLike, S extends ZodType = ZodType>(
  name: string,
  init: T,
  options?: AnchorOptions<S>,
  storageClass = SessionStorage
): T => {
  const state = anchor(init, options);

  if (isBrowser() && !STORAGE_REGISTRY.has(state)) {
    const storage = new storageClass(name, state) as SessionStorage;
    STORAGE_REGISTRY.set(state, storage);

    const controller = derive.resolve(state);

    if (typeof controller?.subscribe === 'function') {
      STORAGE_SYNC.set(storage.key, state);

      const stateUnsubscribe = controller.subscribe(() => {
        storage?.write();
      });
      const unsubscribe = () => {
        stateUnsubscribe?.();
        STORAGE_SYNC.delete(storage.key);
      };

      STORAGE_SUBSCRIPTION_REGISTRY.set(state, unsubscribe);
    }
  }

  return state;
}) as SessionFn;

session.leave = <T extends ObjLike>(state: T) => {
  const unsubscribe = STORAGE_SUBSCRIPTION_REGISTRY.get(state);

  if (typeof unsubscribe === 'function') {
    unsubscribe();
  }

  STORAGE_REGISTRY.delete(state);
  STORAGE_SUBSCRIPTION_REGISTRY.delete(state);
};

if (isBrowser()) {
  window.addEventListener('storage', (event) => {
    if (!event.key) return;

    if (STORAGE_SYNC.has(event.key)) {
      const state = STORAGE_SYNC.get(event.key) as ObjLike;

      try {
        const data = JSON.parse(event.newValue ?? '');
        anchor.assign(state, data as ObjLike);
      } catch (error) {
        logger.error(`Unable to parse new value of: "${event.key}".`, error);
      }
    }
  });
}
