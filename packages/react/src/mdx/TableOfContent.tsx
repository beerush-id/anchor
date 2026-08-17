import { $inline, classx, derived, For, isBrowser, mutable, onCleanup, setup } from '../index.js';
import { mdxCtx } from './context.js';

export interface TocHeading {
  id: string;
  text: string;
  depth: number;
}

export const TableOfContent = setup(() => {
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

  const scrollTo = (e: MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();

    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
      history.replaceState(null, '', [location.pathname, `#${id}`].join('/'));
    }
  };

  return (
    <div className="air-mdx-toc">
      <div className="air-mdx-toc-title">On this page</div>
      <nav className="air-mdx-toc-navs">
        <For each={() => ctx?.headings as TocHeading[]}>
          {(h) => {
            const active = derived(() => activeId.value === h.id);
            return $inline(() => (
              <a
                id={`#${h.id}`}
                ref={(el) => observe(el, h.id)}
                style={{ paddingLeft: `${h.depth - 2}rem` }}
                className={classx(`air-mdx-toc-link`, { active: active.value })}
                onClick={(e) => {
                  scrollTo(e as never, h.id);
                }}
              >
                {h.text}
              </a>
            ));
          }}
        </For>
      </nav>
    </div>
  );
}, 'TableOfContent');
