import { describe, expect, it, vi } from 'vitest';
import { IRPCCall } from '../src/call.js';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import type { IRPCTransport } from '../src/index.js';

describe('IRPCCall', () => {
  const mockTransport = {
    schedule: vi.fn(),
  } as unknown as IRPCTransport;

  describe('constructor', () => {
    it('should create call with payload and options', () => {
      const payload = { name: 'testFunc', args: ['arg1'] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);

      expect(call.payload).toBe(payload);
      expect(call.options).toBe(options);
      expect(call.resolved).toBe(false);
      expect(typeof call.id).toBe('string');
      expect(call.id).toHaveLength(36); // UUID length
    });

    it('should set timeout timer if timeout option is provided', () => {
      vi.useFakeTimers();
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject, timeout: 1000 };

      new IRPCCall(mockTransport, payload, options);

      vi.advanceTimersByTime(1000);

      expect(reject).toHaveBeenCalledWith(
        expect.objectContaining({
          message: ERROR_MESSAGE[ERROR_CODE.TIMEOUT],
        })
      );

      vi.useRealTimers();
    });
  });

  describe('resolve', () => {
    it('should call resolver callback with value', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);
      const result = { data: 'test' };

      call.resolve(result);

      expect(resolve).toHaveBeenCalledWith(result);
      expect(reject).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });

    it('should not call resolver multiple times', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);
      const result1 = { data: 'test1' };
      const result2 = { data: 'test2' };

      call.resolve(result1);
      call.resolve(result2);

      expect(resolve).toHaveBeenCalledTimes(1);
      expect(resolve).toHaveBeenCalledWith(result1);
      expect(call.resolved).toBe(true);
    });
  });

  describe('reject', () => {
    it('should call rejector callback with error', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);
      const error = new Error('Test error');

      call.reject(error);

      expect(reject).toHaveBeenCalledWith(error);
      expect(resolve).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });

    it('should not call rejector multiple times', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');

      call.reject(error1);
      call.reject(error2);

      expect(reject).toHaveBeenCalledTimes(1);
      expect(reject).toHaveBeenCalledWith(error1);
      expect(call.resolved).toBe(true);
    });

    it('should handle reject without error', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = { resolve, reject };

      const call = new IRPCCall(mockTransport, payload, options);

      call.reject();

      expect(reject).toHaveBeenCalledWith(undefined);
      expect(resolve).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });
  });

  describe('Retry Logic', () => {
    it('should retry call when maxRetries is set', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = {
        maxRetries: 3,
        retryDelay: 10,
        retryMode: 'linear' as const,
        resolve,
        reject,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      vi.useFakeTimers();

      call.reject(error);

      expect(reject).not.toHaveBeenCalled();
      expect(transport.schedule).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);

      expect(transport.schedule).toHaveBeenCalledWith(call);
      // Access private property for testing
      expect((call as any).retries).toBe(1);

      vi.useRealTimers();
    });

    it('should not retry when maxRetries is not set', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = {
        resolve,
        reject,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      call.reject(error);

      expect(reject).toHaveBeenCalledWith(error);
      expect(transport.schedule).not.toHaveBeenCalled();
    });

    it('should stop retrying when maxRetries is reached', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = {
        maxRetries: 1,
        retryDelay: 10,
        resolve,
        reject,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      vi.useFakeTimers();

      // First failure
      call.reject(error);
      vi.advanceTimersByTime(10);
      expect(transport.schedule).toHaveBeenCalledTimes(1);

      // Second failure (should fail permanently)
      call.reject(error);

      expect(reject).toHaveBeenCalledWith(error);
      expect(transport.schedule).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });

    it('should not retry if retriable is false', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = {
        maxRetries: 3,
        resolve,
        reject,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      call.reject(error, false);

      expect(reject).toHaveBeenCalledWith(error);
      expect(transport.schedule).not.toHaveBeenCalled();
    });

    it('should use exponential backoff', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const resolve = vi.fn();
      const reject = vi.fn();
      const options = {
        maxRetries: 3,
        retryDelay: 10,
        retryMode: 'exponential' as const,
        resolve,
        reject,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      vi.useFakeTimers();

      // First retry: 10 * 2^0 = 10ms
      call.reject(error);
      vi.advanceTimersByTime(9);
      expect(transport.schedule).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(transport.schedule).toHaveBeenCalledTimes(1);

      // Second retry: 10 * 2^1 = 20ms
      call.reject(error);
      vi.advanceTimersByTime(19);
      expect(transport.schedule).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(transport.schedule).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
