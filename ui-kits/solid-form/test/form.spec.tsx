/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { FormSubmit, TextInput } from '../src/index.js';

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
    expect(form.className).toBe('air-form my-form');
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

  it('should call onSubmit with validated data on form submission', () => {
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

  it('should apply errorClass when form has errors on submit', async () => {
    const schema = z.object({ name: z.string() });
    const handleSubmit = () => {
      throw new Error('Server validation failed');
    };

    render(() => (
      <Form
        schema={schema}
        value={{ name: 'Valid' }}
        onSubmit={handleSubmit}
        class="base-class"
        errorClass="error-state"
        data-testid="error-form"
      >
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <button type="submit" data-testid="submit-btn">
          Submit
        </button>
      </Form>
    ));

    const form = screen.getByTestId('error-form');
    expect(form.className).toBe('air-form base-class');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await new Promise((r) => setTimeout(r, 10));

    expect(form.className).toBe('air-form base-class error-state');
  });

  it('should apply default errorClass when form has errors and omitted', async () => {
    const schema = z.object({ name: z.string() });
    const handleSubmit = () => {
      throw new Error('Server validation failed');
    };

    render(() => (
      <Form schema={schema} value={{ name: 'Valid' }} onSubmit={handleSubmit} data-testid="error-form-def">
        <Field name="name">
          <TextInput data-testid="input-def" />
        </Field>
        <button type="submit" data-testid="submit-btn-def">
          Submit
        </button>
      </Form>
    ));

    const form = screen.getByTestId('error-form-def');
    expect(form.className).toBe('air-form');

    fireEvent.input(screen.getByTestId('input-def'), { target: { value: 'Valid Changed' } });
    fireEvent.click(screen.getByTestId('submit-btn-def'));
    await new Promise((r) => setTimeout(r, 10));

    expect(form.className).toBe('air-form air-form-error');
  });

  it('should apply partial errorClass or class correctly on error', async () => {
    const schema = z.object({ name: z.string() });
    const handleSubmit = () => {
      throw new Error('Server validation failed');
    };

    render(() => (
      <>
        <Form
          schema={schema}
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="form-only-class"
          class="only-class"
        >
          <Field name="name">
            <TextInput data-testid="input-only-class" />
          </Field>
          <button type="submit" data-testid="submit-only-class">
            Submit
          </button>
        </Form>
        <Form
          schema={schema}
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="form-only-error"
          errorClass="only-error"
        >
          <Field name="name">
            <TextInput data-testid="input-only-error" />
          </Field>
          <button type="submit" data-testid="submit-only-error">
            Submit
          </button>
        </Form>
      </>
    ));

    fireEvent.input(screen.getByTestId('input-only-class'), { target: { value: 'Changed' } });
    fireEvent.input(screen.getByTestId('input-only-error'), { target: { value: 'Changed' } });

    fireEvent.click(screen.getByTestId('submit-only-class'));
    fireEvent.click(screen.getByTestId('submit-only-error'));
    await new Promise((r) => setTimeout(r, 10));

    expect(screen.getByTestId('form-only-class').className).toBe('air-form only-class air-form-error');
    expect(screen.getByTestId('form-only-error').className).toBe('air-form only-error');
  });

  it('should apply empty string, null, and explicitly undefined classes correctly on error', async () => {
    const schema = z.object({ name: z.string() });
    const handleSubmit = () => {
      throw new Error('Server validation failed');
    };

    render(() => (
      <>
        <Form
          schema={schema}
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="form-empty-class"
          class=""
          errorClass=""
        >
          <Field name="name">
            <TextInput data-testid="input-empty-class" />
          </Field>
          <button type="submit" data-testid="submit-empty-class">
            Submit
          </button>
        </Form>
        <Form
          schema={schema}
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="form-null-class"
          class={null as any}
          errorClass={null as any}
        >
          <Field name="name">
            <TextInput data-testid="input-null-class" />
          </Field>
          <button type="submit" data-testid="submit-null-class">
            Submit
          </button>
        </Form>
        <Form
          schema={schema}
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="form-undef-class"
          class={undefined}
          errorClass={undefined}
        >
          <Field name="name">
            <TextInput data-testid="input-undef-class" />
          </Field>
          <button type="submit" data-testid="submit-undef-class">
            Submit
          </button>
        </Form>
      </>
    ));

    fireEvent.input(screen.getByTestId('input-empty-class'), { target: { value: 'Changed' } });
    fireEvent.input(screen.getByTestId('input-null-class'), { target: { value: 'Changed' } });
    fireEvent.input(screen.getByTestId('input-undef-class'), { target: { value: 'Changed' } });

    fireEvent.click(screen.getByTestId('submit-empty-class'));
    fireEvent.click(screen.getByTestId('submit-null-class'));
    fireEvent.click(screen.getByTestId('submit-undef-class'));
    await new Promise((r) => setTimeout(r, 10));

    expect(screen.getByTestId('form-empty-class').className).toBe('air-form');
    expect(screen.getByTestId('form-null-class').className).toBe('air-form air-form-error');
    expect(screen.getByTestId('form-undef-class').className).toBe('air-form air-form-error');
  });

  it('FormSubmit should apply default pendingClass when omitted', async () => {
    const schema = z.object({ name: z.string() });
    let resolveSubmit: any;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    render(() => (
      <Form schema={schema} value={{ name: 'Valid' }} onSubmit={handleSubmit}>
        <Field name="name">
          <TextInput data-testid="input-submit" />
        </Field>
        <FormSubmit data-testid="form-submit">Submit</FormSubmit>
      </Form>
    ));

    const btn = screen.getByTestId('form-submit');
    expect(btn.className).toBe('air-form-submit');

    fireEvent.input(screen.getByTestId('input-submit'), { target: { value: 'Changed' } });
    fireEvent.click(btn);

    expect(btn.className).toBe('air-form-submit air-form-submit-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));
  });
});
