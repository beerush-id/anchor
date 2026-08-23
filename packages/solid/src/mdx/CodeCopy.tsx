import { classx, mutable, onCleanup } from '@airlib/core';
import { type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';

export interface CodeCopyProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  getText?: () => string | null | undefined;
  copyLabel?: string;
  copiedLabel?: string;
}

export function CodeCopy(allProps: CodeCopyProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, [
    'getText',
    'class',
    'ref',
    'onClick',
    'copyLabel',
    'copiedLabel',
    'aria-label',
  ]);

  const state = mutable({ copied: false });
  let buttonRef: HTMLButtonElement | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  const handleClick: JSX.EventHandler<HTMLButtonElement, MouseEvent> = async (e) => {
    if (typeof props.onClick === 'function') {
      (props.onClick as (e: MouseEvent) => void)(e);
    }

    const text = props.getText?.() ?? buttonRef?.parentElement?.querySelector('code')?.textContent ?? '';

    if (text && typeof navigator !== 'undefined' && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        state.copied = true;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          state.copied = false;
        }, 2000);
      } catch {
        // Clipboard write failed
      }
    }
  };

  return (
    <button
      {...restProps}
      ref={(el) => {
        buttonRef = el;
        if (typeof props.ref === 'function') {
          (props.ref as (el: HTMLButtonElement) => void)(el);
        }
      }}
      type="button"
      class={classx('air-mdx-copy-btn', props.class)}
      aria-label={
        props['aria-label'] ??
        (state.copied
          ? (props.copiedLabel ?? 'Copied code to clipboard')
          : (props.copyLabel ?? 'Copy code to clipboard'))
      }
      onClick={handleClick}
    >
      <span class="sr-only" aria-live="polite">
        <Show when={state.copied}>{props.copiedLabel ?? 'Copied code to clipboard'}</Show>
      </span>
      <Show
        when={state.copied}
        fallback={
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
        }
      >
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
      </Show>
    </button>
  );
}
