import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  anchor,
  contextProvider,
  createContext,
  createRenderCtx,
  getAllContext,
  getContext,
  getRenderCtx,
  RenderContext,
  setContext,
  setRenderCtx,
  withContext,
} from '../../src/index.js';

describe('Anchor Utilities - Context', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal('window', {});

    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  describe('createContext', () => {
    it('should create an empty context when no initial values provided', () => {
      const context = createContext();
      expect(context).toBeInstanceOf(Map);
      expect(context.size).toBe(0);
      expect(anchor.has(context));
    });

    it('should create a context with initial values', () => {
      const context = createContext([
        ['key1', 'value1'],
        ['key2', 'value2'],
      ]);

      expect(context).toBeInstanceOf(Map);
      expect(context.size).toBe(2);
      expect(context.get('key1')).toBe('value1');
      expect(context.get('key2')).toBe('value2');
    });
  });

  describe('Context Store', () => {
    it('should handle error when running outside store', () => {
      withContext(null as never, () => {
        // Do nothing
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('Context Access', () => {
    it('should set and get context values when context is activated', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('key1', 'value1');
        setContext('key2', 42);

        expect(getContext('key1')).toBe('value1');
        expect(getContext('key2')).toBe(42);
      });
    });

    it('should return undefined for non-existent keys', () => {
      const context = createContext();
      withContext(context, () => {
        expect(getContext('nonexistent')).toBeUndefined();
      });
    });

    it('should handle different types of keys and values', () => {
      const context = createContext();
      withContext(context, () => {
        const symbolKey = Symbol('test');

        setContext('stringKey', 'stringValue');
        setContext(42, 'numericKey');
        setContext(symbolKey, { complex: 'object' });

        expect(getContext('stringKey')).toBe('stringValue');
        expect(getContext(42)).toBe('numericKey');
        expect(getContext(symbolKey)).toEqual({ complex: 'object' });
      });
    });

    it('should return the fallback value', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('fallback-1', 'value1');

        expect(getContext('fallback-1', 'fallback')).toBe('value1');
        expect(getContext('fallback-2', 'fallback')).toBe('fallback');
      });
    });
  });

  describe('Edge cases', () => {
    it('should get all context value', () => {
      expect(getAllContext()).toBeInstanceOf(Map);
    });

    it('should handle falsy values correctly', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('falsy', false);
        setContext('nullish', null);
        setContext('zero', 0);
        setContext('empty', '');

        expect(getContext('falsy')).toBe(false);
        expect(getContext('nullish')).toBe(null);
        expect(getContext('zero')).toBe(0);
        expect(getContext('empty')).toBe('');
      });
    });

    it('should handle setting the same key multiple times', () => {
      const context = createContext();
      withContext(context, () => {
        setContext('key', 'value1');
        expect(getContext('key')).toBe('value1');

        setContext('key', 'value2');
        expect(getContext('key')).toBe('value2');

        setContext('key', undefined);
        expect(getContext('key')).toBeUndefined();
      });
    });

    it('should handle large number of context entries', () => {
      const context = createContext();
      withContext(context, () => {
        // Add many entries
        for (let i = 0; i < 1000; i++) {
          setContext(`key${i}`, `value${i}`);
        }

        // Verify some entries
        expect(getContext('key0')).toBe('value0');
        expect(getContext('key500')).toBe('value500');
        expect(getContext('key999')).toBe('value999');
      });
    });

    it('should handle complex nested objects', () => {
      const context = createContext();

      withContext(context, () => {
        const complexObject = {
          nested: {
            array: [1, 2, { deep: 'value' }],
            date: new Date(),
            regex: /test/gi,
          },
          symbol: Symbol('test'),
        };

        setContext('complex', complexObject);
        const retrieved = getContext<typeof complexObject>('complex');

        expect(retrieved).toEqual(complexObject);
        expect(retrieved?.nested.array).toEqual(complexObject.nested.array);
      });
    });

    it('should run context provider', () => {
      setContext('provider-key', 'value1');
      const provide = contextProvider('provider-key', 'value2');

      expect(getContext('provider-key')).toBe('value1');
      provide(() => {
        expect(getContext('provider-key')).toBe('value2');
      });
    });
  });

  describe('RenderContext', () => {
    it('should create a RenderContext with default name', () => {
      const ctx = new RenderContext();
      expect(ctx.name).toBe('Anonymous');
      expect(ctx.parent).toBeUndefined();
      expect(ctx).toBeInstanceOf(Map);
    });

    it('should create a RenderContext with custom name', () => {
      const ctx = new RenderContext('TestContext');
      expect(ctx.name).toBe('TestContext');
      expect(ctx.parent).toBeUndefined();
    });

    it('should create a RenderContext with parent', () => {
      const parent = new RenderContext('Parent');
      const child = new RenderContext('Child', parent);

      expect(child.name).toBe('Child');
      expect(child.parent).toBe(parent);
    });

    it('should get value from current context', () => {
      const ctx = new RenderContext();
      ctx.set('key1', 'value1');
      ctx.set('key2', 42);

      expect(ctx.get('key1')).toBe('value1');
      expect(ctx.get('key2')).toBe(42);
    });

    it('should inherit value from parent context', () => {
      const parent = new RenderContext('Parent');
      parent.set('parentKey', 'parentValue');

      const child = new RenderContext('Child', parent);
      child.set('childKey', 'childValue');

      expect(child.get('childKey')).toBe('childValue');
      expect(child.get('parentKey')).toBe('parentValue');
    });

    it('should prioritize current context value over parent', () => {
      const parent = new RenderContext('Parent');
      parent.set('sharedKey', 'parentValue');

      const child = new RenderContext('Child', parent);
      child.set('sharedKey', 'childValue');

      expect(child.get('sharedKey')).toBe('childValue');
    });

    it('should handle multi-level inheritance chain', () => {
      const grandparent = new RenderContext('Grandparent');
      grandparent.set('gpKey', 'gpValue');
      grandparent.set('sharedKey', 'gp Shared');

      const parent = new RenderContext('Parent', grandparent);
      parent.set('pKey', 'p Value');
      parent.set('sharedKey', 'p Shared');

      const child = new RenderContext('Child', parent);
      child.set('cKey', 'c Value');

      expect(child.get('cKey')).toBe('c Value');
      expect(child.get('pKey')).toBe('p Value');
      expect(child.get('gpKey')).toBe('gpValue');
      expect(child.get('sharedKey')).toBe('p Shared');
    });

    it('should return undefined for non-existent key in entire chain', () => {
      const parent = new RenderContext('Parent');
      parent.set('parentKey', 'parentValue');

      const child = new RenderContext('Child', parent);
      expect(child.get('nonexistent')).toBeUndefined();
    });

    it('should handle shadow map entries', () => {
      const parent = new RenderContext('Parent');
      parent.set('key', 'parentValue');

      const child = new RenderContext('Child', parent);
      // Use Map.set to bypass RenderContext.get override
      Map.prototype.set.call(child, 'key', 'childValue');

      expect(child.get('key')).toBe('childValue');
    });

    it('should work with symbol keys in inheritance', () => {
      const sym = Symbol('test');
      const parent = new RenderContext('Parent');
      parent.set(sym, 'symbolValue');

      const child = new RenderContext('Child', parent);
      expect(child.get(sym)).toBe('symbolValue');
    });

    it('should handle different value types in inheritance', () => {
      const parent = new RenderContext('Parent');
      parent.set('string', 'text');
      parent.set('number', 123);
      parent.set('boolean', true);
      parent.set('object', { prop: 'value' });
      parent.set('array', [1, 2, 3]);
      parent.set('undefined', undefined);

      const child = new RenderContext('Child', parent);
      expect(child.get('string')).toBe('text');
      expect(child.get('number')).toBe(123);
      expect(child.get('boolean')).toBe(true);
      expect(child.get('object')).toEqual({ prop: 'value' });
      expect(child.get('array')).toEqual([1, 2, 3]);
      expect(child.get('undefined')).toBeUndefined();
    });
  });

  describe('createRenderCtx', () => {
    it('should create render context without explicit parent', () => {
      const ctx = createRenderCtx('TestCtx');
      expect(ctx).toBeInstanceOf(RenderContext);
      expect(ctx.name).toBe('TestCtx');
      expect(ctx.parent).toBeUndefined();
    });

    it('should use current render context as parent when available', () => {
      const parent = new RenderContext('Parent');
      setRenderCtx(parent);

      const child = createRenderCtx('Child');
      expect(child.parent).toBe(parent);

      setRenderCtx(undefined);
    });

    it('should use explicit parent over current render context', () => {
      const explicitParent = new RenderContext('Explicit');
      const currentCtx = new RenderContext('Current');
      setRenderCtx(currentCtx);

      const child = createRenderCtx('Child', explicitParent);
      expect(child.parent).toBe(explicitParent);

      setRenderCtx(undefined);
    });
  });

  describe('setRenderCtx and getRenderCtx', () => {
    it('should set and get render context', () => {
      const ctx = new RenderContext('Test');
      setRenderCtx(ctx);

      const retrieved = getRenderCtx();
      expect(retrieved).toBe(ctx);
      expect(retrieved?.name).toBe('Test');

      setRenderCtx(undefined);
    });

    it('should return undefined when no render context is set', () => {
      setRenderCtx(undefined);
      expect(getRenderCtx()).toBeUndefined();
    });

    it('should allow clearing render context', () => {
      const ctx = new RenderContext('Test');
      setRenderCtx(ctx);
      expect(getRenderCtx()).toBe(ctx);

      setRenderCtx(undefined);
      expect(getRenderCtx()).toBeUndefined();
    });

    it('should maintain context across multiple operations', () => {
      const ctx1 = new RenderContext('Ctx1');
      const ctx2 = new RenderContext('Ctx2');

      setRenderCtx(ctx1);
      expect(getRenderCtx()).toBe(ctx1);

      setRenderCtx(ctx2);
      expect(getRenderCtx()).toBe(ctx2);

      setRenderCtx(ctx1);
      expect(getRenderCtx()).toBe(ctx1);

      setRenderCtx(undefined);
    });
  });

  describe('RenderContext integration with context functions', () => {
    it('should use RenderContext when set as active context', () => {
      const renderCtx = new RenderContext('Render');
      renderCtx.set('renderKey', 'renderValue');
      setRenderCtx(renderCtx);

      expect(getContext('renderKey')).toBe('renderValue');

      setRenderCtx(undefined);
    });

    it('should allow setting values in active RenderContext', () => {
      const renderCtx = new RenderContext('Render');
      setRenderCtx(renderCtx);

      setContext('dynamicKey', 'dynamicValue');
      expect(renderCtx.get('dynamicKey')).toBe('dynamicValue');
      expect(getContext('dynamicKey')).toBe('dynamicValue');

      setRenderCtx(undefined);
    });

    it('should handle parent-child inheritance with setContext', () => {
      const parent = new RenderContext('Parent');
      parent.set('parentKey', 'parentValue');
      setRenderCtx(parent);

      const child = new RenderContext('Child', parent);
      setRenderCtx(child);

      expect(getContext('parentKey')).toBe('parentValue');

      setContext('childKey', 'childValue');
      expect(getContext('childKey')).toBe('childValue');
      expect(child.get('childKey')).toBe('childValue');

      setRenderCtx(undefined);
    });

    it('should work with contextProvider in RenderContext', () => {
      const renderCtx = new RenderContext('Render');
      renderCtx.set('tempKey', 'original');
      setRenderCtx(renderCtx);

      const provide = contextProvider('tempKey', 'temporary');

      expect(getContext('tempKey')).toBe('original');

      provide(() => {
        expect(getContext('tempKey')).toBe('temporary');
      });

      expect(getContext('tempKey')).toBe('original');

      setRenderCtx(undefined);
    });

    it('should maintain RenderContext state through withContext', () => {
      const renderCtx = new RenderContext('Render');
      renderCtx.set('before', 'beforeValue');
      setRenderCtx(renderCtx);

      const regularCtx = createContext();
      withContext(regularCtx, () => {
        setContext('during', 'duringValue');

        expect(getContext('before')).toBe('beforeValue');
        expect(getContext('during')).toBe('duringValue');
      });

      expect(getContext('before')).toBe('beforeValue');
      expect(getContext('during')).toBe('duringValue');

      setRenderCtx(undefined);

      expect(getContext('before')).toBeUndefined();
      expect(getContext('during')).toBeUndefined();
    });
  });
});
