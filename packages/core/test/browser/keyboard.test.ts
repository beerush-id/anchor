import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions } from '../../src/browser/index.js';
import { LIVE_KEYBOARD } from '../../src/browser/keyboard.js';

describe('browser/keyboard', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    LIVE_KEYBOARD.key; // trigger watchKeyboard
    await acceptInteractions(false);
  });

  afterEach(() => {
    // Dispatch blur to clean up keyboard state
    window.dispatchEvent(new Event('blur'));
  });

  it('should initialize empty state', async () => {
    expect(LIVE_KEYBOARD.key).toBe('');
    expect(LIVE_KEYBOARD.modifiers.size).toBe(0);
    expect(LIVE_KEYBOARD.target).toBeUndefined();
  });

  it('should track keydown events', async () => {
    const event = new KeyboardEvent('keydown', { key: 'a' });
    document.dispatchEvent(event);

    expect(LIVE_KEYBOARD.key).toBe('a');
    expect(LIVE_KEYBOARD.modifiers.size).toBe(0);
  });

  it('should clear key on keyup event for the active key', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    expect(LIVE_KEYBOARD.key).toBe('a');

    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'b' }));
    // Still 'a' because we released a different key
    expect(LIVE_KEYBOARD.key).toBe('a');

    document.dispatchEvent(new KeyboardEvent('keyup', { key: 'a' }));
    expect(LIVE_KEYBOARD.key).toBe('');
  });

  it('should track modifiers like ctrl, shift, alt, meta', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, shiftKey: true }));

    expect(LIVE_KEYBOARD.modifiers.has('ctrl')).toBe(true);
    expect(LIVE_KEYBOARD.modifiers.has('shift')).toBe(true);
    expect(LIVE_KEYBOARD.modifiers.has('alt')).toBe(false);

    expect(LIVE_KEYBOARD.is('ctrl', 'shift', 's')).toBe(true);
    expect(LIVE_KEYBOARD.is('ctrl', 's')).toBe(false); // Because shift is also pressed
  });

  it('should clear all state on window blur', async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));

    expect(LIVE_KEYBOARD.key).toBe('s');
    expect(LIVE_KEYBOARD.modifiers.size).toBe(1);

    window.dispatchEvent(new Event('blur'));

    expect(LIVE_KEYBOARD.key).toBe('');
    expect(LIVE_KEYBOARD.modifiers.size).toBe(0);
  });

  it('should identify target element if not document', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    Object.defineProperty(event, 'target', { value: div, enumerable: true });

    document.dispatchEvent(event);

    expect(LIVE_KEYBOARD.target).toBe(div);
    expect(LIVE_KEYBOARD.key).toBe('Enter');

    document.body.removeChild(div);
  });

  it('should clean up event listeners when interactions are re-accepted', async () => {
    // 1. Ensure the listener is active initially
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'x' }));
    expect(LIVE_KEYBOARD.key).toBe('x');

    // 2. Trigger the disposer returned by onInteractive
    // This simulates the cleanup phase of the lifecycle
    await acceptInteractions(false);

    // 3. Reset the state manually to empty
    window.dispatchEvent(new Event('blur'));
    expect(LIVE_KEYBOARD.key).toBe('');

    // 4. Dispatch a new event and verify the state DOES NOT change
    // because the event listener was successfully removed by the cleanup function
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y' }));

    expect(LIVE_KEYBOARD.key).toBe('');
  });

  describe('Coverage', () => {
    beforeEach(async () => {
      vi.resetModules();
    });

    it('should return false from is() if main key does not match', async () => {
      const { LIVE_KEYBOARD } = await import('../../src/browser/keyboard.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      LIVE_KEYBOARD.key;
      await acceptInteractions(false); // To ensure watchers trigger cleanly
      await acceptInteractions(true);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(LIVE_KEYBOARD.is('b')).toBe(false);
      expect(LIVE_KEYBOARD.is('ctrl', 'b')).toBe(false);
    });

    it('should set element on initialization for keyboardRef', async () => {
      const { keyboardRef } = await import('../../src/browser/keyboard.js');
      const div = document.createElement('div');
      const ref = keyboardRef(div);
      expect(ref.current).toBe(div);
    });

    it('should return false if no keys provided to is()', async () => {
      const { LIVE_KEYBOARD } = await import('../../src/browser/keyboard.js');
      expect(LIVE_KEYBOARD.is()).toBe(false);
    });

    it('should return false if modifier is missing', async () => {
      const { LIVE_KEYBOARD } = await import('../../src/browser/keyboard.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      LIVE_KEYBOARD.key;
      await acceptInteractions(true);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); // no ctrlKey
      expect(LIVE_KEYBOARD.is('ctrl', 'c')).toBe(false);
    });

    it('should parse altKey and metaKey modifiers and handle keyup with modifiers', async () => {
      const { LIVE_KEYBOARD } = await import('../../src/browser/keyboard.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      LIVE_KEYBOARD.key;
      await acceptInteractions(true);

      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', altKey: true, metaKey: true, ctrlKey: true, shiftKey: true })
      );
      expect(LIVE_KEYBOARD.modifiers.has('alt')).toBe(true);
      expect(LIVE_KEYBOARD.modifiers.has('meta')).toBe(true);
      expect(LIVE_KEYBOARD.modifiers.has('ctrl')).toBe(true);
      expect(LIVE_KEYBOARD.modifiers.has('shift')).toBe(true);
      expect(LIVE_KEYBOARD.is('alt', 'meta', 'ctrl', 'shift', 'Enter')).toBe(true);

      // keyup while modifiers are still true
      document.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', altKey: true, metaKey: true, ctrlKey: true, shiftKey: true })
      );
      expect(LIVE_KEYBOARD.modifiers.size).toBe(4);

      // keyup when modifiers are released
      document.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter', altKey: false, metaKey: false, ctrlKey: false, shiftKey: false })
      );
      expect(LIVE_KEYBOARD.modifiers.size).toBe(0);
    });

    it('should track element-specific keyboard events', async () => {
      const { keyboardRef } = await import('../../src/browser/keyboard.js');
      const div = document.createElement('div');
      const state = keyboardRef(div);

      div.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(state.key).toBe('Escape');

      div.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
      expect(state.key).toBe('');

      state.current = undefined;
      expect(state.key).toBe('');
    });

    it('should execute onCleanup when lifecycle scope is destroyed', async () => {
      const { keyboardRef } = await import('../../src/browser/keyboard.js');
      const { createLifecycle } = await import('../../src/scope/lifecycle.js');
      const lifecycle = createLifecycle();
      const div = document.createElement('div');
      let ref: any;

      lifecycle.run(() => {
        ref = keyboardRef(div);
      });

      expect(ref.current).toBe(div);
      lifecycle.destroy();
    });
  });
});
