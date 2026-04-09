import { describe, expect, it, vi } from 'vitest';
import { IRPCCall } from '../src/call.js';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from '../src/enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from '../src/error.js';
import type { IRPCTransport } from '../src/index.js';

describe('IRPCCall', () => {
  const mockTransport = {
    schedule: vi.fn(),
  } as unknown as IRPCTransport;

  describe('constructor', () => {
    it('should create call with payload and options', () => {
      const payload = { name: 'testFunc', args: ['arg1'] };
      const options = { timeout: 1000 };

      const call = new IRPCCall(mockTransport, payload, options);

      expect(call.payload).toBe(payload);
      expect(call.options).toBe(options);
      expect(call.resolved).toBe(false);
      expect(typeof call.id).toBe('string');
      expect(call.id).toHaveLength(36); // UUID length
      expect(call.reader).toBeDefined();
    });

    it('should set timeout timer if timeout option is provided and dispatch CLOSE to reader', () => {
      vi.useFakeTimers();
      const payload = { name: 'testFunc', args: [] };
      const options = { timeout: 1000 };

      const call = new IRPCCall(mockTransport, payload, options);
      call.reader.catch(() => {}); // Hide error message.
      const pushSpy = vi.spyOn(call.reader, 'push');

      vi.advanceTimersByTime(1000);

      expect(pushSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: expect.objectContaining({
            message: ERROR_MESSAGE[ERROR_CODE.TIMEOUT],
          }),
        })
      );

      vi.useRealTimers();
    });
  });

  describe('resolve', () => {
    it('should statically set resolved to true', () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, {});
      const result = { data: 'test' };

      call.resolve(result);

      expect(call.resolved).toBe(true);
      expect(call.value).toBe(result);
      expect(call.status).toBe(IRPC_STATUS.SUCCESS);
    });

    it('should ignore multiple redundant resolves', () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, {});
      const result1 = { data: 'test1' };
      const result2 = { data: 'test2' };

      call.resolve(result1);
      call.resolve(result2);

      expect(call.resolved).toBe(true);
      expect(call.value).toBe(result1);
    });
  });

  describe('reject', () => {
    it('should definitively set state error without retries map', () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, { maxRetries: 0 });
      const error = new Error('Test error');

      call.reject(error);

      expect(call.resolved).toBe(true);
      expect(call.error).toBe(error);
      expect(call.status).toBe(IRPC_STATUS.ERROR);
    });

    it('should not mutate error iteratively', () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, { maxRetries: 0 });
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');

      call.reject(error1);
      call.reject(error2);

      expect(call.resolved).toBe(true);
      expect(call.error).toBe(error1);
    });
  });

  describe('enqueue', () => {
    it('should map ANSWER tracking to explicit successful resolve dynamically', () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, {});

      call.enqueue({
        id: call.id,
        name: 'testFunc',
        type: IRPC_PACKET_TYPE.ANSWER,
        status: IRPC_STATUS.SUCCESS,
        data: 'Network Payload',
        createdAt: Date.now(),
      });

      expect(call.resolved).toBe(true);
      expect(call.value).toBe('Network Payload');
    });

    it('should securely trigger fallback reject if stream receives structural CLOSE ERROR securely', async () => {
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(mockTransport, payload, { maxRetries: 0 });

      call.reader.catch(() => {}); // Hide error message.

      call.enqueue({
        id: call.id,
        name: 'testFunc',
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: { code: ERROR_CODE.UNKNOWN, message: 'Bad network pipe' },
        createdAt: Date.now(),
      });

      expect(call.resolved).toBe(true);
      expect(call.error?.message).toBe('Bad network pipe');
    });
  });

  describe('Retry Logic', () => {
    it('should retry call when maxRetries is set successfully triggering scheduler', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const options = {
        maxRetries: 3,
        retryDelay: 10,
        retryMode: 'linear' as const,
      };

      const call = new IRPCCall(transport, payload, options);
      const error = new Error('Test error');

      vi.useFakeTimers();

      call.reject(error);

      expect(call.resolved).toBe(false);
      expect(transport.schedule).not.toHaveBeenCalled();

      vi.advanceTimersByTime(10);

      expect(transport.schedule).toHaveBeenCalledWith(call);
      expect((call as any).retries).toBe(1);

      vi.useRealTimers();
    });

    it('should not retry when maxRetries is safely disabled structurally', () => {
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;
      const payload = { name: 'testFunc', args: [] };
      const call = new IRPCCall(transport, payload, { maxRetries: 0 });
      const error = new Error('Test error');

      call.reject(error);

      expect(call.resolved).toBe(true);
      expect(transport.schedule).not.toHaveBeenCalled();
    });

    it('should stop securely recovering loops when maxRetries boundary triggers conclusively', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const transport = {
        schedule: vi.fn(),
      } as unknown as IRPCTransport;

      const call = new IRPCCall(
        transport,
        { name: 'testFunc', args: [] },
        {
          maxRetries: 1,
          retryDelay: 10,
        }
      );
      const error = new Error('Test error');

      vi.useFakeTimers();

      // First failure triggers schedule implicitly
      call.reject(error);
      vi.advanceTimersByTime(10);
      expect(transport.schedule).toHaveBeenCalledTimes(1);

      // Second failure hits limit statically resolving error cleanly
      call.reject(error);

      expect(call.resolved).toBe(true);
      expect(transport.schedule).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
      errorSpy.mockRestore();
    });

    it('should use accurate exponential backoff timers dynamically mapped', () => {
      const transport = { schedule: vi.fn() } as unknown as IRPCTransport;
      const call = new IRPCCall(
        transport,
        { name: 'test', args: [] },
        {
          maxRetries: 3,
          retryDelay: 10,
          retryMode: 'exponential',
        }
      );
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
