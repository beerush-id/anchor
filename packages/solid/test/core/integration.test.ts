import { mutable } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { $bind, bind, isBinding } from '../../src/binding.js';
import { bindable } from '../../src/hoc.js';
import { omitProps, pickProps, proxyProps } from '../../src/props.js';
import type { Bindable, BindableComponentProps, BindableProps } from '../../src/types.js';

describe('Anchor Solid - Integration Tests', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('Binding and Props Integration', () => {
    it('should work together to create two-way data binding', () => {
      // Create a source object
      const source = { count: 10, name: 'test' };

      // Create bindings
      const countBinding = bind(source, 'count');
      const nameBinding = bind(source, 'name');

      // Verify bindings work
      expect(isBinding(countBinding)).toBe(true);
      expect(isBinding(nameBinding)).toBe(true);
      expect(countBinding.value).toBe(10);
      expect(nameBinding.value).toBe('test');

      // Create props object with bindings
      const props = {
        count: countBinding,
        name: nameBinding,
        staticValue: 'static',
      };

      // Proxy the props
      const proxiedProps = proxyProps(props);

      // Verify that accessing the props resolves the bindings
      expect(proxiedProps.count).toBe(10);
      expect(proxiedProps.name).toBe('test');
      expect(proxiedProps.staticValue).toBe('static');

      // Verify that setting values through the proxy updates the source
      proxiedProps.count = 20;
      expect(source.count).toBe(20);
      expect(countBinding.value).toBe(20);

      proxiedProps.name = 'updated';
      expect(source.name).toBe('updated');
      expect(nameBinding.value).toBe('updated');
    });

    it('should work with omit and pick on props containing bindings', () => {
      const source = { count: 10, name: 'test', email: 'test@example.com' };

      const props = {
        count: bind(source, 'count'),
        name: bind(source, 'name'),
        email: bind(source, 'email'),
      };

      const proxiedProps = proxyProps(props);

      // Test omit with bindings
      const omitted = omitProps(props, proxiedProps as never, ['email']);
      const omittedSpread = { ...omitted };
      expect(omittedSpread.count).toBe(10);
      expect(omittedSpread.name).toBe('test');
      // @ts-expect-error - email should be omitted
      expect(omittedSpread.email).toBeUndefined();

      // Verify that setting values still works
      // @ts-ignore
      omitted.count = 30;
      expect(source.count).toBe(30);

      // Test pick with bindings
      const picked = pickProps(props, proxiedProps as never, ['count', 'name']);
      const pickedSpread = { ...picked };
      expect(pickedSpread.count).toBe(30);
      expect(pickedSpread.name).toBe('test');
      // @ts-expect-error - email should not be in picked
      expect(pickedSpread.email).toBeUndefined();

      // Verify that setting values still works
      // @ts-ignore
      picked.name = 'picked';
      expect(source.name).toBe('picked');
    });
  });

  describe('HOC with Binding Integration', () => {
    it('should work with bindable HOC and binding props', () => {
      type TestComponentProps = {
        count: Bindable<number>;
        name: Bindable<string>;
        onIncrement?: () => void;
      };

      // Create a mock component that expects bindable props
      const mockComponent = vi.fn((props: BindableComponentProps<TestComponentProps>) => {
        return {
          count: props.count,
          name: props.name,
          $omit: props.$omit,
          $pick: props.$pick,
        };
      });

      // Create bindable version of the component
      const BindableTestComponent = bindable(mockComponent as never);

      // Create source object for binding
      const source = { count: 5, name: 'initial' };

      // Create props with bindings
      const componentProps: BindableProps<TestComponentProps> = {
        count: bind(source, 'count'),
        name: bind(source, 'name'),
        onIncrement: () => {
          source.count++;
        },
      };

      // Use the bindable component
      const result = BindableTestComponent(componentProps) as any;

      // Verify that the mock component was called with proxied props
      expect(mockComponent).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 5,
          name: 'initial',
        })
      );

      // Verify the result contains expected values
      expect(result.count).toBe(5);
      expect(result.name).toBe('initial');

      // Verify that the props are properly proxied (have $omit and $pick)
      const callArgs = mockComponent.mock.calls[0][0];
      expect(typeof callArgs.$omit).toBe('function');
      expect(typeof callArgs.$pick).toBe('function');

      // Test that setting values through the proxied props updates the source
      callArgs.count = 15;
      expect(source.count).toBe(15);
    });

    it('should preserve binding functionality within HOC', () => {
      type CounterProps = {
        count: number;
        label: string;
      };

      const capturedProps: any[] = [];
      const counterComponent = (props: BindableComponentProps<CounterProps>) => {
        capturedProps.push(props);
        return { count: props.count, label: props.label };
      };

      const BindableCounter = bindable(counterComponent as never);

      // Create a mutable ref and a regular binding
      const mutableRef = mutable(10);
      const source = { label: 'Counter' };
      const labelBinding = bind(source, 'label');

      // Pass both mutable ref and binding to the component
      const result = BindableCounter({
        count: mutableRef,
        label: labelBinding,
      }) as any;

      // Check that both values were properly resolved
      expect(result.count).toBe(10);
      expect(result.label).toBe('Counter');

      // Get the captured props to test updates
      const props = capturedProps[0];

      // Update through the proxied props
      props.count = 20;
      expect(mutableRef.value).toBe(20);

      props.label = 'Updated Counter';
      expect(source.label).toBe('Updated Counter');
    });
  });

  describe('Complex Binding Scenarios', () => {
    it('should handle nested objects and complex bindings', () => {
      const source = {
        user: {
          profile: {
            name: 'John',
            age: 30,
          },
        },
        settings: {
          theme: 'dark',
          notifications: true,
        },
      };

      // Create bindings for nested properties
      const nameBinding = bind(source.user, 'profile');
      const themeBinding = bind(source.settings, 'theme');

      const props = {
        profile: nameBinding,
        theme: themeBinding,
      };

      const proxiedProps = proxyProps(props);

      // Test accessing nested objects
      expect(proxiedProps.profile).toEqual({ name: 'John', age: 30 });
      expect(proxiedProps.theme).toBe('dark');

      // Test updating nested objects
      const newProfile = { name: 'Jane', age: 25 };
      proxiedProps.profile = newProfile;
      expect(source.user.profile).toEqual(newProfile);

      proxiedProps.theme = 'light';
      expect(source.settings.theme).toBe('light');
    });

    it('should work with $bind alias', () => {
      const source = { value: 100 };

      // Use the $bind alias
      const binding = $bind(source, 'value');

      expect(isBinding(binding)).toBe(true);
      expect(binding.value).toBe(100);

      binding.value = 200;
      expect(source.value).toBe(200);

      // Should work the same as bind function
      const regularBinding = bind(source, 'value');
      expect(isBinding(regularBinding)).toBe(true);
      expect(regularBinding.value).toBe(200);
    });

    it('should properly handle event handler protection with bindings', () => {
      vi.useFakeTimers();

      const source = { count: 10 };
      const countBinding = bind(source, 'count');

      const props = {
        count: countBinding,
        onClick: vi.fn(),
        onHover: vi.fn(),
      };

      const proxiedProps = proxyProps(props);

      // Should be able to access the count binding
      expect(proxiedProps.count).toBe(10);

      // Should be able to call event handlers
      proxiedProps.onClick();
      expect(props.onClick).toHaveBeenCalled();

      // Should not be able to reassign event handlers (will log error but not throw in proxy)
      const newHandler = vi.fn();
      // @ts-expect-error - Testing invalid assignment
      proxiedProps.onClick = newHandler;

      vi.runAllTimers();

      // The original handler should still be there
      expect(proxiedProps.onClick).toBe(props.onClick);
      expect(errorSpy).toHaveBeenCalled();

      // Should be able to update binding values
      proxiedProps.count = 20;
      expect(source.count).toBe(20);

      vi.useRealTimers();
    });
  });
});
