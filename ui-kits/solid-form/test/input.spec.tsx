/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { Checkbox, createInput, FilePicker, Radio, Select, Textarea, TextInput } from '../src/index.js';

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
    expect(input.className).toBe('air-text-input my-input');
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

  it('should apply errorClass when input has errors and is touched', () => {
    const errorSchema = z.object({ name: z.string().min(5) });
    render(() => (
      <Form schema={errorSchema} value={{ name: 'Al' }}>
        <Field name="name">
          <TextInput data-testid="input" class="base-input" errorClass="err-input" />
        </Field>
      </Form>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.className).toBe('air-text-input base-input');

    fireEvent.input(input, { target: { value: 'Ali' } });
    fireEvent.blur(input);

    expect(input.className).toBe('air-text-input base-input err-input');
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
    expect(checkbox.className).toBe('air-checkbox-input my-checkbox');
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

  it('should apply errorClass when checkbox has errors and is touched', () => {
    const errorSchema = z.object({ agree: z.literal(true) });
    render(() => (
      <Form schema={errorSchema} value={{ agree: false }}>
        <Field name="agree">
          {(field: any) => (
            <>
              <Checkbox name="agree" data-testid="checkbox" class="base-cb" errorClass="err-cb" />
              <button
                data-testid="touch"
                onClick={() => {
                  field.value = false as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));

    const cb = screen.getByTestId('checkbox') as HTMLInputElement;
    expect(cb.className).toBe('air-checkbox-input base-cb');

    fireEvent.click(screen.getByTestId('touch'));

    expect(cb.className).toBe('air-checkbox-input base-cb err-cb');
  });

  it('Checkbox applies default classes when not provided', () => {
    const errorSchema = z.object({ agree: z.literal(true) });
    render(() => (
      <Form schema={errorSchema} value={{ agree: false }}>
        <Field name="agree">
          {(field: any) => (
            <>
              <Checkbox name="agree" data-testid="checkbox-def" />
              <button
                data-testid="touch-def"
                onClick={() => {
                  field.value = false as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));

    const cb = screen.getByTestId('checkbox-def') as HTMLInputElement;
    fireEvent.click(screen.getByTestId('touch-def'));
    expect(cb.className).toBe('air-checkbox-input air-checkbox-input-error');
  });
});

describe('Other Inputs Error State', () => {
  const errorSchema = z.object({
    radio: z.literal('yes'),
    select: z.literal('yes'),
    text: z.string().min(5),
    file: z.any().refine((val) => val != null, 'Required'),
  });

  it('Radio applies errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ radio: 'no' }}>
        <Field name="radio">
          {(field: any) => (
            <>
              <Radio name="radio" data-testid="input" class="base" errorClass="err" value="no" />
              <button
                data-testid="touch"
                onClick={() => {
                  field.value = 'no' as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input');
    fireEvent.click(screen.getByTestId('touch'));
    expect(input.className).toBe('air-radio-input base err');
  });

  it('Radio applies default errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ radio: 'no' }}>
        <Field name="radio">
          {(field: any) => (
            <>
              <Radio name="radio" data-testid="input-def" value="no" />
              <button
                data-testid="touch-def"
                onClick={() => {
                  field.value = 'no' as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input-def');
    fireEvent.click(screen.getByTestId('touch-def'));
    expect(input.className).toBe('air-radio-input air-radio-input-error');
  });

  it('Select applies errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ select: 'no' }}>
        <Field name="select">
          <Select data-testid="input" class="base" errorClass="err">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input');
    fireEvent.change(input, { target: { value: 'no' } });
    fireEvent.blur(input);
    expect(input.className).toBe('air-select-input base err');
  });

  it('Textarea applies errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ text: 'Al' }}>
        <Field name="text">
          <Textarea data-testid="input" class="base" errorClass="err" />
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input');
    fireEvent.input(input, { target: { value: 'Ali' } });
    fireEvent.blur(input);
    expect(input.className).toBe('air-textarea-input base err');
  });

  it('Textarea applies default errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ text: 'Al' }}>
        <Field name="text">
          <Textarea data-testid="input-def" />
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input-def');
    fireEvent.input(input, { target: { value: 'Ali' } });
    fireEvent.blur(input);
    expect(input.className).toBe('air-textarea-input air-textarea-input-error');
  });

  it('Select applies default errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ select: 'no' }}>
        <Field name="select">
          <Select data-testid="input-def">
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </Select>
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input-def');
    fireEvent.change(input, { target: { value: 'yes' } });
    fireEvent.change(input, { target: { value: 'no' } });
    fireEvent.blur(input);
    expect(input.className).toBe('air-select-input air-select-input-error');
  });

  it('FilePicker applies errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ file: null }}>
        <Field name="file">
          {(field: any) => (
            <>
              <FilePicker name="file" data-testid="input" class="base" errorClass="err" />
              <button
                data-testid="touch"
                onClick={() => {
                  field.value = null as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input');
    fireEvent.click(screen.getByTestId('touch'));
    expect(input.className).toBe('air-file-input base err');
  });

  it('FilePicker applies default errorClass', () => {
    render(() => (
      <Form schema={errorSchema} value={{ file: null }}>
        <Field name="file">
          {(field: any) => (
            <>
              <FilePicker name="file" data-testid="input-def" />
              <button
                data-testid="touch-def"
                onClick={() => {
                  field.value = null as never;
                }}
              />
            </>
          )}
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('input-def');
    fireEvent.click(screen.getByTestId('touch-def'));
    expect(input.className).toBe('air-file-input air-file-input-error');
  });

  it('createInput returns default classes for unknown type', () => {
    const UnknownInput = createInput('unknown');
    render(() => (
      <Form schema={errorSchema} value={{ select: 'no' }}>
        <Field name="select">
          <UnknownInput data-testid="unknown" />
        </Field>
      </Form>
    ));
    const input = screen.getByTestId('unknown');
    expect(input.className).toBe('air-text-input');
  });
});
