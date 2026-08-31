/** @jsxImportSource solid-js */

import { cleanup, fireEvent, render, screen } from '@solidjs/testing-library';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { Field } from '../src/Field.js';
import { FieldList } from '../src/FieldList.js';
import { Form } from '../src/Form.js';
import { TextInput } from '../src/index.js';

afterEach(cleanup);

const userSchema = z.object({
  name: z.string().min(3, 'Name too short'),
  email: z.string().email('Invalid email'),
});

describe('Field', () => {
  describe('Structured mode', () => {
    it('should render a <div> with a label and children', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" label="Full Name" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      expect(field.tagName).toBe('DIV');
      expect(screen.getByText('Full Name')).toBeDefined();
      expect(screen.getByTestId('input')).toBeDefined();
    });

    it('should forward intrinsic props to the wrapping <div>', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" class="field-group" id="name-field" data-testid="field">
            <TextInput />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      expect(field.className).toBe('air-form-field field-group');
      expect(field.id).toBe('name-field');
    });

    it('should apply labelClass to the label element', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" label="Name" labelClass="label-style">
            <TextInput />
          </Field>
        </Form>
      ));

      const label = screen.getByText('Name');
      expect(label.className).toBe('air-form-field-label label-style');
    });

    it('should render the control wrapper with controlClass', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" controlClass="custom-control" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const control = screen.getByTestId('field').querySelector('.air-form-field-control');
      expect(control).not.toBeNull();
      expect(control?.className).toBe('air-form-field-control custom-control');
      expect(control?.contains(screen.getByTestId('input'))).toBe(true);
    });

    it('should display validation errors with supportClass', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'Al', email: 'john@test.com' }}>
          <Field name="name" label="Name" errorClass="error-text" supportClass="support-text" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      expect(field.className).toBe('air-form-field');
      let error = field.querySelector('[role="alert"]');
      expect(error).toBeNull();

      const input = screen.getByTestId('input');
      fireEvent.input(input, { target: { value: 'A' } });

      expect(field.className).toBe('air-form-field error-text');
      error = field.querySelector('[role="alert"]');
      expect(error).toBeDefined();
      expect(error?.className).toBe('air-form-field-support support-text');
      expect(error?.textContent).toBe('Name too short');
    });

    it('should not leak name, label, labelClass, errorClass to the DOM', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" label="Name" labelClass="lbl" errorClass="err" data-testid="field">
            <TextInput />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      expect(field.getAttribute('name')).toBeNull();
      expect(field.getAttribute('label')).toBeNull();
      expect(field.getAttribute('labelClass')).toBeNull();
      expect(field.getAttribute('errorClass')).toBeNull();
    });
  });

  describe('Headless mode', () => {
    it('should call render function with field state', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name">
            {(field: any) => (
              <div data-testid="custom-field">
                <span data-testid="field-value">{String(field.value)}</span>
                <span data-testid="field-name">{field.name}</span>
              </div>
            )}
          </Field>
        </Form>
      ));

      expect(screen.getByTestId('field-value').textContent).toBe('John');
      expect(screen.getByTestId('field-name').textContent).toBe('name');
    });
  });

  describe('Accessibility', () => {
    it('should link label to input via for and auto-id', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" label="Full Name" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const label = screen.getByText('Full Name');
      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(label.getAttribute('for')).toBe('name');
      expect(input.id).toBe('name');
    });

    it('should add error id and role=alert on validation error', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'Al', email: 'john@test.com' }}>
          <Field name="name" label="Name" errorClass="error-text" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const input = screen.getByTestId('input');
      fireEvent.input(input, { target: { value: 'A' } });

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]') as HTMLElement;

      expect(error).not.toBeNull();
      expect(error.id).toBe('name-error');
    });

    it('should set aria-invalid and aria-describedby on input when errors exist', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'Al', email: 'john@test.com' }}>
          <Field name="name" label="Name" errorClass="error-text">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(input.getAttribute('aria-invalid')).toBe('true');
      expect(input.getAttribute('aria-describedby')).toBe('name-error');
    });

    it('should not set aria-invalid when field is valid', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name" label="Name">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(input.getAttribute('aria-invalid')).toBeNull();
      expect(input.getAttribute('aria-describedby')).toBeNull();
    });

    it('should sanitize dot paths to dashes for ids', () => {
      const nestedSchema = z.object({
        address: z.object({ city: z.string().min(2) }),
      });

      render(() => (
        <Form schema={nestedSchema} value={{ address: { city: 'NY' } }}>
          <Field name="address.city" label="City" data-testid="field">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));

      const label = screen.getByText('City');
      const input = screen.getByTestId('input') as HTMLInputElement;

      expect(label.getAttribute('for')).toBe('address-city');
      expect(input.id).toBe('address-city');
    });
  });

  describe('Match prop', () => {
    const passwordSchema = z.object({
      password: z.string().min(6, 'Too short'),
      confirmPassword: z.string().min(6, 'Too short'),
    });

    it('should expose matched state in render function', () => {
      render(() => (
        <Form schema={passwordSchema} value={{ password: 'secret', confirmPassword: 'secret' }}>
          <Field name="confirmPassword" match="password">
            {(field: any) => (
              <div>
                <span data-testid="matched">{String(field.matched)}</span>
                <span data-testid="valid">{String(field.valid)}</span>
              </div>
            )}
          </Field>
        </Form>
      ));

      expect(screen.getByTestId('matched').textContent).toBe('true');
      expect(screen.getByTestId('valid').textContent).toBe('true');
    });

    it('should show valid but not matched when values differ', () => {
      render(() => (
        <Form schema={passwordSchema} value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <Field name="confirmPassword" match="password">
            {(field: any) => (
              <div>
                <span data-testid="matched">{String(field.matched)}</span>
                <span data-testid="valid">{String(field.valid)}</span>
              </div>
            )}
          </Field>
        </Form>
      ));

      expect(screen.getByTestId('valid').textContent).toBe('true');
      expect(screen.getByTestId('matched').textContent).toBe('false');
    });

    it('should not leak match prop to the DOM', () => {
      render(() => (
        <Form schema={passwordSchema} value={{ password: 'secret', confirmPassword: 'secret' }}>
          <Field name="confirmPassword" match="password" data-testid="field">
            <TextInput />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      expect(field.getAttribute('match')).toBeNull();
    });

    it('should display mismatchLabel when values differ', () => {
      render(() => (
        <Form schema={passwordSchema} value={{ password: 'secret', confirmPassword: 'abcdef' }}>
          <Field name="confirmPassword" match="password" mismatchLabel="Passwords do not match!" data-testid="field">
            <TextInput />
          </Field>
        </Form>
      ));

      const field = screen.getByTestId('field');
      const error = field.querySelector('[role="alert"]');
      expect(error).toBeDefined();
      expect(error?.textContent).toBe('Passwords do not match!');
    });
  });

  describe('Touched tracking', () => {
    it('should expose touched state in render function', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name">
            {(field: any) => (
              <div>
                <span data-testid="touched">{String(field.touched)}</span>
              </div>
            )}
          </Field>
        </Form>
      ));

      expect(screen.getByTestId('touched').textContent).toBe('false');
    });

    it('should become touched after input mutation', () => {
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name="name">
            {(field: any) => (
              <div>
                <TextInput data-testid="input" />
                <span data-testid="touched">{String(field.touched)}</span>
              </div>
            )}
          </Field>
        </Form>
      ));

      expect(screen.getByTestId('touched').textContent).toBe('false');

      fireEvent.input(screen.getByTestId('input'), { target: { value: 'Jane' } });

      expect(screen.getByTestId('touched').textContent).toBe('true');
    });
  });

  describe('Missing properties fallback', () => {
    it('should render error message when name is not provided', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name={'' as never} errorClass="custom-error">
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));
      expect(screen.getByText('[FieldError]: Name property is required!')).toBeDefined();
      expect(screen.getByText('[FieldError]: Name property is required!').className).toBe('custom-error');
      errorSpy.mockRestore();
    });

    it('should render default error message class when name is not provided and errorClass is omitted', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <Field name={'' as never}>
            <TextInput data-testid="input" />
          </Field>
        </Form>
      ));
      expect(screen.getByText('[FieldError]: Name property is required!').className).toBe('air-form-field-error');
      errorSpy.mockRestore();
    });

    it('FieldList should render error message when name is not provided', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <FieldList name={'' as never}>{() => <div />}</FieldList>
        </Form>
      ));
      expect(screen.getByText('[FieldListError]: Name property is required!')).toBeDefined();
      errorSpy.mockRestore();
    });

    it('FieldList should render default error message class when errorClass is omitted', () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      render(() => (
        <Form schema={userSchema} value={{ name: 'John', email: 'john@test.com' }}>
          <FieldList name={'' as never}>{() => <div />}</FieldList>
        </Form>
      ));
      expect(screen.getByText('[FieldListError]: Name property is required!').className).toBe('air-form-field-error');
      errorSpy.mockRestore();
    });
  });
});
