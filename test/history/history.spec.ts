import { expect, test } from 'vitest';
import { anchor } from '../../lib/esm';
import { history } from '../../lib/esm/history';
import { sleep } from '../../src/utils';

test('History without debounce', () => {
  const state = anchor({ count: 0 });
  const track = history(state, { debounce: 0 });

  state.count = 1;

  expect(state.count).toBe(1);
  expect(track.hasChanges).toBe(true);
  expect(track.backwards.length).toBe(1);
  expect(track.canBackward).toBe(true);
  expect(track.forwards.length).toBe(0);
  expect(track.canForward).toBe(false);
  expect(track.changes).toEqual({ count: 1 });

  track.undo();

  expect(state.count).toBe(0);
  expect(track.hasChanges).toBe(false);
  expect(track.backwards.length).toBe(0);
  expect(track.canBackward).toBe(false);
  expect(track.forwards.length).toBe(1);
  expect(track.canForward).toBe(true);
  expect(track.changes).toEqual({});

  track.redo();

  expect(state.count).toBe(1);
  expect(track.hasChanges).toBe(true);
  expect(track.backwards.length).toBe(1);
  expect(track.canBackward).toBe(true);
  expect(track.forwards.length).toBe(0);
  expect(track.canForward).toBe(false);
  expect(track.changes).toEqual({ count: 1 });

  track.destroy();
  state.count = 2;

  expect(state.count).toBe(2);
  expect(track.hasChanges).toBe(false);
  expect(track.backwards.length).toBe(0);
  expect(track.canBackward).toBe(false);
  expect(track.forwards.length).toBe(0);
  expect(track.canForward).toBe(false);
  expect(track.changes).toEqual({});
});

test('History', async () => {
  const state = anchor({ count: 0 });
  const track = history(state);

  state.count = 1;

  await sleep(500);

  expect(state.count).toBe(1);
  expect(track.hasChanges).toBe(true);
});

test('History with custom debounce', async () => {
  const state = anchor({ count: 0 });
  const track = history(state, { debounce: 300 });

  state.count = 1;

  await sleep(300);

  expect(state.count).toBe(1);
  expect(track.hasChanges).toBe(true);
  expect(track.changes).toEqual({ count: 1 });
});
