import { describe, expect, it } from 'vitest';
import { anchor, createLifecycle, derived, effect } from '../../src/index.js';

describe('Anchor Core - derived.reduce', () => {
  it('should compute initial reduction on anchored array', () => {
    const todos = anchor([
      { id: 1, text: 'First', done: true },
      { id: 2, text: 'Second', done: false },
      { id: 3, text: 'Third', done: true },
    ]);

    const stats = derived.reduce({ total: 0, completed: 0 }, todos, (stats, todo, remove) => {
      if (remove) {
        if (todo.done) stats.completed--;
        stats.total--;
      } else {
        if (todo.done) stats.completed++;
        stats.total++;
      }
    });

    expect(stats.total).toBe(3);
    expect(stats.completed).toBe(2);
  });

  it('should support primitive initial state', () => {
    const items = anchor([
      { price: 10, qty: 2 },
      { price: 25, qty: 1 },
    ]);

    const total = derived.reduce(0, items, (sum, item, remove) => {
      const amount = item.price * item.qty;
      sum.value += remove ? -amount : amount;
    });

    expect(total.value).toBe(45);
  });

  it('should reactively update when an item property changes', () => {
    const todos = anchor([
      { id: 1, done: false },
      { id: 2, done: false },
    ]);

    const activeMap = new Map<number, boolean>();

    const stats = derived.reduce({ completed: 0 }, todos, (stats, todo, remove) => {
      const prev = activeMap.get(todo.id) ?? false;
      if (remove) {
        if (prev) stats.completed--;
        activeMap.delete(todo.id);
      } else {
        if (todo.done && !prev) stats.completed++;
        else if (!todo.done && prev) stats.completed--;
        activeMap.set(todo.id, todo.done);
      }
    });

    expect(stats.completed).toBe(0);

    todos[0].done = true;
    expect(stats.completed).toBe(1);

    todos[1].done = true;
    expect(stats.completed).toBe(2);

    todos[0].done = false;
    expect(stats.completed).toBe(1);
  });

  it('should handle adding items via array mutations (push, unshift)', () => {
    const list = anchor([10, 20]);

    const sum = derived.reduce(0, list, (acc, num, remove) => {
      acc.value += remove ? -num : num;
    });

    expect(sum.value).toBe(30);

    list.push(30);
    expect(sum.value).toBe(60);

    list.unshift(5);
    expect(sum.value).toBe(65);
  });

  it('should handle removing items via array mutations (splice, pop, shift)', () => {
    const list = anchor([
      { id: 1, val: 10 },
      { id: 2, val: 20 },
      { id: 3, val: 30 },
    ]);

    const sum = derived.reduce(0, list, (acc, item, remove) => {
      acc.value += remove ? -item.val : item.val;
    });

    expect(sum.value).toBe(60);

    list.splice(1, 1);
    expect(sum.value).toBe(40);

    list.pop();
    expect(sum.value).toBe(10);

    list.shift();
    expect(sum.value).toBe(0);
  });

  it('should handle index replacement (arr[i] = newItem)', () => {
    const list = anchor([
      { id: 1, score: 100 },
      { id: 2, score: 200 },
    ]);

    const total = derived.reduce(0, list, (acc, item, remove) => {
      acc.value += remove ? -item.score : item.score;
    });

    expect(total.value).toBe(300);

    list[0] = { id: 1, score: 50 };
    expect(total.value).toBe(250);
  });

  it('should trigger downstream observers reactively', () => {
    const list = anchor([10]);
    const stats = derived.reduce({ count: 0 }, list, (acc, num, remove) => {
      acc.count += remove ? -1 : 1;
    });

    let observedCount = -1;
    const dispose = effect(() => {
      observedCount = stats.count;
    });

    expect(observedCount).toBe(1);

    list.push(20);
    expect(observedCount).toBe(2);

    list.push(30);
    expect(observedCount).toBe(3);

    list.pop();
    expect(observedCount).toBe(2);

    dispose();
  });

  it('should clean up subscriptions and observers on scope cleanup', () => {
    const lifecycle = createLifecycle();
    const list = anchor([10]);
    let stats: { sum: number } | undefined;

    lifecycle.run(() => {
      stats = derived.reduce({ sum: 0 }, list, (acc, num, remove) => {
        acc.sum += remove ? -num : num;
      });
    });

    expect(stats?.sum).toBe(10);

    list.push(20);
    expect(stats?.sum).toBe(30);

    lifecycle.destroy();

    list.push(30);
    expect(stats?.sum).toBe(30);
  });

  it('should handle unanchored array input', () => {
    const rawList = [1, 2, 3];
    const sum = derived.reduce(0, rawList, (acc, num, remove) => {
      acc.value += remove ? -num : num;
    });

    expect(sum.value).toBe(6);
  });

  it('should handle property deletion on accumulator and array deletion', () => {
    const list = anchor([
      { id: 1, val: 10 },
      { id: 2, val: 20 },
    ]);
    const dict = derived.reduce({} as Record<number, number>, list, (acc, item, remove) => {
      if (remove) {
        delete acc[item.id];
      } else {
        acc[item.id] = item.val;
      }
    });

    expect(dict[1]).toBe(10);
    expect(dict[2]).toBe(20);

    // Delete array element (triggers type === 'delete')
    delete list[0];
    expect(dict[1]).toBeUndefined();
    expect(dict[2]).toBe(20);
  });
});
