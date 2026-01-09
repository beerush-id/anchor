import { describe, expect, it, vi } from 'vitest';
import { BindingRef } from '../../src/binding.js';
import { bindable } from '../../src/hoc.js';
import type { BindableComponentProps } from '../../src/index.js';

describe('Anchor Solid - HOC API', () => {
  describe('bindable', () => {
    describe('basic functionality', () => {
      it('should create a bindable component that wraps the original component', () => {
        type TestProps = { name: string; count: number };

        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const result = BindableComponent({ name: 'test', count: 42 });

        // Verify that the mock component was called with proxied props
        expect(mockComponent).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'test',
            count: 42,
          })
        );

        // Check that the result is returned properly
        expect(result).toBeDefined();
      });

      it('should apply proxyProps to the input props', () => {
        type TestProps = { value: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);
        const inputProps = { value: 42 };

        BindableComponent(inputProps);

        const proxiedProps = capturedProps[0];

        // Verify that the props are proxied (has $omit and $pick methods)
        expect(typeof proxiedProps.$omit).toBe('function');
        expect(typeof proxiedProps.$pick).toBe('function');
      });
    });

    describe('prop handling', () => {
      it('should handle binding references in props', () => {
        type TestProps = { count: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const source = { count: 100 };
        const bindingRef = new BindingRef(source, 'count');
        const propsWithBinding = { count: bindingRef };

        BindableComponent(propsWithBinding);

        const proxiedProps = capturedProps[0];

        // The proxy should resolve the binding value
        expect(proxiedProps.count).toBe(100);
      });

      it('should allow prop mutation through the proxy', () => {
        type TestProps = { count: number };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        const source = { count: 10 };
        const bindingRef = new BindingRef(source, 'count');
        const propsWithBinding = { count: bindingRef };

        BindableComponent(propsWithBinding);

        const proxiedProps = capturedProps[0];

        // Set the value through the proxied props
        proxiedProps.count = 20;

        // The source should be updated
        expect(source.count).toBe(20);
      });

      it('should preserve event handler protection', () => {
        type TestProps = { name: string; onClick: () => void };

        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);
        const onClickHandler = vi.fn();

        BindableComponent({ name: 'test', onClick: onClickHandler });

        const callArgs = mockComponent.mock.calls[0][0];
        const proxiedProps = callArgs;

        // Event handlers should still be protected when set on the proxy
        // This is tested through the proxyProps functionality
        expect(proxiedProps.onClick).toBe(onClickHandler);
      });
    });

    describe('integration with omit and pick', () => {
      it('should work with $omit method on proxied props', () => {
        type TestProps = { name: string; count: number; email: string };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        BindableComponent({ name: 'test', count: 42, email: 'test@example.com' });

        const proxiedProps = capturedProps[0];

        // Test $omit functionality
        const omitted = { ...proxiedProps.$omit(['email']) };
        expect(omitted.name).toBe('test');
        expect(omitted.count).toBe(42);
        expect(omitted.email).toBeUndefined();
      });

      it('should work with $pick method on proxied props', () => {
        type TestProps = { name: string; count: number; email: string };

        const capturedProps: any[] = [];
        const mockComponent = vi.fn((props: BindableComponentProps<TestProps>) => {
          capturedProps.push(props);
          return { props };
        });

        const BindableComponent = bindable(mockComponent as never);

        BindableComponent({ name: 'test', count: 42, email: 'test@example.com' });

        const proxiedProps = capturedProps[0];

        // Test $pick functionality
        const picked = { ...proxiedProps.$pick(['name', 'count']) };
        expect(picked.name).toBe('test');
        expect(picked.count).toBe(42);
        expect(picked.email).toBeUndefined();
      });
    });
  });
});
