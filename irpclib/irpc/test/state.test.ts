import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IRPC_STATUS } from '../src/enum.js';
import { RemoteState } from '../src/state.js';

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
});
