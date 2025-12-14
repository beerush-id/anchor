import { describe, expect, it, vi } from 'vitest';
import { IRPCCall } from '../src/call.js';

describe('IRPCCall', () => {
  describe('constructor', () => {
    it('should create call with payload and callbacks', () => {
      const payload = { name: 'testFunc', args: ['arg1'] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);

      expect(call.payload).toBe(payload);
      expect(call.resolver).toBe(resolver);
      expect(call.rejector).toBe(rejector);
      expect(call.resolved).toBe(false);
      expect(typeof call.id).toBe('string');
      expect(call.id).toHaveLength(36); // UUID length
    });
  });

  describe('resolve', () => {
    it('should call resolver callback with value', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);
      const result = { data: 'test' };

      call.resolve(result);

      expect(resolver).toHaveBeenCalledWith(result);
      expect(rejector).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });

    it('should not call resolver multiple times', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);
      const result1 = { data: 'test1' };
      const result2 = { data: 'test2' };

      call.resolve(result1);
      call.resolve(result2);

      expect(resolver).toHaveBeenCalledTimes(1);
      expect(resolver).toHaveBeenCalledWith(result1);
      expect(call.resolved).toBe(true);
    });
  });

  describe('reject', () => {
    it('should call rejector callback with error', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);
      const error = new Error('Test error');

      call.reject(error);

      expect(rejector).toHaveBeenCalledWith(error);
      expect(resolver).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });

    it('should not call rejector multiple times', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);
      const error1 = new Error('Test error 1');
      const error2 = new Error('Test error 2');

      call.reject(error1);
      call.reject(error2);

      expect(rejector).toHaveBeenCalledTimes(1);
      expect(rejector).toHaveBeenCalledWith(error1);
      expect(call.resolved).toBe(true);
    });

    it('should handle reject without error', () => {
      const payload = { name: 'testFunc', args: [] };
      const resolver = vi.fn();
      const rejector = vi.fn();

      const call = new IRPCCall(payload, resolver, rejector);

      call.reject();

      expect(rejector).toHaveBeenCalledWith(undefined);
      expect(resolver).not.toHaveBeenCalled();
      expect(call.resolved).toBe(true);
    });
  });
});
