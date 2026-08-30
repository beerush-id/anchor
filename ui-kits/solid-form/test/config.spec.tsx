/** @jsxImportSource solid-js */

import { describe, expect, it } from 'vitest';
import { configureForm, FORM_OPTIONS, getSpecificOptions } from '../src/config.js';

describe('config', () => {
  it('should configure form options', () => {
    configureForm({
      form: { class: 'custom-form-class' },
      textInput: { errorClass: 'custom-text-err' },
    });
    expect(FORM_OPTIONS.class).toBe('custom-form-class');
  });

  it('should handle configureForm with empty options', () => {
    configureForm({});
    expect(FORM_OPTIONS.class).toBeDefined();
  });

  it('should return null options for unknown type', () => {
    const { options, keys } = getSpecificOptions('unknown-type');
    expect(options).toBeNull();
    expect(keys).toEqual([]);
  });

  it('should return options for specific input types', () => {
    expect(getSpecificOptions('email').options).toBeDefined();
    expect(getSpecificOptions('number').options).toBeDefined();
    expect(getSpecificOptions('password').options).toBeDefined();
  });
});
