import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IndexedKv } from '../../src/db/index.js';
import { clearIndexedDBMock, mockIndexedDB } from '../../mocks/indexeddb-mock.js';

describe('IndexedKV Module - Edge Cases', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockIndexedDB();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    clearIndexedDBMock();
  });

  it('should handle setting value before database open', async () => {
    const kv = new IndexedKv<string>('test-kv-edge-1');

    await kv.set('key1', 'ignored').promise();
    await kv.promise();

    expect(kv.get('key1')).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should handle deleting value before database open', async () => {
    const kv = new IndexedKv<string>('test-kv-edge-1');

    await kv.delete('key1').promise();
    await kv.promise();

    expect(kv.get('key1')).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });

  it('should handler db error during kv:setup operation', async () => {
    const kv = new IndexedKv<string>('test-kv-edge-1');
    await kv.promise();

    const handler = vi.fn();
    const request = {
      onerror: () => {},
      error: new Error('Set error'),
    };

    // Override the instance to mock the writer.
    kv.connection = {
      ...kv.connection,
      instance: {
        ...kv.connection.instance,
        transaction: () =>
          ({
            objectStore: () => ({
              openCursor: () => request,
            }),
          }) as never,
      } as never,
    };

    (kv as never as { setup: () => Promise<void> }).setup().catch(handler);
    request.onerror();

    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(handler).toHaveBeenCalled();
  });

  it('should handler db error when writing kv:set operation', async () => {
    const kv = new IndexedKv<string>('test-kv-edge-1');
    await kv.promise();
    await kv.set('test', 'test-value').promise();

    const errHandler = vi.fn();
    const request = {
      onerror: () => {},
      error: new Error('Set error'),
    };

    // Override the instance to mock the writer.
    kv.connection = {
      ...kv.connection,
      instance: {
        ...kv.connection.instance,
        transaction: () =>
          ({
            objectStore: () => ({
              put: () => {
                setTimeout(() => request.onerror(), 5);
                return request;
              },
            }),
          }) as never,
      } as never,
    };

    kv.set('test', 'test', errHandler);
    await kv.completed();

    kv.set('unknown', 'test');
    await kv.completed();

    expect(errorSpy).toHaveBeenCalled();
    expect(errHandler).toHaveBeenCalled();

    const result = kv.set('test', 'test');

    // Promise based handler.
    await result.promise().catch(errHandler);
    expect(errHandler).toHaveBeenCalledTimes(2);

    // Make sure awaiting already resolved promise behaves the same.
    await result.promise().catch(errHandler);
    expect(errHandler).toHaveBeenCalledTimes(3);
  });

  it('should handler db error when writing kv:delete operation', async () => {
    const kv = new IndexedKv<string>('test-kv-edge-1');
    await kv.promise();

    await kv.set('test', 'test-value').promise();

    const errHandler = vi.fn();

    // Override the instance to mock the writer.
    kv.connection = {
      ...kv.connection,
      instance: {
        ...kv.connection.instance,
        transaction: () =>
          ({
            objectStore: () => ({
              delete: () => {
                const request = {
                  onerror: () => {},
                  error: new Error('Delete error'),
                };
                setTimeout(() => request.onerror(), 5);
                return request;
              },
            }),
          }) as never,
      } as never,
    };

    kv.delete('test', errHandler);
    await kv.completed();

    expect(errorSpy).toHaveBeenCalled();
    expect(errHandler).toHaveBeenCalled();

    const result = kv.delete('test');

    // Promise based handler.
    await result.promise().catch(errHandler);
    expect(errHandler).toHaveBeenCalledTimes(2);

    // Make sure awaiting already resolved promise behaves the same.
    await result.promise().catch(errHandler);
    expect(errHandler).toHaveBeenCalledTimes(3);
  });

  it('should support kvFn.remove, kvFn.ready, and kvFn.store', async () => {
    const { createKVStore } = await import('../../src/db/kv.js');
    const myKv = createKVStore('test-remove-store');
    await myKv.ready();

    expect(myKv.store()).toBeDefined();

    // Remove non-cached key
    myKv.remove('non_cached_key');

    // Create state and remove cached key
    const state = myKv('cached_key', 'initial_value');
    await new Promise((resolve) => setTimeout(resolve, 20));

    myKv.remove('cached_key');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(state.status).toBe('removed');

    const activeState = myKv('active_key', 'active_val');
    myKv.leave(activeState);
    myKv.leave({} as never);
  });
});
