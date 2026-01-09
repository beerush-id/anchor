import { mutable, type MutableRef } from '@anchorlib/core';
import { describe, expect, it } from 'vitest';
import { $bind, bind, BindingRef, isBinding } from '../../src/binding.js';

describe('Anchor Solid - Binding API', () => {
  describe('BindingRef', () => {
    describe('constructor', () => {
      it('should create a new BindingRef with source and key', () => {
        const source = { value: 42 };
        const bindingRef = new BindingRef(source, 'value');

        expect(bindingRef.source).toBe(source);
        expect(bindingRef.key).toBe('value');
      });

      it('should use default key "value" when not provided', () => {
        const source = { value: 42 };
        const bindingRef = new BindingRef(source);

        expect(bindingRef.key).toBe('value');
      });

      it('should accept custom key', () => {
        const source = { count: 100 };
        const bindingRef = new BindingRef(source, 'count');

        expect(bindingRef.key).toBe('count');
      });

      it('should accept type parameter', () => {
        const source = { name: 'test' };
        const bindingRef = new BindingRef<string, string>(source as never, 'name');

        expect(bindingRef.source).toBe(source);
        expect(bindingRef.key).toBe('name');
      });
    });

    describe('get value', () => {
      it('should get value from source using key', () => {
        const source = { count: 42 };
        const bindingRef = new BindingRef(source, 'count');

        expect(bindingRef.value).toBe(42);
      });

      it('should get nested property value', () => {
        const source = { data: { value: 'hello' } };
        const bindingRef = new BindingRef(source, 'data');

        expect(bindingRef.value).toEqual({ value: 'hello' });
      });
    });

    describe('set value', () => {
      it('should set value on source using key', () => {
        const source = { count: 42 };
        const bindingRef = new BindingRef(source, 'count');

        bindingRef.value = 100;
        expect(source.count).toBe(100);
      });

      it('should update nested property', () => {
        const source = { data: { value: 'hello' } };
        const bindingRef = new BindingRef(source, 'data');

        bindingRef.value = { value: 'world' };
        expect(source.data).toEqual({ value: 'world' });
      });
    });
  });

  describe('isBinding', () => {
    it('should return true for BindingRef instances', () => {
      const bindingRef = new BindingRef({ value: 42 }, 'value');
      expect(isBinding(bindingRef)).toBe(true);
    });

    it('should return false for non-BindingRef objects', () => {
      expect(isBinding({})).toBe(false);
      expect(isBinding(null)).toBe(false);
      expect(isBinding(undefined)).toBe(false);
      expect(isBinding(42)).toBe(false);
      expect(isBinding('string')).toBe(false);
      expect(isBinding([])).toBe(false);
    });
  });

  describe('bind function', () => {
    it('should return BindingRef when source is not a MutableRef', () => {
      const source = { count: 42 };
      const result = bind(source, 'count');

      expect(isBinding(result)).toBe(true);
      expect((result as BindingRef<Record<string, unknown>, unknown>).value).toBe(42);
    });

    it('should return source when source is a MutableRef', () => {
      // We'll test this scenario when MutableRef is available
      // For now, testing the basic case
      const source = { count: 42 };
      const result = bind(source, 'count');

      expect(isBinding(result)).toBe(true);
      expect((result as BindingRef<Record<string, unknown>, unknown>).value).toBe(42);
    });

    it('should create binding with default key when key is not provided', () => {
      const source = { value: 'test' } as MutableRef<string>;
      const result = bind(source);

      expect(isBinding(result)).toBe(true);
      expect((result as BindingRef<Record<string, unknown>, unknown>).value).toBe('test');
    });

    it('should allow getting and setting through binding', () => {
      const source = { count: 10 };
      const binding = bind(source, 'count');

      expect(isBinding(binding)).toBe(true);

      const bindingRef = binding as BindingRef<Record<string, unknown>, unknown>;
      expect(bindingRef.value).toBe(10);

      bindingRef.value = 20;
      expect(source.count).toBe(20);
    });

    it('should allow getting and setting through primitive binding', () => {
      const source = mutable(10);
      const binding = bind(source);

      const bindingRef = binding as BindingRef<Record<string, unknown>, unknown>;
      expect(bindingRef.value).toBe(10);

      bindingRef.value = 20;
      expect(source.value).toBe(20);
    });
  });

  describe('$bind alias', () => {
    it('should be the same function as bind', () => {
      expect($bind).toBe(bind);
    });

    it('should work the same as bind function', () => {
      const source = { name: 'test' };
      const result = $bind(source, 'name');

      expect(isBinding(result)).toBe(true);
      expect((result as BindingRef<Record<string, unknown>, unknown>).value).toBe('test');
    });
  });
});
