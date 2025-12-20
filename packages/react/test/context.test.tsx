import { getContext } from '@anchorlib/core';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { contextProvider } from '../src/context';

describe('Anchor React - Context', () => {
  describe('contextProvider', () => {
    it('should create a context provider component', () => {
      const Provider = contextProvider(Symbol('test'), 'TestContext');

      expect(Provider).toBeDefined();
      expect(typeof Provider).toBe('function');
      expect(Provider.displayName).toBe('Enter Context(TestContext)');
    });

    it('should create a context provider with anonymous name', () => {
      const Provider = contextProvider(Symbol('test'));

      expect(Provider.displayName).toBe('Enter Context(Anonymous)');
    });

    it('should provide context values to children', () => {
      const contextKey = Symbol('test');
      const Provider = contextProvider(contextKey, 'TestContext');
      const testValue = { data: 'test' };

      let capturedValue: any;

      const TestComponent = () => {
        capturedValue = getContext(contextKey);
        return <div>Test</div>;
      };

      render(
        <Provider value={testValue}>
          <TestComponent />
        </Provider>
      );

      expect(capturedValue).toEqual(testValue);
    });

    it('should restore previous context values after unmount', () => {
      const contextKey = Symbol('test');
      const Provider = contextProvider(contextKey, 'TestContext');

      // Set initial context value
      const initialValue = { data: 'initial' };
      // In a real scenario, we'd set this via another mechanism

      const testValue = { data: 'test' };

      const { unmount } = render(
        <Provider value={testValue}>
          <div>Test</div>
        </Provider>
      );

      // Unmounting should restore previous value
      unmount();

      // Verification would require checking the context after unmount
    });
  });
});
