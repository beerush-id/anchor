import { classx, isBrowser, mutable, onCleanup } from '@airlib/core';
import { Link } from '../router/index.js';
import { For, type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';
import { mdxCtx } from './context.js';

export interface TableOfContentProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export function TableOfContent(allProps: TableOfContentProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['title', 'class']);
  const ctx = mdxCtx.get();
  const state = mutable({ activeId: '' });

  let observer: IntersectionObserver | undefined;

  if (isBrowser()) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            state.activeId = entry.target.id;
          }
        });
      },
      { rootMargin: '-10% 0px -90% 0px' }
    );

    const handleScroll = () => {
      const doc = document.documentElement;
      const headings = ctx?.headings;
      const scrollable = doc.scrollHeight > window.innerHeight + 2;
      if (scrollable && headings?.length && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        state.activeId = headings[headings.length - 1].id;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    onCleanup(() => {
      observer?.disconnect();
      window.removeEventListener('scroll', handleScroll);
    });
  }

  const observe = (_el: HTMLAnchorElement, id: string) => {
    const target = document.getElementById(id);
    if (target) {
      observer?.observe(target);
    }
  };

  return (
    <Show when={ctx?.headings?.length}>
      <div {...restProps} class={classx('air-mdx-toc', props.class)}>
        <div class="air-mdx-toc-title">{props.title ?? 'On this page'}</div>
        <nav class="air-mdx-toc-navs" aria-label={props.title ?? 'Table of contents'}>
          <For each={ctx?.headings}>
            {(h) => {
              const isActive = () => state.activeId === h.id;
              return (
                <Link
                  href={`#${h.id}`}
                  ref={(el) => observe(el, h.id)}
                  style={{ 'padding-inline-start': `${Math.max(0, h.depth - 2) * 0.75}rem` }}
                  class={classx('air-mdx-toc-link', { active: isActive() })}
                  aria-current={isActive() ? 'true' : undefined}
                >
                  {h.text}
                </Link>
              );
            }}
          </For>
        </nav>
      </div>
    </Show>
  );
}
