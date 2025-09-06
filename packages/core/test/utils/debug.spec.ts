import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createDebugger, debug, getDebugger, setDebugger, withDebugger } from '../../src/index.js';

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

    it('should get the current debugger function', () => {
      const restore = setDebugger(debugSpy);
      debug('test message');
      expect(debugSpy).toHaveBeenCalledWith('test message');

      const debugFn = getDebugger();
      expect(debugFn).toBe(debugSpy);

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

    it('should handle debugger function with missing methods by falling back to main debugger', () => {
      const restore = setDebugger(debugSpy);

      // Test that when debugger doesn't have specific methods, it falls back to main debugger
      debug.ok('test ok');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ test ok\x1b[0m');

      debug.info('test info');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[34mℹ test info\x1b[0m');

      debug.check('test check', true);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[36m▣ test check\x1b[0m');

      debug.error('test error');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[31m✕ test error\x1b[0m');

      debug.warning('test warning');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[33m! test warning\x1b[0m');

      restore();
    });

    it('should handle debugger function with custom methods', () => {
      const customDebugSpy = vi.fn();
      const customOkSpy = vi.fn();
      const customInfoSpy = vi.fn();

      const customDebugger = Object.assign(customDebugSpy, {
        ok: customOkSpy,
        info: customInfoSpy,
      });

      const restore = setDebugger(customDebugger);

      debug('regular debug');
      expect(customDebugSpy).toHaveBeenCalledWith('regular debug');

      debug.ok('custom ok');
      expect(customOkSpy).toHaveBeenCalledWith('\x1b[32m✓ custom ok\x1b[0m');

      debug.info('custom info');
      expect(customInfoSpy).toHaveBeenCalledWith('\x1b[34mℹ custom info\x1b[0m');

      // These should fall back to main debugger function
      debug.check('check fallback', true);
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[36m▣ check fallback\x1b[0m');

      debug.error('error fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[31m✕ error fallback\x1b[0m');

      debug.warning('warning fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[33m! warning fallback\x1b[0m');

      restore();
    });

    it('should handle debugger function with custom factory', () => {
      let cDebug = createDebugger();
      const customDebugSpy = vi.fn();
      const customOkSpy = vi.fn();
      const customInfoSpy = vi.fn();

      const customDebugger = Object.assign(customDebugSpy, {
        ok: customOkSpy,
        info: customInfoSpy,
      });

      const restore = setDebugger(customDebugger);

      cDebug('regular debug');
      expect(customDebugSpy).toHaveBeenCalledWith('regular debug');

      cDebug = createDebugger('test');

      cDebug.ok('custom ok');
      expect(customOkSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[32m✓ custom ok\x1b[0m');

      cDebug.info('custom info');
      expect(customInfoSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[34mℹ custom info\x1b[0m');

      // These should fall back to main debugger function
      cDebug.check('check fallback', true);
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[36m▣ check fallback\x1b[0m');

      cDebug.error('error fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[31m✕ error fallback\x1b[0m');

      cDebug.warning('warning fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[33m! warning fallback\x1b[0m');

      restore();
    });

    it('should handle debugger function with custom debugger factory', () => {
      const customOkSpy = vi.fn();
      const customInfoSpy = vi.fn();
      const customDebugSpy = vi.fn();

      const customDebugger = Object.assign(customDebugSpy, {
        ok: customOkSpy,
        info: customInfoSpy,
      });

      let cDebug = createDebugger(undefined, customDebugger);

      cDebug('regular debug');
      expect(customDebugSpy).toHaveBeenCalledWith('regular debug');

      cDebug.ok('custom ok');
      expect(customOkSpy).toHaveBeenCalledWith('\x1b[32m✓ custom ok\x1b[0m');

      cDebug.info('custom info');
      expect(customInfoSpy).toHaveBeenCalledWith('\x1b[34mℹ custom info\x1b[0m');

      cDebug = createDebugger('test', customDebugSpy);

      // These should fall back to main debugger function
      cDebug.check('check fallback', true);
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[36m▣ check fallback\x1b[0m');

      cDebug.error('error fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[31m✕ error fallback\x1b[0m');

      cDebug.warning('warning fallback');
      expect(customDebugSpy).toHaveBeenCalledWith('\x1b[1mtest\x1b[0m \x1b[33m! warning fallback\x1b[0m');
    });

    it('should correctly handle falsy values in debug messages', () => {
      const restore = setDebugger(debugSpy);

      debug.ok('zero value', 0);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ zero value\x1b[0m', 0);

      debug.info('null value', null);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[34mℹ null value\x1b[0m', null);

      debug.check('falsy condition', false, undefined);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[37m▢ falsy condition\x1b[0m', undefined);

      debug.error('empty string', '');
      expect(debugSpy).toHaveBeenCalledWith('\x1b[31m✕ empty string\x1b[0m', '');

      debug.warning('NaN value', NaN);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[33m! NaN value\x1b[0m', NaN);

      restore();
    });

    it('should handle complex nested objects and arrays in debug messages', () => {
      const restore = setDebugger(debugSpy);

      const complexObject = {
        nested: {
          array: [1, 2, { deep: 'value' }],
          func: () => 'test',
          date: new Date('2023-01-01'),
        },
      };

      debug.ok('complex object', complexObject);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[32m✓ complex object\x1b[0m', complexObject);

      debug.info('multiple args', 'string', 42, true, [1, 2, 3]);
      expect(debugSpy).toHaveBeenCalledWith('\x1b[34mℹ multiple args\x1b[0m', 'string', 42, true, [1, 2, 3]);

      restore();
    });

    it('should handle withDebugger returning correct values', () => {
      const restore = setDebugger(debugSpy);

      const result = withDebugger(() => {
        debug('inside withDebugger');
        return { value: 'test' };
      }, debugSpy);

      expect(result).toEqual({ value: 'test' });
      expect(debugSpy).toHaveBeenCalledWith('inside withDebugger');

      restore();
    });

    it('should properly restore debugger after withDebugger even with async operations', () => {
      const restore = setDebugger(debugSpy);
      const tempDebugSpy = vi.fn();

      new Promise((resolve) => {
        withDebugger(() => {
          debug('async debug');
          resolve('done');
        }, tempDebugSpy);
      });

      expect(tempDebugSpy).toHaveBeenCalledWith('async debug');

      restore();
    });
  });
});
