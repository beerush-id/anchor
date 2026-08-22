import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { cursorRef, LIVE_CURSOR } from '../../src/browser/cursor.js';
import { acceptInteractions } from '../../src/browser/index.js';

function createPointerEvent(type: string, props: any = {}) {
  const event = new Event(type) as any;
  Object.assign(event, {
    clientX: 0,
    clientY: 0,
    pageX: 0,
    pageY: 0,
    screenX: 0,
    screenY: 0,
    button: 0,
    pointerType: 'mouse',
    ...props,
  });
  return event;
}

describe('browser/cursor', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  beforeAll(async () => {
    LIVE_CURSOR.x; // trigger watchCursors
    await acceptInteractions(false);
  });

  afterEach(() => {
    window.dispatchEvent(new Event('blur'));
  });

  it('should initialize empty state', async () => {
    expect(LIVE_CURSOR.x).toBe(0);
    expect(LIVE_CURSOR.y).toBe(0);
    expect(LIVE_CURSOR.type).toBe('');
    expect(LIVE_CURSOR.button).toBeUndefined();

    const ref = cursorRef();
    expect(ref.x).toBe(0);
    expect(ref.y).toBe(0);
  });

  it('should parse metaKey modifier', () => {
    const downEvent = new PointerEvent('pointerdown', { button: 0, metaKey: true });
    document.dispatchEvent(downEvent);
    expect(LIVE_CURSOR.modifiers.has('meta')).toBe(true);
  });

  it('should set current element on cursorRef init', () => {
    const div = document.createElement('div');
    const ref = cursorRef(div);
    expect(ref.current).toBe(div);
  });

  it('should track pointer coordinates on move', async () => {
    document.dispatchEvent(
      createPointerEvent('pointermove', {
        clientX: 100,
        clientY: 200,
        pageX: 100,
        pageY: 200,
        screenX: 100,
        screenY: 200,
        pointerType: 'touch',
      })
    );

    expect(LIVE_CURSOR.x).toBe(100);
    expect(LIVE_CURSOR.y).toBe(200);
    expect(LIVE_CURSOR.pageX).toBe(100);
    expect(LIVE_CURSOR.pageY).toBe(200);
    expect(LIVE_CURSOR.screenX).toBe(100);
    expect(LIVE_CURSOR.screenY).toBe(200);
    expect(LIVE_CURSOR.type).toBe('touch');
  });

  it('should track button and modifiers on pointerdown', async () => {
    document.dispatchEvent(
      createPointerEvent('pointerdown', {
        button: 2, // right click
        pointerType: 'pen',
        ctrlKey: true,
      })
    );

    expect(LIVE_CURSOR.button).toBe('right');
    expect(LIVE_CURSOR.type).toBe('pen');
    expect(LIVE_CURSOR.modifiers.has('ctrl')).toBe(true);
    expect(LIVE_CURSOR.modifiers.has('alt')).toBe(false);
  });

  it('should clear button and modifiers on pointerup and contextmenu', async () => {
    document.dispatchEvent(
      createPointerEvent('pointerdown', {
        button: 0, // left click
        shiftKey: true,
      })
    );

    expect(LIVE_CURSOR.button).toBe('left');
    expect(LIVE_CURSOR.modifiers.has('shift')).toBe(true);

    document.dispatchEvent(createPointerEvent('pointerup'));

    expect(LIVE_CURSOR.button).toBeUndefined();
    expect(LIVE_CURSOR.modifiers.size).toBe(0);

    // Test contextmenu
    document.dispatchEvent(createPointerEvent('pointerdown', { button: 2 }));
    expect(LIVE_CURSOR.button).toBe('right');

    document.dispatchEvent(createPointerEvent('contextmenu'));
    expect(LIVE_CURSOR.button).toBeUndefined();
  });

  it('should identify target element', async () => {
    const div = document.createElement('div');
    document.body.appendChild(div);

    const event = createPointerEvent('pointerdown', { button: 0 });
    Object.defineProperty(event, 'target', { value: div, enumerable: true });

    document.dispatchEvent(event);

    expect(LIVE_CURSOR.target).toBe(div);

    document.body.removeChild(div);
  });

  it('should clear state on window blur', async () => {
    document.dispatchEvent(createPointerEvent('pointerdown', { button: 0, altKey: true }));
    expect(LIVE_CURSOR.button).toBe('left');

    window.dispatchEvent(new Event('blur'));

    expect(LIVE_CURSOR.button).toBeUndefined();
    expect(LIVE_CURSOR.modifiers.size).toBe(0);
  });

  describe('Coverage', () => {
    it('should set current and clear listeners on dispose', async () => {
      // Trigger disposer from onInteractive
      const { acceptInteractions } = await import('../../src/browser/interactive.js');
      await acceptInteractions(false);

      expect(LIVE_CURSOR.current).toBeUndefined();

      // Dispatching an event should now have no effect since listeners are removed
      const mockEvent = new PointerEvent('pointermove', {
        clientX: 999,
        clientY: 999,
      });
      document.dispatchEvent(mockEvent);

      expect(LIVE_CURSOR.x).not.toBe(999);
      expect(LIVE_CURSOR.y).not.toBe(999);
    });

    it('should execute onCleanup when lifecycle scope is destroyed', async () => {
      const { createLifecycle } = await import('../../src/scope/lifecycle.js');
      const lifecycle = createLifecycle();
      const div = document.createElement('div');
      let ref: any;

      lifecycle.run(() => {
        ref = cursorRef(div);
      });

      expect(ref.current).toBe(div);
      lifecycle.destroy();
    });
  });
});
