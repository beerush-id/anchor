import { anchor, mutable } from '@airlib/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { buildShell } from '../src/builder.js';
import { flattenSchemas } from '../src/schema.js';

beforeEach(() => {
  anchor.configure({ globalScopeWarning: false });
});

describe('buildShell', () => {
  it('fills a new user profile with schema defaults', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      active: z.boolean().default(true),
      tags: z.array(z.string()).default(['new_user']),
    });

    const map = flattenSchemas(schema);
    const input: Record<string, unknown> = mutable({});
    const result = buildShell(map, input);

    // Defaults filled
    expect(input.role).toBe('user');
    expect(input.active).toBe(true);
    expect(input.tags).toEqual(['new_user']);

    // Required fields without defaults — user hasn't typed yet
    expect(input.name).toBeUndefined();
    expect(input.email).toBeUndefined();
  });

  it('preserves existing data when editing a user', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      bio: z.string().optional(),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ name: 'Alice', email: 'alice@test.com', role: 'admin' as const });
    const result = buildShell(map, input);

    // Existing data untouched
    expect(input.name).toBe('Alice');
    expect(input.email).toBe('alice@test.com');
    expect(input.role).toBe('admin');
  });

  it('fills nested settings with defaults', () => {
    const schema = z.object({
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
        newsletter: z.boolean().default(false),
        language: z.string().default('en'),
      }),
    });

    const map = flattenSchemas(schema);
    const input: Record<string, unknown> = mutable({});
    buildShell(map, input);

    expect((input as any).preferences.theme).toBe('auto');
    expect((input as any).preferences.newsletter).toBe(false);
    expect((input as any).preferences.language).toBe('en');
  });

  it('fills only missing nested values when partial data provided', () => {
    const schema = z.object({
      address: z.object({
        city: z.string(),
        state: z.string(),
        country: z.string().default('US'),
      }),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ address: { city: 'New York', state: 'NY' } });
    buildShell(map, input);

    expect(input.address.city).toBe('New York');
    expect(input.address.state).toBe('NY');
    expect((input.address as any).country).toBe('US');
  });

  it('fills defaults in each order item', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          product: z.string(),
          quantity: z.number().default(1),
          price: z.number().default(0),
          taxable: z.boolean().default(true),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      items: [{ product: 'Widget', price: 9.99 }, { product: 'Gadget' }, {}],
    });
    buildShell(map, input);

    // First item: price preserved, others filled
    expect(input.items[0].product).toBe('Widget');
    expect((input.items[0] as any).quantity).toBe(1);
    expect(input.items[0].price).toBe(9.99);
    expect((input.items[0] as any).taxable).toBe(true);

    // Second item: product preserved, defaults filled
    expect((input.items[1] as any).product).toBe('Gadget');
    expect((input.items[1] as any).quantity).toBe(1);
    expect((input.items[1] as any).price).toBe(0);

    // Third item: all defaults
    expect((input.items[2] as any).quantity).toBe(1);
    expect((input.items[2] as any).price).toBe(0);
    expect((input.items[2] as any).taxable).toBe(true);
    expect((input.items[2] as any).product).toBeUndefined();
  });

  it('leaves empty arrays alone', () => {
    const schema = z.object({
      attachments: z.array(
        z.object({
          url: z.string(),
          label: z.string().default('Untitled'),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ attachments: [] as any[] });
    buildShell(map, input);

    expect(input.attachments.length).toBe(0);
  });

  it('never overwrites — the reference stays the same', () => {
    const schema = z.object({
      theme: z.string().default('dark'),
    });

    const map = flattenSchemas(schema);
    const input: Record<string, unknown> = mutable({});
    const ref = input;
    buildShell(map, input);

    expect(ref).toBe(input);
    expect(ref.theme).toBe('dark');
  });

  it('handles a full registration form', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      password: z.string().min(8),
      confirmPassword: z.string(),
      role: z.enum(['user', 'admin']).default('user'),
      address: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zip: z.string(),
        country: z.string().default('US'),
      }),
      preferences: z.object({
        newsletter: z.boolean().default(true),
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      }),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      firstName: 'Alice',
      email: 'alice@test.com',
      address: { city: 'New York', state: 'NY' },
    });
    buildShell(map, input);

    // Provided stays
    expect((input as any).firstName).toBe('Alice');
    expect((input as any).email).toBe('alice@test.com');
    expect((input as any).address.city).toBe('New York');

    // Defaults filled
    expect((input as any).role).toBe('user');
    expect((input as any).address.country).toBe('US');
    expect((input as any).preferences.newsletter).toBe(true);
    expect((input as any).preferences.theme).toBe('auto');

    // Required without defaults — user hasn't typed
    expect((input as any).lastName).toBeUndefined();
    expect((input as any).password).toBeUndefined();
    expect((input as any).confirmPassword).toBeUndefined();
    expect((input as any).address.line1).toBeUndefined();
    expect((input as any).address.zip).toBeUndefined();
  });

  it('handles product form with variants', () => {
    const schema = z.object({
      title: z.string(),
      price: z.number(),
      currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
      inStock: z.boolean().default(true),
      variants: z.array(
        z.object({
          sku: z.string(),
          size: z.enum(['S', 'M', 'L', 'XL']),
          stock: z.number().default(0),
          active: z.boolean().default(true),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      title: 'T-Shirt',
      price: 29.99,
      variants: [
        { sku: 'TS-S', size: 'S' as const, stock: 50 },
        { sku: 'TS-M', size: 'M' as const },
      ],
    });
    buildShell(map, input);

    // Top-level defaults
    expect((input as any).currency).toBe('USD');
    expect((input as any).inStock).toBe(true);

    // First variant: stock preserved, active filled
    expect(input.variants[0].stock).toBe(50);
    expect((input.variants[0] as any).active).toBe(true);

    // Second variant: stock + active filled
    expect((input.variants[1] as any).stock).toBe(0);
    expect((input.variants[1] as any).active).toBe(true);
  });

  it('starts from empty — brand new form', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      active: z.boolean().default(true),
      preferences: z.object({
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      }),
    });

    const map = flattenSchemas(schema);
    const input: Record<string, unknown> = mutable({});
    buildShell(map, input);

    // Defaults filled
    expect(input.role).toBe('user');
    expect(input.active).toBe(true);
    expect((input as any).preferences.theme).toBe('auto');

    // Required fields — user hasn't touched anything
    expect(input.name).toBeUndefined();
    expect(input.email).toBeUndefined();
  });

  it('starts from full record — editing from database', () => {
    const schema = z.object({
      name: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      active: z.boolean().default(true),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ name: 'Alice', email: 'alice@test.com', role: 'admin', active: false });
    buildShell(map, input);

    // Everything preserved — DB record is complete, buildShell is no-op
    expect(input.name).toBe('Alice');
    expect(input.email).toBe('alice@test.com');
    expect(input.role).toBe('admin');
    expect(input.active).toBe(false);
  });

  it('starts from saved draft — user partially filled and left', () => {
    const schema = z.object({
      firstName: z.string(),
      lastName: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      address: z.object({
        city: z.string(),
        country: z.string().default('US'),
      }),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ firstName: 'Al' });
    buildShell(map, input);

    // Draft value preserved
    expect((input as any).firstName).toBe('Al');

    // Defaults filled
    expect((input as any).role).toBe('user');
    expect((input as any).address.country).toBe('US');

    // Not yet filled by user
    expect((input as any).lastName).toBeUndefined();
    expect((input as any).email).toBeUndefined();
    expect((input as any).address.city).toBeUndefined();
  });

  // --- Integration: full result in one scenario ---

  it('new form — defaults filled, baseline set, errors on required, no changes', () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      active: z.boolean().default(true),
    });

    const map = flattenSchemas(schema);
    const input: Record<string, unknown> = mutable({});
    const { baseline, errors, changes } = buildShell(map, input);

    // Defaults filled
    expect(input.role).toBe('user');
    expect(input.active).toBe(true);

    // Baseline captures filled state — reset goes here
    expect(baseline.get('role')).toBe('user');
    expect(baseline.get('active')).toBe(true);
    expect(baseline.has('name')).toBe(false);

    // Errors on unfilled required fields
    expect(errors.has('name')).toBe(true);
    expect(errors.has('email')).toBe(true);
    expect(errors.has('role')).toBe(false);

    // Defaults are changes — they weren't in the given input
    expect(changes.has('role')).toBe(true);
    expect(changes.has('active')).toBe(true);
    expect(changes.has('name')).toBe(false);
  });

  it('edit from DB — all preserved, baseline matches, no errors, no changes', () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ name: 'Alice', email: 'alice@test.com', role: 'admin' as const });
    const { baseline, errors, changes } = buildShell(map, input);

    // Nothing changed
    expect(input.name).toBe('Alice');
    expect(input.role).toBe('admin');

    // Baseline matches DB values — not the defaults
    expect(baseline.get('name')).toBe('Alice');
    expect(baseline.get('role')).toBe('admin');

    // Valid record — no errors
    expect(errors.size).toBe(0);

    // No changes — everything was given
    expect(changes.size).toBe(0);
  });

  it('draft resume — partial filled, defaults added, errors on invalid/missing', () => {
    const schema = z.object({
      firstName: z.string().min(2),
      lastName: z.string(),
      email: z.string().email(),
      role: z.enum(['user', 'admin']).default('user'),
      address: z.object({
        city: z.string(),
        country: z.string().default('US'),
      }),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ firstName: 'Al', email: 'bad-email' });
    const { baseline, errors, changes } = buildShell(map, input);

    // Defaults filled
    expect((input as any).role).toBe('user');
    expect((input as any).address.country).toBe('US');

    // Baseline includes provided + defaults
    expect(baseline.get('firstName')).toBe('Al');
    expect(baseline.get('role')).toBe('user');
    expect(baseline.get('address.country')).toBe('US');

    // Errors: bad email, missing lastName
    expect(errors.has('email')).toBe(true);
    expect(errors.has('lastName')).toBe(true);
    expect(errors.has('firstName')).toBe(false);
    expect(errors.has('role')).toBe(false);

    // Defaults are changes — role and country weren't given
    expect(changes.has('role')).toBe(true);
    expect(changes.has('address.country')).toBe(true);
    expect(changes.has('firstName')).toBe(false);
  });

  it('order form with invalid items — defaults, baseline, errors all together', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          product: z.string().min(1),
          quantity: z.number().default(1),
          price: z.number().min(0),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      items: [
        { product: 'Widget', price: 9.99 },
        { product: '', price: -1 },
      ],
    });
    const { baseline, errors, changes } = buildShell(map, input);

    // Defaults filled in both items
    expect((input.items[0] as any).quantity).toBe(1);
    expect((input.items[1] as any).quantity).toBe(1);

    // Baseline includes filled state
    expect(baseline.get('items.0.quantity')).toBe(1);
    expect(baseline.get('items.0.price')).toBe(9.99);

    // First item valid, second item invalid
    expect(errors.has('items.0.product')).toBe(false);
    expect(errors.has('items.1.product')).toBe(true);
    expect(errors.has('items.1.price')).toBe(true);

    // Quantity defaults are changes — they weren't given
    expect(changes.has('items.0.quantity')).toBe(true);
    expect(changes.has('items.1.quantity')).toBe(true);
    expect(changes.has('items.0.price')).toBe(false);
  });

  it('event form — nullable dates, all-or-nothing baseline', () => {
    const schema = z.object({
      title: z.string().min(3),
      startDate: z.date(),
      endDate: z.date().nullable().default(null),
      location: z.string().optional(),
      maxAttendees: z.number().min(1).default(50),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ title: 'Meetup' });
    const { baseline, errors, changes } = buildShell(map, input);

    // Defaults
    expect((input as any).endDate).toBe(null);
    expect((input as any).maxAttendees).toBe(50);

    // Baseline
    expect(baseline.get('title')).toBe('Meetup');
    expect(baseline.get('endDate')).toBe(null);
    expect(baseline.get('maxAttendees')).toBe(50);

    // Errors on missing required
    expect(errors.has('startDate')).toBe(true);
    expect(errors.has('title')).toBe(false);
    expect(errors.has('endDate')).toBe(false);

    // Defaults are changes
    expect(changes.has('maxAttendees')).toBe(true);
    expect(changes.has('endDate')).toBe(true);
    expect(changes.has('title')).toBe(false);
  });

  it('settings form — nested defaults with user overrides', () => {
    const schema = z.object({
      notifications: z.object({
        email: z.boolean().default(true),
        sms: z.boolean().default(false),
        push: z.boolean().default(true),
      }),
      privacy: z.object({
        profileVisible: z.boolean().default(true),
        showEmail: z.boolean().default(false),
      }),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      notifications: { email: false },
    });
    const { baseline, errors, changes } = buildShell(map, input);

    // User override preserved
    expect((input as any).notifications.email).toBe(false);
    // Other defaults filled
    expect((input as any).notifications.sms).toBe(false);
    expect((input as any).notifications.push).toBe(true);
    expect((input as any).privacy.profileVisible).toBe(true);

    // Baseline captures the override, not the default
    expect(baseline.get('notifications.email')).toBe(false);
    expect(baseline.get('notifications.push')).toBe(true);

    // All booleans have values — no errors
    expect(errors.size).toBe(0);

    // Defaults are changes, user override is not
    expect(changes.has('notifications.sms')).toBe(true);
    expect(changes.has('notifications.push')).toBe(true);
    expect(changes.has('privacy.profileVisible')).toBe(true);
    expect(changes.has('privacy.showEmail')).toBe(true);
    expect(changes.has('notifications.email')).toBe(false);
  });

  it('contact form — mix of valid, invalid, and missing fields', () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      subject: z.string().min(5),
      message: z.string().min(20),
      priority: z.enum(['low', 'medium', 'high']).default('medium'),
    });

    const map = flattenSchemas(schema);
    const input = mutable({ name: 'A', email: 'user@test.com', subject: 'Hi' });
    const { baseline, errors, changes } = buildShell(map, input);

    // Default filled
    expect((input as any).priority).toBe('medium');

    // Baseline
    expect(baseline.get('name')).toBe('A');
    expect(baseline.get('email')).toBe('user@test.com');
    expect(baseline.get('priority')).toBe('medium');

    // name too short, subject too short, message missing
    expect(errors.has('name')).toBe(true);
    expect(errors.has('subject')).toBe(true);
    expect(errors.has('message')).toBe(true);
    expect(errors.has('email')).toBe(false);
    expect(errors.has('priority')).toBe(false);

    // Only priority was filled by default
    expect(changes.has('priority')).toBe(true);
    expect(changes.has('name')).toBe(false);
  });

  it('product catalog — nested variants with mixed valid/invalid items', () => {
    const schema = z.object({
      name: z.string().min(3),
      description: z.string().max(500).optional(),
      price: z.number().min(0),
      currency: z.enum(['USD', 'EUR']).default('USD'),
      variants: z.array(
        z.object({
          sku: z.string().min(3),
          color: z.string(),
          stock: z.number().min(0).default(0),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      name: 'Hoodie',
      price: 49.99,
      variants: [
        { sku: 'HOD-BLK', color: 'Black', stock: 25 },
        { sku: 'HO', color: 'White' },
      ],
    });
    const { baseline, errors, changes } = buildShell(map, input);

    // Top-level default
    expect((input as any).currency).toBe('USD');

    // Variant defaults
    expect((input.variants[1] as any).stock).toBe(0);

    // Baseline
    expect(baseline.get('name')).toBe('Hoodie');
    expect(baseline.get('currency')).toBe('USD');
    expect(baseline.get('variants.0.stock')).toBe(25);
    expect(baseline.get('variants.1.stock')).toBe(0);

    // First variant valid, second has short sku
    expect(errors.has('variants.0.sku')).toBe(false);
    expect(errors.has('variants.1.sku')).toBe(true);
    expect(errors.has('name')).toBe(false);
    expect(errors.has('price')).toBe(false);

    // currency + second variant stock are changes
    expect(changes.has('currency')).toBe(true);
    expect(changes.has('variants.1.stock')).toBe(true);
    expect(changes.has('variants.0.stock')).toBe(false);
    expect(changes.has('name')).toBe(false);
  });
});

describe('branch coverage', () => {
  it('throws when input is not mutable', () => {
    const schema = z.object({ name: z.string() });
    const map = flattenSchemas(schema);

    expect(() => buildShell(map, { name: 'test' })).toThrow('buildShell requires a mutable object.');
  });

  it('skips object/array types in array template fill and validation', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          name: z.string(),
          meta: z.object({
            note: z.string().default('n/a'),
          }),
          labels: z.array(z.string()).default(['default']),
        })
      ),
    });

    const map = flattenSchemas(schema);
    const input = mutable({
      items: [{ name: 'A' }, { name: 'B' }],
    });

    const { errors } = buildShell(map, input);

    expect((input.items[0] as any).meta.note).toBe('n/a');
    expect((input.items[1] as any).meta.note).toBe('n/a');
    expect((input.items[0] as any).labels).toBeUndefined();
    expect((input.items[1] as any).labels).toBeUndefined();
  });
});
