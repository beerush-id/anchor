import { describe, expect, it } from 'vitest';
import { configureForm, FORM_OPTIONS, FIELD_OPTIONS, getSpecificOptions } from '../src/config.js';

describe('config', () => {
  it('should apply partial configurations to default options', () => {
    configureForm({
      form: { class: 'custom-form', errorClass: 'form-err' },
      field: { class: 'custom-field', labelClass: 'custom-label' },
    });

    expect(FORM_OPTIONS.class).toBe('custom-form');
    expect(FORM_OPTIONS.errorClass).toBe('form-err');

    expect(FIELD_OPTIONS.class).toBe('custom-field');
    expect(FIELD_OPTIONS.labelClass).toBe('custom-label');
  });

  it('should handle empty configuration safely', () => {
    configureForm({});
    expect(FORM_OPTIONS).toBeDefined();
  });

  it('should return default fallback for unsupported input type', () => {
    const { options, keys } = getSpecificOptions('unsupported-type');

    expect(options).toBeNull();
    expect(keys).toEqual([]);
  });
});
