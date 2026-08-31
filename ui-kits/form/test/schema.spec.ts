import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { flattenSchemas } from '../src/schema.js';

describe('flattenSchemas', () => {
  it('flattens a user profile with required and optional fields', () => {
    const schema = z.object({
      name: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
    });

    const map = flattenSchemas(schema);

    // Paths exist
    expect(map.has('name')).toBe(true);
    expect(map.has('email')).toBe(true);
    expect(map.has('phone')).toBe(true);

    // Required detection
    expect(map.get('name')!.required).toBe(true);
    expect(map.get('email')!.required).toBe(true);
    expect(map.get('phone')!.required).toBe(false);

    // Validation works through shape
    expect(map.get('name')!.shape.safeParse('').success).toBe(false);
    expect(map.get('name')!.shape.safeParse('Alice').success).toBe(true);
    expect(map.get('email')!.shape.safeParse('bad').success).toBe(false);
    expect(map.get('email')!.shape.safeParse('user@test.com').success).toBe(true);
  });

  it('flattens nested objects with dot-path access', () => {
    const schema = z.object({
      address: z.object({
        street: z.string(),
        city: z.string(),
        zip: z.string().min(5),
      }),
    });

    const map = flattenSchemas(schema);

    // Parent and children exist
    expect(map.get('address')!.type).toBe('object');
    expect(map.has('address.street')).toBe(true);
    expect(map.has('address.city')).toBe(true);
    expect(map.has('address.zip')).toBe(true);

    // Nested validation works
    expect(map.get('address.zip')!.shape.safeParse('123').success).toBe(false);
    expect(map.get('address.zip')!.shape.safeParse('10001').success).toBe(true);
  });

  it('flattens arrays with $ wildcard and validates elements', () => {
    const schema = z.object({
      tags: z.array(z.string().min(1)),
    });

    const map = flattenSchemas(schema);

    expect(map.get('tags')!.type).toBe('array');
    expect(map.get('tags.$')!.type).toBe('string');

    // Element validation works
    expect(map.get('tags.$')!.shape.safeParse('').success).toBe(false);
    expect(map.get('tags.$')!.shape.safeParse('admin').success).toBe(true);
  });

  it('flattens array of objects with nested validation', () => {
    const schema = z.object({
      items: z.array(
        z.object({
          product: z.string(),
          quantity: z.number().min(1),
          price: z.number().min(0),
        })
      ),
    });

    const map = flattenSchemas(schema);

    expect(map.get('items')!.type).toBe('array');
    expect(map.get('items.$')!.type).toBe('object');
    expect(map.has('items.$.product')).toBe(true);
    expect(map.has('items.$.quantity')).toBe(true);

    // Nested array element validation
    expect(map.get('items.$.quantity')!.shape.safeParse(0).success).toBe(false);
    expect(map.get('items.$.quantity')!.shape.safeParse(3).success).toBe(true);
  });

  it('flattens nested arrays (sections → fields)', () => {
    const schema = z.object({
      sections: z.array(
        z.object({
          title: z.string(),
          fields: z.array(z.string()),
        })
      ),
    });

    const map = flattenSchemas(schema);

    expect(map.get('sections')!.type).toBe('array');
    expect(map.get('sections.$')!.type).toBe('object');
    expect(map.get('sections.$.fields')!.type).toBe('array');
    expect(map.get('sections.$.fields.$')!.type).toBe('string');
  });

  it('unwraps .default() and produces defaults via builder', () => {
    const schema = z.object({
      role: z.string().default('user'),
      active: z.boolean().default(true),
      tags: z.array(z.string()).default(['new_user']),
    });

    const map = flattenSchemas(schema);

    // Type is the inner type, not ZodDefault
    expect(map.get('role')!.type).toBe('string');
    expect(map.get('active')!.type).toBe('boolean');
    expect(map.get('tags')!.type).toBe('array');

    // builder.safeParse(undefined) produces defaults
    expect(map.get('role')!.builder.safeParse(undefined).data).toBe('user');
    expect(map.get('active')!.builder.safeParse(undefined).data).toBe(true);
    expect(map.get('tags')!.builder.safeParse(undefined).data).toEqual(['new_user']);
  });

  it('unwraps .nullable() and validates null', () => {
    const schema = z.object({
      avatar: z.string().nullable(),
      deletedAt: z.date().nullable(),
    });

    const map = flattenSchemas(schema);

    expect(map.get('avatar')!.type).toBe('string');
    expect(map.get('deletedAt')!.type).toBe('date');

    // Nullable fields accept null through builder
    expect(map.get('avatar')!.builder.safeParse(null).success).toBe(true);
    expect(map.get('avatar')!.builder.safeParse('url').success).toBe(true);
  });

  it('unwraps .refine() and preserves validation', () => {
    const schema = z.object({
      age: z.number().refine((n) => n >= 18, 'Must be 18+'),
    });

    const map = flattenSchemas(schema);

    expect(map.get('age')!.type).toBe('number');

    // builder carries the full chain — refine validation included
    expect(map.get('age')!.builder.safeParse(10).success).toBe(false);
    expect(map.get('age')!.builder.safeParse(25).success).toBe(true);

    // shape validates raw type
    expect(map.get('age')!.shape.safeParse('text').success).toBe(false);
    expect(map.get('age')!.shape.safeParse(30).success).toBe(true);
  });

  it('unwraps .transform() and validates input', () => {
    const schema = z.object({
      slug: z.string().transform((s) => s.toLowerCase().replace(/\s+/g, '-')),
    });

    const map = flattenSchemas(schema);

    expect(map.get('slug')!.type).toBe('string');

    // shape validates input, not output
    expect(map.get('slug')!.shape.safeParse('Hello World').success).toBe(true);
    expect(map.get('slug')!.shape.safeParse(42).success).toBe(false);
  });

  it('handles z.enum() with validation', () => {
    const schema = z.object({
      status: z.enum(['active', 'inactive', 'pending']),
      role: z.enum(['admin', 'user']).default('user'),
    });

    const map = flattenSchemas(schema);

    expect(map.has('status')).toBe(true);
    expect(map.get('status')!.required).toBe(true);

    // Validates against defined values
    expect(map.get('status')!.shape.safeParse('active').success).toBe(true);
    expect(map.get('status')!.shape.safeParse('invalid').success).toBe(false);

    // Default via builder
    expect(map.get('role')!.builder.safeParse(undefined).data).toBe('user');
  });

  it('handles z.union() with validation', () => {
    const schema = z.object({
      value: z.union([z.string(), z.number()]),
    });

    const map = flattenSchemas(schema);

    expect(map.has('value')).toBe(true);

    // Accepts any branch
    expect(map.get('value')!.shape.safeParse('hello').success).toBe(true);
    expect(map.get('value')!.shape.safeParse(42).success).toBe(true);
    expect(map.get('value')!.shape.safeParse(true).success).toBe(false);
  });

  it('handles z.literal() fields', () => {
    const schema = z.object({
      type: z.literal('user'),
      version: z.literal(2),
    });

    const map = flattenSchemas(schema);

    expect(map.get('type')!.shape.safeParse('user').success).toBe(true);
    expect(map.get('type')!.shape.safeParse('admin').success).toBe(false);
    expect(map.get('version')!.shape.safeParse(2).success).toBe(true);
    expect(map.get('version')!.shape.safeParse(3).success).toBe(false);
  });

  it('handles a realistic registration form', () => {
    const schema = z.object({
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email(),
      phone: z.string().optional(),
      password: z.string().min(8),
      address: z.object({
        line1: z.string(),
        line2: z.string().optional(),
        city: z.string(),
        state: z.string(),
        zip: z.string().min(5),
      }),
      roles: z.array(z.string()).default(['viewer']),
      preferences: z.object({
        newsletter: z.boolean().default(false),
        theme: z.enum(['light', 'dark', 'auto']).default('auto'),
      }),
    });

    const map = flattenSchemas(schema);

    // Required vs optional
    expect(map.get('firstName')!.required).toBe(true);
    expect(map.get('phone')!.required).toBe(false);
    expect(map.get('address.line2')!.required).toBe(false);

    // Nested validation
    expect(map.get('address.zip')!.shape.safeParse('123').success).toBe(false);
    expect(map.get('address.zip')!.shape.safeParse('10001').success).toBe(true);

    // Defaults
    expect(map.get('roles')!.builder.safeParse(undefined).data).toEqual(['viewer']);
    expect(map.get('preferences.theme')!.builder.safeParse(undefined).data).toBe('auto');
    expect(map.get('preferences.newsletter')!.builder.safeParse(undefined).data).toBe(false);

    // Array elements
    expect(map.get('roles.$')!.type).toBe('string');

    // Total paths: firstName, lastName, email, phone, password, address,
    // address.line1, address.line2, address.city, address.state, address.zip,
    // roles, roles.$, preferences, preferences.newsletter, preferences.theme = 16
    expect(map.size).toBe(16);
  });

  it('unwraps chained wrappers: optional → default', () => {
    const schema = z.object({
      nickname: z.string().optional().default('Anonymous'),
    });

    const map = flattenSchemas(schema);

    expect(map.get('nickname')!.type).toBe('string');
    expect(map.get('nickname')!.builder.safeParse(undefined).data).toBe('Anonymous');
  });

  it('unwraps chained wrappers: nullable → optional', () => {
    const schema = z.object({
      deletedAt: z.date().nullable().optional(),
    });

    const map = flattenSchemas(schema);

    expect(map.get('deletedAt')!.type).toBe('date');
    expect(map.get('deletedAt')!.required).toBe(false);
    expect(map.get('deletedAt')!.builder.safeParse(null).success).toBe(true);
    expect(map.get('deletedAt')!.builder.safeParse(undefined).success).toBe(true);
  });

  it('handles optional object (entire section optional)', () => {
    const schema = z.object({
      billing: z
        .object({
          cardNumber: z.string(),
          expiry: z.string(),
        })
        .optional(),
    });

    const map = flattenSchemas(schema);

    expect(map.get('billing')!.type).toBe('object');
    expect(map.get('billing')!.required).toBe(false);
    expect(map.has('billing.cardNumber')).toBe(true);
    expect(map.has('billing.expiry')).toBe(true);
  });

  it('handles optional array', () => {
    const schema = z.object({
      attachments: z.array(z.string()).optional(),
    });

    const map = flattenSchemas(schema);

    expect(map.get('attachments')!.type).toBe('array');
    expect(map.get('attachments')!.required).toBe(false);
    expect(map.get('attachments.$')!.type).toBe('string');
  });

  it('handles empty object schema', () => {
    const schema = z.object({});
    const map = flattenSchemas(schema);
    expect(map.size).toBe(0);
  });

  it('flattens deeply nested paths (4+ levels)', () => {
    const schema = z.object({
      company: z.object({
        headquarters: z.object({
          address: z.object({
            zip: z.string().min(5),
          }),
        }),
      }),
    });

    const map = flattenSchemas(schema);

    expect(map.has('company.headquarters.address.zip')).toBe(true);
    expect(map.get('company.headquarters.address.zip')!.shape.safeParse('123').success).toBe(false);
    expect(map.get('company.headquarters.address.zip')!.shape.safeParse('10001').success).toBe(true);
  });

  it('returns undefined for non-existent paths', () => {
    const schema = z.object({ name: z.string() });
    const map = flattenSchemas(schema);

    expect(map.get('nonexistent')).toBeUndefined();
    expect(map.get('name.deep.path')).toBeUndefined();
  });

  it('preserves .min/.max/.email through optional/default/nullable chains', () => {
    const schema = z.object({
      // validators + optional
      username: z.string().min(3).max(20).optional(),
      // validators + default
      email: z.string().email().default('user@example.com'),
      // validators + nullable + optional
      bio: z.string().min(10).max(500).nullable().optional(),
      // number validators + default
      age: z.number().min(18).max(120).default(18),
      // array with validated elements + default
      tags: z.array(z.string().min(1)).default(['general']),
    });

    const map = flattenSchemas(schema);

    // username: min(3), max(20) survive .optional()
    const username = map.get('username')!;
    expect(username.required).toBe(false);
    expect(username.shape.safeParse('ab').success).toBe(false);
    expect(username.shape.safeParse('alice').success).toBe(true);
    expect(username.shape.safeParse('a'.repeat(21)).success).toBe(false);

    // email: .email() survives .default()
    const email = map.get('email')!;
    expect(email.shape.safeParse('not-an-email').success).toBe(false);
    expect(email.shape.safeParse('valid@test.com').success).toBe(true);
    expect(email.builder.safeParse(undefined).data).toBe('user@example.com');

    // bio: min(10), max(500) survive .nullable().optional()
    const bio = map.get('bio')!;
    expect(bio.required).toBe(false);
    expect(bio.shape.safeParse('short').success).toBe(false);
    expect(bio.shape.safeParse('a long enough biography text').success).toBe(true);
    expect(bio.builder.safeParse(null).success).toBe(true);

    // age: min(18), max(120) survive .default()
    const age = map.get('age')!;
    expect(age.shape.safeParse(10).success).toBe(false);
    expect(age.shape.safeParse(25).success).toBe(true);
    expect(age.shape.safeParse(200).success).toBe(false);
    expect(age.builder.safeParse(undefined).data).toBe(18);

    // tags.$: min(1) survives array + default
    const tagElement = map.get('tags.$')!;
    expect(tagElement.shape.safeParse('').success).toBe(false);
    expect(tagElement.shape.safeParse('valid').success).toBe(true);
  });

  it('preserves .refine() validation through wrapper chains', () => {
    const schema = z.object({
      // Required password with refine — passwords are never optional
      password: z
        .string()
        .min(8)
        .refine((s) => /[A-Z]/.test(s) && /[0-9]/.test(s), 'Must contain uppercase and number'),
      // Optional website with url validation
      website: z
        .string()
        .url()
        .refine((s) => s.startsWith('https://'), 'Must use HTTPS')
        .optional(),
    });

    const map = flattenSchemas(schema);

    // Password: required, refine + min(8) enforced
    const pw = map.get('password')!;
    expect(pw.required).toBe(true);
    expect(pw.builder.safeParse('short').success).toBe(false);
    expect(pw.builder.safeParse('longbutnouppercaseornumber').success).toBe(false);
    expect(pw.builder.safeParse('Valid1Password').success).toBe(true);

    // Website: optional, url + refine enforced when provided
    const web = map.get('website')!;
    expect(web.required).toBe(false);
    expect(web.builder.safeParse(undefined).success).toBe(true);
    expect(web.builder.safeParse('http://example.com').success).toBe(false);
    expect(web.builder.safeParse('https://example.com').success).toBe(true);
  });

  it('flattens registration schema with confirm fields', () => {
    const schema = z.object({
      email: z.string().email(),
      confirmEmail: z.string().email(),
      password: z.string().min(8),
      confirmPassword: z.string().min(8),
    });

    const map = flattenSchemas(schema);

    // All four fields exist independently
    expect(map.size).toBe(4);
    expect(map.get('email')!.required).toBe(true);
    expect(map.get('confirmEmail')!.required).toBe(true);
    expect(map.get('password')!.required).toBe(true);
    expect(map.get('confirmPassword')!.required).toBe(true);

    // Each field validates independently
    expect(map.get('email')!.shape.safeParse('bad').success).toBe(false);
    expect(map.get('email')!.shape.safeParse('user@test.com').success).toBe(true);
    expect(map.get('confirmEmail')!.shape.safeParse('user@test.com').success).toBe(true);
    expect(map.get('password')!.shape.safeParse('short').success).toBe(false);
    expect(map.get('password')!.shape.safeParse('longEnough1').success).toBe(true);
  });

  it('handles object-level .refine() without losing fields', () => {
    const schema = z
      .object({
        start: z.date(),
        end: z.date(),
      })
      .refine((data) => data.end > data.start, 'End must be after start');

    const map = flattenSchemas(schema);

    // Even with object-level refine, individual fields are still flattened
    expect(map.has('start')).toBe(true);
    expect(map.has('end')).toBe(true);
    expect(map.get('start')!.type).toBe('date');
    expect(map.get('end')!.type).toBe('date');
  });

  it('flattens e-commerce product form with mixed types', () => {
    const schema = z.object({
      title: z.string().min(3).max(100),
      description: z.string().max(2000).optional(),
      price: z.number().min(0),
      currency: z.enum(['USD', 'EUR', 'GBP']).default('USD'),
      inStock: z.boolean().default(true),
      publishedAt: z.date().nullable(),
      images: z.array(z.string().url()),
      variants: z.array(
        z.object({
          sku: z.string(),
          size: z.enum(['S', 'M', 'L', 'XL']),
          stock: z.number().min(0).default(0),
        })
      ),
    });

    const map = flattenSchemas(schema);

    // Every field path exists
    expect(map.has('title')).toBe(true);
    expect(map.has('description')).toBe(true);
    expect(map.has('price')).toBe(true);
    expect(map.has('currency')).toBe(true);
    expect(map.has('inStock')).toBe(true);
    expect(map.has('publishedAt')).toBe(true);
    expect(map.has('images')).toBe(true);
    expect(map.has('images.$')).toBe(true);
    expect(map.has('variants')).toBe(true);
    expect(map.has('variants.$')).toBe(true);
    expect(map.has('variants.$.sku')).toBe(true);
    expect(map.has('variants.$.size')).toBe(true);
    expect(map.has('variants.$.stock')).toBe(true);

    // Required vs optional
    expect(map.get('title')!.required).toBe(true);
    expect(map.get('description')!.required).toBe(false);

    // Validation survives wrappers
    expect(map.get('title')!.shape.safeParse('ab').success).toBe(false);
    expect(map.get('price')!.shape.safeParse(-1).success).toBe(false);
    expect(map.get('images.$')!.shape.safeParse('not-a-url').success).toBe(false);
    expect(map.get('images.$')!.shape.safeParse('https://cdn.example.com/img.png').success).toBe(true);

    // Defaults
    expect(map.get('currency')!.builder.safeParse(undefined).data).toBe('USD');
    expect(map.get('inStock')!.builder.safeParse(undefined).data).toBe(true);
    expect(map.get('variants.$.stock')!.builder.safeParse(undefined).data).toBe(0);

    // Nullable
    expect(map.get('publishedAt')!.builder.safeParse(null).success).toBe(true);
  });
});

describe('branch coverage', () => {
  it('handles root-level ZodArray (unwrap with no path)', () => {
    const arraySchema = z.array(z.string());
    const map = flattenSchemas(arraySchema as any);

    expect(map.has('$')).toBe(true);
    expect(map.get('$')!.type).toBe('string');
  });
});
