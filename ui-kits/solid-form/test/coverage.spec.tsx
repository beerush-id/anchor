/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createForm } from '../src/factory.js';
import { Checkbox, createInput, Field, FilePicker, Form, Radio, Select, Textarea, TextInput } from '../src/index.js';

afterEach(cleanup);

const schema = z.object({
  text: z.string().min(3),
  bio: z.string(),
  agree: z.boolean(),
  plan: z.string(),
  country: z.string(),
  file: z.any().optional(),
});

describe('Coverage & Edge Cases', () => {
  it('should support function children for Checkbox, Radio, Select, FilePicker', () => {
    render(() => (
      <Form schema={schema} value={{ text: 'test', bio: 'bio', agree: true, plan: 'pro', country: 'us', file: null }}>
        <Field name="agree">
          <Checkbox>{(props: any) => <input {...props} type="checkbox" data-testid="custom-cb" />}</Checkbox>
        </Field>
        <Field name="plan">
          <Radio value="pro">{(props: any) => <input {...props} type="radio" data-testid="custom-radio" />}</Radio>
        </Field>
        <Field name="country">
          <Select>
            {(props: any) => (
              <select {...props} data-testid="custom-select">
                <option value="us">US</option>
              </select>
            )}
          </Select>
        </Field>
        <Field name="file">
          <FilePicker>{(props: any) => <input {...props} type="file" data-testid="custom-file" />}</FilePicker>
        </Field>
      </Form>
    ));

    expect(screen.getByTestId('custom-cb')).toBeDefined();
    expect(screen.getByTestId('custom-radio')).toBeDefined();
    expect(screen.getByTestId('custom-select')).toBeDefined();
    expect(screen.getByTestId('custom-file')).toBeDefined();
  });

  it('should support function children and ref forwarding for Textarea', () => {
    let fnRefEl: HTMLTextAreaElement | null = null;
    const objRef = { current: null as HTMLTextAreaElement | null };

    render(() => (
      <Form schema={schema} value={{ text: 'test', bio: 'hello world', agree: true, plan: 'pro', country: 'us' }}>
        <Field name="bio">
          <Textarea
            ref={(el) => {
              fnRefEl = el;
            }}
          >
            {(props: any) => <textarea {...props} data-testid="custom-textarea" />}
          </Textarea>
        </Field>
        <Field name="bio">
          <Textarea ref={(el) => (objRef.current = el)} data-testid="textarea-obj" />
        </Field>
        <Field name="bio">
          <Textarea ref={null as any} data-testid="textarea-null-ref" />
        </Field>
      </Form>
    ));

    expect(fnRefEl).not.toBeNull();
    expect(objRef.current).not.toBeNull();
    expect(screen.getByTestId('custom-textarea')).toBeDefined();
    expect(screen.getByTestId('textarea-null-ref')).toBeDefined();
  });

  it('should support function children and ref forwarding for createInput', () => {
    let fnRefEl: HTMLInputElement | null = null;
    const objRef = { current: null as HTMLInputElement | null };
    const CustomInput = createInput('text');

    render(() => (
      <Form schema={schema} value={{ text: 'initial', bio: '', agree: true, plan: 'pro', country: 'us' }}>
        <Field name="text">
          <CustomInput
            ref={(el: HTMLInputElement) => {
              fnRefEl = el;
            }}
          >
            {(props: any) => <input data-testid="custom-created-input" {...props} />}
          </CustomInput>
        </Field>
        <Field name="text">
          <TextInput ref={(el) => (objRef.current = el)} data-testid="text-obj" />
        </Field>
        <Field name="text">
          <TextInput ref={null as any} data-testid="text-null-ref" />
        </Field>
      </Form>
    ));

    expect(fnRefEl).not.toBeNull();
    expect(objRef.current).not.toBeNull();
    expect(screen.getByTestId('custom-created-input')).toBeDefined();
    expect(screen.getByTestId('text-null-ref')).toBeDefined();
  });

  it('should apply submit and reset options in createForm', async () => {
    const CustomForm = createForm(schema, {
      submit: {
        class: 'factory-submit',
        pendingClass: 'factory-submit-pending',
      },
      reset: {
        class: 'factory-reset',
        dirtyClass: 'factory-reset-dirty',
      },
    });

    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    render(() => (
      <CustomForm value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }} onSubmit={handleSubmit}>
        <CustomForm.Field name="text">
          <TextInput data-testid="input" />
        </CustomForm.Field>
        <CustomForm.Submit data-testid="submit-btn">Submit</CustomForm.Submit>
        <CustomForm.Reset data-testid="reset-btn">Reset</CustomForm.Reset>
      </CustomForm>
    ));

    const submitBtn = screen.getByTestId('submit-btn');
    const resetBtn = screen.getByTestId('reset-btn');

    expect(submitBtn.className).toBe('factory-submit');
    expect(resetBtn.className).toBe('factory-reset');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });

    expect(resetBtn.className).toBe('factory-reset factory-reset-dirty');

    fireEvent.click(submitBtn);

    expect(submitBtn.className).toBe('factory-submit factory-submit-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(submitBtn.className).toBe('factory-submit');
  });

  it('should fallback to default submit and reset classes when options are empty objects', () => {
    const EmptyOptionsForm = createForm(schema, {
      submit: {},
      reset: {},
    });

    render(() => (
      <EmptyOptionsForm value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}>
        <EmptyOptionsForm.Submit data-testid="submit-empty">Submit</EmptyOptionsForm.Submit>
        <EmptyOptionsForm.Reset data-testid="reset-empty">Reset</EmptyOptionsForm.Reset>
      </EmptyOptionsForm>
    ));

    expect(screen.getByTestId('submit-empty').className).toBe('air-form-submit');
    expect(screen.getByTestId('reset-empty').className).toBe('air-form-reset');
  });

  it('should apply formOptions pendingClass on Form created from factory', async () => {
    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    const FactoryForm = createForm(schema, {
      form: { pendingClass: 'factory-form-pending' },
    });

    render(() => (
      <FactoryForm
        value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}
        onSubmit={handleSubmit}
        data-testid="factory-form"
      >
        <FactoryForm.Field name="text">
          <TextInput data-testid="input" />
        </FactoryForm.Field>
        <FactoryForm.Submit data-testid="submit-btn">Submit</FactoryForm.Submit>
        <FactoryForm.Reset data-testid="reset-btn">Reset</FactoryForm.Reset>
      </FactoryForm>
    ));

    const formEl = screen.getByTestId('factory-form');
    const submitBtn = screen.getByTestId('submit-btn');

    expect(formEl.className).toBe('air-form');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });
    fireEvent.click(submitBtn);

    expect(formEl.className).toBe('air-form factory-form-pending');
    expect(submitBtn.className).toBe('air-form-submit air-form-submit-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form');
  });

  it('should apply formOptions errorClass on Form when submission errors', async () => {
    const FactoryErrorForm = createForm(schema, {
      form: { errorClass: 'factory-form-error' },
    });

    render(() => (
      <FactoryErrorForm
        value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}
        onSubmit={() => {
          throw new Error('Submit failed');
        }}
        data-testid="error-form"
      >
        <FactoryErrorForm.Field name="text">
          <TextInput data-testid="input" />
        </FactoryErrorForm.Field>
        <FactoryErrorForm.Submit data-testid="submit-btn">Submit</FactoryErrorForm.Submit>
      </FactoryErrorForm>
    ));

    const formEl = screen.getByTestId('error-form');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });
    fireEvent.click(screen.getByTestId('submit-btn'));
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form factory-form-error');
  });

  it('should fallback to default FORM_OPTIONS pendingClass when formOptions has no pendingClass', async () => {
    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    const EmptyForm = createForm(schema, {
      form: {},
    });

    render(() => (
      <EmptyForm
        value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}
        onSubmit={handleSubmit}
        pendingClass={undefined}
        data-testid="empty-pending-form"
      >
        <EmptyForm.Field name="text">
          <TextInput data-testid="input" />
        </EmptyForm.Field>
        <EmptyForm.Submit data-testid="submit-btn">Submit</EmptyForm.Submit>
      </EmptyForm>
    ));

    const formEl = screen.getByTestId('empty-pending-form');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid Changed' } });
    fireEvent.click(screen.getByTestId('submit-btn'));

    expect(formEl.className).toBe('air-form air-form-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form');
  });

  it('should support function children and pendingClass on Form', async () => {
    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    render(() => (
      <Form
        schema={schema}
        value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}
        class="my-form"
        pendingClass="my-form-pending"
        onSubmit={handleSubmit}
        data-testid="form"
      >
        {(form: any) => (
          <div>
            <Field name="text">
              <TextInput data-testid="input" />
            </Field>
            <span data-testid="valid-indicator">{String(form?.valid)}</span>
            <button type="submit" data-testid="submit">
              Submit
            </button>
          </div>
        )}
      </Form>
    ));

    const formEl = screen.getByTestId('form');
    expect(screen.getByTestId('valid-indicator').textContent).toBe('true');
    expect(formEl.className).toBe('air-form my-form');

    fireEvent.click(screen.getByTestId('submit'));

    expect(formEl.className).toBe('air-form my-form my-form-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form my-form');
  });

  it('should apply default FORM_OPTIONS pendingClass on Form when pending', async () => {
    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    render(() => (
      <Form
        schema={schema}
        value={{ text: 'Valid', bio: '', agree: true, plan: 'pro', country: 'us' }}
        onSubmit={handleSubmit}
        data-testid="form"
      >
        <Field name="text">
          <TextInput data-testid="input" />
        </Field>
        <button type="submit" data-testid="submit">
          Submit
        </button>
      </Form>
    ));

    const formEl = screen.getByTestId('form');
    expect(formEl.className).toBe('air-form');

    fireEvent.click(screen.getByTestId('submit'));

    expect(formEl.className).toBe('air-form air-form-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form');
  });

  it('should fallback to default options and support clear on factory Reset', async () => {
    const singleSchema = z.object({ text: z.string().min(3) });
    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    const CustomForm = createForm(singleSchema);
    const handleClick = vi.fn();

    render(() => (
      <CustomForm value={{ text: 'Initial' }} onSubmit={handleSubmit} data-testid="custom-form">
        <CustomForm.Field name="text">
          <TextInput data-testid="input" />
        </CustomForm.Field>
        <CustomForm.Submit data-testid="submit-btn" pendingClass="custom-submit-pending">Submit</CustomForm.Submit>
        <CustomForm.Reset data-testid="reset-btn" clear dirtyClass="custom-reset-dirty" onClick={handleClick}>
          Clear
        </CustomForm.Reset>
      </CustomForm>
    ));

    const formEl = screen.getByTestId('custom-form');
    const submitBtn = screen.getByTestId('submit-btn');
    const resetBtn = screen.getByTestId('reset-btn');
    expect(resetBtn.className).toBe('air-form-reset');
    expect(submitBtn.className).toBe('air-form-submit');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Changed' } });

    expect(resetBtn.className).toBe('air-form-reset custom-reset-dirty');

    fireEvent.click(resetBtn);

    expect(handleClick).toHaveBeenCalledTimes(1);
    expect((screen.getByTestId('input') as HTMLInputElement).value).toBe('');

    fireEvent.input(screen.getByTestId('input'), { target: { value: 'Valid' } });
    fireEvent.click(submitBtn);

    expect(formEl.className).toBe('air-form air-form-pending');
    expect(submitBtn.className).toBe('air-form-submit custom-submit-pending');

    resolveSubmit();
    await new Promise((r) => setTimeout(r, 10));

    expect(formEl.className).toBe('air-form');
    expect(submitBtn.className).toBe('air-form-submit');
  });

  it('should sync values on external field mutations in Textarea and TextInput', () => {
    let formRef: any;

    render(() => (
      <Form schema={schema} value={{ text: 'initial text', bio: 'initial bio', agree: true, plan: 'pro', country: 'us' }}>
        {(form: any) => {
          formRef = form;
          return (
            <div>
              <Field name="text">
                <TextInput data-testid="text-input" />
              </Field>
              <Field name="bio">
                <Textarea data-testid="textarea-input" />
              </Field>
            </div>
          );
        }}
      </Form>
    ));

    const textEl = screen.getByTestId('text-input') as HTMLInputElement;
    const bioEl = screen.getByTestId('textarea-input') as HTMLTextAreaElement;

    expect(textEl.value).toBe('initial text');
    expect(bioEl.value).toBe('initial bio');

    formRef.fields.text = 'updated text';
    formRef.fields.bio = 'updated bio';

    expect(textEl.value).toBe('updated text');
    expect(bioEl.value).toBe('updated bio');

    formRef.fields.text = undefined;
    formRef.fields.bio = undefined;

    expect(textEl.value).toBe('');
    expect(bioEl.value).toBe('');

    formRef.fields.text = null;
    formRef.fields.bio = null;

    expect(textEl.value).toBe('');
    expect(bioEl.value).toBe('');
  });

  it('should support function children for all inputs when field has error', async () => {
    const errorSchema = z.object({
      text: z.string().min(5),
      agree: z.literal(true),
      plan: z.literal('paid'),
      country: z.literal('id'),
      bio: z.string().min(5),
      file: z.instanceof(FileList),
    });

    let resolveSubmit!: () => void;
    const handleSubmit = () =>
      new Promise<void>((resolve) => {
        resolveSubmit = resolve;
      });

    render(() => (
      <Form
        schema={errorSchema}
        value={{ text: 'a', agree: false as never, plan: 'free' as never, country: 'us' as never, bio: 'a', file: null as never }}
        pendingClass="form-custom-pending"
        onSubmit={handleSubmit}
        data-testid="form-pending"
      >
        {(form: any) => (
          <div>
            <Field name="text">
              <TextInput>{(props: any) => <input data-testid="err-text" {...props} />}</TextInput>
            </Field>
            <Field name="agree">
              <Checkbox>{(props: any) => <input data-testid="err-cb" {...props} />}</Checkbox>
            </Field>
            <Field name="plan">
              <Radio value="paid">{(props: any) => <input data-testid="err-radio" {...props} />}</Radio>
            </Field>
            <Field name="country">
              <Select>
                {(props: any) => (
                  <select data-testid="err-select" {...props}>
                    <option value="us">US</option>
                  </select>
                )}
              </Select>
            </Field>
            <Field name="bio">
              <Textarea>{(props: any) => <textarea data-testid="err-textarea" {...props} />}</Textarea>
            </Field>
            <Field name="file">
              <FilePicker errorClass="file-err">{(props: any) => <input data-testid="err-file" {...props} />}</FilePicker>
            </Field>
            <Field name="file">
              {(field: any) => (
                <>
                  <FilePicker name="file" data-testid="direct-file" errorClass="direct-file-err" />
                  <button
                    data-testid="touch-file"
                    type="button"
                    onClick={() => {
                      field.value = null as never;
                    }}
                  />
                </>
              )}
            </Field>
            <button
              data-testid="touch-all"
              type="button"
              onClick={() => {
                for (const key of Object.keys(form.fields)) {
                  form.fields[key].touched = true;
                }
              }}
            />
            <button type="submit" data-testid="submit-pending-form">
              Submit
            </button>
          </div>
        )}
      </Form>
    ));

    fireEvent.click(screen.getByTestId('touch-all'));
    fireEvent.click(screen.getByTestId('touch-file'));

    expect(screen.getByTestId('err-text').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('err-cb').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('err-radio').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('err-select').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('err-textarea').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByTestId('err-file').getAttribute('aria-invalid')).toBe('true');

    expect(screen.getByTestId('err-text').getAttribute('aria-describedby')).toBe('text-error');
    expect(screen.getByTestId('err-cb').getAttribute('aria-describedby')).toBe('agree-error');
    expect(screen.getByTestId('err-radio').getAttribute('aria-describedby')).toBe('plan-error');
    expect(screen.getByTestId('err-select').getAttribute('aria-describedby')).toBe('country-error');
    expect(screen.getByTestId('err-textarea').getAttribute('aria-describedby')).toBe('bio-error');
    expect(screen.getByTestId('err-file').getAttribute('aria-describedby')).toBe('file-error');

    expect(screen.getByTestId('direct-file').className).toContain('direct-file-err');

    fireEvent.click(screen.getByTestId('submit-pending-form'));
    expect(screen.getByTestId('form-pending').className).toContain('form-custom-pending');

    resolveSubmit();
  });
});
