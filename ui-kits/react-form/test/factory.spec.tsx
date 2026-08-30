import { mutable } from '@airlib/react';
import { act, cleanup, fireEvent, render as renderComponent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { FIELD_OPTIONS } from '../src/config.js';
import { createForm } from '../src/factory.js';
import { TextInput } from '../src/index.js';

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

    renderComponent(
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <UserForm.Field name="name" label="Name" data-testid="field">
          <TextInput data-testid="input" />
        </UserForm.Field>
      </UserForm>
    );

    const field = screen.getByTestId('field');
    expect(field).toBeDefined();
    expect(screen.getByText('Name')).toBeDefined();

    const input = screen.getByTestId('input') as HTMLInputElement;
    expect(input.value).toBe('John');
  });

  it('should handle onSubmit with validated data', async () => {
    const UserForm = createForm(userSchema);
    const handleSubmit = vi.fn();

    const { container } = renderComponent(
      <UserForm value={{ name: 'John', email: 'john@test.com' }} onSubmit={handleSubmit}>
        <UserForm.Field name="name">
          <TextInput data-testid="input" />
        </UserForm.Field>
        <button type="submit">Submit</button>
      </UserForm>
    );

    // Make a change to enable submission
    await act(async () => {
      fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });

    expect(handleSubmit).toHaveBeenCalledTimes(1);

    const [data, changes] = handleSubmit.mock.calls[0];
    expect(data.name).toBe('Jane');
    expect(changes.name).toBe('Jane');
  });

  it('should support headless Field with render function', () => {
    const UserForm = createForm(userSchema);

    renderComponent(
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <UserForm.Field name="name">
          {(field) => (
            <div data-testid="custom">
              <span data-testid="field-value">{String(field.value)}</span>
            </div>
          )}
        </UserForm.Field>
      </UserForm>
    );

    expect(screen.getByTestId('field-value').textContent).toBe('John');
  });

  it('should display validation errors in structured Field', () => {
    const UserForm = createForm(userSchema);

    renderComponent(
      <UserForm value={{ name: 'Al', email: 'john@test.com' }}>
        <UserForm.Field name="name" label="Name" errorClass="error-text" data-testid="field">
          <TextInput />
        </UserForm.Field>
      </UserForm>
    );

    const error = screen.getByTestId('field').querySelector('.error-text');
    expect(error).toBeNull();
  });

  it('should access form state via get()', () => {
    const UserForm = createForm(userSchema);

    function StateReader() {
      const form = UserForm.get();
      return <span data-testid="form-valid">{String(form?.valid)}</span>;
    }

    renderComponent(
      <UserForm value={{ name: 'John', email: 'john@test.com' }}>
        <StateReader />
      </UserForm>
    );

    expect(screen.getByTestId('form-valid').textContent).toBe('true');
  });

  it('should access typed field via field()', () => {
    const UserForm = createForm(userSchema);

    function FieldReader() {
      const field = UserForm.field('name');
      return <span data-testid="field-val">{String(field.value)}</span>;
    }

    renderComponent(
      <UserForm value={{ name: 'Alice', email: 'alice@test.com' }}>
        <FieldReader />
      </UserForm>
    );

    expect(screen.getByTestId('field-val').textContent).toBe('Alice');
  });

  it('should render FieldList with array items as inputs', () => {
    const UserForm = createForm(userSchema);

    renderComponent(
      <UserForm value={{ name: 'John', email: 'j@t.com', tags: ['react', 'vue'] }}>
        <UserForm.FieldList name="tags">
          {(items) => (
            <>
              {items.map((_, i) => (
                <UserForm.Field name={`tags.${i}`} key={i}>
                  <TextInput data-testid={`tag-${i}`} />
                </UserForm.Field>
              ))}
            </>
          )}
        </UserForm.FieldList>
      </UserForm>
    );

    expect((screen.getByTestId('tag-0') as HTMLInputElement).value).toBe('react');
    expect((screen.getByTestId('tag-1') as HTMLInputElement).value).toBe('vue');
  });

  it('should initialize empty array in FieldList when value is not an array', () => {
    const Schema = z.object({ items: z.any() });
    const TestForm = createForm(Schema);

    renderComponent(
      <TestForm value={{ items: 'not-an-array' }}>
        <TestForm.FieldList name="items">
          {(items) => <span data-testid="count">{items.length}</span>}
        </TestForm.FieldList>
      </TestForm>
    );

    expect(screen.getByTestId('count').textContent).toBe('0');
  });

  it('should support array mutations like push() in FieldList', async () => {
    const UserForm = createForm(userSchema);
    const data = mutable({ name: 'John', email: 'j@t.com', tags: ['react'] });

    renderComponent(
      <UserForm value={data}>
        <UserForm.FieldList name="tags">
          {(items) => (
            <>
              {items.map((_, i) => (
                <UserForm.Field name={`tags.${i}`} key={i}>
                  <TextInput data-testid={`tag-${i}`} />
                </UserForm.Field>
              ))}
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
    );

    expect((screen.getByTestId('tag-0') as HTMLInputElement).value).toBe('react');
    expect(screen.queryByTestId('tag-1')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByTestId('add-tag'));
    });

    expect((screen.getByTestId('tag-1') as HTMLInputElement).value).toBe('vue');
  });

  describe('Factory Edge Cases', () => {
    it('Form and Field should fallback to factory options', async () => {
      const Schema = z.object({ name: z.string().min(3) });
      const OptForm = createForm(Schema, {
        form: { class: 'opt-form', errorClass: 'opt-form-err', pendingClass: 'opt-form-pend' },
        field: {
          class: 'opt-field',
          errorClass: 'opt-field-err',
          labelClass: 'opt-label',
          requiredClass: 'opt-req',
          requiredLabel: '*',
        },
      });
      let rejectSubmit: any;
      const handleSubmit = () =>
        new Promise<void>((_, reject) => {
          rejectSubmit = reject;
        });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(
        <OptForm value={{ name: 'Valid' }} onSubmit={handleSubmit} data-testid="opt-form">
          <OptForm.Field name="name" label="Name" data-testid="opt-field">
            <TextInput data-testid="opt-input" />
          </OptForm.Field>
          <OptForm.FieldList name={'' as never}>{() => <div />}</OptForm.FieldList>
          <OptForm.Field name={'' as never}>
            <TextInput />
          </OptForm.Field>
          <button type="submit" data-testid="opt-submit" />
        </OptForm>
      );

      const form = screen.getByTestId('opt-form');
      const field = screen.getByTestId('opt-field');
      expect(form.className).toBe('opt-form');
      expect(field.className).toBe('opt-field');
      expect(screen.getByText('Name').className).toBe('opt-label');
      expect(screen.getByText('*').className).toBe('opt-req');

      await act(async () => {
        fireEvent.input(screen.getByTestId('opt-input'), { target: { value: 'Changed' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('opt-submit'));
      });
      expect(form.className).toBe('opt-form opt-form-pend');

      await act(async () => {
        rejectSubmit(new Error('fail'));
      });
      expect(form.className).toBe('opt-form opt-form-err');

      await act(async () => {
        fireEvent.input(screen.getByTestId('opt-input'), { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(screen.getByTestId('opt-input'));
      });
      expect(field.className).toBe('opt-field opt-field-err');
      expect(field.querySelector('[role="alert"]')).toBeDefined();

      errorSpy.mockRestore();
    });

    it('Form and Field should bypass factory options when explicit props are provided', async () => {
      const Schema = z.object({ name: z.string().min(3) });
      const ExplicitForm = createForm(Schema, {
        form: { class: 'opt-form', errorClass: 'opt-form-err', pendingClass: 'opt-form-pend' },
        field: { class: 'opt-field', errorClass: 'opt-field-err' },
      });
      let rejectSubmit: any;
      const handleSubmit = () =>
        new Promise<void>((_, reject) => {
          rejectSubmit = reject;
        });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(
        <ExplicitForm
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          data-testid="exp-form"
          className="explicit-form"
          errorClass="explicit-form-err"
          pendingClass="explicit-form-pend"
        >
          <ExplicitForm.Field
            name="name"
            label="Name"
            data-testid="exp-field"
            className="explicit-field"
            errorClass="explicit-field-err"
            labelClass="explicit-label"
            requiredClass="explicit-req"
            requiredLabel="**"
          >
            <TextInput data-testid="exp-input" />
          </ExplicitForm.Field>
          <ExplicitForm.FieldList name={'' as never} errorClass="explicit-list-err">
            {() => <div />}
          </ExplicitForm.FieldList>
          <ExplicitForm.Field name={'' as never} errorClass="explicit-field-err">
            <TextInput />
          </ExplicitForm.Field>
          <button type="submit" data-testid="exp-submit" />
        </ExplicitForm>
      );

      const form = screen.getByTestId('exp-form');
      const field = screen.getByTestId('exp-field');
      expect(form.className).toBe('opt-form explicit-form');
      expect(field.className).toBe('opt-field explicit-field');
      expect(screen.getByText('Name').className).toBe('air-form-field-label explicit-label');
      expect(screen.getByText('**').className).toBe('air-form-field-required explicit-req');

      await act(async () => {
        fireEvent.click(screen.getByTestId('exp-submit'));
      });
      expect(form.className).toBe('opt-form explicit-form explicit-form-pend');

      await act(async () => {
        rejectSubmit(new Error('fail'));
      });
      expect(form.className).toBe('opt-form explicit-form explicit-form-err');

      await act(async () => {
        fireEvent.input(screen.getByTestId('exp-input'), { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(screen.getByTestId('exp-input'));
      });
      expect(field.className).toBe('opt-field explicit-field explicit-field-err');
      expect(field.querySelector('[role="alert"]')).toBeDefined();

      errorSpy.mockRestore();
    });

    it('Form and Field should handle empty string, null, and explicitly undefined props correctly', async () => {
      const Schema = z.object({ name: z.string().min(3) });
      const NullishForm = createForm(Schema, {
        form: { class: 'opt-form', errorClass: 'opt-form-err', pendingClass: 'opt-form-pend' },
        field: { class: 'opt-field', errorClass: 'opt-field-err' },
      });
      const rejectSubmits: any[] = [];
      const handleSubmit = () =>
        new Promise<void>((_, reject) => {
          rejectSubmits.push(reject);
        });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(
        <>
          <NullishForm
            value={{ name: 'Valid' }}
            onSubmit={handleSubmit}
            data-testid="nullish-empty"
            className=""
            errorClass=""
            pendingClass=""
          >
            <NullishForm.Field name="name" data-testid="field-empty" className="" errorClass="">
              <TextInput data-testid="input-empty" />
            </NullishForm.Field>
            <NullishForm.FieldList name={'' as never} errorClass="">
              {() => <div />}
            </NullishForm.FieldList>
            <NullishForm.Field name={'' as never} errorClass="">
              <TextInput />
            </NullishForm.Field>
            <button type="submit" data-testid="submit-empty" />
          </NullishForm>
          <NullishForm
            value={{ name: 'Valid' }}
            onSubmit={handleSubmit}
            data-testid="nullish-null"
            className={null as any}
            errorClass={null as any}
            pendingClass={null as any}
          >
            <NullishForm.Field name="name" data-testid="field-null" className={null as any} errorClass={null as any}>
              <TextInput data-testid="input-null" />
            </NullishForm.Field>
            <NullishForm.FieldList name={'' as never} errorClass={null as any}>
              {() => <div />}
            </NullishForm.FieldList>
            <NullishForm.Field name={'' as never} errorClass={null as any}>
              <TextInput />
            </NullishForm.Field>
            <button type="submit" data-testid="submit-null" />
          </NullishForm>
          <NullishForm
            value={{ name: 'Valid' }}
            onSubmit={handleSubmit}
            data-testid="nullish-undef"
            className={undefined}
            errorClass={undefined}
            pendingClass={undefined}
          >
            <NullishForm.Field name="name" data-testid="field-undef" className={undefined} errorClass={undefined}>
              <TextInput data-testid="input-undef" />
            </NullishForm.Field>
            <NullishForm.FieldList name={'' as never} errorClass={undefined}>
              {() => <div />}
            </NullishForm.FieldList>
            <NullishForm.Field name={'' as never} errorClass={undefined}>
              <TextInput />
            </NullishForm.Field>
            <button type="submit" data-testid="submit-undef" />
          </NullishForm>
        </>
      );

      // Trigger pendings
      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-empty'));
        fireEvent.click(screen.getByTestId('submit-null'));
        fireEvent.click(screen.getByTestId('submit-undef'));
      });
      expect(screen.getByTestId('nullish-empty').className).toBe('opt-form');
      expect(screen.getByTestId('nullish-null').className).toBe('opt-form opt-form-pend');
      expect(screen.getByTestId('nullish-undef').className).toBe('opt-form opt-form-pend');

      // Trigger form errors
      await act(async () => {
        rejectSubmits.forEach((reject) => reject(new Error('fail')));
      });
      expect(screen.getByTestId('nullish-empty').className).toBe('opt-form');
      expect(screen.getByTestId('nullish-null').className).toBe('opt-form opt-form-err');
      expect(screen.getByTestId('nullish-undef').className).toBe('opt-form opt-form-err');

      // Trigger field errors
      await act(async () => {
        fireEvent.input(screen.getByTestId('input-empty'), { target: { value: '' } });
        fireEvent.input(screen.getByTestId('input-null'), { target: { value: '' } });
        fireEvent.input(screen.getByTestId('input-undef'), { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(screen.getByTestId('input-empty'));
        fireEvent.blur(screen.getByTestId('input-null'));
        fireEvent.blur(screen.getByTestId('input-undef'));
      });

      expect(screen.getByTestId('field-empty').className).toBe('opt-field');
      expect(screen.getByTestId('field-null').className).toBe('opt-field opt-field-err');
      expect(screen.getByTestId('field-undef').className).toBe('opt-field opt-field-err');

      errorSpy.mockRestore();
    });

    it('Field should handle strictly undefined fieldOptions gracefully', async () => {
      const Schema = z.object({ name: z.string() });
      const NoFieldOptionsForm = createForm(Schema, { form: {} });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(
        <NoFieldOptionsForm value={{ name: 'Valid' }} data-testid="no-field-options-form">
          <NoFieldOptionsForm.Field name={'' as never} />
          <NoFieldOptionsForm.FieldList name={'' as never}>{() => <div />}</NoFieldOptionsForm.FieldList>
        </NoFieldOptionsForm>
      );

      const alerts = screen.getAllByText(/Name property is required!/);
      expect(alerts.length).toBeGreaterThan(0);
      errorSpy.mockRestore();
    });

    it('Form and Field should fallback to global defaults', async () => {
      const Schema = z.object({ name: z.string() });
      const DefForm = createForm(Schema);
      let rejectSubmit: any;
      const handleSubmit = () =>
        new Promise<void>((_, reject) => {
          rejectSubmit = reject;
        });

      renderComponent(
        <DefForm value={{ name: 'Valid' }} onSubmit={handleSubmit} data-testid="def-form">
          <DefForm.Field name="name" label="Name" data-testid="def-field">
            <TextInput data-testid="def-input" />
          </DefForm.Field>
          <button type="submit" data-testid="def-submit" />
        </DefForm>
      );

      const form = screen.getByTestId('def-form');
      const field = screen.getByTestId('def-field');
      expect(form.className).toBe('air-form');
      expect(field.className).toBe('air-form-field');
      expect(screen.getByText('Name').className).toBe('air-form-field-label');
      expect(screen.getByText('*').className).toBe('air-form-field-required');

      await act(async () => {
        fireEvent.input(screen.getByTestId('def-input'), { target: { value: 'Changed' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('def-submit'));
      });
      expect(form.className).toBe('air-form air-form-pending');

      await act(async () => {
        rejectSubmit(new Error('fail'));
      });
      expect(form.className).toBe('air-form air-form-error');
    });

    it('Form and Field should handle empty config options gracefully', async () => {
      const Schema = z.object({ name: z.string().min(3) });
      const EmptyForm = createForm(Schema, { form: {}, field: {} });
      let rejectSubmit: any;
      const handleSubmit = () =>
        new Promise<void>((_, reject) => {
          rejectSubmit = reject;
        });
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderComponent(
        <EmptyForm value={{ name: 'Valid' }} onSubmit={handleSubmit} data-testid="empty-form">
          <EmptyForm.Field name="name" label="Name" data-testid="empty-field">
            <TextInput data-testid="empty-input" />
          </EmptyForm.Field>
          <EmptyForm.FieldList name={'' as never}>{() => <div />}</EmptyForm.FieldList>
          <button type="submit" data-testid="empty-submit" />
        </EmptyForm>
      );

      const form = screen.getByTestId('empty-form');
      const field = screen.getByTestId('empty-field');
      expect(form.className).toBe('air-form');
      expect(field.className).toBe('air-form-field');
      expect(screen.getByText('Name').className).toBe('air-form-field-label');
      expect(screen.getByText('*').className).toBe('air-form-field-required');

      await act(async () => {
        fireEvent.input(screen.getByTestId('empty-input'), { target: { value: 'Changed' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('empty-submit'));
      });
      expect(form.className).toBe('air-form air-form-pending');

      await act(async () => {
        rejectSubmit(new Error('fail'));
      });
      expect(form.className).toBe('air-form air-form-error');

      await act(async () => {
        fireEvent.input(screen.getByTestId('empty-input'), { target: { value: '' } });
      });
      await act(async () => {
        fireEvent.blur(screen.getByTestId('empty-input'));
      });
      expect(field.className).toBe('air-form-field air-form-field-error');
      expect(field.querySelector('#name-error')?.className).toBe('air-form-field-support');
      errorSpy.mockRestore();
    });

    it('Form should apply errorClass when form has errors on submit', async () => {
      const Schema = z.object({ name: z.string() });
      const TestForm = createForm(Schema);
      const handleSubmit = () => {
        throw new Error('Server error');
      };

      renderComponent(
        <TestForm
          value={{ name: 'Valid' }}
          onSubmit={handleSubmit}
          className="base-class"
          errorClass="error-state"
          data-testid="error-form"
        >
          <TestForm.Field name="name">
            <TextInput data-testid="input" />
          </TestForm.Field>
          <button type="submit" data-testid="submit-btn">
            Submit
          </button>
        </TestForm>
      );

      const form = screen.getByTestId('error-form');
      expect(form.className).toBe('air-form base-class');

      await act(async () => {
        fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit-btn'));
      });

      expect(form.className).toBe('air-form base-class error-state');
    });

    it('Form should apply pendingClass when form is pending', async () => {
      const Schema = z.object({ name: z.string().min(5) });
      const TestForm = createForm(Schema);
      let resolveSubmit!: () => void;
      const handleSubmit = () => {
        return new Promise<void>((resolve) => {
          resolveSubmit = resolve;
        });
      };

      renderComponent(
        <TestForm
          value={{ name: 'Alice' }}
          onSubmit={handleSubmit}
          className="base-class"
          pendingClass="pending-state"
          data-testid="pending-form"
        >
          <TestForm.Field name="name">
            <TextInput data-testid="input" />
          </TestForm.Field>
          <button type="submit" data-testid="submit">
            Submit
          </button>
        </TestForm>
      );

      const form = screen.getByTestId('pending-form');
      expect(form.className).toBe('air-form base-class');

      await act(async () => {
        fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane Doe' } });
      });

      await act(async () => {
        fireEvent.click(screen.getByTestId('submit'));
      });

      expect(form.className).toBe('air-form base-class pending-state');

      await act(async () => {
        resolveSubmit();
      });

      expect(form.className).toBe('air-form base-class');
    });

    it('Field should render error message when name is not provided', async () => {
      const TestForm = createForm(userSchema);
      renderComponent(
        <TestForm value={{ name: 'John', email: 'john@test.com' }}>
          <TestForm.Field name={'' as never} errorClass="custom-error">
            <TextInput />
          </TestForm.Field>
        </TestForm>
      );
      expect(screen.getByText('[FieldError]: Name property is required!')).toBeDefined();
      expect(screen.getByText('[FieldError]: Name property is required!').className).toBe('custom-error');
    });

    it('Field should display rendered error message when touched and invalid', async () => {
      const TestForm = createForm(userSchema);
      renderComponent(
        <TestForm value={{ name: 'John', email: 'john@test.com' }}>
          <TestForm.Field name="name" errorClass="custom-error" data-testid="field">
            <TextInput data-testid="input" />
          </TestForm.Field>
        </TestForm>
      );

      const field = screen.getByTestId('field');
      expect(field.querySelector('.custom-error')).toBeNull();

      await act(async () => {
        fireEvent.input(screen.getByTestId('input'), { target: { value: 'A' } });
      });

      expect(field.className).toBe('air-form-field custom-error');
      const error = field.querySelector('[role="alert"]');
      expect(error).toBeDefined();
      expect(error?.textContent).toBe('Name too short');
    });

    it('FieldList should render error message when name is not provided', async () => {
      const TestForm = createForm(userSchema);
      renderComponent(
        <TestForm value={{ name: 'John', email: 'john@test.com' }}>
          <TestForm.FieldList name={'' as never} errorClass="list-error">
            {() => <div />}
          </TestForm.FieldList>
        </TestForm>
      );
      expect(screen.getByText('[FieldListError]: Name property is required!')).toBeDefined();
      expect(screen.getByText('[FieldListError]: Name property is required!').className).toBe('list-error');

      await act(async () => {});
    });
  });

  describe('Match prop', () => {
    const passwordSchema = z.object({
      password: z.string().min(6, 'Too short'),
      confirmPassword: z.string().min(6, 'Too short'),
    });

    it('should display mismatchLabel in structured Field when values differ', () => {
      const PasswordForm = createForm(passwordSchema);

      renderComponent(
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
      );

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error).toBeDefined();
      expect(error?.textContent).toBe('Passwords do not match!');
    });

    it('should use provided errorClass for mismatchLabel', () => {
      const PasswordForm = createForm(passwordSchema);

      renderComponent(
        <PasswordForm value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <PasswordForm.Field
            name="confirmPassword"
            match="password"
            mismatchLabel="Passwords do not match!"
            supportClass="custom-mismatch-error"
            data-testid="field"
          >
            <TextInput />
          </PasswordForm.Field>
        </PasswordForm>
      );

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error?.className).toBe('air-form-field-support custom-mismatch-error');
    });

    it('should fallback to default errorClass when fieldOptions is missing', () => {
      const PasswordForm = createForm(passwordSchema, { field: {} as any });

      renderComponent(
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
      );

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error?.className).toBe(FIELD_OPTIONS.supportClass);
    });
  });
});
