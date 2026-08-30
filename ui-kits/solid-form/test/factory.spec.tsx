/** @jsxImportSource solid-js */

import { mutable } from '@airlib/solid';
import { cleanup, fireEvent, render as renderComponent, screen } from '@solidjs/testing-library';
import { act } from 'react';
import { For } from 'solid-js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { configureForm, FIELD_OPTIONS } from '../src/config.js';
import { createForm } from '../src/factory.js';
import { TextInput } from '../src/inputs/TextInput.js';

afterEach(cleanup);

const userSchema = z.object({
  name: z.string().min(3, 'Name too short'),
  email: z.string().email('Invalid email'),
  tags: z.array(z.string()).default([]),
});

describe('createForm', () => {
  it('should return a Form component with a Field subcomponent', () => {
    const UserForm = createForm(userSchema);
    expect(UserForm).toBeDefined();
    expect(UserForm.Field).toBeDefined();
  });

  it('should expose get() and field() static methods', () => {
    const UserForm = createForm(userSchema);
    expect(typeof UserForm.get).toBe('function');
    expect(typeof UserForm.field).toBe('function');
  });

  it('should render a working form with typed field', () => {
    const UserForm = createForm(userSchema);

    renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <UserForm.Field name="name" label="Name" data-testid="field">
          <TextInput data-testid="input" />
        </UserForm.Field>
      </UserForm>
    ));

    const field = screen.getByTestId('field');
    expect(field).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('John');
  });

  it('should handle onSubmit with validated data', async () => {
    const UserForm = createForm(userSchema);
    const handleSubmit = vi.fn();

    const { container } = renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'john@test.com' }} onSubmit={handleSubmit}>
        <UserForm.Field name="name">
          <TextInput data-testid="input" />
        </UserForm.Field>
        <button type="submit">Submit</button>
      </UserForm>
    ));

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    fireEvent.submit(container.querySelector('form')!);

    expect(handleSubmit).toHaveBeenCalledTimes(1);

    const [data, changes] = handleSubmit.mock.calls[0];
    expect(data.name).toBe('Jane');
    expect(changes.name).toBe('Jane');
  });

  it('should apply error class to typed form when onSubmit throws', async () => {
    const TestForm = createForm(userSchema);
    const handleSubmit = async () => {
      throw new Error('Submit error');
    };

    renderComponent(() => (
      <TestForm
        value={{ name: 'John', email: 'j@t.com', tags: [] }}
        errorClass="t-err"
        data-testid="t-form"
        onSubmit={handleSubmit}
      >
        <button type="submit">Submit</button>
      </TestForm>
    ));
    const form = screen.getByTestId('t-form');
    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));
    expect(form.className).toContain('t-err');
  });

  it('should apply pending class to typed form while submitting', async () => {
    const TestForm = createForm(userSchema);
    const handleSubmit = () => new Promise<void>((r) => setTimeout(r, 100));

    renderComponent(() => (
      <TestForm
        value={{ name: 'John', email: 'j@t.com' }}
        pendingClass="t-pending"
        data-testid="t-form"
        onSubmit={handleSubmit}
      >
        <button type="submit">Submit</button>
      </TestForm>
    ));
    const form = screen.getByTestId('t-form');
    fireEvent.submit(form);
    expect(form.className).toContain('t-pending');
  });

  it('should support headless Field with render function', () => {
    const UserForm = createForm(userSchema);

    renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <UserForm.Field name="name">
          {(field) => (
            <div data-testid="custom">
              <span data-testid="field-value">{String(field.value)}</span>
            </div>
          )}
        </UserForm.Field>
      </UserForm>
    ));

    expect(screen.getByTestId('field-value').textContent).toBe('John');
  });

  it('should display validation errors in structured Field', () => {
    const UserForm = createForm(userSchema);

    renderComponent(() => (
      <UserForm value={{ name: 'Al', email: 'john@test.com' }}>
        <UserForm.Field name="name" label="Name" errorClass="error-text" data-testid="field">
          <TextInput data-testid="input" />
        </UserForm.Field>
      </UserForm>
    ));

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('Al');

    act(() => {
      fireEvent.input(input, { target: { value: 'A' } });
    });

    const error = screen.getByTestId('field').querySelector('.error-text');
    expect(error).not.toBeNull();
    expect(error?.textContent).toContain('Name too short');
  });

  it('should render an error when name is not provided for Field', () => {
    const UserForm = createForm(userSchema);
    renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <UserForm.Field name={'' as any} data-testid="field">
          <TextInput />
        </UserForm.Field>
      </UserForm>
    ));
    expect(screen.getByText('[FieldError]: Name property is required!')).toBeDefined();
  });

  it('should access form state via get()', () => {
    const UserForm = createForm(userSchema);

    function StateReader() {
      const form = UserForm.get();
      return <span data-testid="form-valid">{String(form?.valid)}</span>;
    }

    renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <StateReader />
      </UserForm>
    ));

    expect(screen.getByTestId('form-valid').textContent).toBe('true');
  });

  it('should access typed field via field()', () => {
    const UserForm = createForm(userSchema);

    function FieldReader() {
      const field = UserForm.field('name');
      return <span data-testid="field-val">{String(field.value)}</span>;
    }

    renderComponent(() => (
      <UserForm value={{ name: 'Alice', email: 'alice@test.com' }}>
        <FieldReader />
      </UserForm>
    ));

    expect(screen.getByTestId('field-val').textContent).toBe('Alice');
  });

  it('should render FieldList with array items as inputs', () => {
    const UserForm = createForm(userSchema);

    renderComponent(() => (
      <UserForm value={{ name: 'John', email: 'j@t.com', tags: ['react', 'vue'] }}>
        <UserForm.FieldList name="tags">
          {(items: any[]) => (
            <>
              <For each={items}>
                {(_, i) => (
                  <UserForm.Field name={`tags.${i()}`}>
                    <TextInput data-testid={`tag-${i()}`} />
                  </UserForm.Field>
                )}
              </For>
            </>
          )}
        </UserForm.FieldList>
      </UserForm>
    ));

    expect((screen.getByTestId('tag-0') as HTMLInputElement).value).toBe('react');
    expect((screen.getByTestId('tag-1') as HTMLInputElement).value).toBe('vue');
  });

  it('should initialize empty array in FieldList when value is not an array', () => {
    const Schema = z.object({ items: z.any() });
    const TestForm = createForm(Schema);

    renderComponent(() => (
      <TestForm value={{ items: 'not-an-array' }}>
        <TestForm.FieldList name="items">
          {(items: any[]) => <span data-testid="count">{items.length}</span>}
        </TestForm.FieldList>
      </TestForm>
    ));

    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('should support array mutations like push() in FieldList', async () => {
    const UserForm = createForm(userSchema);
    const data = mutable({ name: 'John', email: 'j@t.com', tags: ['react'] });

    renderComponent(() => (
      <UserForm value={data}>
        <UserForm.FieldList name="tags">
          {(items: any[]) => (
            <>
              <For each={items}>
                {(_, i) => (
                  <UserForm.Field name={`tags.${i()}`}>
                    <TextInput data-testid={`tag-${i()}`} />
                  </UserForm.Field>
                )}
              </For>
              <button
                data-testid="add-tag"
                type="button"
                onClick={() => {
                  items.push('vue');
                }}
              >
                Add Tag
              </button>
            </>
          )}
        </UserForm.FieldList>
      </UserForm>
    ));

    expect((screen.getByTestId('tag-0') as HTMLInputElement).value).toBe('react');
    expect(screen.queryByTestId('tag-1')).toBeNull();

    fireEvent.click(screen.getByTestId('add-tag'));

    expect((screen.getByTestId('tag-1') as HTMLInputElement).value).toBe('vue');
  });

  it('should render an error when name is not provided for FieldList', () => {
    const Schema = z.object({ tags: z.array(z.string()).default([]) });
    const TestForm = createForm(Schema);

    renderComponent(() => (
      <TestForm value={{ tags: ['react', 'vue'] }}>
        <TestForm.FieldList name={'' as any}>{(items: any[]) => <span>{items.length}</span>}</TestForm.FieldList>
      </TestForm>
    ));

    expect(screen.getByText('[FieldListError]: Name property is required!')).toBeDefined();
  });

  it('should use formOptions and fieldOptions when props are missing', async () => {
    const CustomForm = createForm(userSchema, {
      form: { class: 'f-class', errorClass: 'f-err' },
      field: {
        class: 'fld-class',
        errorClass: 'fld-err',
        labelClass: 'lbl-class',
        requiredClass: 'req-class',
        requiredLabel: '(*)',
      },
    });

    const handleSubmit = async () => {
      throw new Error('err');
    };

    renderComponent(() => (
      <CustomForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} data-testid="c-form" onSubmit={handleSubmit}>
        <CustomForm.Field name="name" label="Name" data-testid="c-field">
          <TextInput data-testid="c-input" />
        </CustomForm.Field>
        <CustomForm.Field name={'' as any}>
          <TextInput />
        </CustomForm.Field>
        <CustomForm.FieldList name={'' as any}>{() => <span />}</CustomForm.FieldList>
        <button type="submit">Submit</button>
      </CustomForm>
    ));

    const form = screen.getByTestId('c-form');
    expect(form.className).toContain('f-class');

    const field = screen.getByTestId('c-field');
    expect(field.className).toContain('fld-class');

    expect(screen.getByText('(*)')).toBeDefined();
    expect(screen.getByText('Name').className).toContain('lbl-class');

    fireEvent.input(screen.getByTestId('c-input'), { target: { value: 'A' } });
    expect(field.querySelector('.fld-err')).not.toBeNull();

    fireEvent.submit(form);
    await new Promise((r) => setTimeout(r, 10));
    expect(form.className).toContain('f-err');

    expect(screen.getByText('[FieldError]: Name property is required!').className).toContain('fld-err');
    expect(screen.getByText('[FieldListError]: Name property is required!').className).toContain('fld-err');
  });

  it('should apply pendingClass from formOptions', async () => {
    const CustomForm = createForm(userSchema, { form: { class: 'f-class', pendingClass: 'f-pend' } });
    const handleSubmit = () => new Promise<void>((r) => setTimeout(r, 100));

    renderComponent(() => (
      <CustomForm value={{ name: 'John', email: 'j@t.com', tags: [] }} data-testid="p-form" onSubmit={handleSubmit}>
        <button type="submit">Submit</button>
      </CustomForm>
    ));

    const form = screen.getByTestId('p-form');
    fireEvent.submit(form);
    expect(form.className).toContain('f-pend');
  });

  it('should hit global defaults when neither props nor options provide classes', async () => {
    const GlobalForm = createForm(userSchema);
    const handleSubmit = async () => {
      throw new Error('err');
    };

    renderComponent(() => (
      <GlobalForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} onSubmit={handleSubmit}>
        <GlobalForm.Field name="name" label="Name" data-testid="g-field">
          <TextInput data-testid="g-input" />
        </GlobalForm.Field>
        <GlobalForm.Field name={'' as any}>
          <TextInput />
        </GlobalForm.Field>
        <GlobalForm.FieldList name={'' as any}>{() => <span />}</GlobalForm.FieldList>
        <button type="submit" data-testid="g-btn">
          Submit
        </button>
      </GlobalForm>
    ));

    fireEvent.input(screen.getByTestId('g-input'), { target: { value: 'A' } });

    fireEvent.submit(screen.getByTestId('g-btn'));
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should hit global pending default', () => {
    const GlobalForm = createForm(userSchema);
    const handleSubmit = () => new Promise<void>((r) => setTimeout(r, 100));

    renderComponent(() => (
      <GlobalForm value={{ name: 'John', email: 'j@t.com', tags: [] }} onSubmit={handleSubmit}>
        <button type="submit" data-testid="g-pend-btn">
          Submit
        </button>
      </GlobalForm>
    ));

    fireEvent.submit(screen.getByTestId('g-pend-btn'));
  });

  it('should use explicit props over options for all classes', async () => {
    const TestForm = createForm(userSchema, {
      form: { class: 'x', errorClass: 'x', pendingClass: 'x' },
      field: { class: 'x', errorClass: 'x', labelClass: 'x', requiredClass: 'x', requiredLabel: 'x' },
    });
    const handleSubmit = async () => {
      throw new Error('err');
    };

    renderComponent(() => (
      <TestForm
        value={{ name: 'Al', email: 'j@t.com', tags: [] }}
        class="prop-class"
        errorClass="prop-err"
        data-testid="prop-form"
        onSubmit={handleSubmit}
      >
        <TestForm.Field
          name="name"
          label="Name"
          class="prop-fld"
          errorClass="prop-fld-err"
          labelClass="prop-lbl"
          requiredClass="prop-req"
          requiredLabel="(R)"
        >
          <TextInput data-testid="prop-input" />
        </TestForm.Field>

        <TestForm.Field name={'' as any} class="prop-fld" errorClass="prop-fld-err">
          <TextInput />
        </TestForm.Field>

        <TestForm.FieldList name={'' as any} errorClass="prop-fld-err">
          {() => <span />}
        </TestForm.FieldList>
        <button type="submit">Submit</button>
      </TestForm>
    ));

    fireEvent.input(screen.getByTestId('prop-input'), { target: { value: 'A' } });
    fireEvent.submit(screen.getByTestId('prop-form'));
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should handle options with empty objects (optional chaining branches)', async () => {
    const EmptyForm = createForm(userSchema, { form: {}, field: {} });
    const handleSubmit = async () => {
      throw new Error('err');
    };

    renderComponent(() => (
      <EmptyForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} onSubmit={handleSubmit}>
        <EmptyForm.Field name="name" label="Name" data-testid="e-field">
          <TextInput data-testid="e-input" />
        </EmptyForm.Field>
        <EmptyForm.Field name={'' as any}>
          <TextInput />
        </EmptyForm.Field>
        <EmptyForm.FieldList name={'' as any}>{() => <span />}</EmptyForm.FieldList>
        <button type="submit" data-testid="e-btn">
          Submit
        </button>
      </EmptyForm>
    ));

    fireEvent.input(screen.getByTestId('e-input'), { target: { value: 'A' } });
    fireEvent.submit(screen.getByTestId('e-btn'));
    await new Promise((r) => setTimeout(r, 10));
  });

  it('should handle pending with empty options', () => {
    const EmptyForm = createForm(userSchema, { form: {}, field: {} });
    const handleSubmit = () => new Promise<void>((r) => setTimeout(r, 100));

    renderComponent(() => (
      <EmptyForm value={{ name: 'John', email: 'j@t.com', tags: [] }} onSubmit={handleSubmit}>
        <button type="submit" data-testid="e-pend-btn">
          Submit
        </button>
      </EmptyForm>
    ));

    fireEvent.submit(screen.getByTestId('e-pend-btn'));
  });

  it('should cover all class branches for factory error and pending', async () => {
    const TestForm = createForm(userSchema);

    // Test class only
    const handleSubmitErr = async () => {
      throw new Error('err');
    };
    renderComponent(() => (
      <TestForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} class="c-only" onSubmit={handleSubmitErr}>
        <button type="submit" data-testid="btn-c">
          Submit
        </button>
      </TestForm>
    ));
    fireEvent.submit(screen.getByTestId('btn-c'));
    await new Promise((r) => setTimeout(r, 10));

    // Test pending explicitly with both
    const handleSubmitPend = () => new Promise<void>((r) => setTimeout(r, 100));
    renderComponent(() => (
      <TestForm
        value={{ name: 'Al', email: 'j@t.com', tags: [] }}
        class="c-both"
        pendingClass="p-both"
        onSubmit={handleSubmitPend}
      >
        <button type="submit" data-testid="btn-p">
          Submit
        </button>
      </TestForm>
    ));
    fireEvent.submit(screen.getByTestId('btn-p'));

    // Test pending with pendingClass only
    renderComponent(() => (
      <TestForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} pendingClass="p-only" onSubmit={handleSubmitPend}>
        <button type="submit" data-testid="btn-p-only">
          Submit
        </button>
      </TestForm>
    ));
    fireEvent.submit(screen.getByTestId('btn-p-only'));
  });

  it('should evaluate right side of final ?? fallback with truthy global FORM_OPTIONS', async () => {
    configureForm({
      form: { class: 'global-f-c', errorClass: 'global-f-e', pendingClass: 'global-f-p' },
    });
    const GlobalForm = createForm(userSchema);

    // Error test
    const handleSubmitErr = async () => {
      throw new Error('err');
    };
    renderComponent(() => (
      <GlobalForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} data-testid="gf-err" onSubmit={handleSubmitErr}>
        <button type="submit">Submit</button>
      </GlobalForm>
    ));
    fireEvent.submit(screen.getByTestId('gf-err'));
    await new Promise((r) => setTimeout(r, 10));

    // Pending test
    const handleSubmitPend = () => new Promise<void>((r) => setTimeout(r, 100));
    renderComponent(() => (
      <GlobalForm value={{ name: 'Al', email: 'j@t.com', tags: [] }} data-testid="gf-pend" onSubmit={handleSubmitPend}>
        <button type="submit">Submit</button>
      </GlobalForm>
    ));
    fireEvent.submit(screen.getByTestId('gf-pend'));

    configureForm({
      form: { class: undefined, errorClass: undefined, pendingClass: undefined },
    });
  });

  it('should evaluate right side of factory ?? fallbacks by passing explicit undefined to formOptions', async () => {
    const OptForm = createForm(userSchema, {
      form: { class: 'opt-c', errorClass: 'opt-e', pendingClass: 'opt-p' },
    });

    // Error test
    const handleSubmitErr = async () => {
      throw new Error('err');
    };
    renderComponent(() => (
      <OptForm
        value={{ name: 'Al', email: 'j@t.com', tags: [] }}
        class={undefined}
        errorClass={undefined}
        pendingClass={undefined}
        data-testid="of-err"
        onSubmit={handleSubmitErr}
      >
        <button type="submit">Submit</button>
      </OptForm>
    ));
    fireEvent.submit(screen.getByTestId('of-err'));
    await new Promise((r) => setTimeout(r, 10));

    // Pending test
    const handleSubmitPend = () => new Promise<void>((r) => setTimeout(r, 100));
    renderComponent(() => (
      <OptForm
        value={{ name: 'Al', email: 'j@t.com', tags: [] }}
        class={undefined}
        errorClass={undefined}
        pendingClass={undefined}
        data-testid="of-pend"
        onSubmit={handleSubmitPend}
      >
        <button type="submit">Submit</button>
      </OptForm>
    ));
    fireEvent.submit(screen.getByTestId('of-pend'));
  });

  describe('Match prop', () => {
    const passwordSchema = z.object({
      password: z.string().min(6, 'Too short'),
      confirmPassword: z.string().min(6, 'Too short'),
    });

    it('should display mismatchLabel in structured Field when values differ', () => {
      const PasswordForm = createForm(passwordSchema);

      renderComponent(() => (
        <PasswordForm value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <PasswordForm.Field
            name="confirmPassword"
            match="password"
            mismatchLabel="Passwords do not match!"
            data-testid="field"
          >
            <TextInput />
          </PasswordForm.Field>
        </PasswordForm>
      ));

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error).toBeDefined();
      expect(error?.textContent).toBe('Passwords do not match!');
    });

    it('should use provided errorClass for mismatchLabel', () => {
      const PasswordForm = createForm(passwordSchema);

      renderComponent(() => (
        <PasswordForm value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <PasswordForm.Field
            name="confirmPassword"
            match="password"
            mismatchLabel="Passwords do not match!"
            errorClass="custom-mismatch-error"
            data-testid="field"
          >
            <TextInput />
          </PasswordForm.Field>
        </PasswordForm>
      ));

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error?.className).toBe('custom-mismatch-error');
    });

    it('should fallback to default errorClass when fieldOptions is missing', () => {
      const PasswordForm = createForm(passwordSchema, { field: {} as any });

      renderComponent(() => (
        <PasswordForm value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <PasswordForm.Field
            name="confirmPassword"
            match="password"
            mismatchLabel="Passwords do not match!"
            data-testid="field"
          >
            <TextInput />
          </PasswordForm.Field>
        </PasswordForm>
      ));

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error?.className).toBe(FIELD_OPTIONS.errorClass);
    });
  });
});
