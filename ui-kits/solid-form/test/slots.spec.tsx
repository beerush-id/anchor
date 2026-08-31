/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { TextInput } from '../src/index.js';

afterEach(cleanup);

const schema = z.object({
  name: z.string().min(3, 'Name too short'),
});

describe('Form slots', () => {
  it('should render header, actions, and footer snippets around children', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }} data-testid="form">
        <Form.Snippet for="header">{() => <div data-testid="header">Header</div>}</Form.Snippet>
        <Form.Snippet for="actions">{() => <div data-testid="actions">Actions</div>}</Form.Snippet>
        <Form.Snippet for="footer">{() => <div data-testid="footer">Footer</div>}</Form.Snippet>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    const form = screen.getByTestId('form');
    expect(screen.getByTestId('header')).toBeDefined();
    expect(screen.getByTestId('actions')).toBeDefined();
    expect(screen.getByTestId('footer')).toBeDefined();
    expect(screen.getByTestId('input')).toBeDefined();

    const nodes = Array.from(form.children).map((el) => el.getAttribute('data-testid'));
    expect(nodes.indexOf('header')).toBeLessThan(nodes.indexOf('actions'));
    expect(nodes.indexOf('actions')).toBeLessThan(nodes.indexOf('footer'));
  });

  it('should pass the form state to slot renderers', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Form.Snippet for="header">{(form: any) => <span data-testid="header-valid">{String(form.valid)}</span>}</Form.Snippet>
      </Form>
    ));

    expect(screen.getByTestId('header-valid').textContent).toBe('true');
  });

  it('should render the default error banner when submission fails', async () => {
    render(() => (
      <Form
        schema={schema}
        value={{ name: 'John' }}
        onSubmit={() => {
          throw new Error('Server rejected');
        }}
      >
        <button type="submit" data-testid="submit">
          Submit
        </button>
      </Form>
    ));

    expect(screen.queryByRole('alert')).toBeNull();

    fireEvent.click(screen.getByTestId('submit'));
    await new Promise((r) => setTimeout(r, 10));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe('Server rejected');
    expect(alert.className).toBe('air-form-error');
  });

  it('should replace the default error banner with the error snippet', async () => {
    render(() => (
      <Form
        schema={schema}
        value={{ name: 'John' }}
        onSubmit={() => {
          throw new Error('Server rejected');
        }}
      >
        <Form.Snippet for="error">
          {(form: any) => form.error && <div data-testid="custom-error">{form.error.message}</div>}
        </Form.Snippet>
        <button type="submit" data-testid="submit">
          Submit
        </button>
      </Form>
    ));

    fireEvent.click(screen.getByTestId('submit'));
    await new Promise((r) => setTimeout(r, 10));

    expect(screen.getByTestId('custom-error').textContent).toBe('Server rejected');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('Field slots', () => {
  it('should replace the default label with the label snippet', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name" label="Name">
          <Field.Snippet for="label">{(field: any) => <span data-testid="custom-label">{field.name}</span>}</Field.Snippet>
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    expect(screen.getByTestId('custom-label').textContent).toBe('name');
    expect(screen.queryByText('Name')).toBeNull();
  });

  it('should render prefix and suffix snippets around the control', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name" data-testid="field">
          <Field.Snippet for="prefix">{() => <span data-testid="prefix">P</span>}</Field.Snippet>
          <TextInput data-testid="input" />
          <Field.Snippet for="suffix">{() => <span data-testid="suffix">S</span>}</Field.Snippet>
        </Field>
      </Form>
    ));

    const control = screen.getByTestId('field').querySelector('.air-form-field-control');
    expect(control).not.toBeNull();

    const nodes = Array.from(control!.children).map((el) => el.getAttribute('data-testid'));
    expect(nodes).toEqual(['prefix', 'input', 'suffix']);
  });

  it('should replace the default support content with the support snippet', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'Al' }}>
        <Field name="name" data-testid="field">
          <Field.Snippet for="support">
            {(field: any) => <div data-testid="custom-support">{field.error?.join(', ')}</div>}
          </Field.Snippet>
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'A' } });

    expect(screen.getByTestId('custom-support').textContent).toBe('Name too short');
    expect(screen.getByTestId('field').querySelector('[role="alert"]')).toBeNull();
  });
});
