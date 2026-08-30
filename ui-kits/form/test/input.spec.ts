import { anchor, clearContextStore, createLifecycle, mutable } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { FORM_INPUT } from '../src/constant.js';
import { formField } from '../src/field.js';
import { formState } from '../src/form.js';
import type { FormInputProps } from '../src/input.js';
import { FormInput, formInput } from '../src/input.js';

const schema = z.object({
  name: z.string(),
  age: z.number(),
  active: z.boolean(),
  role: z.string(),
  birthday: z.date(),
});

let scope: ReturnType<typeof createLifecycle>;

beforeEach(() => {
  clearContextStore();
  anchor.configure({ globalScopeWarning: false });
  scope = createLifecycle();
});

afterEach(() => {
  scope.destroy();
});

describe('FormInput', () => {
  describe('Text input', () => {
    it('syncs string value from field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        expect(input.name).toBe('name');
        expect(input.type).toBe(FORM_INPUT.text);
        expect(input.value).toBe('Alice');
        // Matched default to true.
        expect(input.matched).toBe(true);
      });
    });

    it('writes back to field on value assignment', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        input.value = 'Bob';
        expect(form.fields['name']).toBe('Bob');
      });
    });
  });

  describe('Number input', () => {
    it('parses string to number', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('age');
        const input = new FormInput({ type: FORM_INPUT.number });

        input.value = '30';
        expect(form.fields['age']).toBe(30);
      });
    });

    it('rejects invalid number input', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('age');
        const input = new FormInput({ type: FORM_INPUT.number });

        input.value = 'not-a-number';
        expect(form.fields['age']).toBe(25);
      });
    });
  });

  describe('Checkbox input', () => {
    it('toggles boolean via checked property', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('active');
        const input = new FormInput({ type: FORM_INPUT.checkbox });

        expect(input.checked).toBe(true);

        input.checked = false;
        expect(form.fields['active']).toBe(false);
        expect(input.checked).toBe(false);
      });
    });
  });

  describe('Radio input', () => {
    it('tracks selected option via checked', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('role');
        const adminInput = new FormInput({ type: FORM_INPUT.radio, value: 'admin' });

        expect(adminInput.checked).toBe(true);

        // Simulate selecting a different radio
        form.fields['role'] = 'user';
        expect(adminInput.checked).toBe(false);
      });
    });

    it('writes value to field when checked', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('role');
        const userInput = new FormInput({ type: FORM_INPUT.radio, value: 'user' });

        userInput.checked = true;
        expect(form.fields['role']).toBe('user');
      });
    });
  });

  describe('Date input', () => {
    it('formats Date to YYYY-MM-DD string', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.date });

        expect(input.value).toBe('2000-06-15');
      });
    });

    it('parses date string back to Date', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.date });

        input.value = '2024-12-25';
        expect(form.fields['birthday']).toBeInstanceOf(Date);
      });
    });
  });

  describe('settled', () => {
    it('re-syncs buffer from field value when locked', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        // Simulate a locked state (mid-composition)
        input.locked = true;
        input.settled();

        expect(input.locked).toBe(false);
        expect(input.value).toBe('Alice');
      });
    });

    it('skips settled for boolean inputs', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('active');
        const input = new FormInput({ type: FORM_INPUT.checkbox });

        input.locked = true;
        input.settled();

        // locked stays true because bool inputs skip settled
        expect(input.locked).toBe(true);
      });
    });
  });

  describe('Standalone (no field context)', () => {
    it('reads/writes props directly without a form and field', () => {
      scope.run(() => {
        const props: FormInputProps<string> = { type: FORM_INPUT.text, value: 'standalone' };
        const input = formInput(props);

        expect(input.value).toBe('standalone');

        input.value = 'updated';
        expect(props.value).toBe('updated');
        // Fallback to true.
        expect(input.matched).toBe(true);
      });
    });

    it('create field when inside a form', () => {
      scope.run(() => {
        const state = mutable({
          name: 'Alice',
          age: 25,
          active: true,
          role: 'admin',
          birthday: new Date('2000-01-01'),
        });
        formState(schema, {
          value: state,
        });

        const props: FormInputProps<string> = { type: FORM_INPUT.text, name: 'name', value: 'standalone' };
        const input = formInput(props);

        expect(input.value).toBe('Alice');

        input.value = 'updated';
        expect(props.value).toBe('standalone');
        expect(state.name).toBe('updated');
        expect(input.value).toBe('updated');
        // Fallback to true.
        expect(input.matched).toBe(true);
      });
    });
  });

  describe('Custom parse/stringify', () => {
    it('uses custom parse function', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text }, { parse: (raw: string) => raw.toUpperCase() });

        input.value = 'bob';
        expect(form.fields['name']).toBe('BOB');
      });
    });

    it('uses custom stringify function', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text }, { stringify: (value: string) => value.toLowerCase() });

        expect(input.value).toBe('alice');
      });
    });
  });

  it('reflects error and valid from parent field', () => {
    scope.run(() => {
      const minSchema = z.object({ name: z.string().min(3) });
      formState(minSchema, { value: { name: 'Alice' } });

      formField('name');
      const input = new FormInput({ type: FORM_INPUT.text });

      expect(input.valid).toBe(true);
      expect(input.error).toBeUndefined();

      input.value = 'Al';
      expect(input.valid).toBe(false);
      expect(input.error).toBeDefined();
    });
  });

  describe('Field state getters', () => {
    it('reflects changed from field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        expect(input.changed).toBe(false);

        input.value = 'Bob';
        expect(input.changed).toBe(true);
      });
    });

    it('reflects touched from field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        expect(input.touched).toBe(false);

        input.value = 'Bob';
        expect(input.touched).toBe(true);
      });
    });

    it('reflects disabled from field (pending state)', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        expect(input.disabled).toBe(false);

        // Pending disables fields
        input.value = 'Bob';
        const promise = form.submit(async () => {
          expect(input.disabled).toBe(true);
        });

        return promise;
      });
    });

    it('reflects required from field', () => {
      scope.run(() => {
        const reqSchema = z.object({ required: z.string(), optional: z.string().optional() });
        formState(reqSchema, { value: { required: 'yes' } as any });

        formField('required');
        const input = new FormInput({ type: FORM_INPUT.text });
        expect(input.required).toBe(true);
      });
    });
  });

  describe('Date format branches', () => {
    it('formats datetime-local', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15T14:30:00') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.datetimeLocal });

        expect(input.value).toMatch(/^2000-06-15T\d{2}:\d{2}$/);
      });
    });

    it('formats time', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15T14:30:00') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.time });

        expect(input.value).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    it('formats month', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.month });

        expect(input.value).toBe('2000-06');
      });
    });

    it('formats week', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.week });

        expect(input.value).toMatch(/^\d{4}-W\d{2}$/);
      });
    });

    it('returns empty string for invalid dates', () => {
      scope.run(() => {
        const dateSchema = z.object({ d: z.any() });
        formState(dateSchema, { value: { d: 'not-a-date' } });

        formField('d');
        const dateInput = new FormInput({ type: FORM_INPUT.date });
        expect(dateInput.value).toBe('');

        const dtInput = new FormInput({ type: FORM_INPUT.datetimeLocal });
        expect(dtInput.value).toBe('');

        const timeInput = new FormInput({ type: FORM_INPUT.time });
        expect(timeInput.value).toBe('');

        const monthInput = new FormInput({ type: FORM_INPUT.month });
        expect(monthInput.value).toBe('');

        const weekInput = new FormInput({ type: FORM_INPUT.week });
        expect(weekInput.value).toBe('');
      });
    });

    it('parses invalid date input', () => {
      scope.run(() => {
        const form = formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-06-15') },
        });

        formField('birthday');
        const input = new FormInput({ type: FORM_INPUT.date });

        input.value = 'invalid-date';
        // Invalid date is rejected
        expect(form.fields['birthday']).toBeInstanceOf(Date);
      });
    });
  });

  describe('standalone (no field)', () => {
    it('changed/touched/valid/disabled/required default without field', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text, name: 'standalone' });

        expect(input.changed).toBe(false);
        expect(input.touched).toBe(false);
        expect(input.valid).toBe(true);
        expect(input.disabled).toBe(false);
        expect(input.required).toBe(false);
        expect(input.error).toBeUndefined();
      });
    });

    it('changed/touched/valid/disabled/required default without field and name', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text });

        expect(input.changed).toBe(false);
        expect(input.touched).toBe(false);
        expect(input.valid).toBe(true);
        expect(input.disabled).toBe(false);
        expect(input.required).toBe(false);
        expect(input.error).toBeUndefined();
      });
    });

    it('name falls back to props.name without field', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text, name: 'fallback' });
        expect(input.name).toBe('fallback');
      });
    });

    it('name defaults to empty string without field or props.name', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text });
        expect(input.name).toBe('');
      });
    });

    it('defaults to text type when type is omitted', () => {
      scope.run(() => {
        const input = new FormInput({} as any);
        expect(input.type).toBe(FORM_INPUT.text);
      });
    });

    it('writes to props.value without field', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.text, value: 'hello' };
        const input = new FormInput(props);

        input.value = 'world';
        expect(props.value).toBe('world');
      });
    });

    it('checked setter writes to props.checked without field', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.checkbox };
        const input = new FormInput(props);

        input.checked = true;
        expect(props.checked).toBe(true);
      });
    });

    it('checkbox effect reads from props.checked without field', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.checkbox, checked: true };
        const input = new FormInput(props);

        expect(input.checked).toBe(true);
      });
    });

    it('text effect reads from props.value without field', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.text, value: 'hello' };
        const input = new FormInput(props);

        expect(input.value).toBe('hello');
      });
    });

    it('settled resets buffer after invalid parse', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.number, value: 42 };
        const input = new FormInput(props);

        input.value = 'not-a-number';
        expect(input.locked).toBe(true);

        input.settled();
        expect(input.locked).toBe(false);
      });
    });

    it('required falls back to props.required', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text, required: true } as any);
        expect(input.required).toBe(true);
      });
    });

    it('disabled uses props.disabled', () => {
      scope.run(() => {
        const input = new FormInput({ type: FORM_INPUT.text, disabled: true } as any);
        expect(input.disabled).toBe(true);
      });
    });

    it('defaultStringify returns empty string for null/undefined', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.date, value: null };
        const input = new FormInput(props);
        expect(input.value).toBe('');
      });
    });
  });

  describe('clear & reset', () => {
    it('clear restores buffer via field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        input.value = 'Bob';
        expect(input.value).toBe('Bob');

        input.clear();
        expect(input.value).toBe('');
      });
    });

    it('reset restores buffer via field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('name');
        const input = new FormInput({ type: FORM_INPUT.text });

        input.value = 'Bob';
        input.reset();
        expect(input.value).toBe('Alice');
      });
    });

    it('unlocks before reset after invalid parse', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('age');
        const input = new FormInput({ type: FORM_INPUT.number });

        input.value = 'abc';
        expect(input.locked).toBe(true);

        input.reset();
        expect(input.locked).toBe(false);
        expect(input.value).toBe('25');
      });
    });

    it('unlocks before clear after invalid parse', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('age');
        const input = new FormInput({ type: FORM_INPUT.number });

        input.value = 'abc';
        expect(input.locked).toBe(true);

        input.clear();
        expect(input.locked).toBe(false);
      });
    });

    it('standalone clear empties buffer and props', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.text, value: 'hello' };
        const input = new FormInput(props);

        input.clear();
        expect(input.value).toBe('');
        expect(props.value).toBeUndefined();
      });
    });

    it('standalone reset restores initial value', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.text, value: 'initial' };
        const input = new FormInput(props);

        input.value = 'changed';
        expect(input.value).toBe('changed');

        input.reset();
        expect(input.value).toBe('initial');
        expect(props.value).toBe('initial');
      });
    });

    it('standalone checkbox clear resets checked', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.checkbox, checked: true };
        const input = new FormInput(props);

        input.clear();
        expect(input.checked).toBe(false);
        expect(props.checked).toBeUndefined();
      });
    });

    it('standalone checkbox reset restores initial checked', () => {
      scope.run(() => {
        const props: any = { type: FORM_INPUT.checkbox, checked: true };
        const input = new FormInput(props);

        input.checked = false;
        input.reset();
        expect(props.checked).toBe(true);
      });
    });

    it('reset syncs checkbox buffer via field', () => {
      scope.run(() => {
        formState(schema, {
          value: { name: 'Alice', age: 25, active: true, role: 'admin', birthday: new Date('2000-01-01') },
        });

        formField('active');
        const input = new FormInput({ type: FORM_INPUT.checkbox });

        input.checked = false;
        input.reset();
        expect(input.checked).toBe(true);
      });
    });
  });
});
