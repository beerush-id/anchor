/** @jsxImportSource solid-js */

import { mutable } from '@airlib/core';
import { render } from '@solidjs/testing-library';
import { describe, expect, it } from 'vitest';
import { Show, Slot, Snippet } from '../src/index.js';

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

describe('Snippet Component', () => {
  it('should render snippet content', () => {
    const { container } = render(() => <Snippet>{() => <div>Success!</div>}</Snippet>);

    expect(container.textContent).toContain('Success!');
  });

  it('should render snippet content with object data', () => {
    const { container } = render(() => (
      <Snippet data={{ text: 'Success!' }}>{({ text }) => <div>{text}</div>}</Snippet>
    ));

    expect(container.textContent).toContain('Success!');
  });

  it('should render snippet content with array data', () => {
    const { container } = render(() => (
      <Snippet data={[{ text: 'Success!' }]}>{({ 0: item }) => <div>{item.text}</div>}</Snippet>
    ));

    expect(container.textContent).toContain('Success!');
  });

  it('should render error when children is not function', () => {
    const { container } = render(() => (
      <Snippet data={[{ text: 'Success!' }]}>{(<div>Success!</div>) as never}</Snippet>
    ));

    expect(container.textContent).toContain('Snippet Error');
  });

  it('should render snippet content with undefined data', () => {
    const { container } = render(() => (
      <Snippet data={undefined as never as { text: string }}>{(data) => <div>{data?.text}</div>}</Snippet>
    ));

    expect(container.textContent).not.toContain('undefined');
  });

  it('should re-render snippet content', () => {
    const state = mutable({ count: 0 });

    const { container } = render(() => <Snippet data={state}>{({ count }) => <div>Count: {count}</div>}</Snippet>);
    expect(container.textContent).toContain('Count: 0');

    state.count = 1;
    expect(container.textContent).toContain('Count: 1');
  });

  it('should re-render full snippet content', () => {
    const state = mutable({
      name: 'Alice',
      age: 30,
    });

    const { container } = render(() => (
      <Snippet data={state}>
        {({ name, age }) => (
          <div>
            <span>Name: {name}</span>
            <span>Age: {age}</span>
          </div>
        )}
      </Snippet>
    ));
    expect(container.textContent).toContain('Name: Alice');
    expect(container.textContent).toContain('Age: 30');

    state.age = 31;
    expect(container.textContent).toContain('Name: Alice');
    expect(container.textContent).toContain('Age: 31');

    state.name = 'Bob';
    expect(container.textContent).toContain('Name: Bob');
    expect(container.textContent).toContain('Age: 31');
  });
});

describe('Slot Component', () => {
  it('should render functional fallback Slot', () => {
    const { container } = render(() => <Slot for={undefined as never}>{() => <span>Default</span>}</Slot>);
    expect(container.textContent).toContain('Default');
  });

  it('should render slot function output when provided', () => {
    const { container } = render(() => <Slot for={<span>Injected Function</span>}>{() => <span>Default</span>}</Slot>);
    expect(container.textContent).toContain('Injected Function');
  });

  it('should render direct JSX element when provided', () => {
    const { container } = render(() => <Slot for={<span>Injected Element</span>}>{() => <span>Default</span>}</Slot>);
    expect(container.textContent).toContain('Injected Element');
  });
});
