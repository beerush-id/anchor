import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { anchor, getDefaultOptions, history, setDefaultOptions, softEntries, softValues } from '../../src/index.js';

const defaultOptions = { ...getDefaultOptions() };
const timeTravel = (time?: number) => vi.advanceTimersByTime(time ?? defaultOptions.debounce);

describe('Anchor History', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.useRealTimers();
    errorSpy.mockRestore();
  });

  describe('Initialization', () => {
    it('should initialize a history object', () => {
      const state = anchor({ a: 1, b: 2 });
      const stateHistory = history(state);

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toEqual([]);
      expect(stateHistory.forwardList).toEqual([]);
      expect(() => {
        stateHistory.destroy();
      }).not.toThrow();
    });

    it('should work with custom maxHistory option', () => {
      const state = anchor({ a: 1 });
      const stateHistory = history(state, { maxHistory: 5 });

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
    });

    it('should not throw error for non-reactive objects', () => {
      errorSpy.mockClear();

      const stateHistory = history({ a: 1, b: 2 });

      expect(() => stateHistory.reset()).not.toThrow();
      expect(errorSpy).toHaveBeenCalledTimes(1);
      stateHistory.destroy();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it('should update the default options', () => {
      setDefaultOptions({ maxHistory: 25 });

      expect(getDefaultOptions().maxHistory).toBe(25);
      expect(getDefaultOptions().debounce).toBe(defaultOptions.debounce);
      expect(getDefaultOptions().maxHistory).not.toBe(defaultOptions.maxHistory);

      setDefaultOptions(defaultOptions);
    });
  });

  describe('Basic Operations', () => {
    it('should track state changes', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;

      timeTravel();

      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle backward operation', () => {
      const state = anchor({ count: 0 }) as { count?: number; age?: number };
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();

      expect(state.count).toBe(2);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.backward();

      expect(state.count).toBe(1);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(2);

      delete state.count;
      timeTravel();
      expect(state.count).toBeUndefined();

      stateHistory.backward();
      expect(state.count).toBe(0);

      state.age = 10;
      timeTravel();

      expect(state.age).toBe(10);

      stateHistory.backward();
      expect(state.age).toBeUndefined();

      stateHistory.destroy();
    });

    it('should handle forward operation', () => {
      const state = anchor({ count: 0 }) as { count?: number };
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();

      stateHistory.backward();
      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.forward();

      expect(state.count).toBe(1);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.forward();

      expect(state.count).toBe(2);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);

      delete state.count;
      timeTravel();
      expect(state.count).toBeUndefined();

      stateHistory.backward();
      expect(state.count).toBe(2);

      stateHistory.forward();
      expect(state.count).toBeUndefined();

      stateHistory.destroy();
    });

    it('should clear forward list when making new changes', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();

      // Go backward to create forward list
      stateHistory.backward();
      expect(stateHistory.forwardList).toHaveLength(1);
      expect(stateHistory.backwardList).toHaveLength(1);

      // Make a new change, which should clear forward list
      state.count = 3;
      timeTravel();

      expect(stateHistory.forwardList).toHaveLength(0);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle clear operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();

      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.clear();

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle reset operation', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();

      stateHistory.backward();
      expect(state.count).toBe(1);

      stateHistory.reset();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle reset Array operation', () => {
      const state = anchor([1, 2]);
      const stateHistory = history(state);

      state.push(3);
      timeTravel();

      stateHistory.reset();
      expect(state).toEqual([1, 2]);

      stateHistory.destroy();
    });

    it('should handle reset Map operation', () => {
      const state = anchor(new Map([['count', 0]]));
      const stateHistory = history(state);

      state.set('count', 1);
      timeTravel();

      stateHistory.reset();

      expect(softEntries(state)).toEqual([['count', 0]]);
    });

    it('should handle reset Set operation', () => {
      const state = anchor(new Set([1, 2, 3]));
      const stateHistory = history(state);

      state.add(4);
      timeTravel();

      stateHistory.reset();

      expect(softValues(state)).toEqual([1, 2, 3]);
    });

    it('should handle "assign" operation', () => {
      const state = anchor({ count: 0 }) as Record<string, unknown>;
      const stateHistory = history(state);

      anchor.assign(state, { count: 1, name: 'test' });
      timeTravel();
      expect(state.count).toBe(1);
      expect(state.name).toBe('test');

      stateHistory.backward();
      expect(state.count).toBe(0);
      expect(state.name).toBeUndefined();

      stateHistory.forward();
      expect(state.count).toBe(1);
      expect(state.name).toBe('test');
    });
  });

  describe('Edge Cases', () => {
    it('should handle maxHistory limit', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      // Make more changes than maxHistory
      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();
      state.count = 3;
      timeTravel();
      state.count = 4;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(2);
      // Should only keep the last 2 changes

      stateHistory.destroy();
    });

    it('should handle backward with maxHistory limit', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();
      state.count = 3;
      timeTravel();

      // At this point we should have 2 changes in backwardList
      expect(stateHistory.backwardList).toHaveLength(2);
      expect(state.count).toBe(3);

      // Go backward
      stateHistory.backward();
      expect(state.count).toBe(2);
      expect(stateHistory.forwardList).toHaveLength(1);
      expect(stateHistory.backwardList).toHaveLength(1);

      // Add a new change
      state.count = 4;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle forward with maxHistory limit in backward list', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();
      state.count = 3;
      timeTravel();

      stateHistory.backward();

      expect(state.count).toBe(2);
      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();

      expect(state.count).toBe(1);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(2);

      state.count = 4;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(1);
      expect(stateHistory.forwardList).toHaveLength(0);

      stateHistory.destroy();
    });

    it('should handle forward with maxHistory limit in forward list', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state, { maxHistory: 2 });

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();
      state.count = 3;
      timeTravel();
      state.count = 4;
      timeTravel();

      // Go back to create forwardList
      stateHistory.backward();
      expect(state.count).toBe(3);
      expect(stateHistory.forwardList).toHaveLength(1);

      stateHistory.backward();
      expect(state.count).toBe(2);
      expect(stateHistory.forwardList).toHaveLength(2);

      // Add new change when forwardList is at max
      stateHistory.backward();
      expect(state.count).toBe(2); // No change since we're at the limit
      expect(stateHistory.forwardList).toHaveLength(2);

      stateHistory.destroy();
    });

    it('should handle multiple backward/forward operations', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();
      state.count = 2;
      timeTravel();
      state.count = 3;
      timeTravel();

      // Go back to the beginning
      stateHistory.backward();
      stateHistory.backward();
      stateHistory.backward();

      expect(state.count).toBe(0);
      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(true);

      // Go forward to the end
      stateHistory.forward();
      stateHistory.forward();
      stateHistory.forward();

      expect(state.count).toBe(3);
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);

      stateHistory.destroy();
    });

    it('should not track init events', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      expect(stateHistory.backwardList).toHaveLength(0);

      state.count = 1;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(1);

      stateHistory.destroy();
    });

    it('should handle destroy operation properly', () => {
      const state = anchor({ count: 0 });
      const stateHistory = history(state);

      state.count = 1;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(1);

      stateHistory.destroy();

      expect(stateHistory.canBackward).toBe(false);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList).toHaveLength(0);
      expect(stateHistory.forwardList).toHaveLength(0);

      // Should not track changes after destroy
      state.count = 2;
      timeTravel();

      expect(stateHistory.backwardList).toHaveLength(0);
    });
  });

  describe('Complex Data Structures', () => {
    it('should handle array operations', () => {
      const state = anchor([1, 2, 3]);
      const stateHistory = history(state);

      state.push(4);
      timeTravel();

      expect(state).toEqual([1, 2, 3, 4]);

      stateHistory.backward();
      expect(state).toEqual([1, 2, 3]);

      stateHistory.forward();
      expect(state).toEqual([1, 2, 3, 4]);

      stateHistory.destroy();

      const nestedArray = anchor({ items: [1, 2, 3] });
      const nestedHistory = history(nestedArray);

      nestedArray.items.push(4);
      timeTravel();

      expect(nestedArray.items).toEqual([1, 2, 3, 4]);

      nestedHistory.backward();
      expect(nestedArray.items).toEqual([1, 2, 3]);

      nestedHistory.forward();
      expect(nestedArray.items).toEqual([1, 2, 3, 4]);

      nestedHistory.destroy();
    });

    it('should handle object nesting', () => {
      const state = anchor({ user: { name: 'John', age: 30 } });
      const stateHistory = history(state);

      state.user.name = 'Jane';
      timeTravel();

      expect(state.user.name).toBe('Jane');

      stateHistory.backward();
      expect(state.user.name).toBe('John');

      stateHistory.forward();
      expect(state.user.name).toBe('Jane');

      stateHistory.destroy();
    });

    it('should handle Map operations', () => {
      const state = anchor({ map: new Map([['key1', 'value1']]) }) as { map: Map<string, unknown> };
      const stateHistory = history(state);

      state.map.set('key2', 'value2');
      timeTravel();
      expect(state.map.get('key2')).toBe('value2');

      state.map.set('key1', 'value1-changed');
      timeTravel();
      expect(state.map.get('key1')).toBe('value1-changed');

      stateHistory.backward();
      expect(state.map.get('key1')).toBe('value1');

      stateHistory.backward();
      expect(state.map.has('key2')).toBe(false);

      stateHistory.forward();
      expect(state.map.get('key2')).toBe('value2');

      state.map.clear();
      timeTravel();
      expect(state.map.size).toBe(0);
      expect(stateHistory.canBackward).toBe(true);

      stateHistory.backward();
      expect(state.map.size).toBe(2);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.forward();
      expect(state.map.size).toBe(0);
      expect(stateHistory.canBackward).toBe(true);

      state.map.set('foo', { bar: 'baz' });
      timeTravel();

      expect(state.map.has('foo'));
      expect(state.map.get('foo')).toEqual({ bar: 'baz' });

      stateHistory.backward();
      expect(state.map.has('foo')).toBe(false);
      expect(state.map.size).toBe(0);
      expect(stateHistory.canForward).toBe(true);

      stateHistory.destroy();
    });

    it('should handle deep map operations', () => {
      const state = anchor({
        count: 1,
        settings: new Map([['profile', { theme: 'light' }]]),
      });
      const profile = state.settings.get('profile') as { theme: string };
      const stateHistory = history(state);

      expect(profile.theme).toBe('light');

      profile.theme = 'dark';
      timeTravel();

      expect(profile.theme).toBe('dark');
      expect(stateHistory.canBackward).toBe(true);

      stateHistory.backward();

      expect(profile.theme).toBe('light');
    });

    it('should handle Set operations', () => {
      const state = anchor({ set: new Set([1, 2, 3]) });
      const stateHistory = history(state);

      state.set.add(4);
      timeTravel();

      expect(state.set.has(4)).toBe(true);

      stateHistory.backward();
      expect(state.set.has(4)).toBe(false);

      stateHistory.forward();
      expect(state.set.has(4)).toBe(true);

      state.set.delete(4);
      timeTravel();
      expect(state.set.has(4)).toBe(false);

      stateHistory.backward();
      expect(state.set.has(4)).toBe(true);

      state.set.clear();
      timeTravel();
      expect(state.set.size).toBe(0);

      stateHistory.backward();
      expect(state.set.size).toBe(4);

      stateHistory.forward();
      expect(state.set.size).toBe(0);

      stateHistory.destroy();
    });
  });

  describe('Special Cases', () => {
    it('should handle Map delete operations', () => {
      const state = anchor({
        map: new Map([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ]),
      });
      const stateHistory = history(state);

      state.map.delete('key1');
      timeTravel();

      expect(state.map.has('key1')).toBe(false);

      stateHistory.backward();
      expect(state.map.has('key1')).toBe(true);
      expect(state.map.get('key1')).toBe('value1');

      stateHistory.forward();
      expect(state.map.has('key1')).toBe(false);

      stateHistory.destroy();
    });

    it('should handle Set delete operations', () => {
      const state = anchor({ set: new Set([1, 2, 3]) });
      const stateHistory = history(state);

      state.set.delete(2);
      timeTravel();

      expect(state.set.has(2)).toBe(false);

      stateHistory.backward();
      expect(state.set.has(2)).toBe(true);

      stateHistory.forward();
      expect(state.set.has(2)).toBe(false);

      stateHistory.destroy();
    });

    it('should handle rapid typing', () => {
      const state = anchor({ text: '' });
      const debounce = 200;
      const stateHistory = history(state, { debounce });

      const words = ['Hello', ' ', 'World', ' ', 'TypeScript', ' ', 'is', ' ', 'awesome.'];
      for (const word of words) {
        const timeUnit = debounce / word.length;

        for (const char of word) {
          state.text += char;
          timeTravel(timeUnit);
        }

        timeTravel(5);
      }
      timeTravel(5);

      expect(state.text).toBe('Hello World TypeScript is awesome.');
      expect(stateHistory.canBackward).toBe(true);
      expect(stateHistory.canForward).toBe(false);
      expect(stateHistory.backwardList.length).toBe(words.length);

      expect(stateHistory.backwardList[0].prev).toBe('');
      expect(stateHistory.backwardList[0].value).toBe('Hello');

      expect(stateHistory.backwardList[1].prev).toBe('Hello');
      expect(stateHistory.backwardList[1].value).toBe('Hello ');

      expect(stateHistory.backwardList[2].prev).toBe('Hello ');
      expect(stateHistory.backwardList[2].value).toBe('Hello World');

      expect(stateHistory.backwardList[3].prev).toBe('Hello World');
      expect(stateHistory.backwardList[3].value).toBe('Hello World ');

      expect(stateHistory.backwardList[4].prev).toBe('Hello World ');
      expect(stateHistory.backwardList[4].value).toBe('Hello World TypeScript');

      expect(stateHistory.backwardList[5].prev).toBe('Hello World TypeScript');
      expect(stateHistory.backwardList[5].value).toBe('Hello World TypeScript ');

      expect(stateHistory.backwardList[6].prev).toBe('Hello World TypeScript ');
      expect(stateHistory.backwardList[6].value).toBe('Hello World TypeScript is');

      expect(stateHistory.backwardList[7].prev).toBe('Hello World TypeScript is');
      expect(stateHistory.backwardList[7].value).toBe('Hello World TypeScript is ');

      expect(stateHistory.backwardList[8].prev).toBe('Hello World TypeScript is ');
      expect(stateHistory.backwardList[8].value).toBe('Hello World TypeScript is awesome.');
    });
  });
});
