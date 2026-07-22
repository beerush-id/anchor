import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions, LIVE_SELECTION } from '../../src/browser/index.js';

describe('browser/selection', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  let getSelectionMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    vi.useFakeTimers();
    getSelectionMock = vi.fn();
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelectionMock,
    });
    LIVE_SELECTION.size; // trigger watchSelection
    await acceptInteractions(false);
  });

  beforeEach(() => {
    vi.useFakeTimers();

    getSelectionMock = vi.fn();
    Object.defineProperty(window, 'getSelection', {
      writable: true,
      value: getSelectionMock,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('should initialize empty state', async () => {
    expect(LIVE_SELECTION.size).toBe(0);
    expect(LIVE_SELECTION.text).toBe('');
    expect(LIVE_SELECTION.rect).toBeNull();
    expect(LIVE_SELECTION.target).toBeUndefined();
    expect(LIVE_SELECTION.paths()).toBe('');
  });

  it('should update state when text is selected', async () => {
    const div = document.createElement('div');
    const mockRect = { x: 20, y: 10, top: 10, left: 20, width: 100, height: 20 } as DOMRect;

    getSelectionMock.mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'selected text',
      getRangeAt: () => ({
        getBoundingClientRect: () => mockRect,
        getClientRects: () => [mockRect],
        commonAncestorContainer: {
          nodeType: Node.TEXT_NODE,
          parentElement: div,
        },
      }),
    });

    document.dispatchEvent(new Event('selectionchange'));

    // microtask(0) delay
    await vi.advanceTimersByTimeAsync(300);

    expect(LIVE_SELECTION.text).toBe('selected text');
    expect(LIVE_SELECTION.size).toBe(13);
    expect(LIVE_SELECTION.rect).toBe(mockRect);
    expect(LIVE_SELECTION.target).toBe(div);
  });

  it('should clear state when selection is collapsed', async () => {
    getSelectionMock.mockReturnValue({
      rangeCount: 1,
      isCollapsed: true,
    });

    document.dispatchEvent(new Event('selectionchange'));

    // It clears synchronously without microtask
    expect(LIVE_SELECTION.text).toBe('');
    expect(LIVE_SELECTION.size).toBe(0);
    expect(LIVE_SELECTION.rect).toBeNull();
  });

  it('should initialize with existing selection if present', async () => {
    const div = document.createElement('div');
    const mockRect = { x: 0, y: 0, top: 0, left: 0, width: 50, height: 10 } as DOMRect;

    getSelectionMock.mockReturnValue({
      rangeCount: 1,
      isCollapsed: false,
      toString: () => 'initial text',
      getRangeAt: () => ({
        getBoundingClientRect: () => mockRect,
        getClientRects: () => [mockRect],
        commonAncestorContainer: div, // Not a text node
      }),
    });

    // Manual trigger for test setup
    document.dispatchEvent(new Event('selectionchange'));
    await vi.advanceTimersByTimeAsync(300);

    expect(LIVE_SELECTION.text).toBe('initial text');
    expect(LIVE_SELECTION.size).toBe(12);
    expect(LIVE_SELECTION.target).toBe(div);
  });

  describe('Coverage', () => {
    it('should assign selection immediately if present during init and clear listeners on dispose', async () => {
      // Mock an existing selection
      const mockEmptyRect = { x: 0, y: 0, width: 0, height: 0 } as DOMRect;
      getSelectionMock.mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'pre-selected',
        getRangeAt: () => ({
          getBoundingClientRect: () => mockEmptyRect,
          getClientRects: () => [],
          commonAncestorContainer: document.createElement('div'),
        }),
      });

      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Since it's a singleton, we need to reset to test init logic
      vi.resetModules();
      const { LIVE_SELECTION } = await import('../../src/browser/selection.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      LIVE_SELECTION.text; // triggers watchSelection
      await acceptInteractions(false); // <--- execute the onInteractive listener!

      // Should instantly assign selection
      expect(LIVE_SELECTION.text).toBe('pre-selected');

      // Trigger disposer (call acceptInteractions again with INTERACTIVE_ENABLED already true will not re-run listeners since they were cleared, but wait, acceptInteractions runs disposers FIRST!)
      await acceptInteractions(false);

      // Now selection changes shouldn't update state
      getSelectionMock.mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'post-dispose',
        getRangeAt: () => ({
          getBoundingClientRect: () => mockEmptyRect,
          getClientRects: () => [],
          commonAncestorContainer: document.createElement('div'),
        }),
      });
      const mockEvent = new Event('selectionchange');
      document.dispatchEvent(mockEvent);
      await vi.advanceTimersByTimeAsync(300);

      expect(LIVE_SELECTION.text).toBe('pre-selected'); // remains unchanged

      consoleError.mockRestore();
    });
  });

  describe('paths', () => {
    it('should generate valid SVG path for single and multi-rect selections', async () => {
      const div = document.createElement('div');
      const r1 = { x: 10, y: 10, width: 100, height: 20, top: 10, left: 10, right: 110, bottom: 30 } as DOMRect;
      const r2 = { x: 10, y: 35, width: 80, height: 20, top: 35, left: 10, right: 90, bottom: 55 } as DOMRect;
      const r3 = { x: 150, y: 10, width: 50, height: 20, top: 10, left: 150, right: 200, bottom: 30 } as DOMRect;
      const mockRect = { x: 10, y: 10, width: 190, height: 45, top: 10, left: 10, right: 200, bottom: 55 } as DOMRect;

      getSelectionMock.mockReturnValue({
        rangeCount: 1,
        isCollapsed: false,
        toString: () => 'multi rect text',
        getRangeAt: () => ({
          getBoundingClientRect: () => mockRect,
          getClientRects: () => [r1, r2, r3],
          commonAncestorContainer: {
            nodeType: Node.TEXT_NODE,
            parentElement: div,
          },
        }),
      });

      document.dispatchEvent(new Event('selectionchange'));
      await vi.advanceTimersByTimeAsync(300);

      const pathWithRadius = LIVE_SELECTION.paths(8, 8);
      expect(typeof pathWithRadius).toBe('string');
      expect(pathWithRadius).toContain('M ');
      expect(pathWithRadius).toContain('A ');

      const pathWithoutRadius = LIVE_SELECTION.paths(8, 0);
      expect(typeof pathWithoutRadius).toBe('string');
      expect(pathWithoutRadius).toContain('M ');
    });
  });
});
