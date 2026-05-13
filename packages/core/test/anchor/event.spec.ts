import { describe, it, expect } from 'vitest';
import { replay } from '../../src/reactive/event.js';
import { StateChange } from '../../src/types.js';

describe('replay.any', () => {
  it('should handle ObjectMutations.SET', () => {
    const state = { a: 1 };
    replay.any(state, { type: 'set', keys: ['a'], value: 2 } as StateChange);
    expect(state.a).toBe(2);
  });

  it('should handle ObjectMutations.DELETE', () => {
    const state = { a: 1 };
    replay.any(state, { type: 'delete', keys: ['a'] } as StateChange);
    expect(state).not.toHaveProperty('a');
  });

  it('should handle MapMutations.SET', () => {
    const state = new Map();
    replay.any(state, { type: 'map:set', keys: ['a'], value: 1 } as StateChange);
    expect(state.get('a')).toBe(1);
  });

  it('should handle MapMutations.DELETE', () => {
    const state = new Map([['a', 1]]);
    replay.any(state, { type: 'map:delete', keys: ['a'] } as StateChange);
    expect(state.has('a')).toBe(false);
  });

  it('should handle MapMutations.CLEAR', () => {
    const state = new Map([['a', 1]]);
    replay.any(state, { type: 'map:clear', keys: [] } as StateChange);
    expect(state.size).toBe(0);
  });

  it('should handle SetMutations.ADD', () => {
    const state = new Set();
    // For Set, the "value" might be passed in `value` and getEventTarget handles collection mutations.
    // Let's pass keys: [] and value: 1
    replay.any(state, { type: 'set:add', keys: [], value: 1 } as StateChange);
    expect(state.has(1)).toBe(true);
  });

  it('should handle SetMutations.DELETE', () => {
    const state = new Set([1]);
    replay.any(state, { type: 'set:delete', keys: [], prev: 1 } as StateChange);
    expect(state.has(1)).toBe(false);
  });

  it('should handle SetMutations.CLEAR', () => {
    const state = new Set([1]);
    replay.any(state, { type: 'set:clear', keys: [] } as StateChange);
    expect(state.size).toBe(0);
  });

  it('should handle BatchMutations.ASSIGN', () => {
    const state = { a: 1, b: 2 };
    replay.any(state, { type: 'assign', keys: [], value: { c: 3 } } as StateChange);
    expect(state).toEqual({ a: 1, b: 2, c: 3 });
  });

  it('should handle BatchMutations.REPLACE', () => {
    const state = { a: 1, b: 2 };
    replay.any(state, { type: 'replace', keys: [], value: { c: 3 } } as StateChange);
    expect(state).toEqual({ c: 3 });
  });

  it('should handle ARRAY_MUTATIONS', () => {
    const state = [1, 2];
    replay.any(state, { type: 'push', keys: [], value: [3] } as StateChange);
    expect(state).toEqual([1, 2, 3]);

    replay.any(state, { type: 'pop', keys: [], value: [] } as StateChange);
    expect(state).toEqual([1, 2]);

    replay.any(state, { type: 'shift', keys: [], value: [] } as StateChange);
    expect(state).toEqual([2]);

    replay.any(state, { type: 'unshift', keys: [], value: [1] } as StateChange);
    expect(state).toEqual([1, 2]);

    replay.any(state, { type: 'splice', keys: [], value: [0, 1] } as StateChange);
    expect(state).toEqual([2]);
  });
  
  it('should handle nested paths', () => {
    const state = { nested: { map: new Map([['key', 1]]) } };
    replay.any(state, { type: 'map:set', keys: ['nested', 'map', 'key'], value: 2 } as StateChange);
    expect(state.nested.map.get('key')).toBe(2);
  });
});
