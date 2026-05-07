import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as Context from '../src/context.js';
import { IRPC_STATUS } from '../src/enum.js';
import { RemoteState, stream } from '../src/state.js';

describe('RemoteState', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default values', () => {
    const state = new RemoteState('initial');
    expect(state.data).toBe('initial');
    expect(state.status).toBe(IRPC_STATUS.PENDING);
    expect(state.error).toBeUndefined();
  });

  it('should call no-op start method', () => {
    const state = new RemoteState('initial');
    expect(() => state.start()).not.toThrow();
  });

  it('should react to data changes via subscription', () => {
    const state = new RemoteState(0);
    const subscriber = vi.fn();

    state.subscribe(subscriber);

    // Anchor emits 'init' immediately upon subscribe
    expect(subscriber).toHaveBeenCalledTimes(1);
    expect(subscriber.mock.calls[0][1].type).toBe('init');

    state.data = 1;
    expect(subscriber).toHaveBeenCalledTimes(2);
    expect(subscriber.mock.calls[1][1].keys).toEqual(['data']);
    expect(subscriber.mock.calls[1][1].value).toBe(1);
  });

  it('should resolve as a Promise when status is SUCCESS', async () => {
    const state = new RemoteState('pending');

    setTimeout(() => {
      state.data = 'completed';
      state.status = IRPC_STATUS.SUCCESS;
    }, 10);

    const result = await state;
    expect(result).toBe('completed');
  });

  it('should reject as a Promise when status is ERROR', async () => {
    const state = new RemoteState('pending');

    setTimeout(() => {
      state.error = new Error('Test Failure');
      state.status = IRPC_STATUS.ERROR;
    }, 10);

    try {
      await state;
      expect.fail('Should have thrown');
    } catch (error) {
      expect((error as Error).message).toBe('Test Failure');
    }
  });

  it('should chain Promises correctly via [Symbol.species]', async () => {
    const state = new RemoteState('start');

    setTimeout(() => {
      state.data = 'finish';
      state.status = IRPC_STATUS.SUCCESS;
    }, 10);

    const chained = state.then((val) => val + 'ed');

    // The chained promise should NOT be an instance of RemoteState
    // due to static [Symbol.species] = Promise
    expect(chained instanceof RemoteState).toBe(false);
    expect(chained instanceof Promise).toBe(true);

    const result = await chained;
    expect(result).toBe('finished');
  });

  it('should explicitly clean up state via close()', () => {
    const state = new RemoteState('start');
    const destroySpy = vi.spyOn(state as any, 'destroy');
    state.close();
    expect(destroySpy).toHaveBeenCalled();
  });

  describe('stream utility factory', () => {
    it('should natively configure RemoteState pipeline', () => {
      const activeStream = stream((state) => {
        expect(state.data).toBe('seeded');
      }, 'seeded');

      expect(activeStream).toBeInstanceOf(RemoteState);
      expect(activeStream.data).toBe('seeded');
      expect(activeStream.status).toBe(IRPC_STATUS.PENDING);
    });

    it('should properly execute manual resolution via inner closure strictly', async () => {
      const activeStream = stream<string[]>((state, resolve) => {
        state.data.push('loaded');
        resolve();
      }, []);

      const result = await activeStream;

      expect(result).toEqual(['loaded']);
      expect(activeStream.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should capture exact sync crashes dynamically binding to reject pipe', async () => {
      const activeStream = stream(() => {
        throw new Error('Sync pipeline crash');
      });

      await expect(activeStream).rejects.toThrow('Sync pipeline crash');
      expect(activeStream.status).toBe(IRPC_STATUS.ERROR);
    });

    it('should securely accept optional payload mutations dynamically during terminal resolution', async () => {
      const activeStream = stream<string>((data, resolve) => {
        resolve('Terminal override');
      }, 'Initial data');

      const result = await activeStream;

      expect(result).toBe('Terminal override');
      expect(activeStream.data).toBe('Terminal override');
      expect(activeStream.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should hook strictly unto promise chains securing unhandled errors natively', async () => {
      const activeStream = stream(async () => {
        await Promise.resolve();
        throw new Error('Async pipeline failure');
      });

      await expect(activeStream).rejects.toThrow('Async pipeline failure');
      expect(activeStream.status).toBe(IRPC_STATUS.ERROR);
    });
    it('should invoke async cleanup cleanly if aborted before promise resolves natively', async () => {
      const abortController = new AbortController();
      vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);

      const futureCleanup = vi.fn();
      const activeStream = stream(async () => {
        return futureCleanup;
      });

      abortController.abort(); // Triggers abort during PENDING lifecycle

      await new Promise((resolve) => setTimeout(resolve, 10)); // Flush promises

      expect(futureCleanup).toHaveBeenCalled();

      vi.restoreAllMocks();
    });

    it('should register abort listener for async cleanup if not yet aborted natively', async () => {
      const abortController = new AbortController();
      vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);

      const futureCleanup = vi.fn();
      let resolveCleanup: any;
      stream(async () => {
        await new Promise((r) => {
          resolveCleanup = r;
        });
        return futureCleanup;
      });

      resolveCleanup();
      await new Promise((resolve) => setTimeout(resolve, 0));

      abortController.abort();
      expect(futureCleanup).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });

    it('should safely bind sync cleanup statically to abort hook pipeline', async () => {
      const abortController = new AbortController();
      vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);

      const syncCleanup = vi.fn();
      stream(() => {
        return syncCleanup;
      });

      abortController.abort();

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(syncCleanup).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });

    it('should fire sync cleanup dynamically if previously aborted', async () => {
      const abortController = new AbortController();
      vi.spyOn(Context, 'getAbortSignal').mockReturnValue(abortController.signal);

      abortController.abort(); // Aborted before mapping

      const syncCleanup = vi.fn();
      stream(() => {
        return syncCleanup; // Cleanup runs instantly logically
      });

      expect(syncCleanup).toHaveBeenCalledTimes(1);

      vi.restoreAllMocks();
    });
  });
});
