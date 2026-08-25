import { classx, For, mutable, render, setup, Show } from '@airlib/react';
import { mdxCtx } from '@airlib/react/mdx';
import type { FocusEvent, KeyboardEvent } from 'react';

export interface DocsSelectorOption {
  value: string;
  label: string;
}

export interface DocsSelectorProps {
  name: string;
  label: string;
  icon: 'framework' | 'pm';
  options: DocsSelectorOption[];
}

/**
 * Next.js-style docs preference card: icon tile, current value, caption and
 * an unfold chevron. Dropdown visibility is pure CSS (`:focus-within`);
 * picking an option writes the shared mdx cookie store, which every
 * `code-group` with the same `group` key reacts to.
 */
export const DocsSelector = setup<DocsSelectorProps>((props) => {
  const store = mdxCtx.get()?.store;
  const state = mutable({ open: false });

  const value = () => String(store?.[props.name] ?? props.options[0]?.value);

  const close = () => {
    (document.activeElement as HTMLElement | null)?.blur();
    state.open = false;
  };

  const select = (option: DocsSelectorOption) => {
    if (store) store[props.name] = option.value;
    close();
  };

  const handleBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) state.open = false;
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') close();
  };

  return render(() => {
    const current = props.options.find((option) => option.value === value());

    return (
      <div className="docs-selector" onFocus={() => (state.open = true)} onBlur={handleBlur} onKeyDown={handleKeyDown}>
        <button type="button" className="docs-selector-trigger" aria-haspopup="listbox" aria-expanded={state.open}>
          <span className="docs-selector-icon" aria-hidden="true">
            {props.icon === 'framework' ? <CubeIcon /> : <TagIcon />}
          </span>
          <span className="docs-selector-text">
            <strong>{current?.label ?? value()}</strong>
            <small>{props.label}</small>
          </span>
          <UnfoldIcon />
        </button>

        <div className="docs-selector-menu" role="listbox" aria-label={props.label}>
          <For each={() => props.options}>
            {(option) => (
              <button
                type="button"
                role="option"
                aria-selected={option.value === value()}
                className={classx('docs-selector-option', { active: option.value === value() })}
                onClick={() => select(option)}
              >
                {option.label}
                <Show when={() => option.value === value()}>
                  <CheckIcon />
                </Show>
              </button>
            )}
          </For>
        </div>
      </div>
    );
  });
});

const CubeIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2.5 21 7.25v9.5L12 21.5l-9-4.75v-9.5L12 2.5Z" />
    <path d="m3 7.25 9 4.75 9-4.75" />
    <path d="M12 12v9.5" />
  </svg>
);

const TagIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2.5H2.5V12l9.5 9.5a1.5 1.5 0 0 0 2.12 0l7.38-7.38a1.5 1.5 0 0 0 0-2.12L12 2.5Z" />
    <circle cx="7.25" cy="7.25" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);

const UnfoldIcon = () => (
  <svg
    className="docs-selector-unfold"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m8 9.5 4-4 4 4" />
    <path d="m8 14.5 4 4 4-4" />
  </svg>
);

const CheckIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);
