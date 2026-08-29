/** @jsxImportSource solid-js */

import { FORM_SYMBOL } from '@airlib/form';
import { setContext } from '@airlib/solid';
import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { FormSubmit } from '../src/FormSubmit.js';
import { TextInput } from '../src/inputs/TextInput.js';

afterEach(cleanup);

const schema = z.object({
  name: z.string().min(3),
});

describe('FormSubmit', () => {
  it('should render a <button type="submit">', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormSubmit data-testid="btn">Save</FormSubmit>
      </Form>
    ));

    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.tagName).toBe('BUTTON');
    expect(btn.type).toBe('submit');
    expect(btn.textContent).toBe('Save');
  });

  it('should be disabled when form has no changes', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormSubmit data-testid="btn">Save</FormSubmit>
      </Form>
    ));

    expect((screen.getByTestId('btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should be enabled after a change', async () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormSubmit data-testid="btn">Save</FormSubmit>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });

    expect((screen.getByTestId('btn') as HTMLButtonElement).disabled).toBe(false);
  });

  it('should forward intrinsic props', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormSubmit data-testid="btn" class="btn-primary" id="submit-btn">
          Save
        </FormSubmit>
      </Form>
    ));

    const btn = screen.getByTestId('btn');
    expect(btn.className).toBe('btn-primary');
    expect(btn.id).toBe('submit-btn');
  });

  it('should support render function with form state', () => {
    render(() => (
      <Form schema={schema} value={{ name: 'John' }}>
        <FormSubmit data-testid="btn">{(form: any) => (form?.pending ? 'Saving...' : 'Save')}</FormSubmit>
      </Form>
    ));

    expect(screen.getByTestId('btn').textContent).toBe('Save');
  });

  it('should pass undefined form when rendered outside Form', () => {
    setContext(FORM_SYMBOL, undefined);

    let receivedForm: unknown = 'not-called';

    render(() => (
      <FormSubmit data-testid="btn">
        {(form: any) => {
          receivedForm = form;
          return 'Submit';
        }}
      </FormSubmit>
    ));

    expect(receivedForm).toBeUndefined();
    expect(screen.getByTestId('btn').textContent).toBe('Submit');
    expect((screen.getByTestId('btn') as HTMLButtonElement).disabled).toBe(true);
  });

  it('should apply pending class when form is submitting', async () => {
    const handleSubmit = () => new Promise<void>((resolve) => setTimeout(resolve, 100));

    render(() => (
      <Form schema={schema} value={{ name: 'John' }} onSubmit={handleSubmit}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormSubmit data-testid="btn" pendingClass="submitting">
          Save
        </FormSubmit>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    const btn = screen.getByTestId('btn');
    fireEvent.click(btn);

    expect(btn.className).toContain('submitting');
  });

  it('should fallback to default options when pendingClass is omitted', async () => {
    const handleSubmit = () => new Promise<void>((resolve) => setTimeout(resolve, 100));

    render(() => (
      <Form schema={schema} value={{ name: 'John' }} onSubmit={handleSubmit}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormSubmit data-testid="btn-fallback">Save</FormSubmit>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    const btn = screen.getByTestId('btn-fallback');
    fireEvent.click(btn);
  });
});
