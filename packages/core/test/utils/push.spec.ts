import { describe, expect, it, vi } from 'vitest';
import { micropush } from '../../src/index.js';

describe('Anchor Utilities - Push', () => {
  describe('Micro Push (micropush)', () => {
    it('should register and execute a handler function', () => {
      const [push] = micropush();
      const handler = vi.fn();

      const exec = push(handler);
      exec();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should only execute the handler once', () => {
      const [push] = micropush();
      const handler = vi.fn();

      const exec = push(handler);
      exec();
      exec();

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should replace previous handler when new one is registered', () => {
      const [push] = micropush();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const exec1 = push(handler1);
      const exec2 = push(handler2);

      exec1();
      exec2();

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should not execute handler if it was replaced', () => {
      const [push] = micropush();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const exec1 = push(handler1);
      push(handler2); // Register new handler, replacing the first

      exec1(); // Try to execute the replaced handler

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should clear the current handler', () => {
      const [push, clear] = micropush();
      const handler = vi.fn();

      const exec = push(handler);
      clear();
      exec();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle multiple clears gracefully', () => {
      const [push, clear] = micropush();
      const handler = vi.fn();

      const exec = push(handler);
      clear();
      clear(); // Second clear should not cause issues
      exec();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should allow registering a new handler after clearing', () => {
      const [push, clear] = micropush();
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const exec1 = push(handler1);
      clear();

      const exec2 = push(handler2);
      exec1(); // Should not execute as it was cleared
      exec2(); // Should execute the new handler

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledTimes(1);
    });

    it('should handle handlers that throw errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [push] = micropush();
      const errorHandler = vi.fn(() => {
        throw new Error('Test error');
      });

      const exec = push(errorHandler);
      exec();

      expect(errorHandler).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled(); // micropush doesn't handle errors itself

      consoleErrorSpy.mockRestore();
    });

    it('should not execute handler after it has been executed once', () => {
      const [push] = micropush();
      const handler = vi.fn();

      const exec = push(handler);
      exec(); // First execution
      exec(); // Second execution attempt

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle rapid successive registrations', () => {
      const [push] = micropush();
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      const exec1 = push(handler1);
      const exec2 = push(handler2);
      const exec3 = push(handler3);

      exec1(); // Should not execute as it was replaced
      exec2(); // Should not execute as it was replaced
      exec3(); // Should execute as it's the current handler

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
      expect(handler3).toHaveBeenCalledTimes(1);
    });

    it('should return a no-op function when the given argument is not a function', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const [push] = micropush();
      const handler = vi.fn();

      const exec = push('test' as never);
      exec(); // First execution
      exec(); // Second execution attempt

      expect(handler).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();

      errorSpy.mockRestore();
    });
  });
});
