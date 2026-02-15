import { describe, expect, it } from 'vitest';
import { ROUTE_TYPE } from '../src/enum.js';

describe('enum.ts', () => {
  describe('ROUTE_TYPE', () => {
    it('should be an object', () => {
      expect(typeof ROUTE_TYPE).toBe('object');
    });

    it('should have INDEX property', () => {
      expect(ROUTE_TYPE.INDEX).toBeDefined();
    });

    it('should have STATIC property', () => {
      expect(ROUTE_TYPE.STATIC).toBeDefined();
    });

    it('should have DYNAMIC property', () => {
      expect(ROUTE_TYPE.DYNAMIC).toBeDefined();
    });

    it('should have WILDCARD property', () => {
      expect(ROUTE_TYPE.WILDCARD).toBeDefined();
    });

    it('should have INDEX value of "index"', () => {
      expect(ROUTE_TYPE.INDEX).toBe('index');
    });

    it('should have STATIC value of "static"', () => {
      expect(ROUTE_TYPE.STATIC).toBe('static');
    });

    it('should have DYNAMIC value of "dynamic"', () => {
      expect(ROUTE_TYPE.DYNAMIC).toBe('dynamic');
    });

    it('should have WILDCARD value of "wildcard"', () => {
      expect(ROUTE_TYPE.WILDCARD).toBe('wildcard');
    });

    it('should have all values as strings', () => {
      expect(typeof ROUTE_TYPE.INDEX).toBe('string');
      expect(typeof ROUTE_TYPE.STATIC).toBe('string');
      expect(typeof ROUTE_TYPE.DYNAMIC).toBe('string');
      expect(typeof ROUTE_TYPE.WILDCARD).toBe('string');
    });

    it('should have unique values', () => {
      const values = Object.values(ROUTE_TYPE);
      const uniqueValues = new Set(values);
      expect(values.length).toBe(uniqueValues.size);
    });

    it('should have exactly 4 properties', () => {
      expect(Object.keys(ROUTE_TYPE).length).toBe(4);
    });

    it('should be readonly (as const)', () => {
      // The as const assertion makes the object readonly
      // We can't directly test this, but we can verify the values are correct
      expect(ROUTE_TYPE.INDEX).toBe('index');
      expect(ROUTE_TYPE.STATIC).toBe('static');
      expect(ROUTE_TYPE.DYNAMIC).toBe('dynamic');
      expect(ROUTE_TYPE.WILDCARD).toBe('wildcard');
    });

    it('should allow using in switch statements', () => {
      const type = 'static' as (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];
      let result = '';

      switch (type) {
        case ROUTE_TYPE.INDEX:
          result = 'index';
          break;
        case ROUTE_TYPE.STATIC:
          result = 'static';
          break;
        case ROUTE_TYPE.DYNAMIC:
          result = 'dynamic';
          break;
        case ROUTE_TYPE.WILDCARD:
          result = 'wildcard';
          break;
      }

      expect(result).toBe('static');
    });

    it('should allow using in conditional checks', () => {
      const type = 'dynamic' as (typeof ROUTE_TYPE)[keyof typeof ROUTE_TYPE];
      const isDynamic = type === ROUTE_TYPE.DYNAMIC;
      const isStatic = type === ROUTE_TYPE.STATIC;

      expect(isDynamic).toBe(true);
      expect(isStatic).toBe(false);
    });

    it('should allow using in array includes', () => {
      const validTypes = [ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD];
      expect(validTypes.includes(ROUTE_TYPE.STATIC)).toBe(true);
      expect(validTypes.includes('invalid' as never)).toBe(false);
    });

    it('should allow using in object keys', () => {
      const routeConfig = {
        [ROUTE_TYPE.INDEX]: { priority: 1 },
        [ROUTE_TYPE.STATIC]: { priority: 2 },
        [ROUTE_TYPE.DYNAMIC]: { priority: 3 },
        [ROUTE_TYPE.WILDCARD]: { priority: 4 },
      };

      expect(routeConfig[ROUTE_TYPE.STATIC].priority).toBe(2);
    });

    it('should allow using in Map', () => {
      const routeMap = new Map([
        [ROUTE_TYPE.INDEX, 'Root route'],
        [ROUTE_TYPE.STATIC, 'Fixed path'],
        [ROUTE_TYPE.DYNAMIC, 'Parameterized path'],
        [ROUTE_TYPE.WILDCARD, 'Catch-all path'],
      ]);

      expect(routeMap.get(ROUTE_TYPE.DYNAMIC)).toBe('Parameterized path');
    });

    it('should allow using in Set', () => {
      const typeSet = new Set([ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD]);
      expect(typeSet.has(ROUTE_TYPE.STATIC)).toBe(true);
      expect(typeSet.has('invalid' as never)).toBe(false);
    });

    it('should allow using in filter operations', () => {
      const allTypes = ['index', 'static', 'dynamic', 'wildcard', 'invalid'] as const;
      const validTypes = allTypes.filter((type) =>
        [ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD].includes(type as never)
      );

      expect(validTypes).toEqual(['index', 'static', 'dynamic', 'wildcard']);
    });

    it('should allow using in find operations', () => {
      const types = ['index', 'static', 'dynamic', 'wildcard'] as const;
      const dynamicType = types.find((type) => type === ROUTE_TYPE.DYNAMIC);

      expect(dynamicType).toBe('dynamic');
    });

    it('should allow using in reduce operations', () => {
      const types = [ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD];
      const typeString = types.reduce((acc, type) => acc + type + '-', '');

      expect(typeString).toBe('index-static-dynamic-wildcard-');
    });

    it('should allow using in map operations', () => {
      const types = [ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD];
      const uppercased = types.map((type) => type.toUpperCase());

      expect(uppercased).toEqual(['INDEX', 'STATIC', 'DYNAMIC', 'WILDCARD']);
    });

    it('should allow using in for...of loops', () => {
      const types: string[] = [];
      for (const type of [ROUTE_TYPE.INDEX, ROUTE_TYPE.STATIC, ROUTE_TYPE.DYNAMIC, ROUTE_TYPE.WILDCARD]) {
        types.push(type);
      }

      expect(types).toEqual(['index', 'static', 'dynamic', 'wildcard']);
    });

    it('should allow using in for...in loops', () => {
      const keys: string[] = [];
      for (const key in ROUTE_TYPE) {
        keys.push(key);
      }

      expect(keys).toEqual(['INDEX', 'STATIC', 'DYNAMIC', 'WILDCARD']);
    });

    it('should allow using Object.values', () => {
      const values = Object.values(ROUTE_TYPE);
      expect(values).toEqual(['index', 'static', 'dynamic', 'wildcard']);
    });

    it('should allow using Object.keys', () => {
      const keys = Object.keys(ROUTE_TYPE);
      expect(keys).toEqual(['INDEX', 'STATIC', 'DYNAMIC', 'WILDCARD']);
    });

    it('should allow using Object.entries', () => {
      const entries = Object.entries(ROUTE_TYPE);
      expect(entries).toEqual([
        ['INDEX', 'index'],
        ['STATIC', 'static'],
        ['DYNAMIC', 'dynamic'],
        ['WILDCARD', 'wildcard'],
      ]);
    });

    it('should allow using in template literals', () => {
      const type = ROUTE_TYPE.DYNAMIC;
      const message = `This is a ${type} route`;

      expect(message).toBe('This is a dynamic route');
    });

    it('should allow using in JSON.stringify', () => {
      const config = { type: ROUTE_TYPE.STATIC };
      const json = JSON.stringify(config);

      expect(json).toBe('{"type":"static"}');
    });

    it('should allow using in JSON.parse', () => {
      const json = '{"type":"dynamic"}';
      const config = JSON.parse(json);

      expect(config.type).toBe(ROUTE_TYPE.DYNAMIC);
    });
  });
});
