import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../src/client/index';
import { mutable } from '@anchorlib/core';
import { $use } from '../src/index.js';
import { createSwitch, Show } from '../src/switch.js';

describe('Switches', () => {
  it('should render the Switch and match the correct Slot', async () => {
    const ctx = Symbol('test-switch-1');
    const TestSwitch = createSwitch<{ status: string }, string>(ctx, 'status', 'TestSwitch');
    const Slot = TestSwitch.Slot;
    const state = mutable({ status: 'pending' });

    const { container } = render(
      <TestSwitch for={state}>
        <Slot for="pending">
          <div>Pending...</div>
        </Slot>
        <Slot for="success">
          <div>Success!</div>
        </Slot>
      </TestSwitch>
    );

    expect(container.textContent).toContain('Pending...');
    expect(container.textContent).not.toContain('Success!');

    act(() => {
      state.status = 'success';
    });

    expect(container.textContent).toContain('Success!');
    expect(container.textContent).not.toContain('Pending...');
  });

  it('should render a Slot with a function as child', () => {
    const ctx = Symbol('test-switch-2');
    const TestSwitch = createSwitch<{ status: string }, string>(ctx, 'status', 'TestSwitchFunc');
    const Slot = TestSwitch.Slot;

    const { container } = render(
      <TestSwitch for={{ status: 'ready' }}>
        <Slot for="ready">{() => <div>Ready as function!</div>}</Slot>
      </TestSwitch>
    );

    expect(container.textContent).toContain('Ready as function!');
  });

  it('should render error message when Slot is rendered outside of Switch', () => {
    const ctx = Symbol('test-switch-3');
    const TestSwitch = createSwitch<{ status: string }, string>(ctx, 'status', 'TestSwitchErr');
    const Slot = TestSwitch.Slot;

    const { container } = render(
      <Slot for="ready">
        <div>Ready!</div>
      </Slot>
    );

    expect(container.textContent).toContain('[Slot Error: Slot rendered outside of Switch]');
  });

  it('should conditionally render children with Show', () => {
    const state = mutable({ status: 'ready' });

    const { container } = render(
      <>
        <Show when={() => state.status === 'ready'}>
          <div>Ready!</div>
        </Show>
        <Show when={() => state.status === 'ready'}>{(value) => <div>Factory!{value}</div>}</Show>
      </>
    );

    expect(container.textContent.includes('Ready!')).toBe(true);
    expect(container.textContent.includes('Factory!')).toBe(true);
  });

  it('should conditionally render children with fallback', () => {
    const state = mutable({ active: false });

    const { container } = render(
      <>
        <Show when={$use(state, 'active')} fallback={() => <div>Loading...</div>}>
          <div>Ready!</div>
        </Show>
        <Show when={$use(state, 'active')}>
          <div>Factory!</div>
        </Show>
        <Show when={state.active}>
          <div>Active!</div>
        </Show>
      </>
    );

    expect(container.textContent).toContain('Loading...');

    act(() => {
      state.active = true;
    });

    expect(container.textContent.includes('Ready!')).toBe(true);
    expect(container.textContent.includes('Factory!')).toBe(true);
    // Pass-by-value should not re-render.
    expect(container.textContent.includes('Active!')).toBe(false);
  });
});
