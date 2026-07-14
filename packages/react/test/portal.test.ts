import { createPortal } from 'react-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { teleport } from '../src/portal';

vi.mock('react-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom')>();
  return {
    ...actual,
    createPortal: vi.fn((content, container) => ({ type: 'portal', content, container })),
  };
});

describe('Anchor React - Portal', () => {
  let querySelectorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    querySelectorSpy = vi.spyOn(document, 'querySelector');
    vi.clearAllMocks();
  });

  afterEach(() => {
    querySelectorSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should return content directly if not in browser (server-side)', () => {
    vi.stubGlobal('window', undefined);
    vi.stubGlobal('document', undefined);

    const content = 'test-content';
    const result = teleport(content);

    expect(result).toBe(content);
    expect(createPortal).not.toHaveBeenCalled();
  });

  it('should use document.body when target is not provided', () => {
    const content = 'test-content';
    teleport(content);

    expect(createPortal).toHaveBeenCalledWith(content, document.body);
  });

  it('should query element when target is a string', () => {
    const content = 'test-content';
    const element = document.createElement('div');
    element.id = 'test-target';

    querySelectorSpy.mockReturnValue(element);

    teleport(content, '#test-target');

    expect(querySelectorSpy).toHaveBeenCalledWith('#test-target');
    expect(createPortal).toHaveBeenCalledWith(content, element);
  });

  it('should fallback to document.body when target string is not found', () => {
    const content = 'test-content';
    querySelectorSpy.mockReturnValue(null);

    teleport(content, '#non-existent');

    expect(querySelectorSpy).toHaveBeenCalledWith('#non-existent');
    expect(createPortal).toHaveBeenCalledWith(content, document.body);
  });

  it('should use target directly when it is an Element', () => {
    const content = 'test-content';
    const element = document.createElement('div');

    teleport(content, element);

    expect(querySelectorSpy).not.toHaveBeenCalled();
    expect(createPortal).toHaveBeenCalledWith(content, element);
  });
});
