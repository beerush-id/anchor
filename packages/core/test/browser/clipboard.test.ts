import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInteractions, LIVE_CLIPBOARD } from '../../src/browser/index.js';

describe('browser/clipboard', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    errorSpy?.mockRestore();
  });
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: {
        writeText: writeTextMock,
      },
    });

    LIVE_CLIPBOARD.isSupported; // Trigger watchClipboard
    await acceptInteractions(false);
  });

  beforeEach(() => {
    writeTextMock = vi.fn().mockResolvedValue(undefined);

    vi.stubGlobal('navigator', {
      ...globalThis.navigator,
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    LIVE_CLIPBOARD.clear(); // Reset state
  });

  it('should initialize correctly when supported', async () => {
    expect(LIVE_CLIPBOARD.isSupported).toBe(true);
  });

  it('should copy text strings successfully', async () => {
    const result = await LIVE_CLIPBOARD.copy('hello world');
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith('hello world');
  });

  it('should stringify objects when copying', async () => {
    const obj = { foo: 'bar' };
    const result = await LIVE_CLIPBOARD.copy(obj);
    expect(result).toBe(true);
    expect(writeTextMock).toHaveBeenCalledWith(JSON.stringify(obj));
  });

  it('should return false if copy throws', async () => {
    writeTextMock.mockRejectedValueOnce(new Error('Denied'));
    const result = await LIVE_CLIPBOARD.copy('fail');
    expect(result).toBe(false);
  });

  it('should process paste events for plain text', async () => {
    const mockEvent = new Event('paste') as any;
    mockEvent.clipboardData = {
      getData: vi.fn().mockReturnValue('pasted text'),
      files: [],
    };

    window.dispatchEvent(mockEvent);
    expect(LIVE_CLIPBOARD.text).toBe('pasted text');
  });

  it('should process paste events for JSON objects to data slot', async () => {
    const obj = { success: true };
    const mockEvent = new Event('paste') as any;
    mockEvent.clipboardData = {
      getData: vi.fn().mockReturnValue(JSON.stringify(obj)),
      files: [],
    };

    window.dispatchEvent(mockEvent);
    expect(LIVE_CLIPBOARD.data).toEqual(obj);
    // Because it's valid JSON, it gets parsed and assigned to 'data' instead of 'text' (wait, let's verify implementation... implementation actually sets isString if input is string, but JSON.parse converts string to object, so it's not string)
    // Actually the implementation says:
    // let input = payload;
    // if (typeof payload === 'string') { try { input = JSON.parse(payload); } catch {} }
    // const isString = typeof input === 'string'; // false for parsed json
    // const slot = isString ? 'text' : ... 'data'
    // So JSON ends up in data slot
  });

  it('should allow taking clipboard data without modifying global state', async () => {
    const taker = vi.fn();
    const unsubscribe = LIVE_CLIPBOARD.take('text', taker);

    const mockEvent = new Event('paste') as any;
    mockEvent.clipboardData = {
      getData: vi.fn().mockReturnValue('intercepted'),
    };

    window.dispatchEvent(mockEvent);

    expect(taker).toHaveBeenCalledWith('intercepted');
    expect(LIVE_CLIPBOARD.text).toBeUndefined(); // Should not modify global state

    unsubscribe();
  });

  describe('Coverage', () => {
    it('should return false if clipboard is not supported', async () => {
      // Temporarily mock unsupported state
      const prev = (navigator as any).clipboard;
      (navigator as any).clipboard = undefined;
      // Re-import to trigger initial support check
      vi.resetModules();
      const { LIVE_CLIPBOARD: NEW_CLIPBOARD } = await import('../../src/browser/clipboard.js');
      const res = await NEW_CLIPBOARD.copy('foo');
      expect(res).toBe(false);
      (navigator as any).clipboard = prev;
    });

    it('should return false if clipboard write fails', async () => {
      vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValueOnce(new Error('Copy failed'));
      const result = await LIVE_CLIPBOARD.copy('foo');
      expect(result).toBe(false);
    });

    it('should handle invalid takers', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const unsubscribe = LIVE_CLIPBOARD.take('text', null as any);
      expect(consoleSpy).toHaveBeenCalled();
      unsubscribe();
      consoleSpy.mockRestore();
    });

    it('should clear specific files slot', () => {
      LIVE_CLIPBOARD.clear('files');
      expect(LIVE_CLIPBOARD.files).toEqual([]);
    });

    it('should clean up paste listener on dispose', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_CLIPBOARD: NEW_CLIPBOARD } = await import('../../src/browser/clipboard.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      NEW_CLIPBOARD.text;
      await acceptInteractions(true);
      await acceptInteractions(false);

      const prevText = NEW_CLIPBOARD.text;
      const pasteEvent = new Event('paste');
      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: { getData: () => 'late', files: [] },
      });
      window.dispatchEvent(pasteEvent);
      expect(NEW_CLIPBOARD.text).toBe(prevText);
      consoleError.mockRestore();
    });

    it('should paste files and text from window paste event', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.resetModules();
      const { LIVE_CLIPBOARD: NEW_CLIPBOARD } = await import('../../src/browser/clipboard.js');
      const { acceptInteractions } = await import('../../src/browser/interactive.js');

      NEW_CLIPBOARD.text;
      await acceptInteractions(true);

      const pasteEvent = new Event('paste');
      const file = new File([''], 'test.txt', { type: 'text/plain' });
      const mockFiles = [file];
      Object.setPrototypeOf(mockFiles, FileList.prototype);

      Object.defineProperty(pasteEvent, 'clipboardData', {
        value: {
          getData: () => 'pasted text',
          files: mockFiles,
        },
      });
      window.dispatchEvent(pasteEvent);
      expect(NEW_CLIPBOARD.text).toBe('pasted text');
      expect(NEW_CLIPBOARD.files.length).toBe(1);

      // Test missing text fallback (?? '')
      const emptyPasteEvent = new Event('paste');
      Object.defineProperty(emptyPasteEvent, 'clipboardData', {
        value: {
          getData: () => undefined,
          files: undefined,
        },
      });
      window.dispatchEvent(emptyPasteEvent);
      // Since it's empty, it should not throw and text remains unchanged
      expect(NEW_CLIPBOARD.text).toBe('pasted text');

      await acceptInteractions(false);
      consoleError.mockRestore();
    });

    it('should clear specific data slot', () => {
      LIVE_CLIPBOARD.paste({ type: 'foo', count: 1, files: [] });
      LIVE_CLIPBOARD.clear('data');
      expect(LIVE_CLIPBOARD.data).toBeUndefined();
    });
  });
});
