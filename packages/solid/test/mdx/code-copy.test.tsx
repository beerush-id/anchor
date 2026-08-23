/** @jsxImportSource solid-js */

import '../../src/client/index.js';
import { fireEvent, render } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CodeCopy } from '../../src/mdx/CodeCopy.js';

describe('Code Snippet Copy Button', () => {
  let writeTextMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('Clipboard Writing & Text Extraction', () => {
    it('copies code text from adjacent code element to system clipboard', async () => {
      const { container } = render(() => (
        <div class="code-container">
          <CodeCopy />
          <pre>
            <code>pnpm add @airlib/solid</code>
          </pre>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(writeTextMock).toHaveBeenCalledWith('pnpm add @airlib/solid');
    });

    it('uses custom getText callback when provided by author', async () => {
      const customExtractor = vi.fn(() => 'CUSTOM_SNIPPET_CONTENT');
      const { container } = render(() => (
        <div class="code-container">
          <CodeCopy getText={customExtractor} />
          <code>original text</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(customExtractor).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith('CUSTOM_SNIPPET_CONTENT');
    });

    it('does nothing when no code text is available', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy getText={() => ''} />
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('does nothing when rendered standalone without adjacent code element', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy />
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('resets timer on consecutive clicks while already in copied state', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy />
          <code>consecutive click text</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      // Click again after 1s (before 2s expires)
      vi.advanceTimersByTime(1000);
      fireEvent.click(button);
      await Promise.resolve();

      // Advance by another 1.5s (total 2.5s from first click, but 1.5s from second click)
      vi.advanceTimersByTime(1500);

      // Still copied because timer was reset
      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      // Advance remaining 600ms (total 2.1s after second click)
      vi.advanceTimersByTime(600);

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });
  });

  describe('Accessible & Visual Feedback', () => {
    it('displays copy accessibility label by default', () => {
      const { container } = render(() => <CodeCopy />);
      const button = container.querySelector('button');

      expect(button?.getAttribute('aria-label')).toBe('Copy code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('');
    });

    it('announces copied state and switches label upon successful copy', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy />
          <code>const a = 1;</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('Copied code to clipboard');
    });

    it('allows authors to customize copy and copied labels', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy copyLabel="Salin kode" copiedLabel="Kode tersalin!" />
          <code>konten</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('Salin kode');

      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Kode tersalin!');
      expect(container.querySelector('.sr-only')?.textContent).toBe('Kode tersalin!');
    });

    it('allows explicit aria-label prop override', () => {
      const { container } = render(() => <CodeCopy aria-label="Custom Copy Button" />);
      const button = container.querySelector('button');
      expect(button?.getAttribute('aria-label')).toBe('Custom Copy Button');
    });

    it('automatically reverts feedback state after two seconds', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      vi.advanceTimersByTime(2000);

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('');
    });
  });

  describe('Lifecycle & Error Resilience', () => {
    it('cleans up pending timer when component unmounts', async () => {
      const { container, unmount } = render(() => (
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(() => unmount()).not.toThrow();
    });

    it('gracefully handles clipboard write errors without crashing the interface', async () => {
      writeTextMock.mockRejectedValueOnce(new Error('Permission denied'));

      const { container } = render(() => (
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });

    it('safely handles environments where clipboard API is unavailable', async () => {
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      const { container } = render(() => (
        <div>
          <CodeCopy />
          <code>text</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');

      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    });

    it('invokes custom onClick handler when clicked', async () => {
      const clickSpy = vi.fn();
      const { container } = render(() => (
        <div>
          <CodeCopy onClick={clickSpy} />
          <code>code</code>
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(clickSpy).toHaveBeenCalled();
    });

    it('does nothing when getText returns empty or null', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy getText={() => null} />
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('does nothing when parent element lacks a code element and getText is omitted', async () => {
      const { container } = render(() => (
        <div>
          <CodeCopy />
        </div>
      ));

      const button = container.querySelector('button')!;
      fireEvent.click(button);
      await Promise.resolve();

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('forwards button element to custom ref callback', () => {
      const refSpy = vi.fn();
      const { container } = render(() => <CodeCopy ref={refSpy} />);
      expect(refSpy).toHaveBeenCalledWith(container.querySelector('button'));
    });
  });
});
