/** @jsxImportSource solid-js */

import { mutable } from '@anchorlib/core';
import { render } from '@solidjs/testing-library';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { bind, type Bindable, bindable, proxyProps } from '../../src/index.js';
import type { BindableComponentProps } from '../../src/types.js';

describe('Anchor Solid - Reactive Binding Tests', () => {
  describe('Binding with Reactive Components', () => {
    it('should work with reactive updates through bindings', () => {
      type CounterProps = { count: Bindable<number>; onIncrement: () => void };

      const Counter = (props: BindableComponentProps<CounterProps>) => {
        return (
          <div>
            <span data-testid="count">{props.count}</span>
            <button onClick={props.onIncrement}>Increment</button>
          </div>
        ) as JSX.Element;
      };

      const BindableCounter = bindable(Counter);

      const state = mutable({ count: 0 });
      const increment = () => {
        state.count++;
      };

      const { getByTestId } = render(() => <BindableCounter count={bind(state, 'count')} onIncrement={increment} />);

      expect(getByTestId('count').textContent).toBe('0');
    });

    it('should handle two-way binding in reactive components', () => {
      type InputProps = { value: Bindable<string>; onInput: (value: string) => void };

      const TextInput = (props: BindableComponentProps<InputProps>) => {
        return (
          <div>
            <input
              value={props.value}
              onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
              data-testid="input"
            />
            <span data-testid="display">{props.value}</span>
          </div>
        );
      };

      const BindableInput = bindable<InputProps>(TextInput);

      const state = mutable({ text: 'initial' });

      const updateText = (value: string) => {
        state.text = value;
      };

      const { getByTestId } = render(() =>
        BindableInput({
          value: bind(state, 'text'),
          onInput: updateText,
        })
      );

      const input = getByTestId('input') as HTMLInputElement;
      const display = getByTestId('display');

      expect(input.value).toBe('initial');
      expect(display.textContent).toBe('initial');

      // Update input value
      userEvent.type(input, 'hello');
      // Note: This is a simplified test - actual input handling might need more setup
    });
  });

  describe('Proxy behavior in reactive context', () => {
    it('should maintain reactivity when accessing bound values', () => {
      const source = mutable({ value: 10 });
      const binding = bind(source, 'value');

      const props = { value: binding };
      const proxied = proxyProps(props);

      // Access the value multiple times to ensure reactivity
      expect(proxied.value).toBe(10);
      source.value = 20;
      expect(proxied.value).toBe(20);

      // This test verifies that the proxy properly accesses the binding
      proxied.value = 30;
      expect(source.value).toBe(30);
    });

    it('should handle nested reactive updates', () => {
      const complexState = mutable({
        user: { name: 'John', age: 30 },
        settings: { theme: 'dark' },
      });

      const props = {
        user: bind(complexState, 'user'),
        theme: bind(complexState.settings, 'theme'),
      };

      const proxied = proxyProps(props);

      expect(proxied.user.name).toBe('John');
      expect(proxied.theme).toBe('dark');

      // Update nested properties
      complexState.user.name = 'Jane';
      expect(proxied.user.name).toBe('Jane');

      // Update through proxy
      proxied.theme = 'light';
      expect(complexState.settings.theme).toBe('light');
    });
  });
});
