import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../src/client/index';
import { mutable } from '@anchorlib/core';
import { $use } from '../src/index.js';
import { createSwitch, For, Show } from '../src/switch.js';

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

  describe('For Component', () => {
    it('should render a list of objects', () => {
      const state = mutable({
        items: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });

      const { container } = render(<For each={() => state.items}>{(item) => <div>{item.name}</div>}</For>);

      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('Bob');
    });

    it('should render fallback when empty', () => {
      const state = mutable({ items: [] });

      const { container } = render(
        <For each={() => state.items} fallback={() => <div>Empty List</div>}>
          {(item: any) => <div>{item.name}</div>}
        </For>
      );

      expect(container.textContent).toContain('Empty List');
    });

    it('should react to array mutations', () => {
      const state = mutable({ items: [{ id: 1, name: 'Alice' }] });

      const { container } = render(<For each={() => state.items}>{(item) => <div>{item.name}</div>}</For>);

      expect(container.textContent).toContain('Alice');
      expect(container.textContent).not.toContain('Bob');

      act(() => {
        state.items.push({ id: 2, name: 'Bob' });
      });

      expect(container.textContent).toContain('Alice');
      expect(container.textContent).toContain('Bob');

      act(() => {
        state.items[0].name = 'Alice Updated';
      });

      expect(container.textContent).toContain('Alice Updated');
    });

    it('should safely render primitives', () => {
      const state = mutable({ items: [1, 1, 2] });

      const { container } = render(<For each={() => state.items}>{(item) => <div>Num: {item as number}</div>}</For>);

      expect(container.textContent).toContain('Num: 1Num: 1Num: 2');
    });

    it('should support static each array', () => {
      const items = [{ id: 1, name: 'Static' }];

      const { container } = render(<For each={items}>{(item) => <div>{item.name}</div>}</For>);

      expect(container.textContent).toContain('Static');
    });

    it('should support static fallback element', () => {
      const { container } = render(
        <For each={[]} fallback={<div>Static Fallback</div>}>
          {() => <div />}
        </For>
      );

      expect(container.textContent).toContain('Static Fallback');
    });

    it('should return null when empty and no fallback provided', () => {
      const { container } = render(<For each={[]}>{() => <div />}</For>);

      expect(container.innerHTML).toBe('');
    });
  });
});
