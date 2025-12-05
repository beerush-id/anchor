import { anchor } from '@anchorlib/core';
import { act, render } from '@testing-library/react';
import { type FunctionComponent, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { named, observer, setup, useAnchor, useVariable, view } from '../../src/index.js';
import { effect, onCleanup, onMount } from '../../src/lifecycle.js';

// Mock the debugRender function since it's not available in tests
vi.mock('../../src', async () => {
  const actual = await vi.importActual('../../src');
  return {
    ...actual,
    debugRender: vi.fn(),
  };
});

describe('Anchor React - HOC', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    errorSpy?.mockRestore();
    vi.useRealTimers();
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

  describe('view', () => {
    describe('With Function Factory', () => {
      it('should create component from function factory', () => {
        const TestComponent = () => {
          const factory = () => <div data-testid="observed">Observed Content</div>;
          const ObservedComponent = view(factory, 'TestObserve');
          return <ObservedComponent />;
        };

        const { getByTestId } = render(<TestComponent />);

        expect(getByTestId('observed').textContent).toBe('Observed Content');
      });

      it('should re-render when observed state changes', () => {
        const state = anchor({ count: 42 });

        const TestComponent = () => {
          const factory = () => <div data-testid="observed">{state.count}</div>;
          const ObservedComponent = view(factory);
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
            render: () => (
              <>
                <div data-testid="observed">Factory Content</div>
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

          const ObservedComponent = view(factory);
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
            render: () => <div data-testid="observed">{state.message}</div>,
          };

          const ObservedComponent = view(factory);
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
          const ObservedComponent = view(invalidFactory);
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
          const ObservedComponent = view({} as never);
          return <ObservedComponent />;
        };

        render(<TestComponent />);

        await vi.runAllTimersAsync();

        expect(consoleErrorSpy).toHaveBeenCalled();
        consoleErrorSpy.mockRestore();
      });
    });
  });

  describe('setup', () => {
    describe('Basic Usage', () => {
      it('should create a setup component', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const SetupComponent = setup(TestComponent, 'TestSetup');

        expect((SetupComponent as FunctionComponent).displayName).toBe('Setup(TestSetup)');
      });

      it('should render setup component with props', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const SetupComponent = setup(TestComponent);

        const { getByTestId } = render(<SetupComponent value="test value" />);

        expect(getByTestId('test-component').textContent).toBe('test value');
      });

      it('should not re-render when parent re-renders with same props', () => {
        const renderSpy = vi.fn();

        const SetupComponent = setup((props: { value: string }) => {
          renderSpy();
          return <div data-testid="test-component">{props.value}</div>;
        });

        const ParentComponent = () => {
          const [, setCount] = useState(0);
          // Trigger re-render after initial render
          setTimeout(() => setCount(1), 0);

          return (
            <div>
              <SetupComponent value="setup value" />
              <button data-testid="rerender-button" onClick={() => setCount((c) => c + 1)}>
                Re-render
              </button>
            </div>
          );
        };

        const { getByTestId } = render(<ParentComponent />);

        expect(getByTestId('test-component').textContent).toBe('setup value');
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

        const SetupComponent = setup(TestComponent);

        const ParentComponent = () => {
          const [value, setValue] = useState('initial value');

          return (
            <div>
              <SetupComponent value={value} />
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
        const SetupComponent = setup(TestComponent);

        expect(SetupComponent.displayName).toBe('Setup(NamedComponent)');
      });

      it('should handle component lifecycle', () => {
        const state = anchor({ count: 1 });

        const handleUnmount = vi.fn();
        const handleMountCleanup = vi.fn();
        const handleEffectCleanup = vi.fn();
        const handleMount = vi.fn().mockReturnValue(handleMountCleanup);
        const handleEffect = vi.fn();
        const handleSecondEffect = vi.fn();

        const TestComponent = (props: { value: string }) => {
          effect(() => {
            expect(state.count).greaterThan(0);
            handleEffect();
            return handleEffectCleanup;
          });

          effect(() => {
            expect(state.count).greaterThan(0);
            handleSecondEffect();
          });

          onMount(handleMount);
          onCleanup(handleUnmount);

          return <div data-testid="test-component">{props.value}</div>;
        };
        const SetupComponent = setup(TestComponent);

        const { getByTestId, unmount } = render(<SetupComponent value="test value" />);
        expect(getByTestId('test-component').textContent).toBe('test value');

        vi.runAllTimers();

        expect(handleMount).toHaveBeenCalled();
        expect(handleEffect).toHaveBeenCalled();
        expect(handleSecondEffect).toHaveBeenCalled();

        state.count++;
        vi.runAllTimers();

        expect(state.count).toBe(2);
        expect(handleEffect).toHaveBeenCalledTimes(2);
        expect(handleEffectCleanup).toHaveBeenCalled();

        unmount();
        vi.runAllTimers();

        expect(handleUnmount).toHaveBeenCalled();
        expect(handleMountCleanup).toHaveBeenCalled();
        expect(handleEffectCleanup).toHaveBeenCalledTimes(2);
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid component and log error', () => {
        const TestComponent = setup(null as never) as FunctionComponent;

        render(<TestComponent />);

        vi.runAllTimers();
        expect(errorSpy).toHaveBeenCalled();
      });

      it('should handle lifecycle function usage outside of setup', () => {
        const handler = vi.fn();

        effect(handler);
        onMount(handler);
        onCleanup(handler);

        vi.runAllTimers();

        expect(errorSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalledTimes(3);
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

      const { getByTestId } = render(<CounterComponent />);

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

  describe('named', () => {
    describe('Basic Usage', () => {
      it('should assign display name to a component', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        const NamedComponent = named(TestComponent, 'TestNamedComponent');

        expect(NamedComponent).toBe(TestComponent);
        expect(NamedComponent.displayName).toBe('TestNamedComponent');
      });

      it('should override existing display name', () => {
        const TestComponent = (props: { value: string }) => {
          return <div data-testid="test-component">{props.value}</div>;
        };

        TestComponent.displayName = 'OriginalName';
        const NamedComponent = named(TestComponent, 'NewName');

        expect(NamedComponent).toBe(TestComponent);
        expect(NamedComponent.displayName).toBe('NewName');
      });
    });

    describe('Error Handling', () => {
      it('should handle invalid component and log error', () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        const NamedComponent = named(null as never, undefined as never);

        render(<NamedComponent />);

        vi.runAllTimers();

        expect(NamedComponent.displayName).toBe('Error(Anonymous)');
        expect(consoleErrorSpy).toHaveBeenCalled();

        consoleErrorSpy.mockRestore();
      });
    });
  });
});
