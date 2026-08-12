import { derived, Link, render, Show, setup } from '../index.js';
import { docsCtx } from './context.js';
import type { NavItem } from './Sidebar.js';

export interface PaginationProps {
  nav: NavItem[];
}

export const Pagination = setup<PaginationProps>((props) => {
  const flatLinks: { text: string; link: string }[] = [];

  const traverse = (items: NavItem[]) => {
    for (const item of items) {
      if (item.link) flatLinks.push({ text: item.text, link: item.link });
      if (item.items) traverse(item.items);
    }
  };

  traverse(props.nav);

  const ctx = docsCtx.get();

  const nav = derived.as(() => {
    if (!ctx?.url) return {};

    const pathname = new URL(ctx.url).pathname;
    const currentIndex = flatLinks.findIndex((l) => l.link === pathname);

    if (currentIndex === -1) return {};

    const prev = flatLinks[currentIndex - 1];
    const next = flatLinks[currentIndex + 1];

    return { prev, next };
  });

  return render(() => {
    return (
      <div className="air-docs-pagination">
        <Show when={() => nav.prev}>
          {(p) => (
            <Link href={p!.link} className="air-docs-pagination-link air-docs-pagination-prev">
              <span>Previous</span>
              <strong>{p!.text}</strong>
            </Link>
          )}
        </Show>

        <Show when={() => nav.next}>
          {(n) => (
            <Link href={n!.link} className="air-docs-pagination-link air-docs-pagination-next">
              <span>Next</span>
              <strong>{n!.text}</strong>
            </Link>
          )}
        </Show>
      </div>
    );
  });
}, 'Pagination');
