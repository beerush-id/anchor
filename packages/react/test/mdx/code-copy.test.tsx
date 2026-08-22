import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../../src/client/index.js';
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
      const { container } = render(
        <div className="code-container">
          <CodeCopy />
          <pre>
            <code>pnpm add @airlib/react</code>
          </pre>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeTextMock).toHaveBeenCalledWith('pnpm add @airlib/react');
    });

    it('uses custom getText callback when provided by author', async () => {
      const customExtractor = vi.fn(() => 'CUSTOM_SNIPPET_CONTENT');
      const { container } = render(
        <div className="code-container">
          <CodeCopy getText={customExtractor} />
          <code>original text</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(customExtractor).toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith('CUSTOM_SNIPPET_CONTENT');
    });

    it('does nothing when no code text is available', async () => {
      const { container } = render(
        <div>
          <CodeCopy getText={() => ''} />
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('does nothing when rendered standalone without adjacent code element', async () => {
      const { container } = render(
        <div>
          <CodeCopy />
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(writeTextMock).not.toHaveBeenCalled();
    });

    it('resets timer on consecutive clicks while already in copied state', async () => {
      const { container } = render(
        <div>
          <CodeCopy />
          <code>consecutive click text</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      // Click again after 1s (before 2s expires)
      await act(async () => {
        vi.advanceTimersByTime(1000);
      });

      await act(async () => {
        fireEvent.click(button);
      });

      // Advance by another 1.5s (total 2.5s from first click, but 1.5s from second click)
      await act(async () => {
        vi.advanceTimersByTime(1500);
      });

      // Still copied because timer was reset
      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      // Advance remaining 600ms (total 2.1s after second click)
      await act(async () => {
        vi.advanceTimersByTime(600);
      });

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });
  });

  describe('Accessible & Visual Feedback', () => {
    it('displays copy accessibility label by default', () => {
      const { container } = render(<CodeCopy />);
      const button = container.querySelector('button');

      expect(button?.getAttribute('aria-label')).toBe('Copy code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('');
    });

    it('announces copied state and switches label upon successful copy', async () => {
      const { container } = render(
        <div>
          <CodeCopy />
          <code>const a = 1;</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('Copied code to clipboard');
    });

    it('allows authors to customize copy and copied labels', async () => {
      const { container } = render(
        <div>
          <CodeCopy copyLabel="Salin kode" copiedLabel="Kode tersalin!" />
          <code>konten</code>
        </div>
      );

      const button = container.querySelector('button')!;
      expect(button.getAttribute('aria-label')).toBe('Salin kode');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Kode tersalin!');
      expect(container.querySelector('.sr-only')?.textContent).toBe('Kode tersalin!');
    });

    it('automatically reverts feedback state after two seconds', async () => {
      const { container } = render(
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Copied code to clipboard');

      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
      expect(container.querySelector('.sr-only')?.textContent).toBe('');
    });
  });

  describe('Lifecycle & Error Resilience', () => {
    it('cleans up pending timer when component unmounts', async () => {
      const { container, unmount } = render(
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(() => unmount()).not.toThrow();
    });

    it('gracefully handles clipboard write errors without crashing the interface', async () => {
      writeTextMock.mockRejectedValueOnce(new Error('Permission denied'));

      const { container } = render(
        <div>
          <CodeCopy />
          <code>echo test</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');
    });

    it('safely handles environments where clipboard API is unavailable', async () => {
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });

      const { container } = render(
        <div>
          <CodeCopy />
          <code>text</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(button.getAttribute('aria-label')).toBe('Copy code to clipboard');

      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
    });

    it('invokes custom onClick handler when clicked', async () => {
      const clickSpy = vi.fn();
      const { container } = render(
        <div>
          <CodeCopy onClick={clickSpy} />
          <code>code</code>
        </div>
      );

      const button = container.querySelector('button')!;
      await act(async () => {
        fireEvent.click(button);
      });

      expect(clickSpy).toHaveBeenCalled();
    });
  });
});
