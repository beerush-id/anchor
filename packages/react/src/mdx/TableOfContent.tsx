import type { HTMLAttributes } from 'react';
import { classx, derived, For, isBrowser, Link, mutable, onCleanup, Snippet, setup } from '../index.js';
import { mdxCtx } from './context.js';

export interface TableOfContentProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

export const TableOfContent = setup<TableOfContentProps>((props) => {
  const $restProps = props.$omit(['title', 'className']);
  const ctx = mdxCtx.get();
  const activeId = mutable('');

  let observer: IntersectionObserver | undefined;
  /* istanbul ignore else */
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

    // Fallback: the top-10% band can never intersect headings near the end of
    // the page, so force the last heading active when scrolled to the bottom.
    const handleScroll = () => {
      const doc = document.documentElement;
      const headings = ctx?.headings;
      const scrollable = doc.scrollHeight > window.innerHeight + 2;
      if (scrollable && headings?.length && window.innerHeight + window.scrollY >= doc.scrollHeight - 2) {
        activeId.value = headings[headings.length - 1].id;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    onCleanup(() => {
      observer!.disconnect();
      window.removeEventListener('scroll', handleScroll);
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

  return () => {
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
  };
}, 'TableOfContent');
