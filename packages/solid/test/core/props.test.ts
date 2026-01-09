import { mutable } from '@anchorlib/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BindingRef } from '../../src/binding.js';
import { omitProps, pickProps, proxyProps } from '../../src/props.js';

describe('Anchor Solid - Props API', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('proxyProps', () => {
    describe('basic functionality', () => {
      it('should create a proxy that wraps the original object', () => {
        const original = { name: 'test', count: 42 };
        const proxied = proxyProps(original);

        expect(proxied.name).toBe('test');
        expect(proxied.count).toBe(42);
      });

      it('should resolve BindingRef values on get', () => {
        const bindingRef = new BindingRef({ value: 100 }, 'value');
        const props = { value: bindingRef };
        const proxied = proxyProps(props);

        expect(proxied.value).toBe(100);
        expect(proxied.value).toBe(bindingRef.value);
      });

      it('should handle setting values on BindingRef', () => {
        const source = { count: 10 };
        const bindingRef = new BindingRef(source, 'count');
        const props = { value: bindingRef };
        const proxied = proxyProps(props);

        expect(proxied.value).toBe(10);

        proxied.value = 20;
        expect(source.count).toBe(20);
        expect(bindingRef.value).toBe(20);
      });

      it('should preserve $omit and $pick methods', () => {
        const props = { name: 'test', age: 30 };
        const proxied = proxyProps(props);

        expect(typeof proxied.$omit).toBe('function');
        expect(typeof proxied.$pick).toBe('function');
      });
    });

    describe('event handler protection', () => {
      it('should throw an error when trying to set event handler properties', () => {
        vi.useFakeTimers();

        const props = { onClick: () => {}, name: 'test' };
        const proxied = proxyProps(props);

        expect(() => {
          // @ts-ignore
          proxied.onClick = () => {};
        }).not.toThrow(); // The function returns true but logs an error

        vi.runAllTimers();

        // Check that the value wasn't changed
        expect(proxied.onClick).toBe(props.onClick);
        expect(errorSpy).toHaveBeenCalled();

        vi.useRealTimers();
      });

      it('should allow setting non-event handler properties', () => {
        const props = { name: 'test', onClick: () => {} };
        const proxied = proxyProps(props);

        // @ts-ignore
        proxied.name = 'updated';
        expect(proxied.name).toBe('updated');
      });
    });

    describe('MutableRef handling', () => {
      it('should handle MutableRef values', () => {
        const mutableRef = mutable(42);
        const props = { value: mutableRef };
        const proxied = proxyProps(props);

        expect(proxied.value).toBe(42);

        proxied.value = 100;
        expect(mutableRef.value).toBe(100);
      });
    });
  });

  describe('omitProps', () => {
    it('should create a proxy that omits specified keys', () => {
      const source = { name: 'test', age: 30, email: 'test@example.com' };
      const props = proxyProps(source);
      const omitted = { ...omitProps(source, props, ['email']) };

      expect(omitted.name).toBe('test');
      expect(omitted.age).toBe(30);
      // @ts-expect-error - email should be omitted
      expect(omitted.email).toBeUndefined();

      // Test that the keys are filtered in ownKeys
      const keys = Object.keys(omitted);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).not.toContain('email');
    });

    it('should work with empty excludes array', () => {
      const source = { name: 'test', age: 30 };
      const props = proxyProps(source);
      const omitted = { ...omitProps(source, props, []) };

      expect(omitted.name).toBe('test');
      expect(omitted.age).toBe(30);

      const keys = Object.keys(omitted);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
    });

    it('should still allow setting values on omitted proxy', () => {
      const source = { name: 'test', age: 30 };
      const props = proxyProps(source);
      const omitted = omitProps(source, props, []);

      omitted.name = 'updated';
      expect(omitted.name).toBe('updated');
      expect(source.name).toBe('updated');
    });
  });

  describe('pickProps', () => {
    it('should create a proxy that includes only specified keys', () => {
      const source = { name: 'test', age: 30, email: 'test@example.com' };
      const props = proxyProps(source);
      const picked = { ...pickProps(source, props, ['name', 'age']) };

      expect(picked.name).toBe('test');
      expect(picked.age).toBe(30);
      // @ts-expect-error - email should not be in the picked object
      expect(picked.email).toBeUndefined();

      const keys = Object.keys(picked);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).not.toContain('email');
    });

    it('should work with empty includes array', () => {
      const source = { name: 'test', age: 30 };
      const props = proxyProps(source);
      const picked = { ...pickProps(source, props, []) };

      const keys = Object.keys(picked);
      expect(keys.length).toBe(0);
    });

    it('should still allow setting values on picked proxy', () => {
      const source = { name: 'test', age: 30 };
      const props = proxyProps(source);
      const picked = pickProps(source, props, ['name']);

      picked.name = 'updated';
      expect(picked.name).toBe('updated');
      expect(source.name).toBe('updated');
    });
  });

  describe('integration with $omit and $pick methods', () => {
    it('should work with the $omit method on proxied props', () => {
      const props = { name: 'test', age: 30, email: 'test@example.com' };
      const proxied = proxyProps(props);

      const omitted = { ...proxied.$omit(['email']) };
      expect(omitted.name).toBe('test');
      expect(omitted.age).toBe(30);
      // @ts-expect-error - email should not be in the picked object
      expect(omitted.email).toBeUndefined();

      const keys = Object.keys(omitted);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).not.toContain('email');

      expect(() => {
        proxied.$omit();
      }).not.toThrow();
    });

    it('should work with the $pick method on proxied props', () => {
      const props = { name: 'test', age: 30, email: 'test@example.com' };
      const proxied = proxyProps(props);

      const picked = { ...proxied.$pick(['name', 'age']) };
      expect(picked.name).toBe('test');
      expect(picked.age).toBe(30);
      // @ts-expect-error - email should not be in the picked object
      expect(picked.email).toBeUndefined();

      const keys = Object.keys(picked);
      expect(keys).toContain('name');
      expect(keys).toContain('age');
      expect(keys).not.toContain('email');

      expect(() => {
        proxied.$pick();
      }).not.toThrow();
    });
  });
});
