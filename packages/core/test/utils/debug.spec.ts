import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debug, setDebugger, withDebugger } from '../../src/index.js';

describe('Anchor Utilities - Debugger', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  let debugSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.fn();
  });

  afterEach(() => {
    errorSpy.mockRestore();
    setDebugger(undefined); // Reset debugger to undefined after each test
  });

  describe('setDebugger', () => {
    it('should set a debugger function', () => {
      const restore = setDebugger(debugSpy);
      debug('test message');
      expect(debugSpy).toHaveBeenCalledWith('test message');
      restore();
    });

    it('should allow setting debugger to undefined', () => {
      const restore = setDebugger(debugSpy);
      expect(() => setDebugger(undefined)).not.toThrow();
      restore();
    });

    it('should throw an error when setting a non-function and non-undefined value', () => {
      // @ts-expect-error - Testing invalid input
      expect(() => setDebugger('not a function')).toThrow('Debug function must be a function or undefined');
      // @ts-expect-error - Testing invalid input
      expect(() => setDebugger(123)).toThrow('Debug function must be a function or undefined');
      // @ts-expect-error - Testing invalid input
      expect(() => setDebugger({})).toThrow('Debug function must be a function or undefined');
    });

    it('should return a restore function that restores the previous debugger', () => {
      const oldDebugSpy = vi.fn();
      const newDebugSpy = vi.fn();

      const restore1 = setDebugger(oldDebugSpy);
      debug('test');
      expect(oldDebugSpy).toHaveBeenCalledWith('test');
      expect(newDebugSpy).not.toHaveBeenCalled();

      const restore2 = setDebugger(newDebugSpy);
      debug('test2');
      expect(oldDebugSpy).toHaveBeenCalledTimes(1);
      expect(newDebugSpy).toHaveBeenCalledWith('test2');

      restore2();
      debug('test3');
      expect(oldDebugSpy).toHaveBeenCalledWith('test3');
      expect(oldDebugSpy).toHaveBeenCalledTimes(2);
      expect(newDebugSpy).toHaveBeenCalledTimes(1);

      restore1();
    });

    it('should not restore multiple times', () => {
      const restore = setDebugger(debugSpy);
      debug('test');
      expect(debugSpy).toHaveBeenCalledWith('test');

      restore();
      restore(); // Second call should not have effect

      debug('test2');
      expect(debugSpy).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('withDebugger', () => {
    it('should temporarily set a debugger and restore the previous one', () => {
      const oldDebugSpy = vi.fn();
      const tempDebugSpy = vi.fn();

      const restore = setDebugger(oldDebugSpy);

      const result = withDebugger(() => {
        debug('during withDebugger');
        return 'result';
      }, tempDebugSpy);

      debug('after withDebugger');

      expect(result).toBe('result');
      expect(oldDebugSpy).toHaveBeenCalledWith('after withDebugger');
      expect(tempDebugSpy).toHaveBeenCalledWith('during withDebugger');
      expect(oldDebugSpy).toHaveBeenCalledTimes(1);
      expect(tempDebugSpy).toHaveBeenCalledTimes(1);

      restore();
    });

    it('should restore debugger even if function throws', () => {
      const oldDebugSpy = vi.fn();
      const tempDebugSpy = vi.fn();

      const restore = setDebugger(oldDebugSpy);

      withDebugger(() => {
        debug('during withDebugger');
        throw new Error('test error');
      }, tempDebugSpy);

      debug('after withDebugger');

      expect(oldDebugSpy).toHaveBeenCalledWith('after withDebugger');
      expect(tempDebugSpy).toHaveBeenCalledWith('during withDebugger');
      expect(tempDebugSpy).toHaveBeenCalledWith(expect.any(Error));
      expect(oldDebugSpy).toHaveBeenCalledTimes(1);
      expect(tempDebugSpy).toHaveBeenCalledTimes(2);

      restore();
    });
  });

  describe('debug', () => {
    it('should not call anything when no debugger is set', () => {
      expect(() => debug('test')).not.toThrow();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should call the debugger function when set', () => {
      const restore = setDebugger(debugSpy);
      debug('test message', 'extra arg');
      expect(debugSpy).toHaveBeenCalledWith('test message', 'extra arg');
      restore();
    });

    it('should handle debug.ok method', () => {
      const restore = setDebugger(debugSpy);
      debug.ok('success message', 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ success message\x1b[0m', 'extra');
      restore();
    });

    it('should handle debug.info method', () => {
      const restore = setDebugger(debugSpy);
      debug.info('info message', 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[34mℹ info message\x1b[0m', 'extra');
      restore();
    });

    it('should handle debug.check method with truthy condition', () => {
      const restore = setDebugger(debugSpy);
      debug.check('check message', true, 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[36m▣ check message\x1b[0m', 'extra');
      restore();
    });

    it('should handle debug.check method with falsy condition', () => {
      const restore = setDebugger(debugSpy);
      debug.check('check message', false, 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[37m▢ check message\x1b[0m', 'extra');
      restore();
    });

    it('should handle debug.error method', () => {
      const restore = setDebugger(debugSpy);
      debug.error('error message', 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[31m✕ error message\x1b[0m', 'extra');
      restore();
    });

    it('should handle debug.warning method', () => {
      const restore = setDebugger(debugSpy);
      debug.warning('warning message', 'extra');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[33m! warning message\x1b[0m', 'extra');
      restore();
    });

    it('should not call debugger methods when no debugger is set', () => {
      expect(() => {
        debug.ok('success');
        debug.info('info');
        debug.check('check', true);
        debug.error('error');
        debug.warning('warning');
      }).not.toThrow();

      expect(errorSpy).not.toHaveBeenCalled();
    });

    it('should handle edge cases with multiple arguments', () => {
      const restore = setDebugger(debugSpy);

      debug.ok('message', 1, true, null, undefined, { key: 'value' }, ['array']);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ message\x1b[0m', 1, true, null, undefined, { key: 'value' }, [
        'array',
      ]);

      restore();
    });

    it('should handle edge cases with special characters in messages', () => {
      const restore = setDebugger(debugSpy);

      debug('message with \n newline and \t tab');
      expect(debugSpy).toHaveBeenCalledWith('message with \n newline and \t tab');

      debug.ok('message with \x1b[32m color codes');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ message with \x1b[32m color codes\x1b[0m');

      restore();
    });

    it('should handle empty arguments', () => {
      const restore = setDebugger(debugSpy);

      debug();
      expect(debugSpy).toHaveBeenCalledWith();

      restore();
    });
  });
});
