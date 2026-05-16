/** @jsxImportSource solid-js */

import { mutable } from '@anchorlib/core';
import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { Show } from '../src/index.js';

describe('Show Component', () => {
  it('should conditionally render static children based on truthy condition', () => {
    const state = mutable({ status: 'pending' });

    const { container } = render(() => (
      <Show when={state.status === 'success'}>
        <div>Success!</div>
      </Show>
    ));

    expect(container.textContent).not.toContain('Success!');

    state.status = 'success';

    expect(container.textContent).toContain('Success!');
  });

  it('should pass the unwrapped truthy value to a render prop', () => {
    const state = mutable<{ user: { name: string } | null }>({ user: null });

    const { container } = render(() => <Show when={state.user}>{(user) => <div>Hello {user.name}</div>}</Show>);

    expect(container.textContent).not.toContain('Hello');

    state.user = { name: 'Alice' };

    expect(container.textContent).toContain('Hello Alice');

    // Make sure reactivity works inside the unwrapped object properties
    state.user.name = 'Bob';

    expect(container.textContent).toContain('Hello Bob');
  });

  it('should render fallback when condition is falsy', () => {
    const state = mutable<{ user: { name: string } | null }>({ user: null });

    const { container } = render(() => (
      <Show when={state.user} fallback={<div>Guest</div>}>
        {(user) => <div>Hello {user.name}</div>}
      </Show>
    ));

    expect(container.textContent).toContain('Guest');

    state.user = { name: 'Alice' };

    expect(container.textContent).not.toContain('Guest');
    expect(container.textContent).toContain('Hello Alice');
  });
});
