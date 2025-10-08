import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook } from '@testing-library/react';
import { useObserverNode } from '../../src/view/index.js';
import { observe, observer, stable, useAnchor, useVariable } from '../../src/index.js';
import { anchor, getObserver } from '@anchorlib/core';
import { useState } from 'react';

// Mock the debugRender function since it's not available in tests
vi.mock('../../src', async () => {
  const actual = await vi.importActual('../../src');
  return {
    ...actual,
    debugRender: vi.fn(),
  };
});

describe('Anchor React - View Observer', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    errorSpy?.mockRestore();
    vi.useRealTimers();
  });

  describe('useObserverNode', () => {
    describe('Basic Usage', () => {
      it('should create an observer node with Unobserve component and version', () => {
        const { result } = renderHook(() => useObserverNode());

        const [Unobserve, version] = result.current;

        expect(Unobserve).toBeInstanceOf(Function);
        expect(typeof version).toBe('number');
      });

      it('should create observer node with dependencies', () => {
        const state = anchor({ count: 42 });
        const { result } = renderHook(() => useObserverNode([state], 'TestObserver'));

        const [Unobserve, version] = result.current;

        expect(Unobserve).toBeInstanceOf(Function);
        expect(typeof version).toBe('number');
        expect(getObserver()).toBeDefined();

        render(<Unobserve />);
      });
    });
  });

  describe('observer', () => {
    describe('Basic Usage', () => {
      it('should create an observer component', () => {
        const TestComponent = (props: { value: string; _state_version?: number }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const ObserverComponent = observer(TestComponent, 'TestObserver');

        expect(ObserverComponent).toBeInstanceOf(Function);
        expect(ObserverComponent.displayName).toBe('Observer(TestObserver)');
      });

      it('should render observer component with props', () => {
        const TestComponent = (props: { value: string; _state_version?: number }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const ObserverComponent = observer<{ value: string }>(TestComponent);

        const { getByTestId } = render(<ObserverComponent value="test value" />);

        expect(getByTestId('test-component').textContent).toBe('test value');
      });

      it('should render observer component with reactive props', () => {
        const TestComponent = (props: { value: string; _state_version?: number }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const ObserverComponent = observer<{ value: string }>(TestComponent);
        const TestParentComponent = () => {
          const [value] = useVariable('test value');
          return <ObserverComponent value={value} />;
        };

        const { getByTestId } = render(<TestParentComponent />);

        expect(getByTestId('test-component').textContent).toBe('test value');
      });

      it('should re-render when observer dependencies change', () => {
        const state = anchor({ count: 42 });

        const TestComponent = (props: { state: typeof state; _state_version?: number }) => {
          return <div data-testid="test-component">{props.state.count}</div>;
        };

        const ObserverComponent = observer<{ state: typeof state }>(TestComponent);

        const { getByTestId } = render(<ObserverComponent state={state} />);

        expect(getByTestId('test-component').textContent).toBe('42');

        act(() => {
          state.count = 100;
        });

        vi.runAllTimers();
        expect(getByTestId('test-component').textContent).toBe('100');
      });

      it('should set component display name', () => {
        const TestComponent = (props: { value: string; _state_version?: number }) => {
          return <div>{props.value}</div>;
        };

        TestComponent.displayName = 'NamedComponent';
        const ObserverComponent = observer(TestComponent);

        expect(ObserverComponent.displayName).toBe('Observer(NamedComponent)');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid component and log error', async () => {
        // Mock console.error to capture the error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const TestComponent = observer(null as never);

        render(<TestComponent />);

        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('observe', () => {
    describe('With Function Factory', () => {
      it('should create component from function factory', () => {
        const TestComponent = () => {
          const factory = (ref: any) => (
            <div ref={ref} data-testid="observed">
              Observed Content
            </div>
          );
          const ObservedComponent = observe(factory, 'TestObserve');
          return <ObservedComponent />;
        };

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('observed').textContent).toBe('Observed Content');
      });

      it('should re-render when observed state changes', () => {
        const state = anchor({ count: 42 });

        const TestComponent = () => {
          const factory = () => <div data-testid="observed">{state.count}</div>;
          const ObservedComponent = observe(factory);
          return <ObservedComponent />;
        };

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('observed').textContent).toBe('42');

        act(() => {
          state.count = 100;
        });

        vi.runAllTimers();
        expect(getByTestId('observed').textContent).toBe('100');
      });
    });

    describe('With Factory Object', () => {
      it('should create component from factory object', async () => {
        const onMounted = vi.fn();
        const onUpdated = vi.fn();
        const onDestroy = vi.fn();

        const TestComponent = () => {
          const [state] = useAnchor({ count: 1 });

          const factory = {
            name: 'TestFactory',
            render: (ref: any) => (
              <>
                <div ref={ref} data-testid="observed">
                  Factory Content
                </div>
                <span data-testid="count">{state.count}</span>
                <button data-testid="increment" onClick={() => state.count++}>
                  Increment
                </button>
              </>
            ),
            onMounted,
            onUpdated,
            onDestroy,
          };

          const ObservedComponent = observe(factory);
          return <ObservedComponent />;
        };

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('observed').textContent).toBe('Factory Content');
        expect(getByTestId('count').textContent).toBe('1');

        // Wait for async onMounted call
        await vi.runAllTimersAsync();

        expect(onMounted).toHaveBeenCalled();

        act(() => {
          getByTestId('increment').click();
        });

        await vi.runAllTimersAsync();
        expect(onUpdated).toHaveBeenCalled();
      });

      it('should handle factory object with render method', () => {
        const state = anchor({ message: 'Hello' });

        const TestComponent = () => {
          const factory = {
            render: (ref: any) => (
              <div ref={ref} data-testid="observed">
                {state.message}
              </div>
            ),
          };

          const ObservedComponent = observe(factory);
          return <ObservedComponent />;
        };

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('observed').textContent).toBe('Hello');

        act(() => {
          state.message = 'World';
        });

        vi.runAllTimers();
        expect(getByTestId('observed').textContent).toBe('World');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid factory and log error', async () => {
        // Mock console.error to capture the error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const TestComponent = () => {
          const invalidFactory = null as any;
          const ObservedComponent = observe(invalidFactory);
          return <ObservedComponent />;
        };

        render(<TestComponent />);

        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });

      it('should handle invalid factory renderer function', async () => {
        // Mock console.error to capture the error
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const TestComponent = () => {
          const ObservedComponent = observe({} as never);
          return <ObservedComponent />;
        };

        render(<TestComponent />);

        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('stable', () => {
    describe('Basic Usage', () => {
      it('should create a stable component', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const StableComponent = stable(TestComponent, 'TestStable');

        expect(StableComponent).toBeInstanceOf(Function);
        expect(StableComponent.displayName).toBe('Stable(TestStable)');
      });

      it('should render stable component with props', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const StableComponent = stable<{ value: string }>(TestComponent);

        const { getByTestId } = render(<StableComponent value="test value" />);

        expect(getByTestId('test-component').textContent).toBe('test value');
      });

      it('should not re-render when parent re-renders with same props', () => {
        const renderSpy = vi.fn();

        const StableComponent = stable((props: { value: string }) => {
          renderSpy();
          return <div data-testid="test-component">{props.value}</div>;
        });

        const ParentComponent = () => {
          const [, setCount] = useState(0);
          // Trigger re-render after initial render
          setTimeout(() => setCount(1), 0);

          return (
            <div>
              <StableComponent value="stable value" />
              <button data-testid="rerender-button" onClick={() => setCount((c) => c + 1)}>
                Re-render
              </button>
            </div>
          );
        };

        const { getByTestId } = render(<ParentComponent />);

        expect(getByTestId('test-component').textContent).toBe('stable value');
        expect(renderSpy).toHaveBeenCalledTimes(1);

        // Click button to trigger parent re-render
        act(() => {
          getByTestId('rerender-button').click();
        });

        // Component should not re-render because props are the same
        expect(renderSpy).toHaveBeenCalledTimes(1);
      });

      it('should re-render when props change', () => {
        const renderSpy = vi.fn();

        const TestComponent = (props: { value: string }) => {
          renderSpy(props.value);
          return <div data-testid="test-component">{props.value}</div>;
        };

        const StableComponent = stable(TestComponent);

        const ParentComponent = () => {
          const [value, setValue] = useState('initial value');

          return (
            <div>
              <StableComponent value={value} />
              <button data-testid="change-button" onClick={() => setValue('updated value')}>
                Change Props
              </button>
            </div>
          );
        };

        const { getByTestId } = render(<ParentComponent />);

        expect(getByTestId('test-component').textContent).toBe('initial value');
        expect(renderSpy).toHaveBeenCalledWith('initial value');

        // Click button to change props
        act(() => {
          getByTestId('change-button').click();
        });

        // Component should re-render because props changed
        expect(getByTestId('test-component').textContent).toBe('updated value');
        expect(renderSpy).toHaveBeenCalledWith('updated value');
      });

      it('should set component display name', () => {
        const TestComponent = (props: { value: string }) => {
          return <div>{props.value}</div>;
        };

        TestComponent.displayName = 'NamedComponent';
        const StableComponent = stable(TestComponent);

        expect(StableComponent.displayName).toBe('Stable(NamedComponent)');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid component and log error', () => {
        const TestComponent = stable(null as never);

        render(<TestComponent />);

        vi.runAllTimers();
        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Integration', () => {
    it('should work with complex components that have their own state', async () => {
      const CounterComponent = observer(() => {
        const [count, setCount] = useState(0);
        const [state] = useAnchor({ value: 10 });

        return (
          <div>
            <div data-testid="local-count">{count}</div>
            <div data-testid="reactive-value">{state.value}</div>
            <button data-testid="local-button" onClick={() => setCount((c) => c + 1)}>
              Increment
            </button>
            <button data-testid="reactive-button" onClick={() => (state.value += 1)}>
              Update
            </button>
          </div>
        );
      });

      const ObserverCounter = observer(CounterComponent);

      const { getByTestId } = render(<ObserverCounter />);

      // Test local state
      expect(getByTestId('local-count').textContent).toBe('0');
      act(() => {
        getByTestId('local-button').click();
      });
      expect(getByTestId('local-count').textContent).toBe('1');

      // Test reactive state
      expect(getByTestId('reactive-value').textContent).toBe('10');

      act(() => {
        getByTestId('reactive-button').click();
      });

      // Run all timers to ensure the reactive update happens
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      expect(getByTestId('reactive-value').textContent).toBe('11');
    });
  });
});
