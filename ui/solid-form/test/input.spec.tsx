/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { Checkbox } from '../src/inputs/Checkbox.js';
import { TextInput } from '../src/inputs/index.js';

afterEach(cleanup);

const formSchema = z.object({
  name: z.string().min(3),
  agree: z.boolean(),
});

describe('TextInput', () => {
  it('should render an <input> element with value from form state', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.tagName).toBe('INPUT');
    expect(input.value).toBe('John');
  });

  it('should forward intrinsic props to the <input> element', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="name">
          <TextInput data-testid="input" class="my-input" placeholder="Enter name" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.className).toBe('my-input');
    expect(input.placeholder).toBe('Enter name');
  });

  it('should update form state on input', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    fireEvent.input(input, { target: { value: 'Jane' } });
    expect(input.value).toBe('Jane');
  });

  it('should call user onInput handler alongside form binding', () => {
    let inputCalled = false;

    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="name">
          <TextInput
            data-testid="input"
            onInput={() => {
              inputCalled = true;
            }}
          />
        </Field>
      </Form>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    expect(inputCalled).toBe(true);
  });

  it('should call user onBlur handler alongside settled()', () => {
    let blurCalled = false;

    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="name">
          <TextInput
            data-testid="input"
            onBlur={() => {
              blurCalled = true;
            }}
          />
        </Field>
      </Form>
    ));

    fireEvent.blur(screen.getByTestId('input'));
    expect(blurCalled).toBe(true);
  });
});

describe('Checkbox', () => {
  it('should render a checkbox input', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="agree">
          <Checkbox data-testid="checkbox" />
        </Field>
      </Form>
    ));

    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.type).toBe('checkbox');
    expect(checkbox.checked).toBe(false);
  });

  it('should toggle checked state on change', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="agree">
          <Checkbox data-testid="checkbox" />
        </Field>
      </Form>
    ));

    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    fireEvent.change(checkbox, { target: { checked: true } });
    expect(checkbox.checked).toBe(true);
  });

  it('should forward intrinsic props', () => {
    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="agree">
          <Checkbox data-testid="checkbox" class="my-checkbox" />
        </Field>
      </Form>
    ));

    const checkbox = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(checkbox.className).toBe('my-checkbox');
  });

  it('should call user onChange handler alongside form binding', () => {
    let changeCalled = false;

    render(() => (
      <Form schema={formSchema} value={{ name: 'John', agree: false }}>
        <Field name="agree">
          <Checkbox
            data-testid="checkbox"
            onChange={() => {
              changeCalled = true;
            }}
          />
        </Field>
      </Form>
    ));

    fireEvent.click(screen.getByTestId('checkbox'));
    expect(changeCalled).toBe(true);
  });

  it('should apply error class when touched and invalid', () => {
    const errorSchema = z.object({ agree: z.boolean().refine((v) => v === true, 'Required') });

    render(() => (
      <Form schema={errorSchema} value={{ agree: false }}>
        <Field name="agree">
          <Checkbox data-testid="checkbox-error" errorClass="check-error" />
        </Field>
      </Form>
    ));

    const checkbox = screen.getByTestId('checkbox-error');
    fireEvent.change(checkbox, { target: { checked: true } });
    fireEvent.change(checkbox, { target: { checked: false } });
    expect(checkbox.className).toContain('check-error');
  });

  it('should fallback to default options when errorClass is omitted', () => {
    const errorSchema = z.object({ agree: z.boolean().refine((v) => v === true, 'Required') });

    render(() => (
      <Form schema={errorSchema} value={{ agree: false }}>
        <Field name="agree">
          <Checkbox data-testid="checkbox-fallback" />
        </Field>
      </Form>
    ));

    const checkbox = screen.getByTestId('checkbox-fallback');
    fireEvent.change(checkbox, { target: { checked: true } });
    fireEvent.change(checkbox, { target: { checked: false } });
  });
});
