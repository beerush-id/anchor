import type { ButtonHTMLAttributes, MouseEvent } from 'react';
import { classx, mutable, onCleanup, render, setup } from '../index.js';

export interface CodeCopyProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  getText?: () => string | null | undefined;
  copyLabel?: string;
  copiedLabel?: string;
}

export const CodeCopy = setup<CodeCopyProps>((props) => {
  const $restProps = props.$omit(['getText', 'className', 'onClick', 'copyLabel', 'copiedLabel']);
  const copied = mutable(false);
  const ref = { current: null } as { current: HTMLButtonElement | null };
  let timer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  const handleClick = async (e: MouseEvent<HTMLButtonElement>) => {
    props.onClick?.(e);

    const text = props.getText?.() ?? ref.current?.parentElement?.querySelector('code')?.textContent ?? '';

    if (text && typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        copied.value = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          copied.value = false;
        }, 2000);
      } catch {
        // Clipboard write failed (e.g. permission or un-focused document)
      }
    }
  };

  return render(
    () => (
      <button
        ref={ref}
        type="button"
        {...$restProps}
        className={classx('air-mdx-copy-btn', props.className)}
        aria-label={
          props['aria-label'] ??
          (copied.value
            ? (props.copiedLabel ?? 'Copied code to clipboard')
            : (props.copyLabel ?? 'Copy code to clipboard'))
        }
        onClick={handleClick}
      >
        <span className="sr-only" aria-live="polite">
          {copied.value ? (props.copiedLabel ?? 'Copied code to clipboard') : ''}
        </span>
        {copied.value ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="m620-275 198-198q11-11 28-11t28 11q11 11 11 28t-11 28L648-191q-12 12-28 12t-28-12L478-305q-11-11-11-28t11-28q11-11 28-11t28 11l86 86ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v160q0 17-11.5 28.5T800-560q-17 0-28.5-11.5T760-600v-160h-80v80q0 17-11.5 28.5T640-640H320q-17 0-28.5-11.5T280-680v-80h-80v560h200q17 0 28.5 11.5T440-160q0 17-11.5 28.5T400-120H200Zm308.5-651.5Q520-783 520-800t-11.5-28.5Q497-840 480-840t-28.5 11.5Q440-817 440-800t11.5 28.5Q463-760 480-760t28.5-11.5Z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="20px"
            viewBox="0 -960 960 960"
            width="20px"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560h-80v80q0 17-11.5 28.5T640-640H320q-17 0-28.5-11.5T280-680v-80h-80v560Zm308.5-571.5Q520-783 520-800t-11.5-28.5Q497-840 480-840t-28.5 11.5Q440-817 440-800t11.5 28.5Q463-760 480-760t28.5-11.5Z" />
          </svg>
        )}
      </button>
    ),
    'CodeCopy'
  );
}, 'CodeCopy');
