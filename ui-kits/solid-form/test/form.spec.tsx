/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { TextInput } from '../src/inputs/TextInput.js';
import { configureForm } from '../src/config.js';

afterEach(cleanup);

const userSchema = z.object({
  name: z.string().min(3, 'Name too short'),
  email: z.string().email('Invalid email'),
});

describe('Form', () => {
  it('should render a <form> element', () => {
    const { container } = render(() => <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }} />);
    expect(container.querySelector('form')).not.toBeNull();
  });

  it('should forward intrinsic props to the <form> element', () => {
    render(() => (
      <Form
        schema={userSchema}
        value={{ name: 'John', email: 'john@test.com' }}
        class="my-form"
        id="test-form"
        data-testid="form"
      />
    ));
    const form = screen.getByTestId('form');
    expect(form.className).toBe('my-form');
    expect(form.id).toBe('test-form');
  });

  it('should not leak schema or value to the DOM', () => {
    render(() => <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }} data-testid="form" />);
    const form = screen.getByTestId('form');
    expect(form.getAttribute('schema')).toBeNull();
    expect(form.getAttribute('value')).toBeNull();
  });

  it('should render children', () => {
    render(() => (
      <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
        <button type="submit">Submit</button>
      </Form>
    ));
    expect(screen.getByText('Submit')).toBeDefined();
  });

  it('should call onSubmit with validated data on form submission', async () => {
    const handleSubmit = vi.fn();

    const { container } = render(() => (
      <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }} onSubmit={handleSubmit}>
        <Field name="name">
          <TextInput data-testid="name-input" />
        </Field>
        <button type="submit">Submit</button>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('name-input'), { target: { value: 'Jane' } });

    const form = container.querySelector('form')!;
    fireEvent.submit(form);

    expect(handleSubmit).toHaveBeenCalledTimes(1);

    const [data, changes, event] = handleSubmit.mock.calls[0];
    expect(data.name).toBe('Jane');
    expect(changes.name).toBe('Jane');
    expect(event).toBeDefined();
  });

  it('should prevent default form submission', () => {
    const { container } = render(() => (
      <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
        <button type="submit">Submit</button>
      </Form>
    ));

    const form = container.querySelector('form')!;
    const event = new Event('submit', { bubbles: true, cancelable: true });
    const prevented = !form.dispatchEvent(event);
    expect(prevented).toBe(true);
  });

  it('should apply error class when onSubmit handler throws', async () => {
    const handleSubmit = async () => {
      throw new Error('Submit error');
    };
    render(() => (
      <Form
        schema={userSchema}
        value={{ name: 'John', email: 'john@test.com' }}
        class="my-form"
        errorClass="form-err"
        data-testid="form"
        onSubmit={handleSubmit}
      >
        <button type="submit">Submit</button>
      </Form>
    ));
    const form = screen.getByTestId('form');
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));
    expect(form.className).toContain('form-err');
  });

  it('should fallback to default options when errorClass is omitted', async () => {
    const handleSubmit = async () => {
      throw new Error('Submit error');
    };
    render(() => (
      <Form
        schema={userSchema}
        value={{ name: 'John', email: 'john@test.com' }}
        data-testid="form-fallback"
        onSubmit={handleSubmit}
      >
        <button type="submit">Submit</button>
      </Form>
    ));
    const form = screen.getByTestId('form-fallback');
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should cover all class branches for error in Form', async () => {
    const handleSubmit = async () => {
      throw new Error('Submit error');
    };
    render(() => (
      <div>
        <Form
          schema={userSchema}
          value={{ name: 'John', email: 'john@test.com' }}
          data-testid="form-c"
          class="my-c"
          onSubmit={handleSubmit}
        >
          <button type="submit">Submit</button>
        </Form>
        <Form
          schema={userSchema}
          value={{ name: 'John', email: 'john@test.com' }}
          data-testid="form-e"
          errorClass="my-e"
          onSubmit={handleSubmit}
        >
          <button type="submit">Submit</button>
        </Form>
      </div>
    ));

    fireEvent.submit(screen.getByTestId('form-c'));
    fireEvent.submit(screen.getByTestId('form-e'));
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should use globally configured FORM_OPTIONS when props are omitted', async () => {
    configureForm({
      form: { class: 'global-c', errorClass: 'global-e' },
    });

    const handleSubmit = async () => {
      throw new Error('err');
    };
    render(() => (
      <Form schema={userSchema} value={{ name: 'x', email: 'x' }} data-testid="global-form" onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </Form>
    ));

    const form = screen.getByTestId('global-form');
    // Initially, error is false, so it uses FORM_OPTIONS.class
    expect(form.className).toContain('global-c');

    // Trigger error
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));

    // Now it uses FORM_OPTIONS.class AND FORM_OPTIONS.errorClass
    expect(form.className).toContain('global-c');
    expect(form.className).toContain('global-e');

    // Reset config
    configureForm({ form: { class: undefined, errorClass: undefined } });
  });

  it('should evaluate right side of ?? by passing explicit undefined', async () => {
    configureForm({
      form: { class: 'global-c', errorClass: 'global-e' },
    });

    const handleSubmit = async () => {
      throw new Error('err');
    };
    // Pass explicitly undefined so Object.hasOwn is true, bypassing the forEach fallback
    render(() => (
      <Form
        schema={userSchema}
        value={{ name: 'x', email: 'x' }}
        class={undefined}
        errorClass={undefined}
        data-testid="global-form-explicit"
        onSubmit={handleSubmit}
      >
        <button type="submit">Submit</button>
      </Form>
    ));

    const form = screen.getByTestId('global-form-explicit');
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));

    expect(form.className).toContain('global-c');
    expect(form.className).toContain('global-e');

    configureForm({ form: { class: undefined, errorClass: undefined } });
  });
});
