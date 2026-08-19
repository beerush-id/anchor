import type { HTMLAttributes } from 'react';
import { classx, derived, For, isBrowser, Link, mutable, onCleanup, render, Snippet, setup } from '../index.js';
import { mdxCtx } from './context.js';

export interface TableOfContentProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const TableOfContent = setup<TableOfContentProps>((props) => {
  const $restProps = props.$omit(['title', 'className']);
  const ctx = mdxCtx.get();
  const activeId = mutable('');

  let observer: IntersectionObserver | undefined;
  if (isBrowser()) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeId.value = entry.target.id;
          }
        });
      },
      { rootMargin: '-10% 0px -90% 0px' }
    );
    onCleanup(() => {
      observer!.disconnect();
    });
  }

  const observe = (el: HTMLAnchorElement | null, id: string) => {
    if (el) {
      const target = document.getElementById(id);
      if (target) {
        observer?.observe(target);
        return () => observer?.unobserve(target);
      }
    }
  };

  return render(() => {
    if (!ctx?.headings?.length) return null;

    return (
      <div {...$restProps} className={classx('air-mdx-toc', props.className)}>
        <div className="air-mdx-toc-title">{props.title ?? 'On this page'}</div>
        <nav className="air-mdx-toc-navs" aria-label={props.title ?? 'Table of contents'}>
          <For each={() => ctx.headings!}>
            {(h) => {
              const active = derived(() => activeId.value === h.id);
              return (
                <Snippet>
                  {() => (
                    <Link
                      href={`#${h.id}`}
                      ref={(el) => observe(el, h.id)}
                      style={{ paddingInlineStart: `${Math.max(0, h.depth - 2) * 0.75}rem` }}
                      className={classx('air-mdx-toc-link', { active: active.value })}
                      aria-current={active.value ? 'true' : undefined}
                    >
                      {h.text}
                    </Link>
                  )}
                </Snippet>
              );
            }}
          </For>
        </nav>
      </div>
    );
  }, 'TableOfContent');
}, 'TableOfContent');
