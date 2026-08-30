import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { Form } from '../src/Form.js';
import { FormReset } from '../src/FormReset.js';
import { TextInput } from '../src/index.js';

afterEach(cleanup);

const schema = z.object({
  name: z.string().min(3),
});

describe('FormReset', () => {
  it('should reset the form state by default', async () => {
    render(
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormReset data-testid="btn" className="btn-base" dirtyClass="btn-dirty">
          Reset
        </FormReset>
      </Form>
    );

    const btn = screen.getByTestId('btn') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    // Make a change
    await act(async () => {
      fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    });

    expect(btn.disabled).toBe(false);
    expect(btn.className).toBe('air-form-reset btn-base btn-dirty');

    // Trigger reset
    await act(async () => {
      fireEvent.click(btn);
    });

    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('John');
    expect(btn.disabled).toBe(true);
    expect(btn.className).toBe('air-form-reset btn-base');
  });

  it('should clear the form state when clear prop is true', async () => {
    render(
      <Form schema={schema} value={{ name: 'John' }}>
        <Field name="name">
          <TextInput data-testid="input" />
        </Field>
        <FormReset data-testid="btn" clear>
          Clear
        </FormReset>
      </Form>
    );

    const btn = screen.getByTestId('btn') as HTMLButtonElement;

    // Make a change
    await act(async () => {
      fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    });

    // Trigger clear
    await act(async () => {
      fireEvent.click(btn);
    });

    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('');
  });
});
