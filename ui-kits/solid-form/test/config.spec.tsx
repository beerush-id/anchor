/** @jsxImportSource solid-js */

import { describe, expect, it } from 'vitest';
import { configureForm, FIELD_OPTIONS, FORM_OPTIONS, getInputClasses, getSpecificOptions } from '../src/config.js';

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

    configureForm({
      form: { class: 'air-form', errorClass: 'air-form-error' },
      field: { class: 'air-form-field', labelClass: 'air-form-field-label' },
    });
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

  it('should fallback to global input classes when specific options are empty', () => {
    const { baseClass, errorClass } = getInputClasses({ class: '', errorClass: '' });

    expect(baseClass).toBe('air-text-input');
    expect(errorClass).toBe('air-text-input-error');
  });

  it('should prefer specific input classes over the global fallback', () => {
    const { baseClass, errorClass } = getInputClasses({ class: 'my-input', errorClass: 'my-input-error' });

    expect(baseClass).toBe('my-input');
    expect(errorClass).toBe('my-input-error');
  });
});
