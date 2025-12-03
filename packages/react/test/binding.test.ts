import { mutable, type MutableRef } from '@anchorlib/core';
import { describe, expect, it } from 'vitest';
import { bind, bindable, BindingRef, isBindable, isBinding } from '../src/binding';

describe('Anchor React - Binding', () => {
  describe('BindingRef', () => {
    it('should create a binding reference with default key', () => {
      const source = { value: 'test' };
      const binding = new BindingRef(source);

      expect(binding.source).toBe(source);
      expect(binding.key).toBe('value');
    });

    it('should create a binding reference with custom key', () => {
      const source = { custom: 'test' };
      const binding = new BindingRef(source, 'custom');

      expect(binding.source).toBe(source);
      expect(binding.key).toBe('custom');
    });

    it('should create a binding reference with type', () => {
      const source = { value: 'test' };
      const binding = new BindingRef(source, 'value', 'string');

      expect(binding.source).toBe(source);
      expect(binding.key).toBe('value');
      expect(binding.type).toBe('string');
    });
  });

  describe('bind', () => {
    it('should create a binding reference to MutableRef source', () => {
      const source = mutable('test');
      const result = bind(source);

      expect(result).toBeInstanceOf(BindingRef);
    });

    it('should create a binding reference to object property', () => {
      const source = { value: 'test' };
      const result = bind(source, 'value');

      expect(result).toBeInstanceOf(BindingRef);
    });
  });

  describe('isBinding', () => {
    it('should return true for BindingRef instances', () => {
      const binding = new BindingRef({});
      expect(isBinding(binding)).toBe(true);
    });

    it('should return false for non-BindingRef values', () => {
      expect(isBinding({})).toBe(false);
      expect(isBinding(null)).toBe(false);
      expect(isBinding(undefined)).toBe(false);
      expect(isBinding('string')).toBe(false);
    });
  });

  describe('bindable', () => {
    it('should create a bindable reference with initial value to MutableRef', () => {
      const source = mutable('initial');
      const bindableRef = bindable('test', source);

      expect(bindableRef.value).toBe('initial'); // Takes value from source, not init
      expect(source.value).toBe('initial');
    });

    it('should sync value to mutable source', () => {
      const source = mutable('initial');
      const bindableRef = bindable('test', source);

      bindableRef.value = 'updated';

      expect(source.value).toBe('updated');
    });

    it('should sync value to mutable source with key', () => {
      const source = mutable('initial');
      const bindableRef = bindable('test', source, 'value');

      bindableRef.value = 'updated';

      expect(source.value).toBe('updated');
    });

    it('should create a bindable reference to object property', () => {
      const source = { value: 'initial' };
      const bindableRef = bindable('test', source, 'value');

      expect(bindableRef.value).toBe('initial'); // Takes value from source, not init
      expect(source.value).toBe('initial');
    });

    it('should sync value to object property', () => {
      const source = { value: 'initial' };
      const bindableRef = bindable('test', source, 'value');

      bindableRef.value = 'updated';

      expect(source.value).toBe('updated');
    });

    it('should use init as fallback when object property is undefined', () => {
      const source = { value: undefined } as never as MutableRef<string>;
      const bindableRef = bindable('fallback', source, 'value');

      expect(bindableRef.value).toBe('fallback');
      expect(source.value).toBeUndefined(); // init value is used to set the source
    });

    it('should use init as fallback when MutableRef source is undefined', () => {
      const source = mutable(undefined);
      const bindableRef = bindable('fallback', source);

      expect(bindableRef.value).toBe('fallback');
      expect(source.value).toBeUndefined(); // init value is used to set the source
    });

    it('should destroy cleanly', () => {
      const source = mutable('initial');
      const bindableRef = bindable('test', source);

      expect(() => bindableRef.destroy()).not.toThrow();
    });
  });

  describe('isBindable', () => {
    it('should return true for BindableRef instances', () => {
      const source = { value: 'initial' };
      const binding = new BindingRef(source, 'value');
      const bindableRef = bindable('test', binding);
      expect(isBindable(bindableRef)).toBe(true);
    });

    it('should return false for non-BindableRef values', () => {
      expect(isBindable({})).toBe(false);
      expect(isBindable(null)).toBe(false);
      expect(isBindable(undefined)).toBe(false);
      expect(isBindable('string')).toBe(false);
    });
  });
});
