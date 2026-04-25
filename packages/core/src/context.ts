import { captureStack } from './exception.js';

// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncKey = any;
// biome-ignore lint/suspicious/noExplicitAny: Expected.
export type AsyncValue = any;

export class AsyncStore extends Map<AsyncKey, AsyncValue> {
  public parent?: AsyncStore;
  public secure?: boolean;

  constructor(parent?: AsyncStore);
  constructor(seeds: Iterable<readonly [AsyncKey, AsyncValue]>, parent?: AsyncStore);
  constructor(seeds?: Iterable<readonly [AsyncKey, AsyncValue]> | AsyncStore, parent?: AsyncStore) {
    super(seeds instanceof AsyncStore ? undefined : seeds);
    this.parent = seeds instanceof AsyncStore ? seeds : parent;
  }

  public get(key: AsyncKey): AsyncValue | undefined {
    return super.get(key) ?? this.parent?.get(key);
  }
}

class Awaited<T> {
  constructor(
    private promise: Promise<T>,
    private context: AsyncContext<T>,
    private current: T,
    private isolated?: boolean
  ) {}

  private fork(fn?: (arg: unknown) => unknown) {
    if (!fn) return;

    const handler = (arg: unknown) => {
      const current = this.context.getStore();
      this.context.store = this.current;

      const destroyed = this.context.store instanceof AsyncStore && this.context.store.get(ISOLATED_CONTEXT_KEY);

      if (typeof destroyed === 'function' && destroyed()) {
        const error = new Error('Hanging async context!');
        captureStack.violation.general(
          'Hanging async context awaiter detected!',
          'Attempted to access detached isolated Async Context.',
          error,
          [
            'Accessing async context in a detached isolation is highly discouraged.',
            '- Make sure to await your awaited function.',
            '- Avoid running a hanging "then" in an isolated context.',
            '- Documentation: https://anchorlib.dev/docs/async-context',
          ],
          handler
        );
      }

      try {
        return fn(arg);
      } finally {
        this.context.store = current;
      }
    };

    return handler;
  }

  // biome-ignore lint/suspicious/noThenProperty: Expect Any.
  public then(onfulfilled?: (value: unknown) => unknown, onrejected?: (reason: unknown) => unknown) {
    const accept = this.fork(onfulfilled);
    const reject = this.fork(onrejected);
    const future = this.promise.then(accept, reject);

    return new Awaited(future, this.context, this.current, this.isolated);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Expect Any.
  public catch<E>(onrejected?: (reason: any) => E | PromiseLike<E>) {
    return this.then(undefined, onrejected);
  }

  public finally(onfinally?: () => void) {
    const future = this.promise.finally(this.fork(onfinally) as () => void);
    return new Awaited(future, this.context, this.current, this.isolated);
  }
}

export class AsyncContext<T> {
  public store?: T;

  constructor(init?: T) {
    this.store = init;
  }

  public run<R>(store: T, fn: () => R) {
    return this.awaited(fn, store);
  }

  public awaited<R>(fn: () => R, store?: T) {
    const current = this.store;
    const restore = () => {
      this.store = current;
    };

    if (store) {
      this.store = store;
    }

    try {
      const result = fn();

      if (result instanceof Promise) {
        const isolated = !!(this.store instanceof AsyncStore && this.store.get(ISOLATED_CONTEXT_KEY));
        return new Awaited(result.finally(restore), this, this.store, isolated) as never as Promise<R>;
      }

      return result;
    } finally {
      restore();
    }
  }

  public getStore() {
    return this.store;
  }
}

const globalStore = new AsyncStore();
const globalAsyncCtx = new AsyncContext(globalStore);

export function inContext<R>(fn: () => R, store?: AsyncStore) {
  const parent = globalAsyncCtx.getStore()!;
  const childStore = store ?? new AsyncStore(parent);

  const secure = parent.get(ISOLATED_CONTEXT_KEY);
  if (secure) childStore.set(ISOLATED_CONTEXT_KEY, true);

  return globalAsyncCtx.awaited(fn, childStore);
}

const ISOLATED_CONTEXT_KEY = Symbol('anchor-secure-context');

export async function isolatedContext<R>(fn: () => R) {
  let destroyed = false;
  const isDestroyed = () => destroyed;

  const parent = globalAsyncCtx.getStore()!;
  const isolatedStore = new AsyncStore([[ISOLATED_CONTEXT_KEY, isDestroyed]], parent);

  try {
    return await globalAsyncCtx.awaited(fn, isolatedStore);
  } finally {
    destroyed = true;
  }
}

export function awaited<R>(fn: () => R) {
  return globalAsyncCtx.awaited<R>(fn);
}

export function getAsyncContext<R>(key: AsyncKey): R {
  return globalAsyncCtx.getStore()!.get(key);
}

export function setAsyncContext(key: AsyncKey, value: AsyncValue) {
  return globalAsyncCtx.getStore()!.set(key, value);
}

function getAll(list: AsyncStore[] = [], from?: AsyncStore) {
  const store = from ?? globalAsyncCtx.getStore()!;

  list.push(store);

  if (store.parent) {
    return getAll(list, store.parent);
  }

  return list;
}

export const getAllAsyncContext = getAll as () => AsyncStore[];
