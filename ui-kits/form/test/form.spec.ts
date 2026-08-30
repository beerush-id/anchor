import { anchor, clearContextStore, createLifecycle, mutable } from '@airlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { formField } from '../src/field.js';
import { FormState, formState } from '../src/form.js';

const userSchema = z.object({
  name: z.string().min(3, 'Name too short'),
  age: z.number().min(18, 'Too young'),
  address: z.object({
    city: z.string(),
    zip: z.string().min(5),
  }),
  tags: z.array(z.string()).default(['new_user']),
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

describe('FormState', () => {
  describe('Initialization', () => {
    it('populates with initial data and schema defaults', () => {
      scope.run(() => {
        const _cForm = new FormState(userSchema); // Coverage.
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' } },
        });

        expect(form.fields['name']).toBe('John');
        expect(form.fields['age']).toBe(20);
        expect(form.fields['tags']).toEqual(['new_user']);

        // shallowChange (default) — init defaults are NOT changes
        expect(form.changed).toBe(false);
      });
    });

    it('treats init defaults as changes when shallowChange is false', () => {
      scope.run(() => {
        const form = formState(
          userSchema,
          { value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' } } },
          { shallowChange: false }
        );

        // tags default filled — shallowChange:false marks it as a change
        expect(form.changed).toBe(true);
        expect(form.changes).toHaveProperty('tags');
      });
    });

    it('handles empty initial data', () => {
      scope.run(() => {
        const form = formState(userSchema);

        expect(form.fields['tags']).toEqual(['new_user']);
        expect(form.output.tags).toEqual(['new_user']);
      });
    });
  });

  describe('Change Tracking', () => {
    it('tracks changes on proxy writes', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        expect(form.changed).toBe(false);

        form.fields['name'] = 'Jane';
        expect(form.changed).toBe(true);
        expect(form.changes).toEqual({ name: 'Jane' });
      });
    });

    it('clears change when reverting to original value', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Jane';
        expect(form.changed).toBe(true);

        form.fields['name'] = 'John';
        expect(form.changed).toBe(false);
        expect(form.changes).toEqual({});
      });
    });

    it('tracks nested field changes', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['address.city'] = 'LA';
        expect(form.changes).toEqual({ address: { city: 'LA' } });
      });
    });

    it('returns complete output hierarchy', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['tags.1'] = 'admin';
        expect(form.output.tags).toEqual(['new_user', 'admin']);
      });
    });
  });

  describe('Validation', () => {
    it('validates on proxy write and populates errors', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' } },
        });

        expect(form.valid).toBe(true);

        form.fields['name'] = 'Al';
        expect(form.valid).toBe(false);
        expect(form.errors['name']).toBeDefined();
      });
    });

    it('clears errors when value becomes valid', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'John', age: 20, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Al';
        expect(form.errors['name']).toBeDefined();

        form.fields['name'] = 'Alice';
        expect(form.errors['name']).toBeUndefined();
        expect(form.valid).toBe(true);
      });
    });

    it('rejects unknown fields in strict mode', () => {
      scope.run(() => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const form = formState(userSchema, {});

        (form.fields as any)['unknown'] = 'test';
        expect((form.fields as any)['unknown']).toBeUndefined();

        errSpy.mockRestore();
      });
    });

    it('protects errors proxy from direct writes', () => {
      scope.run(() => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const form = formState(userSchema, {});

        (form.errors as any)['name'] = ['forced'];
        expect(warnSpy).toHaveBeenCalledWith('[AirLib Form] Violation: form.errors is read-only.');

        warnSpy.mockRestore();
      });
    });
  });

  describe('Touched', () => {
    it('marks field as touched on first write', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        expect(form.touched).toBe(false);

        form.fields['name'] = 'Bob';
        expect(form.touched).toBe(true);
      });
    });

    it('persists touched after reverting to original', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';
        form.fields['name'] = 'Alice';

        expect(form.changed).toBe(false);
        expect(form.touched).toBe(true);
      });
    });

    it('clears touched on reset', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Bob';
        form.reset();

        expect(form.touched).toBe(false);
      });
    });
  });

  describe('Reset & Clear', () => {
    it('reset restores to initial state', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';
        form.fields['address.city'] = 'LA';

        form.reset();

        expect(form.changed).toBe(false);
        expect(form.output.name).toBe('Alice');
        expect(form.output.address.city).toBe('NY');
      });
    });

    it('reset wipes children when restoring object-typed baseline', () => {
      scope.run(() => {
        const handler = vi.fn();
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });
        form.subscribe(handler);

        form.fields['address'] = { city: 'LA', zip: '90001' };
        expect(form.changed).toBe(true);

        form.reset();

        expect(form.changed).toBe(false);
        expect(form.output.address.city).toBe('NY');
        expect(form.output.address.zip).toBe('10001');
        expect(handler).toHaveBeenCalledWith({ type: 'reset' });
      });
    });

    it('reset restores validation errors for invalid baseline values', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Al', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        expect(form.errors['name']).toBeDefined();

        form.fields['name'] = 'Alice';
        expect(form.errors['name']).toBeUndefined();

        form.reset();

        expect(form.errors['name']).toBeDefined();
      });
    });

    it('reset is a no-op when locked', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';

        let resolve: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });

        const sub = form.submit(async () => {
          form.reset();
          expect(form.fields['name']).toBe('Bob');
        });

        resolve!();
        await sub;
      });
    });

    it('clear wipes source and fills defaults', () => {
      scope.run(() => {
        const handler = vi.fn();
        const props = { value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } } };
        const form = formState(userSchema, props);
        form.subscribe(handler);

        form.clear();

        expect(props.value.name).toBeUndefined();
        expect(form.output.tags).toEqual(['new_user']);
        expect(handler).toHaveBeenCalledWith({ type: 'clear' });
      });
    });

    it('clear is a no-op when locked', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';

        let resolve: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });

        const sub = form.submit(async () => {
          const before = form.output;
          form.clear();
          expect(form.output).toEqual(before);
        });

        resolve!();
        await sub;
      });
    });

    it('fires onChange on reset', () => {
      scope.run(() => {
        const onChange = vi.fn();
        const form = formState(
          userSchema,
          {
            value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
          },
          { onChange }
        );

        form.fields['name'] = 'Bob';
        onChange.mockClear();

        form.reset();
        expect(onChange).toHaveBeenCalled();
      });
    });

    it('fires onChange on clear', () => {
      scope.run(() => {
        const onChange = vi.fn();
        const form = formState(
          userSchema,
          {
            value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
          },
          { onChange }
        );

        onChange.mockClear();
        form.clear();
        expect(onChange).toHaveBeenCalled();
      });
    });
  });

  describe('Submit', () => {
    it('transitions status through pending → success', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';
        expect(form.canSubmit).toBe(true);

        const handler = vi.fn().mockImplementation(async () => {
          expect(form.status).toBe('pending');
          expect(form.pending).toBe(true);
        });

        await form.submit(handler);

        expect(form.status).toBe('success');
        expect(form.changed).toBe(false);
        expect(handler).toHaveBeenCalled();
      });
    });

    it('stores error on failed submission', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Bob';

        const error = new Error('Network failed');
        await form.submit(vi.fn().mockRejectedValue(error));

        expect(form.status).toBe('error');
        expect(form.error).toBe(error);
      });
    });

    it('preserves changes when settle is false', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Bob';
        await form.submit(vi.fn().mockResolvedValue(undefined), false);

        expect(form.status).toBe('success');
        expect(form.changed).toBe(true);
      });
    });

    it('prevents overlapping submissions', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Bob';

        let resolve: () => void;
        const promise = new Promise<void>((r) => {
          resolve = r;
        });
        const handler = vi.fn().mockImplementation(() => promise);

        const sub1 = form.submit(handler);
        const sub2 = form.submit(handler);

        resolve!();
        await Promise.all([sub1, sub2]);

        expect(handler).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('External Sync', () => {
    it('handles upstream value replacement', () => {
      scope.run(() => {
        const props = mutable({ value: undefined as any });
        const form = formState(userSchema, props);

        props.value = { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' } };

        expect(form.output.name).toBe('Alice');
        expect(form.output.address.city).toBe('SF');
      });
    });

    it('routes external deep mutations through setter', () => {
      scope.run(() => {
        const props = mutable({
          value: { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' } },
        } as any);
        const form = formState(userSchema, props);

        props.value.name = 'Bob';

        expect(form.fields['name']).toBe('Bob');
        expect(form.changed).toBe(true);
      });
    });

    it('handles external array push', () => {
      scope.run(() => {
        const props = mutable({
          value: { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' }, tags: ['admin'] },
        } as any);
        const form = formState(userSchema, props);

        props.value.tags.push('user');

        expect(form.fields['tags.1']).toBe('user');
        expect(form.changed).toBe(true);
      });
    });

    it('cleans orphaned children when parent is replaced', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['address.zip'] = '123';
        expect(form.errors['address.zip']).toBeDefined();

        form.fields['address'] = { city: 'SF', zip: '94105' };
        expect(form.errors['address.zip']).toBeUndefined();
      });
    });

    it('handles external push of object into array (recursive revalidation)', () => {
      scope.run(() => {
        const itemSchema = z.object({
          items: z.array(
            z.object({
              product: z.string(),
              price: z.number(),
            })
          ),
        });

        const props = mutable({
          value: { items: [{ product: 'Widget', price: 9.99 }] },
        } as any);
        const form = formState(itemSchema, props);

        props.value.items.push({ product: 'Gadget', price: 19.99 });

        expect(form.fields['items.1.product']).toBe('Gadget');
        expect(form.fields['items.1.price']).toBe(19.99);
      });
    });
  });

  describe('Schema Methods', () => {
    it('schemaOf returns schema for known fields', () => {
      scope.run(() => {
        const form = formState(userSchema, { value: {} as any });
        const result = form.schemaOf('name');
        expect(result).toBeDefined();
      });
    });

    it('isRequired detects required vs optional fields', () => {
      scope.run(() => {
        const schema = z.object({
          required: z.string(),
          optional: z.string().optional(),
        });

        const form = formState(schema, { value: {} as any });

        expect(form.isRequired('required')).toBe(true);
        expect(form.isRequired('optional')).toBe(false);
      });
    });

    it('field() returns a FormField for a given path', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        const field = form.field('name');
        expect(field).toBeDefined();
        expect(field.name).toBe('name');
      });
    });

    it('schemaOf() logs violation for unknown fields', () => {
      scope.run(() => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const form = formState(userSchema, { value: {} as any });

        const result = form.schemaOf('nonexistent');
        expect(result).toBeUndefined();
        expect(errSpy).toHaveBeenCalled();

        errSpy.mockRestore();
      });
    });

    it('isRequired logs violation for unknown fields', () => {
      scope.run(() => {
        const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const form = formState(userSchema, { value: {} as any });

        expect(form.isRequired('nonexistent')).toBe(false);
        expect(errSpy).toHaveBeenCalled();

        errSpy.mockRestore();
      });
    });
  });

  describe('branch coverage', () => {
    it('proxy write is silently ignored when locked', async () => {
      await scope.run(async () => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' }, tags: ['new_user'] },
        });

        form.fields['name'] = 'Bob';

        await form.submit(async () => {
          form.fields['name'] = 'LOCKED';
        });

        expect(form.fields['name']).not.toBe('LOCKED');
      });
    });

    it('external array replace to non-array', () => {
      scope.run(() => {
        const props = mutable({
          value: { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' }, tags: ['admin'] },
        } as any);
        const form = formState(userSchema, props);

        props.value.tags = 'not-an-array';

        expect(form.fields['tags']).toBe('not-an-array');
      });
    });

    it('handles external push without onChange', () => {
      scope.run(() => {
        const props = mutable({
          value: { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' }, tags: ['admin'] },
        } as any);
        formState(userSchema, props);

        props.value.tags.push('user');
        expect(props.value.tags).toEqual(['admin', 'user']);
      });
    });

    it('fires onChange on external array push', () => {
      scope.run(() => {
        const onChange = vi.fn();
        const props = mutable({
          value: { name: 'Alice', age: 25, address: { city: 'SF', zip: '94105' }, tags: ['admin'] },
        } as any);
        formState(userSchema, props, { onChange });

        onChange.mockClear();
        props.value.tags.push('user');
        expect(onChange).toHaveBeenCalled();
      });
    });
  });

  describe('Per-field operations', () => {
    it('clearField clears a single field', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.clearField('name');
        expect(form.fields['name']).toBeUndefined();
        expect(form.fields['age']).toBe(25);
      });
    });

    it('resetField restores a single field', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        form.fields['name'] = 'Bob';
        form.fields['age'] = 99;

        form.resetField('name');
        expect(form.fields['name']).toBe('Alice');
        expect(form.fields['age']).toBe(99);
      });
    });

    it('clearField/resetField return this for chaining', () => {
      scope.run(() => {
        const form = formState(userSchema, {
          value: { name: 'Alice', age: 25, address: { city: 'NY', zip: '10001' } },
        });

        const result = form.clearField('name').resetField('age');
        expect(result).toBe(form);
      });
    });
  });

  describe('Blocking & Unblocking', () => {
    it('blocks the form when field match condition fails and unblocks when it passes', () => {
      scope.run(() => {
        const schema = z.object({
          password: z.string(),
          confirmPassword: z.string(),
        });
        const form = formState(schema, {
          value: { password: 'abc', confirmPassword: 'def' },
        });

        const confirmField = formField('confirmPassword', 'password');

        expect(confirmField.matched).toBe(false);
        expect(form.blocked).toBe(true);

        form.fields['confirmPassword'] = 'abc';

        expect(confirmField.matched).toBe(true);
        expect(form.blocked).toBe(false);
      });
    });

    it('handles manual double-blocking gracefully', () => {
      scope.run(() => {
        const form = formState(userSchema, { value: {} as any });

        expect(form.blocked).toBe(false);

        form.block('custom_block');
        expect(form.blocked).toBe(true);

        // Double-block
        form.block('custom_block');
        expect(form.blocked).toBe(true);
      });
    });

    it('handles manual double-unblocking gracefully', () => {
      scope.run(() => {
        const form = formState(userSchema, { value: {} as any });

        form.block('custom_block');
        expect(form.blocked).toBe(true);

        form.unblock('custom_block');
        expect(form.blocked).toBe(false);

        // Double-unblock
        form.unblock('custom_block');
        expect(form.blocked).toBe(false);
      });
    });
  });
});
