import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { bindable } from '../../src/view/Binding';
import { anchor, createContext } from '@anchorlib/core';
import { type ChangeEvent, useRef } from 'react';
import { useVariable } from '../../src/index.js';

// Mock input component for testing
const MockInput = vi.fn((props: any) => {
  const { ref, type, value, checked, onChange, ...rest } = props;
  if (type === 'checkbox' || type === 'radio') {
    return <input ref={ref} type={type} checked={checked} onChange={onChange} {...rest} />;
  }
  return <input ref={ref} type={type} value={value} onChange={onChange} {...rest} />;
});

describe('Anchor React - View Binding', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockInput.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('bindable', () => {
    describe('Basic Usage', () => {
      it('should create a bindable component', () => {
        const BindableInput = bindable(MockInput, 'TestBindable');

        expect(BindableInput).toBeInstanceOf(Function);
        expect((BindableInput as any).displayName).toBe('Binding(TestBindable)');
      });

      it('should set component display name if not already set', () => {
        (MockInput as any).displayName = undefined;
        const BindableInput = bindable(MockInput, 'NamedBindable');

        expect((BindableInput as any).displayName).toBe('Binding(NamedBindable)');
      });

      it('should set component display name using its custom displayName', () => {
        const NamedInput = () => <input />;
        NamedInput.displayName = 'NamedBindable';

        const BindableInput = bindable(NamedInput);
        expect((BindableInput as any).displayName).toBe('Binding(NamedBindable)');
      });

      it('should set component display name to Anonymous', () => {
        const BindableInput = bindable(() => <input />);
        expect((BindableInput as any).displayName).toBe('Binding(Anonymous)');
      });
    });

    describe('State Object Binding', () => {
      it('should bind to a state object property using name', () => {
        const BindableInput = bindable(MockInput);
        const state = anchor({ username: 'john_doe' });

        render(<BindableInput bind={state} name="username" type="text" />);

        expect(MockInput).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'text',
            name: 'username',
            value: 'john_doe',
          }),
          undefined
        );
      });

      it('should bind to a state object property using bindKey', () => {
        const BindableInput = bindable(MockInput);
        const state = anchor({ email: 'john@example.com' });

        render(<BindableInput bind={state} bindKey="email" type="email" />);

        expect(MockInput).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'email',
            value: 'john@example.com',
          }),
          undefined
        );
      });

      it('should update state object property when input changes', () => {
        const BindableInput = bindable(MockInput);
        const state = anchor({ title: 'Initial Title' });

        render(<BindableInput bind={state} name="title" type="text" />);

        // Simulate input change
        const mockEvent = {
          target: {
            value: 'New Title',
          },
        } as ChangeEvent<HTMLInputElement>;

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        expect(state.title).toBe('New Title');
      });
    });

    describe('Input Types', () => {
      it('should handle usage without binding', () => {
        const BindableInput = bindable(MockInput);
        const mockOnChange = vi.fn();

        render(<BindableInput type="text" onChange={mockOnChange} />);

        // Simulate input change
        const mockEvent = {
          target: {
            value: 'new value',
          },
        } as ChangeEvent<HTMLInputElement>;

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
      });

      it('should handle usage on checkbox input', async () => {
        const ctx = createContext<string, { value: boolean }>();

        const Radio = bindable(MockInput);
        const mockOnChange = vi.fn();

        const App = () => {
          const ref = useRef(null);
          const [checked] = useVariable(false);
          ctx.set('checked', checked);

          return <Radio ref={ref} type="checkbox" bind={checked} onChange={mockOnChange} />;
        };
        render(<App />);

        // Simulate input change
        const mockEvent = {
          target: {
            checked: true,
          },
        };

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        await vi.runAllTimersAsync();

        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
        expect(ctx.get('checked')?.value).toBe(true);

        const emptyEvent = {
          target: {},
        };
        act(() => {
          onChangeCall(emptyEvent);
        });

        await vi.runAllTimersAsync();

        expect(mockOnChange).toHaveBeenCalledWith(emptyEvent);
        expect(ctx.get('checked')?.value).toBe(false);
      });

      it('should handle usage on number input', async () => {
        const ctx = createContext<string, { value: number }>();
        const NumberInput = bindable(MockInput);
        const mockOnChange = vi.fn();

        const App = () => {
          const [count] = useVariable(0);
          ctx.set('count', count);

          return <NumberInput type="number" bind={count} onChange={mockOnChange} />;
        };
        render(<App />);

        // Simulate input change
        const mockEvent = {
          target: {
            value: '10',
          },
        };

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        await vi.runAllTimersAsync();

        expect(ctx.get('count')?.value).toBe(10);
        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);

        const emptyEvent = {
          target: {},
        };
        act(() => {
          onChangeCall(emptyEvent);
        });

        await vi.runAllTimersAsync();

        expect(ctx.get('count')?.value).toBeUndefined();
      });

      it('should handle usage on date input', async () => {
        const ctx = createContext<string, { value: Date }>();
        const NumberInput = bindable(MockInput);
        const mockOnChange = vi.fn();

        const App = () => {
          const [date] = useVariable(new Date());
          ctx.set('date', date);

          return <NumberInput type="date" bind={date} onChange={mockOnChange} />;
        };
        render(<App />);

        // Simulate input change
        const mockEvent = {
          target: {
            value: 'Thu Sep 18 2025',
          },
        };

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        await vi.runAllTimersAsync();

        expect(ctx.get('date')?.value?.toDateString()).toBe('Thu Sep 18 2025');
        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
      });
    });

    describe('Edge Cases', () => {
      it('should handle empty values for convertible types by deleting the property', () => {
        const mockOnChange = vi.fn();
        const BindableInput = bindable(MockInput);
        const state = anchor({ count: 42 });

        render(<BindableInput bind={state} name="count" type="number" onChange={mockOnChange} />);

        // Simulate input change to empty string
        const mockEvent = {
          target: {
            value: '',
          },
        } as ChangeEvent<HTMLInputElement>;

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        expect(state.count).toBeUndefined();
        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
      });

      it('should call original onChange handler', () => {
        const BindableInput = bindable(MockInput);
        const state = anchor({ test: 'initial' });
        const mockOnChange = vi.fn();

        render(<BindableInput bind={state} name="test" type="text" onChange={mockOnChange} />);

        // Simulate input change
        const mockEvent = {
          target: {
            value: 'new value',
          },
        } as ChangeEvent<HTMLInputElement>;

        const onChangeCall = MockInput.mock.calls[0][0].onChange;
        act(() => {
          onChangeCall(mockEvent);
        });

        expect(mockOnChange).toHaveBeenCalledWith(mockEvent);
        expect(state.test).toBe('new value');
      });
    });
  });
});
